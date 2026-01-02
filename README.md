# 🦍 Gorila'z Poker Club

Sistema completo de gerenciamento para clube de poker profissional, desenvolvido com Node.js, Express, SQLite e React.

## 📋 Funcionalidades

### 🔐 Autenticação e Autorização
- Sistema de login/registro com JWT
- Controle de acesso baseado em funções (Admin/Jogador)
- Middleware de autenticação para rotas protegidas

### 👥 Gerenciamento de Usuários
- Cadastro e edição de perfis
- Sistema de pontuação e estatísticas
- Promoção/rebaixamento de usuários (Admin)
- Histórico de performance

### 🎮 Gerenciamento de Jogos
- Criação e configuração de jogos
- Sistema de inscrições com controle de vagas
- Registro de resultados e distribuição de pontos
- Histórico completo de jogos

### 🏆 Sistema de Ranking
- Ranking geral por pontos
- Ranking por categorias (vitórias, taxa de vitória, etc.)
- Filtros por período
- Estatísticas detalhadas

### 🃏 Melhores Mãos
- Registro de mãos especiais
- Categorização por raridade
- Galeria com descrições detalhadas
- Sistema de busca e filtros

### ⚙️ Administração
- Painel administrativo completo
- Gerenciamento de usuários
- Configurações do clube
- Relatórios e estatísticas

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados
- **JWT** - Autenticação
- **bcrypt** - Hash de senhas
- **CORS** - Cross-Origin Resource Sharing

### Frontend
- **React** - Biblioteca de interface
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **Lucide React** - Ícones
- **React Hot Toast** - Notificações
- **Date-fns** - Manipulação de datas
- **Recharts** - Gráficos e visualizações

## 📁 Estrutura do Projeto

```
ProjetoPoker/
├── server/                 # Backend (Node.js + Express)
│   ├── config/            # Configurações do banco
│   ├── middleware/        # Middlewares de autenticação
│   ├── routes/           # Rotas da API
│   ├── scripts/          # Scripts de inicialização
│   ├── .env              # Variáveis de ambiente
│   ├── index.js          # Servidor principal
│   └── package.json      # Dependências do backend
├── client/               # Frontend (React)
│   ├── public/          # Arquivos públicos
│   ├── src/             # Código fonte React
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── contexts/    # Contextos React
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── App.js       # Componente principal
│   │   └── index.js     # Ponto de entrada
│   └── package.json     # Dependências do frontend
└── package.json         # Scripts principais
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd ProjetoPoker
```

### 2. Instale as dependências
```bash
# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend
cd server
npm install

# Instalar dependências do frontend
cd ../client
npm install
```

### 3. Configure o ambiente
```bash
# Volte para a pasta server
cd ../server

# O arquivo .env já está configurado com valores padrão
# Você pode editá-lo se necessário
```

### 4. Inicialize o banco de dados
```bash
# Na pasta server
node scripts/initDatabase.js
```

### 5. Execute a aplicação

#### Opção 1: Executar tudo de uma vez (recomendado)
```bash
# Na pasta raiz do projeto
npm run dev
```

#### Opção 2: Executar separadamente
```bash
# Terminal 1 - Backend (pasta server)
npm run dev

# Terminal 2 - Frontend (pasta client)
npm start
```

## 🔑 Credenciais Padrão

Após inicializar o banco de dados, você pode usar estas credenciais:

### Administrador
- **Usuário:** admin
- **Senha:** admin123

### Jogador de Exemplo
- **Usuário:** jogador1
- **Senha:** senha123

## 📱 Acesso à Aplicação

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## 🔧 Scripts Disponíveis

### Projeto Principal
- `npm run dev` - Executa backend e frontend simultaneamente
- `npm run server` - Executa apenas o backend
- `npm run client` - Executa apenas o frontend
- `npm run build` - Gera build de produção do frontend

### Backend (pasta server)
- `npm start` - Executa o servidor em produção
- `npm run dev` - Executa o servidor em desenvolvimento
- `npm run init-db` - Inicializa o banco de dados

