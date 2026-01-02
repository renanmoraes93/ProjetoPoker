const database = require('../config/database');

const db = database.getDb();

console.log('🔄 Iniciando migração do banco de dados...');

db.serialize(() => {
  // Adicionar colunas na tabela game_participants
  console.log('📦 Atualizando tabela game_participants...');
  
  db.run("ALTER TABLE game_participants ADD COLUMN rebuys INTEGER DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️ Coluna rebuys já existe em game_participants');
      } else {
        console.error('❌ Erro ao adicionar coluna rebuys:', err.message);
      }
    } else {
      console.log('✅ Coluna rebuys adicionada com sucesso');
    }
  });

  db.run("ALTER TABLE game_participants ADD COLUMN addons INTEGER DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️ Coluna addons já existe em game_participants');
      } else {
        console.error('❌ Erro ao adicionar coluna addons:', err.message);
      }
    } else {
      console.log('✅ Coluna addons adicionada com sucesso');
    }
  });

  // Verificar e adicionar colunas na tabela games se necessário (baseado na análise do código de rotas)
  console.log('📦 Verificando tabela games...');
  
  db.run("ALTER TABLE games ADD COLUMN rebuy_value DECIMAL(10,2) DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️ Coluna rebuy_value já existe em games');
      } else {
        console.error('❌ Erro ao adicionar coluna rebuy_value:', err.message);
      }
    } else {
      console.log('✅ Coluna rebuy_value adicionada com sucesso');
    }
  });

  db.run("ALTER TABLE games ADD COLUMN addon_value DECIMAL(10,2) DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️ Coluna addon_value já existe em games');
      } else {
        console.error('❌ Erro ao adicionar coluna addon_value:', err.message);
      }
    } else {
      console.log('✅ Coluna addon_value adicionada com sucesso');
    }
  });
});

// Aguardar um pouco para garantir que as operações assíncronas terminem antes de fechar (abordagem simples para script único)
setTimeout(() => {
  console.log('🏁 Migração concluída.');
  process.exit(0);
}, 2000);
