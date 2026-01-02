const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const db = database.getDb();

// Listar todos os jogos
router.get('/', authenticateToken, (req, res) => {
  const { status, limit = 50 } = req.query;
  
  let query = `
    SELECT g.*, u.username as created_by_username
    FROM games g
    LEFT JOIN users u ON g.created_by = u.id
  `;
  
  let params = [];
  
  if (status) {
    query += ' WHERE g.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY g.date DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, games) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar jogos' });
    }
    
    // Buscar participantes para cada jogo
    const gamesWithParticipants = [];
    let completed = 0;
    
    if (games.length === 0) {
      return res.json([]);
    }
    
    games.forEach((game, index) => {
      db.all(`
        SELECT gp.*, u.username, u.avatar
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = ?
        ORDER BY gp.position ASC, gp.joined_at ASC
      `, [game.id], (err, participants) => {
        if (err) {
          participants = [];
        }
        
        gamesWithParticipants[index] = {
          ...game,
          participants,
          participants_count: participants.length
        };
        
        completed++;
        if (completed === games.length) {
          res.json(gamesWithParticipants);
        }
      });
    });
  });
});

// Buscar jogo por ID
router.get('/:id', authenticateToken, (req, res) => {
  const gameId = req.params.id;
  
  db.get(`
    SELECT g.*, u.username as created_by_username
    FROM games g
    LEFT JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `, [gameId], (err, game) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar jogo' });
    }
    
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    
    // Buscar participantes
    db.all(`
      SELECT gp.*, u.username, u.avatar
      FROM game_participants gp
      JOIN users u ON gp.user_id = u.id
      WHERE gp.game_id = ?
      ORDER BY gp.position ASC, gp.joined_at ASC
    `, [gameId], (err, participants) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao buscar participantes' });
      }
      
      res.json({
        ...game,
        participants
      });
    });
  });
});

// Criar novo jogo (apenas admin)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('Nome do jogo é obrigatório'),
  body('date').isISO8601().withMessage('Data inválida'),
  body('buy_in').isFloat({ min: 0 }).withMessage('Buy-in deve ser um valor positivo'),
  body('rebuy_value').optional().isFloat({ min: 0 }).withMessage('Valor do Rebuy inválido'),
  body('addon_value').optional().isFloat({ min: 0 }).withMessage('Valor do Add-on inválido'),
  body('max_players').optional().isInt({ min: 2, max: 10 }).withMessage('Máximo de jogadores deve ser entre 2 e 10')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, date, buy_in, rebuy_value = 0, addon_value = 0, max_players = 9 } = req.body;
  
  db.run(
    'INSERT INTO games (name, date, buy_in, rebuy_value, addon_value, max_players, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, date, buy_in, rebuy_value, addon_value, max_players, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erro ao criar jogo' });
      }
      
      res.status(201).json({
        message: 'Jogo criado com sucesso',
        gameId: this.lastID
      });
    }
  );
});

// Participar de um jogo
router.post('/:id/join', authenticateToken, (req, res) => {
  const gameId = req.params.id;
  const userId = req.user.id;
  
  // Verificar se o jogo existe e está aberto
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar jogo' });
    }
    
    if (!game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    
    if (game.status !== 'scheduled') {
      return res.status(400).json({ message: 'Jogo não está aberto para inscrições' });
    }
    
    // Verificar se já está participando
    db.get(
      'SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?',
      [gameId, userId],
      (err, participant) => {
        if (err) {
          return res.status(500).json({ message: 'Erro ao verificar participação' });
        }
        
        if (participant) {
          return res.status(400).json({ message: 'Você já está participando deste jogo' });
        }
        
        // Verificar limite de jogadores
        db.get(
          'SELECT COUNT(*) as count FROM game_participants WHERE game_id = ?',
          [gameId],
          (err, result) => {
            if (err) {
              return res.status(500).json({ message: 'Erro ao verificar vagas' });
            }
            
            if (result.count >= game.max_players) {
              return res.status(400).json({ message: 'Jogo lotado' });
            }
            
            // Adicionar participante
            db.run(
              'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
              [gameId, userId],
              function(err) {
                if (err) {
                  return res.status(500).json({ message: 'Erro ao participar do jogo' });
                }
                
                res.json({ message: 'Participação confirmada!' });
              }
            );
          }
        );
      }
    );
  });
});

// Sair de um jogo
router.delete('/:id/leave', authenticateToken, (req, res) => {
  const gameId = req.params.id;
  const userId = req.user.id;
  
  // Verificar se o jogo ainda está aberto
  db.get('SELECT status FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err || !game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    
    if (game.status !== 'scheduled') {
      return res.status(400).json({ message: 'Não é possível sair de um jogo já iniciado' });
    }
    
    db.run(
      'DELETE FROM game_participants WHERE game_id = ? AND user_id = ?',
      [gameId, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Erro ao sair do jogo' });
        }
        
        if (this.changes === 0) {
          return res.status(400).json({ message: 'Você não está participando deste jogo' });
        }
        
        res.json({ message: 'Você saiu do jogo' });
      }
    );
  });
});

