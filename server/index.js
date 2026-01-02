const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const rankingRoutes = require('./routes/ranking');
const clubRoutes = require('./routes/club');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const corsOptions = {};
const allowedOrigin = process.env.CORS_ORIGIN;
if (allowedOrigin) {
  corsOptions.origin = allowedOrigin;
}
app.use(cors(corsOptions));
app.use(express.json());
// Servir arquivos estáticos apenas em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Health check para Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Gorila\'z Poker Club está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/club', clubRoutes);

// Rota para servir o React app apenas em produção
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo deu errado no servidor!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🃏 Gorila'z Poker Club - Sistema de Gerenciamento`);
});
