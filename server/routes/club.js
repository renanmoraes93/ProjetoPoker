const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getOne, getMany, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obter informações do clube
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const settings = await getMany('SELECT * FROM club_settings');
    const clubInfo = {};
    for (const setting of settings) {
      clubInfo[setting.setting_key] = setting.setting_value;
    }
    res.json(clubInfo);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar informações do clube' });
  }
});

// Atualizar configurações do clube (apenas admin)
router.put('/settings', authenticateToken, requireAdmin, [
  body('club_name').optional().isLength({ min: 3 }).withMessage('Nome do clube deve ter pelo menos 3 caracteres'),
  body('club_description').optional().isLength({ max: 500 }).withMessage('Descrição muito longa'),
  body('default_buy_in').optional().isFloat({ min: 0 }).withMessage('Buy-in padrão inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const updates = req.body;
  const validSettings = ['club_name', 'club_description', 'points_system', 'default_buy_in'];
  try {
    const keys = Object.keys(updates).filter((k) => validSettings.includes(k));
    if (keys.length === 0) {
      return res.status(400).json({ message: 'Nenhuma configuração válida para atualizar' });
    }
    await transaction(async (client) => {
      for (const key of keys) {
        await client.query('UPDATE club_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = $2', [updates[key], key]);
      }
    });
    res.json({ message: 'Configurações atualizadas com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
});

// Registrar melhor mão (apenas admin)
router.post('/best-hands', authenticateToken, [
  body('game_id').isInt().withMessage('ID do jogo inválido'),
  body('user_id').isInt().withMessage('ID do usuário inválido'),
  body('hand_type').isIn([
    'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
    'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'
  ]).withMessage('Tipo de mão inválido'),
  body('cards').isLength({ min: 5, max: 20 }).withMessage('Cartas inválidas'),
  body('description').optional().isLength({ max: 200 }).withMessage('Descrição muito longa')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem registrar melhores mãos' });
  }
  const { game_id, user_id, hand_type, cards, description } = req.body;
  try {
    const participant = await getOne('SELECT * FROM game_participants WHERE game_id = $1 AND user_id = $2', [game_id, user_id]);
    if (!participant) {
      return res.status(403).json({ message: 'O usuário especificado não participou deste jogo' });
    }
    const game = await getOne('SELECT date FROM games WHERE id = $1', [game_id]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    const r = await query(
      'INSERT INTO best_hands (user_id, game_id, hand_type, cards, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [user_id, game_id, hand_type, cards, description, game.date]
    );
    res.status(201).json({ message: 'Melhor mão registrada com sucesso', id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao registrar melhor mão' });
  }
});

// Editar melhor mão (apenas admin)
router.put('/best-hands/:id', authenticateToken, [
  body('hand_type').isIn([
    'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
    'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'
  ]).withMessage('Tipo de mão inválido'),
  body('cards').isLength({ min: 5, max: 20 }).withMessage('Cartas inválidas'),
  body('description').optional().isLength({ max: 200 }).withMessage('Descrição muito longa')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem editar melhores mãos' });
  }
  const handId = req.params.id;
  const { hand_type, cards, description } = req.body;
  try {
    const hand = await getOne('SELECT * FROM best_hands WHERE id = $1', [handId]);
    if (!hand) {
      return res.status(404).json({ message: 'Mão não encontrada' });
    }
    await query('UPDATE best_hands SET hand_type = $1, cards = $2, description = $3 WHERE id = $4', [hand_type, cards, description, handId]);
    res.json({ message: 'Mão atualizada com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar mão' });
  }
});

// Listar melhores mãos
router.get('/best-hands', authenticateToken, async (req, res) => {
  try {
    const { user_id, hand_type, limit = 50 } = req.query;
    let sql = `SELECT bh.*, u.username, u.avatar, g.name as game_name FROM best_hands bh JOIN users u ON bh.user_id = u.id JOIN games g ON bh.game_id = g.id WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ` AND bh.user_id = $${params.length + 1}`; params.push(user_id); }
    if (hand_type) { sql += ` AND bh.hand_type = $${params.length + 1}`; params.push(hand_type); }
    sql += ` ORDER BY CASE bh.hand_type WHEN 'Royal Flush' THEN 10 WHEN 'Straight Flush' THEN 9 WHEN 'Four of a Kind' THEN 8 WHEN 'Full House' THEN 7 WHEN 'Flush' THEN 6 WHEN 'Straight' THEN 5 WHEN 'Three of a Kind' THEN 4 WHEN 'Two Pair' THEN 3 WHEN 'One Pair' THEN 2 ELSE 1 END DESC, bh.date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const bestHands = await getMany(sql, params);
    res.json(bestHands);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar melhores mãos' });
  }
});

// Deletar melhor mão (apenas admin)
router.delete('/best-hands/:id', authenticateToken, async (req, res) => {
  const handId = req.params.id;
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem deletar melhores mãos' });
  }
  try {
    const hand = await getOne('SELECT id FROM best_hands WHERE id = $1', [handId]);
    if (!hand) {
      return res.status(404).json({ message: 'Mão não encontrada' });
    }
    await query('DELETE FROM best_hands WHERE id = $1', [handId]);
    res.json({ message: 'Mão deletada com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao deletar mão' });
  }
});

// Estatísticas das mãos
router.get('/hand-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getMany(`
      SELECT 
        hand_type,
        COUNT(*) as count,
        ROUND((COUNT(*)::numeric * 100.0 / NULLIF((SELECT COUNT(*) FROM best_hands), 0)), 2) as percentage
      FROM best_hands
      GROUP BY hand_type
      ORDER BY 
        CASE hand_type
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
        END DESC
    `);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Dashboard do clube
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const queries = {
      upcomingGames: `
        SELECT g.*, COUNT(gp.id) as participants
        FROM games g
        LEFT JOIN game_participants gp ON g.id = gp.game_id
        WHERE g.status = 'scheduled' AND g.date >= CURRENT_DATE
        GROUP BY g.id
        ORDER BY g.date ASC
        LIMIT 5
      `,
      recentGames: `
        SELECT g.*, COUNT(gp.id) as participants
        FROM games g
        LEFT JOIN game_participants gp ON g.id = gp.game_id
        WHERE g.status = 'finished'
        GROUP BY g.id
        ORDER BY g.date DESC
        LIMIT 5
      `,
      topPlayers: `
        SELECT username, avatar, total_points, wins, games_played
        FROM users
        WHERE games_played > 0
        ORDER BY total_points DESC
        LIMIT 5
      `,
      recentBestHands: `
        SELECT bh.*, u.username, g.name as game_name
        FROM best_hands bh
        JOIN users u ON bh.user_id = u.id
        JOIN games g ON bh.game_id = g.id
        ORDER BY bh.date DESC
        LIMIT 5
      `,
      generalStats: `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE games_played > 0) as active_players,
          (SELECT COUNT(*) FROM games WHERE status = 'finished') as total_games,
          (SELECT COUNT(*) FROM games WHERE status = 'scheduled' AND date >= CURRENT_DATE) as upcoming_games,
          (SELECT COALESCE(SUM(prize_pool), 0) FROM games WHERE status = 'finished') as total_prizes
      `
    };
    const dashboard = {};
    dashboard.upcomingGames = await getMany(queries.upcomingGames);
    dashboard.recentGames = await getMany(queries.recentGames);
    dashboard.topPlayers = await getMany(queries.topPlayers);
    dashboard.recentBestHands = await getMany(queries.recentBestHands);
    dashboard.generalStats = await getOne(queries.generalStats);
    res.json(dashboard);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar dashboard' });
  }
});

module.exports = router;
