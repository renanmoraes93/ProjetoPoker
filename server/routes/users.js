const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getOne, getMany } = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrSelf } = require('../middleware/auth');

const router = express.Router();

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getMany(`
      SELECT id, username, email, role, total_points, games_played, wins, 
             created_at, updated_at
      FROM users 
      ORDER BY total_points DESC
    `);
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Buscar usuário por ID
router.get('/:id', authenticateToken, requireAdminOrSelf, async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await getOne(`
      SELECT id, username, email, role, total_points, games_played, wins, 
             avatar, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
});

// Atualizar perfil do usuário
router.put('/:id', authenticateToken, requireAdminOrSelf, [
  body('username').optional().isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const userId = req.params.id;
  const { username, email, avatar } = req.body;
  const updateFields = [];
  const values = [];
  if (username) { updateFields.push(`username = $${values.length + 1}`); values.push(username); }
  if (email) { updateFields.push(`email = $${values.length + 1}`); values.push(email); }
  if (avatar) { updateFields.push(`avatar = $${values.length + 1}`); values.push(avatar); }
  updateFields.push('updated_at = NOW()');
  values.push(userId);
  if (updateFields.length === 1) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar' });
  }
  const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${values.length}`;
  try {
    const r = await query(sql, values);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (e) {
    if (String(e.message).includes('duplicate key value')) {
      return res.status(400).json({ message: 'Username ou email já existe' });
    }
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Alterar senha
router.put('/:id/password', authenticateToken, requireAdminOrSelf, [
  body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await getOne('SELECT password FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedNewPassword, userId]);
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Promover/rebaixar usuário (apenas admin)
router.put('/:id/role', authenticateToken, requireAdmin, [
  body('role').isIn(['player', 'admin']).withMessage('Role deve ser player ou admin')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const userId = req.params.id;
  const { role } = req.body;
  try {
    const r = await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json({ message: `Usuário ${role === 'admin' ? 'promovido a' : 'rebaixado para'} ${role}` });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar role' });
  }
});

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
  }
  try {
    const r = await query('DELETE FROM users WHERE id = $1', [userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
});

// Estatísticas do usuário
router.get('/:id/stats', authenticateToken, requireAdminOrSelf, async (req, res) => {
  const userId = req.params.id;
  try {
    const baseStats = await getOne(`
      SELECT total_points, games_played, wins FROM users WHERE id = $1
    `, [userId]);
    if (!baseStats) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const bh = await getOne(`SELECT COUNT(*) as count FROM best_hands WHERE user_id = $1`, [userId]);
    const gamesPlayed = baseStats.games_played || 0;
    const wins = baseStats.wins || 0;
    const totalPoints = baseStats.total_points || 0;
    res.json({
      total_points: totalPoints,
      games_played: gamesPlayed,
      games_won: wins,
      win_rate: gamesPlayed > 0 ? (wins / gamesPlayed) : 0,
      avg_points: gamesPlayed > 0 ? (totalPoints / gamesPlayed) : 0,
      best_hands_count: bh && bh.count ? parseInt(bh.count) : 0
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