### Frontend (pasta client)
- `npm start` - Executa em desenvolvimento
- `npm run build` - Gera build de produção
- `npm test` - Executa testes
- `npm run eject` - Ejeta configurações do Create React App

## 🗃️ Banco de Dados

O sistema utiliza SQLite com as seguintes tabelas:

- **users** - Usuários do sistema
- **games** - Jogos realizados
- **game_participants** - Participantes dos jogos
- **best_hands** - Registro de melhores mãos
- **club_info** - Informações do clube

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verificar token

### Usuários
- `GET /api/users` - Listar usuários (Admin)
- `GET /api/users/:id` - Buscar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário (Admin)
- `PUT /api/users/:id/role` - Alterar função (Admin)
- `PUT /api/users/:id/password` - Alterar senha

### Jogos
- `GET /api/games` - Listar jogos
- `GET /api/games/:id` - Buscar jogo
- `POST /api/games` - Criar jogo (Admin)
- `PUT /api/games/:id` - Atualizar jogo (Admin)
- `DELETE /api/games/:id` - Deletar jogo (Admin)
- `POST /api/games/:id/join` - Participar do jogo
- `POST /api/games/:id/leave` - Sair do jogo
- `POST /api/games/:id/finish` - Finalizar jogo (Admin)

### Ranking
- `GET /api/ranking` - Ranking geral
- `GET /api/ranking/best-hands` - Ranking de melhores mãos
- `GET /api/ranking/stats` - Estatísticas gerais

### Melhores Mãos
- `GET /api/club/best-hands` - Listar melhores mãos
- `POST /api/club/best-hands` - Registrar mão
- `PUT /api/club/best-hands/:id` - Atualizar mão
- `DELETE /api/club/best-hands/:id` - Deletar mão

### Clube
- `GET /api/club` - Informações do clube
- `PUT /api/club` - Atualizar informações (Admin)
- `GET /api/club/dashboard` - Dados do dashboard

## 🎨 Interface do Usuário

A interface foi desenvolvida com foco em:

- **Design Moderno:** Gradientes, glassmorphism e animações suaves
- **Responsividade:** Adaptável a diferentes tamanhos de tela
- **Acessibilidade:** Contraste adequado e navegação por teclado
- **UX Intuitiva:** Navegação clara e feedback visual

### Páginas Principais

1. **Login/Registro** - Autenticação de usuários
2. **Dashboard** - Visão geral do clube e estatísticas
3. **Jogos** - Gerenciamento de jogos e participações
4. **Ranking** - Classificações e estatísticas
5. **Melhores Mãos** - Galeria de mãos especiais
6. **Perfil** - Gerenciamento de conta pessoal
7. **Administração** - Painel administrativo (Admin apenas)

## 🔒 Segurança

- Senhas criptografadas com bcrypt
- Autenticação JWT com expiração
- Validação de entrada em todas as rotas
- Controle de acesso baseado em funções
- Headers de segurança configurados
- Sanitização de dados

## 🚀 Deploy

### Preparação para Produção

1. **Configure variáveis de ambiente:**
```bash
# No arquivo server/.env
NODE_ENV=production
JWT_SECRET=sua-chave-secreta-super-forte
PORT=5000
```

2. **Gere o build do frontend:**
```bash
cd client
npm run build
```

3. **Configure o servidor para servir arquivos estáticos**

### Opções de Deploy

- **Heroku** - Para aplicações Node.js
- **Vercel** - Para frontend React
- **DigitalOcean** - VPS com controle total
- **AWS** - Infraestrutura escalável

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:

- 📧 Email: contato@gorilazpoker.com
- 📱 WhatsApp: (11) 99999-9999
- 🌐 Website: [www.gorilazpoker.com](http://www.gorilazpoker.com)

---

**Desenvolvido com ❤️ para a comunidade de poker**

🦍 **Gorila'z Poker Club** - *Onde os melhores jogadores se encontram*