// Finalizar jogo e registrar resultados (apenas admin)
router.put('/:id/finish', authenticateToken, requireAdmin, [
  body('results').isArray().withMessage('Resultados devem ser um array'),
  body('results.*.user_id').isInt().withMessage('ID do usuário inválido'),
  body('results.*.position').isInt({ min: 1 }).withMessage('Posição inválida'),
  body('results.*.points_earned').optional().isInt({ min: 0 }).withMessage('Pontos inválidos'),
  body('results.*.prize_amount').optional().isFloat({ min: 0 }).withMessage('Prêmio inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const gameId = req.params.id;
  const { results, prize_pool } = req.body;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Atualizar status do jogo
    db.run(
      'UPDATE games SET status = ?, prize_pool = ? WHERE id = ?',
      ['finished', prize_pool || 0, gameId]
    );
    
    // Atualizar resultados dos participantes
    results.forEach(result => {
      const points = result.points_earned || (11 - result.position) * 10; // Sistema de pontos padrão
      
      db.run(
        `UPDATE game_participants 
         SET position = ?, points_earned = ?, prize_amount = ?
         WHERE game_id = ? AND user_id = ?`,
        [result.position, points, result.prize_amount || 0, gameId, result.user_id]
      );
      
      // Atualizar estatísticas do usuário
      db.run(
        `UPDATE users 
         SET total_points = total_points + ?, 
             games_played = games_played + 1,
             wins = wins + ?
         WHERE id = ?`,
        [points, result.position === 1 ? 1 : 0, result.user_id]
      );
    });
    
    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao finalizar jogo' });
      }
      
      res.json({ message: 'Jogo finalizado com sucesso!' });
    });
  });
});

