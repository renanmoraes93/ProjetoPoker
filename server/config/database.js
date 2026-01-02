const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/poker_club.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
      } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        this.initTables();
      }
    });
  }

  initTables() {
    // Tabela de usuários
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'player',
        avatar VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de jogos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        buy_in DECIMAL(10,2) NOT NULL,
        prize_pool DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'scheduled',
        max_players INTEGER DEFAULT 9,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Tabela de participações em jogos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER,
        user_id INTEGER,
        position INTEGER,
        points_earned INTEGER DEFAULT 0,
        prize_amount DECIMAL(10,2) DEFAULT 0,
        best_hand VARCHAR(50),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tabela de melhores mãos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS best_hands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        game_id INTEGER,
        hand_type VARCHAR(50) NOT NULL,
        cards VARCHAR(20) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `);

    // Tabela de configurações do clube
    this.db.run(`
      CREATE TABLE IF NOT EXISTS club_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir configurações padrão do clube
    this.db.run(`
      INSERT OR IGNORE INTO club_settings (setting_key, setting_value) VALUES 
      ('club_name', 'Gorila''z Poker Club'),
      ('club_description', 'O melhor clube de poker da região'),
      ('points_system', 'standard'),
      ('default_buy_in', '50.00')
    `);

    console.log('✅ Tabelas do banco de dados inicializadas');
    this.runMigrations();
  }

  runMigrations() {
    // Adicionar colunas de rebuy e addon na tabela games
    const gamesColumns = ['rebuy_value', 'addon_value'];
    gamesColumns.forEach(column => {
      this.db.run(`ALTER TABLE games ADD COLUMN ${column} DECIMAL(10,2) DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`Erro ao adicionar coluna ${column} na tabela games:`, err.message);
        }
      });
    });

    // Adicionar colunas de rebuys e addons na tabela game_participants
    const participantsColumns = ['rebuys', 'addons'];
    participantsColumns.forEach(column => {
      this.db.run(`ALTER TABLE game_participants ADD COLUMN ${column} INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`Erro ao adicionar coluna ${column} na tabela game_participants:`, err.message);
        }
      });
    });
  }

  getDb() {
    return this.db;
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
      } else {
        console.log('Conexão com o banco de dados fechada');
      }
    });
  }
}

module.exports = new Database();