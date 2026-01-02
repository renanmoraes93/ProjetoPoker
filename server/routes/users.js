const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrSelf } = require('../middleware/auth');

const router = express.Router();
const db = database.getDb();

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT id, username, email, role, total_points, games_played, wins, 
           created_at, updated_at
    FROM users 
    ORDER BY total_points DESC
  `, (err, users) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
    res.json(users);
  });
});

// Buscar usuário por ID
router.get('/:id', authenticateToken, requireAdminOrSelf, (req, res) => {
  const userId = req.params.id;
  
  db.get(`
    SELECT id, username, email, role, total_points, games_played, wins, 
           avatar, created_at, updated_at
    FROM users 
    WHERE id = ?
  `, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(user);
  });
});

// Atualizar perfil do usuário
router.put('/:id', authenticateToken, requireAdminOrSelf, [
  body('username').optional().isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.id;
  const { username, email, avatar } = req.body;
  
  let updateFields = [];
  let values = [];
  
  if (username) {
    updateFields.push('username = ?');
    values.push(username);
  }
  
  if (email) {
    updateFields.push('email = ?');
    values.push(email);
  }
  
  if (avatar) {
    updateFields.push('avatar = ?');
    values.push(avatar);
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  if (updateFields.length === 1) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar' });
  }
  
  const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Username ou email já existe' });
      }
      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json({ message: 'Usuário atualizado com sucesso' });
  });
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
    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Senha atual incorreta' });
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Erro ao atualizar senha' });
          }
          
          res.json({ message: 'Senha atualizada com sucesso' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Promover/rebaixar usuário (apenas admin)
router.put('/:id/role', authenticateToken, requireAdmin, [
  body('role').isIn(['player', 'admin']).withMessage('Role deve ser player ou admin')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.id;
  const { role } = req.body;
  
  db.run(
    'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [role, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erro ao atualizar role' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      res.json({ message: `Usuário ${role === 'admin' ? 'promovido a' : 'rebaixado para'} ${role}` });
    }
  );
});

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
  }
  
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Erro ao deletar usuário' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json({ message: 'Usuário deletado com sucesso' });
  });
});

// Estatísticas do usuário
router.get('/:id/stats', authenticateToken, requireAdminOrSelf, (req, res) => {
  const userId = req.params.id;
  
  const queries = {
    base: `
      SELECT 
        total_points, 
        games_played, 
        wins
      FROM users
      WHERE id = ?
    `,
    bestHands: `
      SELECT COUNT(*) as count
      FROM best_hands
      WHERE user_id = ?
    `
  };
  
  db.get(queries.base, [userId], (err, baseStats) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
    if (!baseStats) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    db.get(queries.bestHands, [userId], (err2, bh) => {
      if (err2) {
        return res.status(500).json({ message: 'Erro ao buscar estatísticas de mãos' });
      }
      
      const gamesPlayed = baseStats.games_played || 0;
      const wins = baseStats.wins || 0;
      const totalPoints = baseStats.total_points || 0;
      res.json({
        total_points: totalPoints,
        games_played: gamesPlayed,
        games_won: wins,
        win_rate: gamesPlayed > 0 ? (wins / gamesPlayed) : 0,
        avg_points: gamesPlayed > 0 ? (totalPoints / gamesPlayed) : 0,
        best_hands_count: bh?.count || 0
      });
    });
  });
});

module.exports = router;