// Atualizar jogo (apenas admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const gameId = req.params.id;
  const { name, date, buy_in, rebuy_value, addon_value, max_players, status } = req.body;
  
  let updateFields = [];
  let values = [];
  
  if (name) {
    updateFields.push('name = ?');
    values.push(name);
  }
  
  if (date) {
    updateFields.push('date = ?');
    values.push(date);
  }
  
  if (buy_in !== undefined) {
    updateFields.push('buy_in = ?');
    values.push(buy_in);
  }

  if (rebuy_value !== undefined) {
    updateFields.push('rebuy_value = ?');
    values.push(rebuy_value);
  }

  if (addon_value !== undefined) {
    updateFields.push('addon_value = ?');
    values.push(addon_value);
  }
  
  if (max_players) {
    updateFields.push('max_players = ?');
    values.push(max_players);
  }
  
  if (status) {
    updateFields.push('status = ?');
    values.push(status);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar' });
  }
  
  values.push(gameId);
  
  const query = `UPDATE games SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err) {
    if (err) {
      return res.status(500).json({ message: 'Erro ao atualizar jogo' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }
    
    res.json({ message: 'Jogo atualizado com sucesso' });
  });
});

// Deletar jogo (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const gameId = req.params.id;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Deletar participantes primeiro
    db.run('DELETE FROM game_participants WHERE game_id = ?', [gameId]);
    
    // Deletar o jogo
    db.run('DELETE FROM games WHERE id = ?', [gameId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao deletar jogo' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ message: 'Jogo não encontrado' });
      }
      
      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ message: 'Erro ao confirmar deleção' });
        }
        
        res.json({ message: 'Jogo deletado com sucesso' });
      });
    });
  });
});

// Adicionar participante (Admin apenas)
router.post('/:id/participants', authenticateToken, requireAdmin, [
  body('user_id').isInt().withMessage('ID do usuário inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const gameId = req.params.id;
  const { user_id } = req.body;

  // Verificar se o jogo existe
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err || !game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }

    // Verificar se o usuário existe
    db.get('SELECT * FROM users WHERE id = ?', [user_id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      // Verificar se já está participando
      db.get(
        'SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?',
        [gameId, user_id],
        (err, participant) => {
          if (err) {
            return res.status(500).json({ message: 'Erro ao verificar participação' });
          }

          if (participant) {
            return res.status(400).json({ message: 'Usuário já está participando deste jogo' });
          }

          // Verificar limite de jogadores
          db.get(
            'SELECT COUNT(*) as count FROM game_participants WHERE game_id = ?',
            [gameId],
            (err, result) => {
              if (err) {
                return res.status(500).json({ message: 'Erro ao verificar vagas' });
              }

              if (result.count >= game.max_players) {
                return res.status(400).json({ message: 'Jogo lotado' });
              }

              // Adicionar participante
              db.run(
                'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
                [gameId, user_id],
                function(err) {
                  if (err) {
                    return res.status(500).json({ message: 'Erro ao adicionar participante' });
                  }

                  res.json({ message: 'Participante adicionado com sucesso!' });
                }
              );
            }
          );
        }
      );
    });
  });
});

// Remover participante (Admin apenas)
router.delete('/:id/participants/:userId', authenticateToken, requireAdmin, (req, res) => {
  const gameId = req.params.id;
  const userId = req.params.userId;

  // Verificar se o jogo existe
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err || !game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }

    // Não permitir remoção se o jogo já foi finalizado
    if (game.status === 'finished') {
      return res.status(400).json({ message: 'Não é possível remover participantes de um jogo finalizado' });
    }

    db.run(
      'DELETE FROM game_participants WHERE game_id = ? AND user_id = ?',
      [gameId, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Erro ao remover participante' });
        }

        if (this.changes === 0) {
          return res.status(400).json({ message: 'Participante não encontrado neste jogo' });
        }

        res.json({ message: 'Participante removido com sucesso' });
      }
    );
  });
});

// Atualizar posições finais (Admin apenas)
router.put('/:id/positions', authenticateToken, requireAdmin, [
  body('positions').isArray().withMessage('Posições devem ser um array'),
  body('positions.*.user_id').isInt().withMessage('ID do usuário inválido'),
  body('positions.*.position').isInt({ min: 1 }).withMessage('Posição inválida')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const gameId = req.params.id;
  const { positions } = req.body;

  // Verificar se o jogo existe e está finalizado
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err || !game) {
      return res.status(404).json({ message: 'Jogo não encontrado' });
    }

    if (game.status !== 'finished') {
      return res.status(400).json({ message: 'Só é possível atualizar posições de jogos finalizados' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      let hasError = false;

      // Atualizar posições
      positions.forEach(pos => {
        if (hasError) return;

        const points = (11 - pos.position) * 10; // Recalcular pontos baseado na nova posição

        db.run(
          `UPDATE game_participants 
           SET position = ?, points_earned = ?
           WHERE game_id = ? AND user_id = ?`,
          [pos.position, points, gameId, pos.user_id],
          function(err) {
            if (err) {
              hasError = true;
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Erro ao atualizar posições' });
            }
          }
        );
      });

      if (!hasError) {
        db.run('COMMIT', (err) => {
          if (err) {
            return res.status(500).json({ message: 'Erro ao confirmar atualizações' });
          }
          res.json({ message: 'Posições atualizadas com sucesso!' });
        });
      }
    });
  });
});

  // Atualizar participante (Admin apenas) - Rebuys e Add-ons
  router.put('/:id/participants/:userId', authenticateToken, requireAdmin, (req, res) => {
    // console.log('--- DEBUG UPDATE STATS (RAW) ---');
    // console.log('Body:', req.body);
    
    const gameId = req.params.id;
    const userId = req.params.userId;
    
    // Extração robusta
    let rebuys = req.body.rebuys;
    let addons = req.body.addons;

    // Se vier como string "0", "1", etc., converter
    if (rebuys !== undefined && rebuys !== null) {
      rebuys = parseInt(rebuys, 10);
    }
    
    if (addons !== undefined && addons !== null) {
      addons = parseInt(addons, 10);
    }

    let updateFields = [];
    let values = [];

    // Verificação simplificada: se é um número válido (incluindo 0), aceita.
    // isNaN(null) é false (0), mas isNaN(undefined) é true.
    // Acima garantimos que se não for null/undefined, virou int.
    // Então checamos se não é NaN.

    if (rebuys !== undefined && rebuys !== null && !isNaN(rebuys) && rebuys >= 0) {
      updateFields.push('rebuys = ?');
      values.push(rebuys);
    }

    if (addons !== undefined && addons !== null && !isNaN(addons) && addons >= 0) {
      updateFields.push('addons = ?');
      values.push(addons);
    }

    if (updateFields.length === 0) {
      // Log detalhado no servidor para ajudar
      console.error('Update participant failed - No valid fields.', {
        receivedBody: req.body,
        parsed: { rebuys, addons }
      });
      
      return res.status(400).json({ 
        message: 'Nenhum campo para atualizar. Verifique os dados enviados.',
        received: req.body 
      });
    }

    values.push(gameId);
    values.push(userId);

    const query = `UPDATE game_participants SET ${updateFields.join(', ')} WHERE game_id = ? AND user_id = ?`;

    db.run(query, values, function(err) {
      if (err) {
        console.error('DB ERROR:', err);
        return res.status(500).json({ message: 'Erro ao atualizar participante: ' + err.message });
      }

      if (this.changes === 0) {
        // console.log('NO CHANGES - User not found in game?', { gameId, userId });
        // Check if user exists in game just to give better error
        return res.status(404).json({ message: 'Participante não encontrado neste jogo' });
      }

      res.json({ message: 'Participante atualizado com sucesso' });
    });
  });

module.exports = router;