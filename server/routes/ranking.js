const express = require('express');
const { getMany, getOne } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Ranking geral de pontuação
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, period } = req.query;
    let sql = `
      SELECT 
        u.id,
        u.username,
        u.avatar,
        u.total_points,
        u.games_played,
        u.wins,
        ROUND((COALESCE(u.wins,0)::numeric / NULLIF(u.games_played, 0)) * 100, 2) as win_rate,
        ROUND(COALESCE(u.total_points,0)::numeric / NULLIF(u.games_played, 0), 2) as avg_points_per_game
      FROM users u
      WHERE u.games_played > 0
    `;
    const params = [];
    if (period) {
      let dateFilter = '';
      switch (period) {
        case 'week':
          dateFilter = "AND g.date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND g.date >= CURRENT_DATE - INTERVAL '1 month'";
          break;
        case 'year':
          dateFilter = "AND g.date >= CURRENT_DATE - INTERVAL '1 year'";
          break;
      }
      if (dateFilter) {
        sql = `
          SELECT 
            u.id,
            u.username,
            u.avatar,
            COALESCE(SUM(gp.points_earned), 0) as total_points,
            COUNT(DISTINCT g.id) as games_played,
            SUM(CASE WHEN gp.position = 1 THEN 1 ELSE 0 END) as wins,
            ROUND((SUM(CASE WHEN gp.position = 1 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(DISTINCT g.id), 0)) * 100, 2) as win_rate,
            ROUND(COALESCE(SUM(gp.points_earned), 0)::numeric / NULLIF(COUNT(DISTINCT g.id), 0), 2) as avg_points_per_game
          FROM users u
          LEFT JOIN game_participants gp ON u.id = gp.user_id
          LEFT JOIN games g ON gp.game_id = g.id
          WHERE g.status = 'finished' ${dateFilter}
          GROUP BY u.id, u.username, u.avatar
          HAVING COUNT(DISTINCT g.id) > 0
        `;
      }
    }
    sql += ` ORDER BY total_points DESC, win_rate DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const ranking = await getMany(sql, params);
    const rankingWithPosition = ranking.map((player, index) => ({ ...player, position: index + 1 }));
    res.json(rankingWithPosition);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar ranking' });
  }
});

// Ranking de melhores mãos
router.get('/best-hands', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const bestHands = await getMany(`
      SELECT 
        bh.*, u.username, u.avatar, g.name as game_name
      FROM best_hands bh
      JOIN users u ON bh.user_id = u.id
      JOIN games g ON bh.game_id = g.id
      ORDER BY 
        CASE bh.hand_type
          WHEN 'Royal Flush' THEN 10
          WHEN 'Straight Flush' THEN 9
          WHEN 'Four of a Kind' THEN 8
          WHEN 'Full House' THEN 7
          WHEN 'Flush' THEN 6
          WHEN 'Straight' THEN 5
          WHEN 'Three of a Kind' THEN 4
          WHEN 'Two Pair' THEN 3
          WHEN 'One Pair' THEN 2
          ELSE 1
        END DESC,
        bh.date DESC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json(bestHands);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar melhores mãos' });
  }
});

// Estatísticas gerais do clube
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const queries = {
      totalPlayers: 'SELECT COUNT(*) as count FROM users WHERE games_played > 0',
      totalGames: "SELECT COUNT(*) as count FROM games WHERE status = 'finished'",
      totalPrizePool: "SELECT COALESCE(SUM(prize_pool), 0) as total FROM games WHERE status = 'finished'",
      avgPlayersPerGame: `
        SELECT ROUND(AVG(participants_count), 2) as avg
        FROM (
          SELECT COUNT(*) as participants_count
          FROM game_participants gp
          JOIN games g ON gp.game_id = g.id
          WHERE g.status = 'finished'
          GROUP BY g.id
        ) sub
      `,
      topPlayer: `
        SELECT username, total_points
        FROM users
        WHERE games_played > 0
        ORDER BY total_points DESC
        LIMIT 1
      `,
      recentActivity: `
        SELECT COUNT(*) as count
        FROM games
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      `
    };
    const stats = {};
    stats.totalPlayers = await getOne(queries.totalPlayers);
    stats.totalGames = await getOne(queries.totalGames);
    stats.totalPrizePool = await getOne(queries.totalPrizePool);
    stats.avgPlayersPerGame = await getOne(queries.avgPlayersPerGame);
    stats.topPlayer = await getOne(queries.topPlayer);
    stats.recentActivity = await getOne(queries.recentActivity);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Histórico de performance de um jogador
