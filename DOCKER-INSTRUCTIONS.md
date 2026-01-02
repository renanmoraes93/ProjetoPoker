# 🐳 Instruções para Executar no Docker Desktop

## 📋 Pré-requisitos

1. **Docker Desktop instalado e funcionando**
   - Baixe em: https://www.docker.com/products/docker-desktop/
   - Certifique-se de que está rodando (ícone na bandeja do sistema)

2. **Git (opcional, se clonar repositório)**
   - Baixe em: https://git-scm.com/

## 🚀 Método 1: Usando Docker Compose (Recomendado)

### Passo 1: Preparar o projeto
```bash
# Se ainda não tem o projeto, clone ou baixe
# cd para a pasta do projeto
cd d:\ProjetoPoker
```

### Passo 2: Executar com Docker Compose
```bash
# Construir e executar a aplicação
docker-compose up --build

# Ou para executar em background (detached)
docker-compose up --build -d
```

### Passo 3: Acessar a aplicação
- **URL:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

### Comandos úteis do Docker Compose
```bash
# Parar a aplicação
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v

# Ver logs
docker-compose logs

# Ver logs em tempo real
docker-compose logs -f

# Reconstruir sem cache
docker-compose build --no-cache
```

## 🔧 Método 2: Usando Docker diretamente

### Passo 1: Construir a imagem
```bash
cd d:\ProjetoPoker
docker build -t gorila-poker-club .
```

### Passo 2: Executar o container
```bash
# Executar em foreground
docker run -p 5000:5000 --name poker-app gorila-poker-club

# Executar em background
docker run -d -p 5000:5000 --name poker-app gorila-poker-club

# Executar com volume para persistir dados
docker run -d -p 5000:5000 -v poker_data:/app/server/data --name poker-app gorila-poker-club
```

### Comandos úteis do Docker
```bash
# Ver containers rodando
docker ps

# Ver todos os containers
docker ps -a

# Parar container
docker stop poker-app

# Remover container
docker rm poker-app

# Ver logs
docker logs poker-app

# Ver logs em tempo real
docker logs -f poker-app

# Acessar terminal do container
docker exec -it poker-app sh
```

## 🎯 Testando a Aplicação

### 1. Verificar se está funcionando
```bash
# Health check
curl http://localhost:5000/api/health

# Ou abra no navegador:
# http://localhost:5000/api/health
```

### 2. Acessar a aplicação
- **URL Principal:** http://localhost:5000
- **Login Admin:** usuário `admin`, senha `admin123`
- **Login Jogador:** usuário `jogador1`, senha `senha123`

### 3. Testar funcionalidades
1. Faça login como admin
2. Acesse o Dashboard
3. Crie um novo jogo
4. Registre uma melhor mão
5. Verifique o ranking

## 🔍 Solução de Problemas

### Problema: Porta 5000 já está em uso
```bash
# Verificar o que está usando a porta
netstat -ano | findstr :5000

# Usar uma porta diferente
docker run -p 8080:5000 --name poker-app gorila-poker-club
# Acesse em: http://localhost:8080
```

### Problema: Container não inicia
```bash
# Ver logs detalhados
docker logs poker-app

# Verificar se o Docker Desktop está rodando
# Reiniciar o Docker Desktop se necessário
```

### Problema: Erro de build
```bash
# Limpar cache do Docker
docker system prune -a

# Reconstruir sem cache
docker build --no-cache -t gorila-poker-club .
```

### Problema: Dados perdidos após reiniciar
```bash
# Usar volume nomeado para persistir dados
docker volume create poker_data
docker run -d -p 5000:5000 -v poker_data:/app/server/data --name poker-app gorila-poker-club
```

## 📊 Monitoramento

### Ver uso de recursos
```bash
# Estatísticas em tempo real
docker stats poker-app

# Informações do container
docker inspect poker-app
```

### Health Check
O container possui health check automático que verifica a cada 30 segundos se a aplicação está respondendo.

```bash
# Ver status do health check
docker ps
# Procure por "healthy" na coluna STATUS
```

## 🛠️ Desenvolvimento com Docker

### Para desenvolvimento com hot reload
```bash
# Criar um docker-compose.dev.yml para desenvolvimento
# Montar volumes para código fonte
docker-compose -f docker-compose.dev.yml up
```

### Acessar banco de dados
```bash
# Entrar no container
docker exec -it poker-app sh

# Navegar para o banco
cd /app/server/data
ls -la

# Usar sqlite3 se disponível
sqlite3 poker.db
```

## 🔒 Segurança

### Variáveis de ambiente para produção
Edite o `docker-compose.yml` e altere:
```yaml
environment:
  - JWT_SECRET=sua-chave-secreta-super-forte-para-producao
```

### Backup do banco de dados
```bash
# Copiar banco do container
docker cp poker-app:/app/server/data/poker.db ./backup-poker.db

# Restaurar banco no container
docker cp ./backup-poker.db poker-app:/app/server/data/poker.db
```

## 📝 Notas Importantes

1. **Primeira execução:** O banco de dados será criado automaticamente
2. **Dados persistentes:** Use volumes para não perder dados
3. **Performance:** A primeira build pode demorar alguns minutos
4. **Logs:** Sempre verifique os logs em caso de problemas
5. **Portas:** Certifique-se de que a porta 5000 está livre

## 🎉 Pronto!

Sua aplicação Gorila'z Poker Club está rodando no Docker! 🦍🃏

**Acesse:** http://localhost:5000

**Credenciais de teste:**
- Admin: `admin` / `admin123`
- Jogador: `jogador1` / `senha123`