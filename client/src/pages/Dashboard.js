import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Star, 
  TrendingUp, 
  Crown,
  Clock,
  DollarSign,
  Target,
  Award
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/club/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getHandTypeIcon = (handType) => {
    const icons = {
      'Royal Flush': '👑',
      'Straight Flush': '🔥',
      'Four of a Kind': '💎',
      'Full House': '🏠',
      'Flush': '♠️',
      'Straight': '📈',
      'Three of a Kind': '🎯',
      'Two Pair': '👥',
      'One Pair': '🎲',
      'High Card': '🃏'
    };
    return icons[handType] || '🃏';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-button">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Bem-vindo, {user?.username}! 👋</h1>
          <p>Aqui está um resumo das atividades do Gorila'z Poker Club</p>
        </div>
        
        <div className="user-stats">
          <div className="stat-card">
            <Trophy className="stat-icon" />
            <div className="stat-info">
              <span className="stat-value">{user?.total_points || 0}</span>
              <span className="stat-label">Pontos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <Target className="stat-icon" />
            <div className="stat-info">
              <span className="stat-value">{user?.games_played || 0}</span>
              <span className="stat-label">Jogos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <Crown className="stat-icon" />
            <div className="stat-info">
              <span className="stat-value">{user?.wins || 0}</span>
              <span className="stat-label">Vitórias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="overview-card">
          <div className="card-header">
            <Users className="card-icon" />
            <h3>Jogadores Ativos</h3>
          </div>
          <div className="card-value">
            {dashboardData?.generalStats?.active_players || 0}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <Trophy className="card-icon" />
            <h3>Total de Jogos</h3>
          </div>
          <div className="card-value">
            {dashboardData?.generalStats?.total_games || 0}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <Calendar className="card-icon" />
            <h3>Próximos Jogos</h3>
          </div>
          <div className="card-value">
            {dashboardData?.generalStats?.upcoming_games || 0}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <DollarSign className="card-icon" />
            <h3>Prêmios Totais</h3>
          </div>
          <div className="card-value">
            {formatCurrency(dashboardData?.generalStats?.total_prizes)}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Próximos Jogos */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Calendar className="section-icon" />
              Próximos Jogos
            </h2>
            <Link to="/games" className="section-link">
              Ver todos
            </Link>
          </div>
          
          <div className="games-list">
            {dashboardData?.upcomingGames?.length > 0 ? (
              dashboardData.upcomingGames.map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-info">
                    <h4>{game.name}</h4>
                    <div className="game-details">
                      <span className="game-date">
                        <Clock size={16} />
                        {formatDate(game.date)}
                      </span>
                      <span className="game-buyin">
                        <DollarSign size={16} />
                        {formatCurrency(game.buy_in)}
                      </span>
                    </div>
                  </div>
                  <div className="game-participants">
                    <Users size={16} />
                    <span>{game.participants}/{game.max_players}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Nenhum jogo agendado</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Players */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Crown className="section-icon" />
              Top Jogadores
            </h2>
            <Link to="/ranking" className="section-link">
              Ver ranking
            </Link>
          </div>
          
          <div className="players-list">
            {dashboardData?.topPlayers?.length > 0 ? (
              dashboardData.topPlayers.map((player, index) => (
                <div key={player.id} className="player-card">
                  <div className="player-rank">
                    {index + 1}
                  </div>
                  <div className="player-avatar">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.username} />
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <div className="player-info">
                    <span className="player-name">{player.username}</span>
                    <span className="player-points">{player.total_points} pts</span>
                  </div>
                  <div className="player-stats">
                    <span className="wins">{player.wins}W</span>
                    <span className="games">{player.games_played}J</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Users size={48} />
                <p>Nenhum jogador encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Jogos Recentes */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Trophy className="section-icon" />
              Jogos Recentes
            </h2>
            <Link to="/games" className="section-link">
              Ver histórico
            </Link>
          </div>
          
          <div className="recent-games">
            {dashboardData?.recentGames?.length > 0 ? (
              dashboardData.recentGames.map((game) => (
                <div key={game.id} className="recent-game">
                  <div className="game-info">
                    <h4>{game.name}</h4>
                    <span className="game-date">{formatDate(game.date)}</span>
                  </div>
                  <div className="game-stats">
                    <span className="participants">
                      <Users size={16} />
                      {game.participants} jogadores
                    </span>
                    <span className="prize">
                      <DollarSign size={16} />
                      {formatCurrency(game.prize_pool)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Trophy size={48} />
                <p>Nenhum jogo recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Melhores Mãos Recentes */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Star className="section-icon" />
              Melhores Mãos
            </h2>
            <Link to="/best-hands" className="section-link">
              Ver todas
            </Link>
          </div>
          
          <div className="best-hands">
            {dashboardData?.recentBestHands?.length > 0 ? (
              dashboardData.recentBestHands.map((hand) => (
                <div key={hand.id} className="hand-card">
                  <div className="hand-icon">
                    {getHandTypeIcon(hand.hand_type)}
                  </div>
                  <div className="hand-info">
                    <h4>{hand.hand_type}</h4>
                    <span className="hand-player">{hand.username}</span>
                    <span className="hand-cards">{hand.cards}</span>
                  </div>
                  <div className="hand-game">
                    <span>{hand.game_name}</span>
                    <span className="hand-date">{formatDate(hand.date)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Star size={48} />
                <p>Nenhuma mão registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Ações Rápidas</h2>
        <div className="actions-grid">
          <Link to="/games" className="action-card">
            <Trophy className="action-icon" />
            <span>Ver Jogos</span>
          </Link>
          
          <Link to="/ranking" className="action-card">
            <TrendingUp className="action-icon" />
            <span>Ranking</span>
          </Link>
          
          <Link to="/best-hands" className="action-card">
            <Star className="action-icon" />
            <span>Melhores Mãos</span>
          </Link>
          
          <Link to="/profile" className="action-card">
            <Users className="action-icon" />
            <span>Meu Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;