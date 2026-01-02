const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const db = database.getDb();

// Obter informações do clube
router.get('/info', authenticateToken, (req, res) => {
  db.all('SELECT * FROM club_settings', (err, settings) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar informações do clube' });
    }
    
    const clubInfo = {};
    settings.forEach(setting => {
      clubInfo[setting.setting_key] = setting.setting_value;
    });
    
    res.json(clubInfo);
  });
});

// Atualizar configurações do clube (apenas admin)
router.put('/settings', authenticateToken, requireAdmin, [
  body('club_name').optional().isLength({ min: 3 }).withMessage('Nome do clube deve ter pelo menos 3 caracteres'),
  body('club_description').optional().isLength({ max: 500 }).withMessage('Descrição muito longa'),
  body('default_buy_in').optional().isFloat({ min: 0 }).withMessage('Buy-in padrão inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const updates = req.body;
  const validSettings = ['club_name', 'club_description', 'points_system', 'default_buy_in'];
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let updateCount = 0;
    const totalUpdates = Object.keys(updates).filter(key => validSettings.includes(key)).length;
    
    if (totalUpdates === 0) {
      db.run('ROLLBACK');
      return res.status(400).json({ message: 'Nenhuma configuração válida para atualizar' });
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (validSettings.includes(key)) {
        db.run(
          'UPDATE club_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
          [value, key],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Erro ao atualizar configurações' });
            }
            
            updateCount++;
            if (updateCount === totalUpdates) {
              db.run('COMMIT', (err) => {
                if (err) {
                  return res.status(500).json({ message: 'Erro ao confirmar atualizações' });
                }
                
                res.json({ message: 'Configurações atualizadas com sucesso' });
              });
            }
          }
        );
      }
    });
  });
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
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Verificar se o usuário é administrador
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem registrar melhores mãos' });
  }

  const { game_id, user_id, hand_type, cards, description } = req.body;
  
  // Verificar se o usuário especificado participou do jogo
  db.get(
    'SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?',
    [game_id, user_id],
    (err, participant) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao verificar participação' });
      }
      
      if (!participant) {
        return res.status(403).json({ message: 'O usuário especificado não participou deste jogo' });
      }
      
      // Obter data do jogo
      db.get('SELECT date FROM games WHERE id = ?', [game_id], (err, game) => {
        if (err || !game) {
          return res.status(404).json({ message: 'Jogo não encontrado' });
        }
        
        db.run(
          'INSERT INTO best_hands (user_id, game_id, hand_type, cards, description, date) VALUES (?, ?, ?, ?, ?, ?)',
          [user_id, game_id, hand_type, cards, description, game.date],
          function(err) {
            if (err) {
              return res.status(500).json({ message: 'Erro ao registrar melhor mão' });
            }
            
            res.status(201).json({
              message: 'Melhor mão registrada com sucesso',
              id: this.lastID
            });
          }
        );
      });
    }
  );
});

// Editar melhor mão (apenas admin)
router.put('/best-hands/:id', authenticateToken, [
  body('hand_type').isIn([
    'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
    'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'
  ]).withMessage('Tipo de mão inválido'),
  body('cards').isLength({ min: 5, max: 20 }).withMessage('Cartas inválidas'),
  body('description').optional().isLength({ max: 200 }).withMessage('Descrição muito longa')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Verificar se o usuário é administrador
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem editar melhores mãos' });
  }

  const handId = req.params.id;
  const { hand_type, cards, description } = req.body;
  
  // Verificar se a mão existe
  db.get('SELECT * FROM best_hands WHERE id = ?', [handId], (err, hand) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar mão' });
    }
    
    if (!hand) {
      return res.status(404).json({ message: 'Mão não encontrada' });
    }
    
    db.run(
      'UPDATE best_hands SET hand_type = ?, cards = ?, description = ? WHERE id = ?',
      [hand_type, cards, description, handId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Erro ao atualizar mão' });
        }
        
        res.json({ message: 'Mão atualizada com sucesso' });
      }
    );
  });
});

