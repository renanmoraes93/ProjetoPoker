const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const ssl = process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false };
const pool = new Pool({ connectionString, ssl });

class Database {
  constructor() {
    this.pool = pool;
    this.ready = this.init();
  }

  async init() {
    await this.initTables();
    try { await this.runMigrations(); } catch (_) {}
  }

  async initTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'player',
        avatar VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        buy_in NUMERIC(10,2) NOT NULL,
        prize_pool NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'scheduled',
        max_players INTEGER DEFAULT 9,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id),
        user_id INTEGER REFERENCES users(id),
        position INTEGER,
        points_earned INTEGER DEFAULT 0,
        prize_amount NUMERIC(10,2) DEFAULT 0,
        best_hand VARCHAR(50),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS best_hands (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        game_id INTEGER REFERENCES games(id),
        hand_type VARCHAR(50) NOT NULL,
        cards VARCHAR(20) NOT NULL,
        description TEXT,
        date DATE NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      INSERT INTO club_settings (setting_key, setting_value)
      VALUES 
        ($1, $2),
        ($3, $4),
        ($5, $6),
        ($7, $8)
      ON CONFLICT (setting_key) DO NOTHING
      `,
      [
        'club_name',
        "Gorila'z Poker Club",
        'club_description',
        'O melhor clube de poker da região',
        'points_system',
        'standard',
        'default_buy_in',
        '50.00',
      ]
    );

    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `
      INSERT INTO users (username, email, password, role, total_points, games_played, wins)
      VALUES ($1, $2, $3, $4, 0, 0, 0)
      ON CONFLICT (email) DO NOTHING
      `,
      ['admin', 'admin@gorilapoker.com', adminPassword, 'admin']
    );

    const playerPassword = await bcrypt.hash('senha123', 10);
    await pool.query(
      `
      INSERT INTO users (username, email, password, role, total_points, games_played, wins)
      VALUES ($1, $2, $3, $4, 0, 0, 0)
      ON CONFLICT (email) DO NOTHING
      `,
      ['king', 'king@gorilapoker.com', playerPassword, 'player']
    );
  }

  async runMigrations() {
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS rebuy_value NUMERIC(10,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS addon_value NUMERIC(10,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS rebuys INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS addons INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS blind_schedule JSONB`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_status VARCHAR(20) DEFAULT 'idle'`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMP`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_total_paused_seconds INTEGER DEFAULT 0`);

    const defaultSchedule = JSON.stringify([
      { level: 1, sb: 10, bb: 20, ante: 0, duration_sec: 600 },
      { level: 2, sb: 20, bb: 40, ante: 0, duration_sec: 600 },
      { level: 3, sb: 30, bb: 60, ante: 0, duration_sec: 600 },
      { level: 4, sb: 50, bb: 100, ante: 0, duration_sec: 600 },
      { level: 'break', name: 'Break', duration_sec: 300 },
      { level: 5, sb: 100, bb: 200, ante: 0, duration_sec: 600 },
      { level: 6, sb: 200, bb: 400, ante: 0, duration_sec: 600 }
    ]);
    try {
      const jsonLiteral = defaultSchedule.replace(/'/g, "''");
      await pool.query(
        `UPDATE games SET blind_schedule = COALESCE(blind_schedule, '${jsonLiteral}'::jsonb)`
      );
    } catch (_) {}

    const defaultPresets = JSON.stringify([
      {
        name: 'Padrão',
        levels: [
          { level: 1, sb: 10, bb: 20, ante: 0, duration_sec: 600 },
          { level: 2, sb: 20, bb: 40, ante: 0, duration_sec: 600 },
          { level: 3, sb: 30, bb: 60, ante: 0, duration_sec: 600 },
          { level: 4, sb: 50, bb: 100, ante: 0, duration_sec: 600 },
          { level: 'break', name: 'Break', duration_sec: 300 },
          { level: 5, sb: 100, bb: 200, ante: 0, duration_sec: 600 },
          { level: 6, sb: 200, bb: 400, ante: 0, duration_sec: 600 }
        ]
      }
    ]);
    try {
      await pool.query(
        `INSERT INTO club_settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) DO NOTHING`,
        ['blind_presets', defaultPresets]
      );
    } catch (_) {}
  }
}

const database = new Database();

const query = (text, params) => pool.query(text, params);
const getOne = async (text, params) => (await pool.query(text, params)).rows[0];
const getMany = async (text, params) => (await pool.query(text, params)).rows;
const transaction = async (cb) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await cb(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { pool, database, query, getOne, getMany, transaction };
