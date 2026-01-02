const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getOne } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registro de usuário
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, email, password } = req.body;
    const user = await getOne('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (user) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const r = await query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedPassword]);
    const newUser = { id: r.rows[0].id, username, email, role: 'player' };
    const token = generateToken(newUser);
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const token = generateToken(user);
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        total_points: user.total_points,
        games_played: user.games_played,
        wins: user.wins
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, async (req, res) => {
  const user = await getOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      total_points: user.total_points,
      games_played: user.games_played,
      wins: user.wins
    }
  });
});

module.exports = router;
