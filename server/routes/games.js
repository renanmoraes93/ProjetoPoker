const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getOne, getMany, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar todos os jogos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let sql = `SELECT g.*, u.username as created_by_username FROM games g LEFT JOIN users u ON g.created_by = u.id`;
    const params = [];
    if (status) {
      sql += ' WHERE g.status = $1';
      params.push(status);
    }
    sql += ` ORDER BY g.date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const games = await getMany(sql, params);
    if (games.length === 0) {
      return res.json([]);
    }
    const gamesWithParticipants = await Promise.all(games.map(async (game) => {
      let participants = [];
      try {
        participants = await getMany(
          `SELECT gp.*, u.username, u.avatar FROM game_participants gp JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1 ORDER BY gp.position ASC, gp.joined_at ASC`,
          [game.id]
        );
      } catch (_) {}
      return { ...game, participants, participants_count: participants.length };
    }));
    res.json(gamesWithParticipants);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar jogos' });
  }
});

// Buscar jogo por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await getOne(`SELECT g.*, u.username as created_by_username FROM games g LEFT JOIN users u ON g.created_by = u.id WHERE g.id = $1`, [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    const participants = await getMany(`SELECT gp.*, u.username, u.avatar FROM game_participants gp JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1 ORDER BY gp.position ASC, gp.joined_at ASC`, [gameId]);
    res.json({ ...game, participants });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar jogo' });
  }
});

// Criar novo jogo (apenas admin)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('Nome do jogo é obrigatório'),
  body('date').isISO8601().withMessage('Data inválida'),
  body('buy_in').isFloat({ min: 0 }).withMessage('Buy-in deve ser um valor positivo'),
  body('rebuy_value').optional().isFloat({ min: 0 }).withMessage('Valor do Rebuy inválido'),
  body('addon_value').optional().isFloat({ min: 0 }).withMessage('Valor do Add-on inválido'),
  body('max_players').optional().isInt({ min: 2, max: 10 }).withMessage('Máximo de jogadores deve ser entre 2 e 10')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, date, buy_in, rebuy_value = 0, addon_value = 0, max_players = 9 } = req.body;
  try {
    const result = await query(
      'INSERT INTO games (name, date, buy_in, rebuy_value, addon_value, max_players, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, date, buy_in, rebuy_value, addon_value, max_players, req.user.id]
    );
    res.status(201).json({ message: 'Jogo criado com sucesso', gameId: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar jogo' });
  }
});

// Participar de um jogo
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    const game = await getOne('SELECT * FROM games WHERE id = $1', [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    if (game.status !== 'scheduled') {
      return res.status(400).json({ message: 'Jogo não está aberto para inscrições' });
    }
    const participant = await getOne('SELECT * FROM game_participants WHERE game_id = $1 AND user_id = $2', [gameId, userId]);
    if (participant) {
      return res.status(400).json({ message: 'Você já está participando deste jogo' });
    }
    const countRes = await getOne('SELECT COUNT(*)::int as count FROM game_participants WHERE game_id = $1', [gameId]);
    if (countRes.count >= game.max_players) {
      return res.status(400).json({ message: 'Jogo lotado' });
    }
    await query('INSERT INTO game_participants (game_id, user_id) VALUES ($1, $2)', [gameId, userId]);
    res.json({ message: 'Participação confirmada!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao participar do jogo' });
  }
});

// Sair de um jogo
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    const game = await getOne('SELECT status FROM games WHERE id = $1', [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    if (game.status !== 'scheduled') {
      return res.status(400).json({ message: 'Não é possível sair de um jogo já iniciado' });
    }
    const delRes = await query('DELETE FROM game_participants WHERE game_id = $1 AND user_id = $2', [gameId, userId]);
    if (delRes.rowCount === 0) {
      return res.status(400).json({ message: 'Você não está participando deste jogo' });
    }
    res.json({ message: 'Você saiu do jogo' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao sair do jogo' });
  }
});

// Finalizar jogo e registrar resultados (apenas admin)
router.put('/:id/finish', authenticateToken, requireAdmin, [
  body('results').isArray().withMessage('Resultados devem ser um array'),
  body('results.*.user_id').isInt().withMessage('ID do usuário inválido'),
  body('results.*.position').isInt({ min: 1 }).withMessage('Posição inválida'),
  body('results.*.points_earned').optional().isInt({ min: 0 }).withMessage('Pontos inválidos'),
  body('results.*.prize_amount').optional().isFloat({ min: 0 }).withMessage('Prêmio inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const gameId = req.params.id;
  const { results, prize_pool } = req.body;
  try {
    await transaction(async (client) => {
      await client.query('UPDATE games SET status = $1, prize_pool = $2 WHERE id = $3', ['finished', prize_pool || 0, gameId]);
      for (const result of results) {
        const points = result.points_earned || (11 - result.position) * 10;
        await client.query(
          `UPDATE game_participants SET position = $1, points_earned = $2, prize_amount = $3 WHERE game_id = $4 AND user_id = $5`,
          [result.position, points, result.prize_amount || 0, gameId, result.user_id]
        );
        await client.query(
          `UPDATE users SET total_points = total_points + $1, games_played = games_played + 1, wins = wins + $2 WHERE id = $3`,
          [points, result.position === 1 ? 1 : 0, result.user_id]
        );
      }
    });
    res.json({ message: 'Jogo finalizado com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao finalizar jogo' });
  }
});

// Atualizar jogo (apenas admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const gameId = req.params.id;
  const { name, date, buy_in, rebuy_value, addon_value, max_players, status } = req.body;
  const updateFields = [];
  const values = [];
  if (name) { updateFields.push(`name = $${values.length + 1}`); values.push(name); }
  if (date) { updateFields.push(`date = $${values.length + 1}`); values.push(date); }
  if (buy_in !== undefined) { updateFields.push(`buy_in = $${values.length + 1}`); values.push(buy_in); }
  if (rebuy_value !== undefined) { updateFields.push(`rebuy_value = $${values.length + 1}`); values.push(rebuy_value); }
  if (addon_value !== undefined) { updateFields.push(`addon_value = $${values.length + 1}`); values.push(addon_value); }
  if (max_players) { updateFields.push(`max_players = $${values.length + 1}`); values.push(max_players); }
  if (status) { updateFields.push(`status = $${values.length + 1}`); values.push(status); }
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar' });
  }
  values.push(gameId);
  const sql = `UPDATE games SET ${updateFields.join(', ')} WHERE id = $${values.length}`;
  try {
    const r = await query(sql, values);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    res.json({ message: 'Jogo atualizado com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar jogo' });
  }
});

// Deletar jogo (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const gameId = req.params.id;
  try {
    await transaction(async (client) => {
      await client.query('DELETE FROM game_participants WHERE game_id = $1', [gameId]);
      const r = await client.query('DELETE FROM games WHERE id = $1', [gameId]);
      if (r.rowCount === 0) {
        throw new Error('not_found');
      }
    });
    res.json({ message: 'Jogo deletado com sucesso' });
  } catch (e) {
    if (e.message === 'not_found') {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    res.status(500).json({ message: 'Erro ao deletar jogo' });
  }
});

// Adicionar participante (Admin apenas)
router.post('/:id/participants', authenticateToken, requireAdmin, [
  body('user_id').isInt().withMessage('ID do usuário inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const gameId = req.params.id;
  const { user_id } = req.body;
  try {
    const game = await getOne('SELECT * FROM games WHERE id = $1', [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    const user = await getOne('SELECT * FROM users WHERE id = $1', [user_id]);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const participant = await getOne('SELECT * FROM game_participants WHERE game_id = $1 AND user_id = $2', [gameId, user_id]);
    if (participant) {
      return res.status(400).json({ message: 'Usuário já está participando deste jogo' });
    }
    const countRes = await getOne('SELECT COUNT(*)::int as count FROM game_participants WHERE game_id = $1', [gameId]);
    if (countRes.count >= game.max_players) {
      return res.status(400).json({ message: 'Jogo lotado' });
    }
    await query('INSERT INTO game_participants (game_id, user_id) VALUES ($1, $2)', [gameId, user_id]);
    res.json({ message: 'Participante adicionado com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao adicionar participante' });
  }
});

// Remover participante (Admin apenas)
router.delete('/:id/participants/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.params.userId;
    const game = await getOne('SELECT * FROM games WHERE id = $1', [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    if (game.status === 'finished') {
      return res.status(400).json({ message: 'Não é possível remover participantes de um jogo finalizado' });
    }
    const r = await query('DELETE FROM game_participants WHERE game_id = $1 AND user_id = $2', [gameId, userId]);
    if (r.rowCount === 0) {
      return res.status(400).json({ message: 'Participante não encontrado neste jogo' });
    }
    res.json({ message: 'Participante removido com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao remover participante' });
  }
});

// Atualizar posições finais (Admin apenas)
router.put('/:id/positions', authenticateToken, requireAdmin, [
  body('positions').isArray().withMessage('Posições devem ser um array'),
  body('positions.*.user_id').isInt().withMessage('ID do usuário inválido'),
  body('positions.*.position').isInt({ min: 1 }).withMessage('Posição inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const gameId = req.params.id;
  const { positions } = req.body;
  try {
    const game = await getOne('SELECT * FROM games WHERE id = $1', [gameId]);
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    if (game.status !== 'finished') {
      return res.status(400).json({ message: 'Só é possível atualizar posições de jogos finalizados' });
    }
    await transaction(async (client) => {
      for (const pos of positions) {
        const points = (11 - pos.position) * 10;
        await client.query(
          `UPDATE game_participants SET position = $1, points_earned = $2 WHERE game_id = $3 AND user_id = $4`,
          [pos.position, points, gameId, pos.user_id]
        );
      }
    });
    res.json({ message: 'Posições atualizadas com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar posições' });
  }
});

  // Atualizar participante (Admin apenas) - Rebuys e Add-ons
  router.put('/:id/participants/:userId', authenticateToken, requireAdmin, async (req, res) => {
    const gameId = req.params.id;
    const userId = req.params.userId;
    let rebuys = req.body.rebuys;
    let addons = req.body.addons;
    if (rebuys !== undefined && rebuys !== null) {
      rebuys = parseInt(rebuys, 10);
    }
    if (addons !== undefined && addons !== null) {
      addons = parseInt(addons, 10);
    }
    const updateFields = [];
    const values = [];
    if (rebuys !== undefined && rebuys !== null && !isNaN(rebuys) && rebuys >= 0) {
      updateFields.push(`rebuys = $${values.length + 1}`);
      values.push(rebuys);
    }
    if (addons !== undefined && addons !== null && !isNaN(addons) && addons >= 0) {
      updateFields.push(`addons = $${values.length + 1}`);
      values.push(addons);
    }
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar. Verifique os dados enviados.', received: req.body });
    }
    values.push(gameId);
    values.push(userId);
    const sql = `UPDATE game_participants SET ${updateFields.join(', ')} WHERE game_id = $${values.length - 1} AND user_id = $${values.length}`;
    try {
      const r = await query(sql, values);
      if (r.rowCount === 0) {
        return res.status(404).json({ message: 'Participante não encontrado neste jogo' });
      }
      res.json({ message: 'Participante atualizado com sucesso' });
    } catch (e) {
      res.status(500).json({ message: 'Erro ao atualizar participante: ' + e.message });
    }
  });

module.exports = router;
