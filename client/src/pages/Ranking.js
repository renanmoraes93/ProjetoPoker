import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Trophy, 
  Crown, 
  Medal, 
  TrendingUp, 
  Users, 
  Target,
  Award,
  Calendar,
  Star,
  Share2
} from 'lucide-react';
import './Ranking.css';

function Ranking() {
  const [rankings, setRankings] = useState([]);
  const [bestHands, setBestHands] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('points');
  const [categoriesData, setCategoriesData] = useState(null);

  const fetchRankingData = useCallback(async () => {
    try {
      setLoading(true);
      const rankingParams = new URLSearchParams();
      if (period !== 'all') {
        rankingParams.append('period', period);
      }
      const requests = [
        axios.get(`/api/ranking?${rankingParams.toString()}`),
        axios.get('/api/club/best-hands'),
        axios.get('/api/club/hand-stats')
      ];
      if (category !== 'points') {
        requests.push(axios.get('/api/ranking/categories'));
      }
      const responses = await Promise.all(requests);
      setRankings(responses[0].data);
      setBestHands(responses[1].data);
      const handStats = responses[2].data;
      const totalHands = handStats.reduce((sum, h) => sum + (h.count || 0), 0);
      const avgPoints =
        responses[0].data.length > 0
          ? responses[0].data.reduce((sum, p) => sum + (p.avg_points_per_game || 0), 0) / responses[0].data.length
          : 0;
      setStats({
        total_players: responses[0].data.length,
        total_hands: totalHands,
        avg_points_per_game: avgPoints,
        total_games: undefined
      });
      if (category !== 'points') {
        setCategoriesData(responses[3].data);
      } else {
        setCategoriesData(null);
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  }, [period, category]);

  useEffect(() => {
    fetchRankingData();
  }, [fetchRankingData]);


  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <Crown className="rank-icon gold" />;
      case 2:
        return <Medal className="rank-icon silver" />;
      case 3:
        return <Award className="rank-icon bronze" />;
      default:
        return <span className="rank-number">{position}</span>;
    }
  };

  const getRankClass = (position) => {
    switch (position) {
      case 1:
        return 'rank-1';
      case 2:
        return 'rank-2';
      case 3:
        return 'rank-3';
      default:
        return '';
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      'points': 'Pontos Totais',
      'wins': 'Mais Vitórias',
      'win_rate': 'Melhor Taxa de Vitória',
      'games': 'Mais Jogos',
      'avg_points': 'Melhor Média de Pontos'
    };
    return labels[cat] || cat;
  };

  const isWindows = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);
  const WA = isWindows ? {
    trophy: '🏆',
    medal1: '#1',
    medal2: '#2',
    medal3: '#3',
    star: '⭐',
    chart: '📈',
    target: '🎯',
    users: '👥',
    link: '🔗'
  } : {
    trophy: '🏆',
    medal1: '🥇',
    medal2: '🥈',
    medal3: '🥉',
    star: '⭐',
    chart: '📈',
    target: '🎯',
    users: '👥',
    link: '🔗'
  };

  const sanitizeForWhatsApp = (text) => {
    const cleaned = text
      .replace(/[\uFE0F\u200D\u200B\u200C\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, '-');
    return cleaned
      .split('')
      .filter((c) => {
        const code = c.charCodeAt(0);
        return c === '\n' || (code >= 32 && code !== 127);
      })
      .join('')
      .trim();
  };

  const getCategoryValue = (player, cat) => {
    switch (cat) {
      case 'points':
        return `${player.total_points} pts`;
      case 'wins':
        return `${(player.wins ?? player.value ?? 0)} vitórias`;
      case 'win_rate':
        return category === 'points'
          ? formatPercentage(player.win_rate || 0)
          : `${(player.value ?? 0).toFixed(1)}%`;
      case 'games':
        return `${(player.games_played ?? player.value ?? 0)} jogos`;
      case 'avg_points':
        return `${(player.avg_points ?? player.value ?? 0).toFixed(1)} pts/jogo`;
      default:
        return player.total_points;
    }
  };

  const handleShareRanking = () => {
    const periodLabel = {
      all: 'Todos os tempos',
      week: 'Última semana',
      month: 'Último mês',
      year: 'Último ano'
    }[period] || 'Todos os tempos';
    const dataList = category === 'points'
      ? rankings
      : (categoriesData ? (
        category === 'wins' ? categoriesData.mostWins :
        category === 'win_rate' ? categoriesData.bestWinRate :
        category === 'games' ? categoriesData.mostGames :
        category === 'avg_points' ? categoriesData.bestAverage : []
      ) : []);
    const top = (dataList || []).slice(0, 10);
    const lines = top.map((p, i) => {
      const posEmoji = i === 0 ? WA.medal1 : i === 1 ? WA.medal2 : i === 2 ? WA.medal3 : `#${i + 1}`;
      const valueText = getCategoryValue(p, category);
      const gamesText = category === 'points' ? (p.games_played || 0) : (category === 'games' ? (p.value || 0) : '-');
      const winsText = category === 'points' ? (p.wins || 0) : (category === 'wins' ? (p.value || 0) : '-');
      const rateText = category === 'points'
        ? formatPercentage(p.win_rate || 0)
        : (category === 'win_rate' ? `${(p.value || 0).toFixed(1)}%` : '-');
      return `${posEmoji} ${p.username} • ${valueText} • Jogos: ${gamesText} • Vitórias: ${winsText} • Taxa: ${rateText}`;
    });
    const raw = [
      `${WA.trophy} Ranking do Gorila'z Poker Club`,
      `${WA.star} Período: ${periodLabel}`,
      `${WA.chart} Categoria: ${getCategoryLabel(category)}`,
      `Jogadores listados: ${top.length}`,
      '',
      ...lines,
      '',
      `${WA.link} https://gorilazpoker.online/ranking`
    ].join('\n');
    const message = sanitizeForWhatsApp(raw);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="ranking-loading">
        <div className="loading-spinner"></div>
        <p>Carregando ranking...</p>
      </div>
    );
  }

  return (
    <div className="ranking-page">
      {/* Header */}
      <div className="ranking-header">
        <div className="header-content">
          <h1>
            <Trophy className="page-icon" />
            Ranking do Clube
          </h1>
          <p>Classificações e estatísticas dos jogadores do Gorila'z Poker Club</p>
        </div>
        <button className="share-btn" onClick={handleShareRanking}>
          <Share2 size={20} />
          Compartilhar Ranking
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <Users />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_players}</span>
              <span className="stat-label">Jogadores Ativos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Target />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_games}</span>
              <span className="stat-label">Jogos Realizados</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.avg_points_per_game?.toFixed(1)}</span>
              <span className="stat-label">Média de Pontos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Star />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_hands}</span>
              <span className="stat-label">Melhores Mãos</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="ranking-tabs">
        <button 
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Trophy size={20} />
          Ranking Geral
        </button>
        <button 
          className={`tab ${activeTab === 'hands' ? 'active' : ''}`}
          onClick={() => setActiveTab('hands')}
        >
          <Star size={20} />
          Melhores Mãos
        </button>
      </div>

      {/* General Ranking Tab */}
      {activeTab === 'general' && (
        <div className="ranking-content">
          {/* Filters */}
          <div className="ranking-filters">
            <div className="filter-group">
              <label>Período:</label>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos os tempos</option>
                <option value="week">Última semana</option>
                <option value="month">Último mês</option>
                <option value="year">Último ano</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Categoria:</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="filter-select"
              >
                <option value="points">Pontos Totais</option>
                <option value="wins">Mais Vitórias</option>
                <option value="win_rate">Melhor Taxa de Vitória</option>
                <option value="games">Mais Jogos</option>
                <option value="avg_points">Melhor Média de Pontos</option>
              </select>
            </div>
          </div>

          {/* Ranking List */}
          <div className="ranking-list">
            <div className="ranking-header-row">
              <span className="col-rank">Posição</span>
              <span className="col-player">Jogador</span>
              <span className="col-value">{getCategoryLabel(category)}</span>
              <span className="col-games">Jogos</span>
              <span className="col-wins">Vitórias</span>
              <span className="col-rate">Taxa de Vitória</span>
            </div>
            
            {(category === 'points' ? rankings : (categoriesData ? (
              category === 'wins' ? categoriesData.mostWins :
              category === 'win_rate' ? categoriesData.bestWinRate :
              category === 'games' ? categoriesData.mostGames :
              category === 'avg_points' ? categoriesData.bestAverage : []
            ) : [])).length > 0 ? (
              (category === 'points' ? rankings : (
                category === 'wins' ? categoriesData.mostWins :
                category === 'win_rate' ? categoriesData.bestWinRate :
                category === 'games' ? categoriesData.mostGames :
                category === 'avg_points' ? categoriesData.bestAverage : []
              )).map((player, index) => (
                <div key={player.id} className={`ranking-row ${getRankClass(index + 1)}`}>
                  <div className="col-rank">
                    {getRankIcon(index + 1)}
                  </div>
                  
                  <div className="col-player">
                    <div className="player-info">
                      <div className="player-avatar">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.username} />
                        ) : (
                          <Users size={20} />
                        )}
                      </div>
                      <div className="player-details">
                        <span className="player-name">{player.username}</span>
                        <span className="player-role">{player.role === 'admin' ? 'Admin' : 'Jogador'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-value">
                    <span className="value-primary">{getCategoryValue(player, category)}</span>
                  </div>
                  
                  <div className="col-games">
                    <span>{category === 'points' ? (player.games_played || 0) : (category === 'games' ? (player.value || 0) : '-')}</span>
                  </div>
                  
                  <div className="col-wins">
                    <span>{category === 'points' ? (player.wins || 0) : (category === 'wins' ? (player.value || 0) : '-')}</span>
                  </div>
                  
                  <div className="col-rate">
                    <div className="rate-bar">
                      <div 
                        className="rate-fill" 
                        style={{ width: `${category === 'points' ? ((player.win_rate || 0) * 100) : ((player.value || 0))}%` }}
                      ></div>
                      <span className="rate-text">
                        {category === 'points' ? formatPercentage(player.win_rate || 0) : (category === 'win_rate' ? `${(player.value || 0).toFixed(1)}%` : '-')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-ranking">
                <Trophy size={64} />
                <h3>Nenhum jogador encontrado</h3>
                <p>Não há dados de ranking para os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Best Hands Tab */}
      {activeTab === 'hands' && (
        <div className="hands-content">
          <div className="hands-grid">
            {bestHands.length > 0 ? (
              bestHands.map((hand) => (
                <div key={hand.id} className="hand-card">
                  <div className="hand-header">
                    <div className="hand-icon">
                      {getHandTypeIcon(hand.hand_type)}
                    </div>
                    <div className="hand-info">
                      <h3>{hand.hand_type}</h3>
                      <span className="hand-cards">{hand.cards}</span>
                    </div>
                  </div>
                  
                  <div className="hand-details">
                    <div className="detail-row">
                      <Users className="detail-icon" />
                      <span>{hand.username}</span>
                    </div>
                    
                    <div className="detail-row">
                      <Trophy className="detail-icon" />
                      <span>{hand.game_name}</span>
                    </div>
                    
                    <div className="detail-row">
                      <Calendar className="detail-icon" />
                      <span>{formatDate(hand.date)}</span>
                    </div>
                  </div>
                  
                  {hand.description && (
                    <div className="hand-description">
                      <p>{hand.description}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-hands">
                <Star size={64} />
                <h3>Nenhuma mão registrada</h3>
                <p>Ainda não há melhores mãos registradas no clube.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ranking;
