const database = require('../config/database');
const db = database.getDb();

function updateSchema() {
  console.log('🔄 Atualizando esquema do banco de dados...');

  db.serialize(() => {
    // Adicionar colunas na tabela games
    db.run("ALTER TABLE games ADD COLUMN rebuy_value DECIMAL(10,2) DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Erro ao adicionar rebuy_value em games:', err.message);
      else console.log('✅ Coluna rebuy_value adicionada ou já existente em games');
    });

    db.run("ALTER TABLE games ADD COLUMN addon_value DECIMAL(10,2) DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Erro ao adicionar addon_value em games:', err.message);
      else console.log('✅ Coluna addon_value adicionada ou já existente em games');
    });

    // Adicionar colunas na tabela game_participants
    db.run("ALTER TABLE game_participants ADD COLUMN rebuy_count INTEGER DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Erro ao adicionar rebuy_count em game_participants:', err.message);
      else console.log('✅ Coluna rebuy_count adicionada ou já existente em game_participants');
    });

    db.run("ALTER TABLE game_participants ADD COLUMN addon_count INTEGER DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Erro ao adicionar addon_count em game_participants:', err.message);
      else console.log('✅ Coluna addon_count adicionada ou já existente em game_participants');
    });
  });

  // Aguardar um pouco para garantir que os comandos terminaram (sqlite3 é assíncrono)
  setTimeout(() => {
    console.log('🏁 Atualização de esquema concluída.');
    process.exit(0);
  }, 1000);
}

updateSchema();
