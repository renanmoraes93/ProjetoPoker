import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Trophy, 
  Users,
  Search,
  Filter,
  Award,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import './BestHands.css';

function BestHands() {
  const { user } = useAuth();
  const [hands, setHands] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHand, setSelectedHand] = useState(null);
  const [newHand, setNewHand] = useState({
    hand_type: '',
    cards: '',
    game_id: '',
    user_id: '',
    description: ''
  });
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);

  const handTypes = [
    'Royal Flush',
    'Straight Flush',
    'Four of a Kind',
    'Full House',
    'Flush',
    'Straight',
    'Three of a Kind',
    'Two Pair',
    'One Pair',
    'High Card'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests = [
        axios.get('/api/club/best-hands'),
        axios.get('/api/club/hand-stats'),
        axios.get('/api/games?status=finished')
      ];
      const includeUsers = user?.role === 'admin';
      if (includeUsers) {
        requests.push(axios.get('/api/users'));
      }
      const responses = await Promise.all(requests);
      
      setHands(responses[0].data);
      setStats(responses[1].data);
      setGames(responses[2].data);
      if (includeUsers && responses[3]) {
        setUsers(responses[3].data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar melhores mãos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHand = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/club/best-hands', newHand);
      toast.success('Mão registrada com sucesso!');
      setShowCreateModal(false);
      setNewHand({
        hand_type: '',
        cards: '',
        game_id: '',
        user_id: '',
        description: ''
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao registrar mão:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar mão');
    }
  };

  const handleEditHand = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/club/best-hands/${selectedHand.id}`, selectedHand);
      toast.success('Mão atualizada com sucesso!');
      setShowEditModal(false);
      setSelectedHand(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar mão:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar mão');
    }
  };

  const handleDeleteHand = async (handId) => {
    if (window.confirm('Tem certeza que deseja deletar esta mão?')) {
      try {
        await axios.delete(`/api/club/best-hands/${handId}`);
        toast.success('Mão deletada com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Erro ao deletar mão:', error);
        toast.error(error.response?.data?.message || 'Erro ao deletar mão');
      }
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

  const getHandRarity = (handType) => {
    const rarities = {
      'Royal Flush': 'legendary',
      'Straight Flush': 'epic',
      'Four of a Kind': 'rare',
      'Full House': 'uncommon',
      'Flush': 'common',
      'Straight': 'common',
      'Three of a Kind': 'common',
      'Two Pair': 'common',
      'One Pair': 'common',
      'High Card': 'common'
    };
    return rarities[handType] || 'common';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredHands = hands.filter(hand => {
    const matchesSearch = hand.hand_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hand.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hand.cards.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hand.game_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || hand.hand_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="best-hands-loading">
        <div className="loading-spinner"></div>
        <p>Carregando melhores mãos...</p>
      </div>
    );
  }

  return (
    <div className="best-hands-page">
      {/* Header */}
      <div className="best-hands-header">
        <div className="header-content">
          <h1>
            <Star className="page-icon" />
            Melhores Mãos
          </h1>
          <p>Registre e celebre as melhores mãos do Gorila'z Poker Club</p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            className="create-hand-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Registrar Mão
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <Star />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_hands}</span>
              <span className="stat-label">Total de Mãos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Trophy />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.unique_players}</span>
              <span className="stat-label">Jogadores Únicos</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Award />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.most_common_type}</span>
              <span className="stat-label">Tipo Mais Comum</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Target />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.rarest_type}</span>
              <span className="stat-label">Tipo Mais Raro</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="hands-controls">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar mãos, jogadores, cartas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <Filter className="filter-icon" />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos os tipos</option>
            {handTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hands Grid */}
      <div className="hands-grid">
        {filteredHands.length > 0 ? (
          filteredHands.map((hand) => (
            <div key={hand.id} className={`hand-card ${getHandRarity(hand.hand_type)}`}>
              <div className="hand-header">
                <div className="hand-type">
                  <div className="hand-icon">
                    {getHandTypeIcon(hand.hand_type)}
                  </div>
                  <div className="hand-info">
                    <h3>{hand.hand_type}</h3>
                    <span className="hand-cards">{hand.cards}</span>
                  </div>
                </div>
                
                {user?.role === 'admin' && (
                  <div className="hand-actions">
                    <button 
                      className="action-btn edit"
                      onClick={() => {
                        setSelectedHand(hand);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteHand(hand.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="hand-details">
                <div className="detail-row">
                  <Users className="detail-icon" />
                  <span className="detail-label">Jogador:</span>
                  <span className="detail-value">{hand.username}</span>
                </div>
                
                <div className="detail-row">
                  <Trophy className="detail-icon" />
                  <span className="detail-label">Jogo:</span>
                  <span className="detail-value">{hand.game_name}</span>
                </div>
                
                <div className="detail-row">
                  <Calendar className="detail-icon" />
                  <span className="detail-label">Data:</span>
                  <span className="detail-value">{formatDate(hand.date)}</span>
                </div>
              </div>
              
              {hand.description && (
                <div className="hand-description">
                  <p>{hand.description}</p>
                </div>
              )}
              
              <div className="hand-rarity">
                <span className={`rarity-badge ${getHandRarity(hand.hand_type)}`}>
                  {getHandRarity(hand.hand_type).toUpperCase()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Star size={64} />
            <h3>Nenhuma mão encontrada</h3>
            <p>Não há mãos que correspondam aos filtros selecionados.</p>
            {user?.role === 'admin' && (
              <button 
                className="create-first-hand-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} />
                Registrar Primeira Mão
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Hand Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Nova Mão</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateHand} className="hand-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo da Mão</label>
                  <select
                    value={newHand.hand_type}
                    onChange={(e) => setNewHand({...newHand, hand_type: e.target.value})}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    {handTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Cartas</label>
                  <input
                    type="text"
                    placeholder="Ex: As Ks Qs Js Ts"
                    value={newHand.cards}
                    onChange={(e) => setNewHand({...newHand, cards: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Jogo</label>
                <select
                  value={newHand.game_id}
                  onChange={(e) => setNewHand({...newHand, game_id: e.target.value})}
                  required
                >
                  <option value="">Selecione o jogo</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name} - {formatDate(game.date)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Jogador</label>
                <select
                  value={newHand.user_id}
                  onChange={(e) => setNewHand({...newHand, user_id: e.target.value})}
                  required
                >
                  <option value="">Selecione o jogador</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Descrição (opcional)</label>
                <textarea
                  placeholder="Descreva o contexto da mão..."
                  value={newHand.description}
                  onChange={(e) => setNewHand({...newHand, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="submit-btn">
                  Registrar Mão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hand Modal */}
      {showEditModal && selectedHand && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Mão</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditHand} className="hand-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo da Mão</label>
                  <select
                    value={selectedHand.hand_type}
                    onChange={(e) => setSelectedHand({...selectedHand, hand_type: e.target.value})}
                    required
                  >
                    {handTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Cartas</label>
                  <input
                    type="text"
                    value={selectedHand.cards}
                    onChange={(e) => setSelectedHand({...selectedHand, cards: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={selectedHand.description || ''}
                  onChange={(e) => setSelectedHand({...selectedHand, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="submit-btn">
                  Atualizar Mão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BestHands;
