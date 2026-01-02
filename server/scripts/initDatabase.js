const bcrypt = require('bcryptjs');
const database = require('../config/database');

const db = database.getDb();

async function initializeDatabase() {
  console.log('🔄 Inicializando banco de dados com dados de exemplo...');
  
  try {
    // Criar usuário administrador padrão
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role, total_points, games_played, wins)
      VALUES ('admin', 'admin@gorilapoker.com', ?, 'admin', 0, 0, 0)
    `, [adminPassword]);
    
    // Criar usuário de demonstração simples
    const demoPassword = await bcrypt.hash('user123', 10);
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role, total_points, games_played, wins)
      VALUES ('demo_user', 'user@gorilas.com', ?, 'player', 150, 3, 1)
    `, [demoPassword]);
    
    // Criar alguns usuários de exemplo
    const users = [
      { username: 'gorila_king', email: 'king@gorilapoker.com', password: 'senha123', points: 850, games: 12, wins: 4 },
      { username: 'poker_ace', email: 'ace@gorilapoker.com', password: 'senha123', points: 720, games: 10, wins: 2 },
      { username: 'bluff_master', email: 'bluff@gorilapoker.com', password: 'senha123', points: 680, games: 9, wins: 3 },
      { username: 'card_shark', email: 'shark@gorilapoker.com', password: 'senha123', points: 590, games: 8, wins: 1 },
      { username: 'all_in_joe', email: 'joe@gorilapoker.com', password: 'senha123', points: 520, games: 7, wins: 2 }
    ];
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      db.run(`
        INSERT OR IGNORE INTO users (username, email, password, role, total_points, games_played, wins)
        VALUES (?, ?, ?, 'player', ?, ?, ?)
      `, [user.username, user.email, hashedPassword, user.points, user.games, user.wins]);
    }
    
    // Criar alguns jogos de exemplo
    const games = [
      {
        name: 'Torneio de Abertura 2024',
        date: '2024-01-15',
        buy_in: 100.00,
        prize_pool: 800.00,
        status: 'finished',
        max_players: 8
      },
      {
        name: 'Friday Night Poker',
        date: '2024-01-19',
        buy_in: 50.00,
        prize_pool: 400.00,
        status: 'finished',
        max_players: 8
      },
      {
        name: 'Weekend Warriors',
        date: '2024-01-27',
        buy_in: 75.00,
        prize_pool: 0,
        status: 'scheduled',
        max_players: 9
      },
      {
        name: 'Monthly Championship',
        date: '2024-02-03',
        buy_in: 150.00,
        prize_pool: 0,
        status: 'scheduled',
        max_players: 10
      }
    ];
    
    for (const game of games) {
      db.run(`
        INSERT OR IGNORE INTO games (name, date, buy_in, prize_pool, status, max_players, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [game.name, game.date, game.buy_in, game.prize_pool, game.status, game.max_players]);
    }
    
    // Adicionar participantes aos jogos finalizados
    const gameParticipants = [
      // Torneio de Abertura 2024 (game_id: 1)
      { game_id: 1, user_id: 2, position: 1, points: 100, prize: 400.00 },
      { game_id: 1, user_id: 3, position: 2, points: 80, prize: 240.00 },
      { game_id: 1, user_id: 4, position: 3, points: 60, prize: 160.00 },
      { game_id: 1, user_id: 5, position: 4, points: 40, prize: 0 },
      { game_id: 1, user_id: 6, position: 5, points: 20, prize: 0 },
      
      // Friday Night Poker (game_id: 2)
      { game_id: 2, user_id: 4, position: 1, points: 100, prize: 200.00 },
      { game_id: 2, user_id: 2, position: 2, points: 80, prize: 120.00 },
      { game_id: 2, user_id: 6, position: 3, points: 60, prize: 80.00 },
      { game_id: 2, user_id: 3, position: 4, points: 40, prize: 0 }
    ];
    
    for (const participant of gameParticipants) {
      db.run(`
        INSERT OR IGNORE INTO game_participants (game_id, user_id, position, points_earned, prize_amount)
        VALUES (?, ?, ?, ?, ?)
      `, [participant.game_id, participant.user_id, participant.position, participant.points, participant.prize]);
    }
    
    // Adicionar algumas melhores mãos
    const bestHands = [
      {
        user_id: 2,
        game_id: 1,
        hand_type: 'Royal Flush',
        cards: 'As Ks Qs Js 10s',
        description: 'Royal Flush de espadas na mão final!',
        date: '2024-01-15'
      },
      {
        user_id: 3,
        game_id: 1,
        hand_type: 'Four of a Kind',
        cards: 'Ac Ad Ah As Kh',
        description: 'Quadra de Ases',
        date: '2024-01-15'
      },
      {
        user_id: 4,
        game_id: 2,
        hand_type: 'Straight Flush',
        cards: '9h 8h 7h 6h 5h',
        description: 'Straight Flush de copas',
        date: '2024-01-19'
      },
      {
        user_id: 2,
        game_id: 2,
        hand_type: 'Full House',
        cards: 'Kc Kd Kh 7s 7c',
        description: 'Full House - Reis sobre Setes',
        date: '2024-01-19'
      }
    ];
    
    for (const hand of bestHands) {
      db.run(`
        INSERT OR IGNORE INTO best_hands (user_id, game_id, hand_type, cards, description, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [hand.user_id, hand.game_id, hand.hand_type, hand.cards, hand.description, hand.date]);
    }
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Dados de exemplo criados:');
    console.log('   - 1 Administrador (admin / admin123)');
    console.log('   - 1 Usuário de demonstração (demo_user / user123)');
    console.log('   - 5 Jogadores de exemplo');
    console.log('   - 4 Jogos (2 finalizados, 2 agendados)');
    console.log('   - Participações e resultados');
    console.log('   - 4 Melhores mãos registradas');
    console.log('');
    console.log('🔐 Credenciais de Login:');
    console.log('   👑 Administrador:');
    console.log('      Email: admin@gorilapoker.com');
    console.log('      Senha: admin123');
    console.log('   👤 Usuário Demo:');
    console.log('      Email: user@gorilas.com');
    console.log('      Senha: user123');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    database.close();
    process.exit(0);
  }
}

// Executar inicialização
initializeDatabase();