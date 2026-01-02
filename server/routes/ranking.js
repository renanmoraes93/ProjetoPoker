const express = require('express');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = database.getDb();

// Ranking geral de pontuação
router.get('/', authenticateToken, (req, res) => {
  const { limit = 50, period } = req.query;
  
  let query = `
    SELECT 
      u.id,
      u.username,
      u.avatar,
      u.total_points,
      u.games_played,
      u.wins,
      ROUND((CAST(u.wins AS FLOAT) / NULLIF(u.games_played, 0)) * 100, 2) as win_rate,
      ROUND(CAST(u.total_points AS FLOAT) / NULLIF(u.games_played, 0), 2) as avg_points_per_game
    FROM users u
    WHERE u.games_played > 0
  `;
  
  let params = [];
  
  // Filtro por período se especificado
  if (period) {
    let dateFilter = '';
    switch(period) {
      case 'week':
        dateFilter = "AND g.date >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND g.date >= date('now', '-1 month')";
        break;
      case 'year':
        dateFilter = "AND g.date >= date('now', '-1 year')";
        break;
    }
    
    if (dateFilter) {
      query = `
        SELECT 
          u.id,
          u.username,
          u.avatar,
          COALESCE(SUM(gp.points_earned), 0) as total_points,
          COUNT(DISTINCT g.id) as games_played,
          SUM(CASE WHEN gp.position = 1 THEN 1 ELSE 0 END) as wins,
          ROUND((CAST(SUM(CASE WHEN gp.position = 1 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(DISTINCT g.id), 0)) * 100, 2) as win_rate,
          ROUND(CAST(COALESCE(SUM(gp.points_earned), 0) AS FLOAT) / NULLIF(COUNT(DISTINCT g.id), 0), 2) as avg_points_per_game
        FROM users u
        LEFT JOIN game_participants gp ON u.id = gp.user_id
        LEFT JOIN games g ON gp.game_id = g.id
        WHERE g.status = 'finished' ${dateFilter}
        GROUP BY u.id, u.username, u.avatar
        HAVING games_played > 0
      `;
    }
  }
  
  query += ' ORDER BY total_points DESC, win_rate DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, ranking) => {
    if (err) {
      console.error('Erro no ranking:', err);
      return res.status(500).json({ message: 'Erro ao buscar ranking' });
    }
    
    // Adicionar posição no ranking
    const rankingWithPosition = ranking.map((player, index) => ({
      ...player,
      position: index + 1
    }));
    
    res.json(rankingWithPosition);
  });
});

// Ranking de melhores mãos
router.get('/best-hands', authenticateToken, (req, res) => {
  const { limit = 20 } = req.query;
  
  const handRanking = {
    'Royal Flush': 10,
    'Straight Flush': 9,
    'Four of a Kind': 8,
    'Full House': 7,
    'Flush': 6,
    'Straight': 5,
    'Three of a Kind': 4,
    'Two Pair': 3,
    'One Pair': 2,
    'High Card': 1
  };
  
  db.all(`
    SELECT 
      bh.*,
      u.username,
      u.avatar,
      g.name as game_name
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
    LIMIT ?
  `, [parseInt(limit)], (err, bestHands) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar melhores mãos' });
    }
    
    res.json(bestHands);
  });
});

// Estatísticas gerais do clube
router.get('/stats', authenticateToken, (req, res) => {
  const queries = {
    totalPlayers: 'SELECT COUNT(*) as count FROM users WHERE games_played > 0',
    totalGames: 'SELECT COUNT(*) as count FROM games WHERE status = "finished"',
    totalPrizePool: 'SELECT COALESCE(SUM(prize_pool), 0) as total FROM games WHERE status = "finished"',
    avgPlayersPerGame: `
      SELECT ROUND(AVG(participants_count), 2) as avg
      FROM (
        SELECT COUNT(*) as participants_count
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.id
        WHERE g.status = 'finished'
        GROUP BY g.id
      )
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
      WHERE date >= date('now', '-30 days')
    `
  };
  
  const stats = {};
  let completed = 0;
  const total = Object.keys(queries).length;
  
  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, (err, result) => {
      if (err) {
        console.error(`Erro na query ${key}:`, err);
        stats[key] = null;
      } else {
        stats[key] = result;
      }
      
      completed++;
      if (completed === total) {
        res.json(stats);
      }
    });
  });
});

// Histórico de performance de um jogador
router.get('/player/:id/history', authenticateToken, (req, res) => {
  const playerId = req.params.id;
  const { limit = 20 } = req.query;
  
  db.all(`
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
    WHERE gp.user_id = ? AND g.status = 'finished'
    GROUP BY g.id, gp.id
    ORDER BY g.date DESC
    LIMIT ?
  `, [playerId, parseInt(limit)], (err, history) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar histórico' });
    }
    
    res.json(history);
  });
});

// Comparação entre jogadores
router.get('/compare', authenticateToken, (req, res) => {
  const { players } = req.query; // Array de IDs separados por vírgula
  
  if (!players) {
    return res.status(400).json({ message: 'IDs dos jogadores são obrigatórios' });
  }
  
  const playerIds = players.split(',').map(id => parseInt(id));
  
  if (playerIds.length < 2 || playerIds.length > 5) {
    return res.status(400).json({ message: 'Compare entre 2 e 5 jogadores' });
  }
  
  const placeholders = playerIds.map(() => '?').join(',');
  
  db.all(`
    SELECT 
      u.id,
      u.username,
      u.avatar,
      u.total_points,
      u.games_played,
      u.wins,
      ROUND((CAST(u.wins AS FLOAT) / NULLIF(u.games_played, 0)) * 100, 2) as win_rate,
      ROUND(CAST(u.total_points AS FLOAT) / NULLIF(u.games_played, 0), 2) as avg_points_per_game,
      (
        SELECT COUNT(*) 
        FROM game_participants gp 
        JOIN games g ON gp.game_id = g.id 
        WHERE gp.user_id = u.id AND gp.position <= 3 AND g.status = 'finished'
      ) as podium_finishes
    FROM users u
    WHERE u.id IN (${placeholders})
    ORDER BY u.total_points DESC
  `, playerIds, (err, comparison) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao comparar jogadores' });
    }
    
    res.json(comparison);
  });
});

// Ranking por categoria
router.get('/categories', authenticateToken, (req, res) => {
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
        ROUND((CAST(u.wins AS FLOAT) / NULLIF(u.games_played, 0)) * 100, 2) as value
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
        ROUND(CAST(u.total_points AS FLOAT) / NULLIF(u.games_played, 0), 2) as value
      FROM users u
      WHERE u.games_played >= 3
      ORDER BY value DESC
      LIMIT 10
    `
  };
  
  const results = {};
  let completed = 0;
  const total = Object.keys(categories).length;
  
  Object.entries(categories).forEach(([category, query]) => {
    db.all(query, (err, data) => {
      if (err) {
        console.error(`Erro na categoria ${category}:`, err);
        results[category] = [];
      } else {
        results[category] = data;
      }
      
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

module.exports = router;