router.get('/player/:id/history', authenticateToken, async (req, res) => {
  try {
    const playerId = req.params.id;
    const { limit = 20 } = req.query;
    const history = await getMany(`
      SELECT 
        g.id as game_id,
        g.name as game_name,
        g.date,
        g.buy_in,
        gp.position,
        gp.points_earned,
        gp.prize_amount,
        gp.best_hand,
        COUNT(gp2.id) as total_players
      FROM game_participants gp
      JOIN games g ON gp.game_id = g.id
      LEFT JOIN game_participants gp2 ON g.id = gp2.game_id
      WHERE gp.user_id = $1 AND g.status = 'finished'
      GROUP BY g.id, gp.id
      ORDER BY g.date DESC
      LIMIT $2
    `, [playerId, parseInt(limit)]);
    res.json(history);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar histórico' });
  }
});

// Comparação entre jogadores
router.get('/compare', authenticateToken, async (req, res) => {
  try {
    const { players } = req.query;
    if (!players) {
      return res.status(400).json({ message: 'IDs dos jogadores são obrigatórios' });
    }
    const playerIds = players.split(',').map((id) => parseInt(id));
    if (playerIds.length < 2 || playerIds.length > 5) {
      return res.status(400).json({ message: 'Compare entre 2 e 5 jogadores' });
    }
    const comparison = await getMany(`
      SELECT 
        u.id,
        u.username,
        u.avatar,
        u.total_points,
        u.games_played,
        u.wins,
        ROUND((COALESCE(u.wins,0)::numeric / NULLIF(u.games_played, 0)) * 100, 2) as win_rate,
        ROUND(COALESCE(u.total_points,0)::numeric / NULLIF(u.games_played, 0), 2) as avg_points_per_game,
        (
          SELECT COUNT(*) 
          FROM game_participants gp 
          JOIN games g ON gp.game_id = g.id 
          WHERE gp.user_id = u.id AND gp.position <= 3 AND g.status = 'finished'
        ) as podium_finishes
      FROM users u
      WHERE u.id = ANY($1)
      ORDER BY u.total_points DESC
    `, [playerIds]);
    res.json(comparison);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao comparar jogadores' });
  }
});

// Ranking por categoria
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = {
      mostWins: `
        SELECT u.username, u.avatar, u.wins as value
        FROM users u
        WHERE u.games_played > 0
        ORDER BY u.wins DESC
        LIMIT 10
      `,
      bestWinRate: `
        SELECT 
          u.username, 
          u.avatar, 
          ROUND((COALESCE(u.wins,0)::numeric / NULLIF(u.games_played, 0)) * 100, 2) as value
        FROM users u
        WHERE u.games_played >= 5
        ORDER BY value DESC
        LIMIT 10
      `,
      mostGames: `
        SELECT u.username, u.avatar, u.games_played as value
        FROM users u
        WHERE u.games_played > 0
        ORDER BY u.games_played DESC
        LIMIT 10
      `,
      bestAverage: `
        SELECT 
          u.username, 
          u.avatar, 
          ROUND(COALESCE(u.total_points,0)::numeric / NULLIF(u.games_played, 0), 2) as value
        FROM users u
        WHERE u.games_played >= 3
        ORDER BY value DESC
        LIMIT 10
      `
    };
    const results = {};
    results.mostWins = await getMany(categories.mostWins);
    results.bestWinRate = await getMany(categories.bestWinRate);
    results.mostGames = await getMany(categories.mostGames);
    results.bestAverage = await getMany(categories.bestAverage);
    res.json(results);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

module.exports = router;