// Listar melhores mãos
router.get('/best-hands', authenticateToken, (req, res) => {
  const { user_id, hand_type, limit = 50 } = req.query;
  
  let query = `
    SELECT 
      bh.*,
      u.username,
      u.avatar,
      g.name as game_name
    FROM best_hands bh
    JOIN users u ON bh.user_id = u.id
    JOIN games g ON bh.game_id = g.id
    WHERE 1=1
  `;
  
  let params = [];
  
  if (user_id) {
    query += ' AND bh.user_id = ?';
    params.push(user_id);
  }
  
  if (hand_type) {
    query += ' AND bh.hand_type = ?';
    params.push(hand_type);
  }
  
  query += `
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
  `;
  
  params.push(parseInt(limit));
  
  db.all(query, params, (err, bestHands) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar melhores mãos' });
    }
    
    res.json(bestHands);
  });
});

// Deletar melhor mão (apenas admin)
router.delete('/best-hands/:id', authenticateToken, (req, res) => {
  const handId = req.params.id;
  
  // Verificar se o usuário é administrador
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem deletar melhores mãos' });
  }
  
  // Verificar se a mão existe
  db.get('SELECT id FROM best_hands WHERE id = ?', [handId], (err, hand) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar mão' });
    }
    
    if (!hand) {
      return res.status(404).json({ message: 'Mão não encontrada' });
    }
    
    db.run('DELETE FROM best_hands WHERE id = ?', [handId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erro ao deletar mão' });
      }
      
      res.json({ message: 'Mão deletada com sucesso' });
    });
  });
});

// Estatísticas das mãos
router.get('/hand-stats', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      hand_type,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM best_hands)), 2) as percentage
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
  `, (err, stats) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
    
    res.json(stats);
  });
});

// Dashboard do clube
router.get('/dashboard', authenticateToken, (req, res) => {
  const queries = {
    // Próximos jogos
    upcomingGames: `
      SELECT g.*, COUNT(gp.id) as participants
      FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.status = 'scheduled' AND g.date >= date('now', 'localtime')
      GROUP BY g.id
      ORDER BY g.date ASC
      LIMIT 5
    `,
    
    // Jogos recentes
    recentGames: `
      SELECT g.*, COUNT(gp.id) as participants
      FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.status = 'finished'
      GROUP BY g.id
      ORDER BY g.date DESC
      LIMIT 5
    `,
    
    // Top 5 jogadores
    topPlayers: `
      SELECT username, avatar, total_points, wins, games_played
      FROM users
      WHERE games_played > 0
      ORDER BY total_points DESC
      LIMIT 5
    `,
    
    // Melhores mãos recentes
    recentBestHands: `
      SELECT bh.*, u.username, g.name as game_name
      FROM best_hands bh
      JOIN users u ON bh.user_id = u.id
      JOIN games g ON bh.game_id = g.id
      ORDER BY bh.date DESC
      LIMIT 5
    `,
    
    // Estatísticas gerais
    generalStats: `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE games_played > 0) as active_players,
        (SELECT COUNT(*) FROM games WHERE status = 'finished') as total_games,
        (SELECT COUNT(*) FROM games WHERE status = 'scheduled' AND date >= date('now', 'localtime')) as upcoming_games,
        (SELECT COALESCE(SUM(prize_pool), 0) FROM games WHERE status = 'finished') as total_prizes
    `
  };
  
  const dashboard = {};
  let completed = 0;
  const total = Object.keys(queries).length;
  
  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'generalStats') {
      db.get(query, (err, result) => {
        if (err) {
          console.error(`Erro na query ${key}:`, err);
          dashboard[key] = null;
        } else {
          dashboard[key] = result;
        }
        
        completed++;
        if (completed === total) {
          res.json(dashboard);
        }
      });
    } else {
      db.all(query, (err, result) => {
        if (err) {
          console.error(`Erro na query ${key}:`, err);
          dashboard[key] = [];
        } else {
          dashboard[key] = result;
        }
        
        completed++;
        if (completed === total) {
          res.json(dashboard);
        }
      });
    }
  });
});

module.exports = router;