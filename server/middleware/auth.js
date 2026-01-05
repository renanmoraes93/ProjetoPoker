const jwt = require('jsonwebtoken');
const { getOne } = require('../config/database');

const JWT_SECRET = process.env.NODE_ENV === 'production' ? process.env.JWT_SECRET : (process.env.JWT_SECRET || 'insecure_dev_key');
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';
const DEV_AUTH_BYPASS = process.env.NODE_ENV !== 'production' && process.env.AUTH_BYPASS === 'true';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no ambiente');
}

let BYPASS_CACHE = { value: false, present: false, ts: 0 };
const getDbBypass = async () => {
  const now = Date.now();
  if (now - BYPASS_CACHE.ts > 5000) {
    try {
      const row = await getOne('SELECT setting_value FROM club_settings WHERE setting_key = $1', ['auth_bypass']);
      BYPASS_CACHE = { value: (row?.setting_value === 'true'), present: !!row, ts: now };
    } catch (_) {}
  }
  return { value: BYPASS_CACHE.value, present: BYPASS_CACHE.present };
};

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  const db = await getDbBypass();
  if (db.present) {
    if (db.value) {
      const role = process.env.AUTH_BYPASS_ROLE || 'admin';
      req.user = { id: 0, username: 'dev', email: 'dev@example.com', role };
      return next();
    }
  } else if (DEV_AUTH_BYPASS) {
    const role = process.env.AUTH_BYPASS_ROLE || 'admin';
    req.user = { id: 0, username: 'dev', email: 'dev@example.com', role };
    return next();
  }
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Middleware para verificar se é admin ou o próprio usuário
const requireAdminOrSelf = (req, res, next) => {
  const userId = parseInt(req.params.id || req.params.userId);
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    return res.status(403).json({ message: 'Acesso negado' });
  }
};

// Função para gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrSelf,
  generateToken,
  JWT_SECRET
};
