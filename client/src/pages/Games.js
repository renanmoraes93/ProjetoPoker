import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Trophy, 
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import FinishGameModal from '../components/FinishGameModal';
import ManageParticipantsModal from '../components/ManageParticipantsModal';
import EditPositionsModal from '../components/EditPositionsModal';
import GameDetailsModal from '../components/GameDetailsModal';
import TimerModal from '../components/TimerModal';
import './Games.css';

function Games() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showManageParticipantsModal, setShowManageParticipantsModal] = useState(false);
  const [showEditPositionsModal, setShowEditPositionsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  
  // Selected items state
  const [editingGame, setEditingGame] = useState(null);
  const [finishingGame, setFinishingGame] = useState(null);
  const [managingGame, setManagingGame] = useState(null);
  const [editingPositionsGame, setEditingPositionsGame] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [timerGame, setTimerGame] = useState(null);

  const [newGame, setNewGame] = useState({
    name: '',
    date: '',
    buy_in: '',
    rebuy_value: '',
    addon_value: '',
    max_players: ''
  });
  
  const [editGame, setEditGame] = useState({
    name: '',
    date: '',
    buy_in: '',
    rebuy_value: '',
    addon_value: '',
    max_players: '',
    prize_structure: ''
  });

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      const response = await axios.get(`/api/games?${params.toString()}`);
      setGames(response.data);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
      toast.error('Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Update selectedGame and other modal states when games list changes
  useEffect(() => {
    if (selectedGame) {
      const updatedGame = games.find(g => g.id === selectedGame.id);
      if (updatedGame) {
        setSelectedGame(updatedGame);
      }
    }
    if (managingGame) {
      const updatedGame = games.find(g => g.id === managingGame.id);
      if (updatedGame) {
        setManagingGame(updatedGame);
      }
    }
    if (editingPositionsGame) {
      const updatedGame = games.find(g => g.id === editingPositionsGame.id);
      if (updatedGame) {
        setEditingPositionsGame(updatedGame);
      }
    }
  }, [games, selectedGame, managingGame, editingPositionsGame]);


  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newGame.name,
        date: newGame.date,
        buy_in: newGame.buy_in,
        rebuy_value: newGame.rebuy_value || 0,
        addon_value: newGame.addon_value || 0,
        max_players: newGame.max_players
      };
      await axios.post('/api/games', payload);
      toast.success('Jogo criado com sucesso!');
      setShowCreateModal(false);
      setNewGame({
        name: '',
        date: '',
        buy_in: '',
        rebuy_value: '',
        addon_value: '',
        max_players: ''
      });
      fetchGames();
    } catch (error) {
      console.error('Erro ao criar jogo:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar jogo');
    }
  };

  const handleJoinGame = async (gameId) => {
    try {
      await axios.post(`/api/games/${gameId}/join`);
      toast.success('Você se inscreveu no jogo!');
      fetchGames();
      // Update selected game if modal is open
      if (selectedGame && selectedGame.id === gameId) {
        const updatedGame = games.find(g => g.id === gameId);
        if (updatedGame) {
            // Need to fetch fresh data for the modal
            const response = await axios.get(`/api/games/${gameId}`);
            setSelectedGame(response.data);
        }
      }
    } catch (error) {
      console.error('Erro ao se inscrever no jogo:', error);
      toast.error(error.response?.data?.message || 'Erro ao se inscrever no jogo');
    }
  };

  const handleLeaveGame = async (gameId) => {
    try {
      await axios.delete(`/api/games/${gameId}/leave`);
      toast.success('Você saiu do jogo!');
      fetchGames();
      if (selectedGame && selectedGame.id === gameId) {
         const response = await axios.get(`/api/games/${gameId}`);
         setSelectedGame(response.data);
      }
    } catch (error) {
      console.error('Erro ao sair do jogo:', error);
      toast.error(error.response?.data?.message || 'Erro ao sair do jogo');
    }
  };

  const handleFinishGame = async (gameId) => {
    try {
      const response = await axios.get(`/api/games/${gameId}`);
      setFinishingGame(response.data);
      setShowDetailsModal(false); // Close details modal if open
      setShowFinishModal(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do jogo:', error);
      toast.error('Erro ao carregar detalhes do jogo');
    }
  };

  const handleFinishGameSubmit = async (finishData) => {
    try {
      await axios.put(`/api/games/${finishingGame.id}/finish`, finishData);
      toast.success('Jogo finalizado com sucesso!');
      setShowFinishModal(false);
      setFinishingGame(null);
      fetchGames();
    } catch (error) {
      console.error('Erro ao finalizar jogo:', error);
      toast.error(error.response?.data?.message || 'Erro ao finalizar jogo');
      throw error;
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (window.confirm('Tem certeza que deseja deletar este jogo?')) {
      try {
        await axios.delete(`/api/games/${gameId}`);
        toast.success('Jogo deletado com sucesso!');
        setShowDetailsModal(false);
        fetchGames();
      } catch (error) {
        console.error('Erro ao deletar jogo:', error);
        toast.error(error.response?.data?.message || 'Erro ao deletar jogo');
      }
    }
  };

  const handleEditGame = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editGame.name,
        date: editGame.date,
        buy_in: editGame.buy_in !== '' ? parseFloat(editGame.buy_in) : undefined,
        rebuy_value: editGame.rebuy_value !== '' ? parseFloat(editGame.rebuy_value) : undefined,
        addon_value: editGame.addon_value !== '' ? parseFloat(editGame.addon_value) : undefined,
        max_players: editGame.max_players !== '' ? parseInt(editGame.max_players, 10) : undefined
      };
      await axios.put(`/api/games/${editingGame.id}`, payload);
      toast.success('Jogo editado com sucesso!');
      setShowEditModal(false);
      setEditingGame(null);
      setEditGame({
        name: '',
        description: '',
        date: '',
        buy_in: '',
        rebuy_value: '',
        addon_value: '',
        max_players: '',
        prize_structure: ''
      });
      fetchGames();
    } catch (error) {
      console.error('Erro ao editar jogo:', error);
      toast.error(error.response?.data?.message || 'Erro ao editar jogo');
    }
  };

  const handleStartGame = async (gameId) => {
    if (window.confirm('Tem certeza que deseja iniciar este jogo?')) {
      try {
        await axios.put(`/api/games/${gameId}`, { status: 'in_progress' });
        toast.success('Jogo iniciado com sucesso!');
        fetchGames();
        if (selectedGame && selectedGame.id === gameId) {
            const response = await axios.get(`/api/games/${gameId}`);
            setSelectedGame(response.data);
        }
      } catch (error) {
        console.error('Erro ao iniciar jogo:', error);
        toast.error(error.response?.data?.message || 'Erro ao iniciar jogo');
      }
    }
  };

  const openEditModal = (game) => {
    setEditingGame(game);
    setEditGame({
      name: game.name,
      date: new Date(game.date).toISOString().slice(0, 16),
      buy_in: game.buy_in ?? '',
      rebuy_value: game.rebuy_value ?? '',
      addon_value: game.addon_value ?? '',
      max_players: game.max_players ?? ''
    });
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const openManageParticipantsModal = (game) => {
    setManagingGame(game);
    setShowDetailsModal(false);
    setShowManageParticipantsModal(true);
  };

  const openEditPositionsModal = (game) => {
    setEditingPositionsGame(game);
    setShowDetailsModal(false);
    setShowEditPositionsModal(true);
  };

  const openTimerModal = (game) => {
    setTimerGame(game);
    setShowTimerModal(true);
  };

  const handleUpdateParticipantStats = async (gameId, userId, stats) => {
    try {
      await axios.put(`/api/games/${gameId}/participants/${userId}`, stats);
      // Refresh game details
      if (selectedGame && selectedGame.id === gameId) {
        const response = await axios.get(`/api/games/${gameId}`);
        setSelectedGame(response.data);
      }
      fetchGames(); // Also refresh the main list if needed
    } catch (error) {
      console.error('Erro ao atualizar estatísticas do participante:', error);
      toast.error('Erro ao atualizar estatísticas');
    }
  };

  const handleCardClick = (game) => {
    setSelectedGame(game);
    setShowDetailsModal(true);
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="status-icon scheduled" />;
      case 'in_progress':
        return <AlertCircle className="status-icon in-progress" />;
      case 'finished':
        return <CheckCircle className="status-icon finished" />;
      case 'cancelled':
        return <XCircle className="status-icon cancelled" />;
      default:
        return <Clock className="status-icon" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado';
      case 'in_progress':
        return 'Em Andamento';
      case 'finished':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="games-loading">
        <div className="loading-spinner"></div>
        <p>Carregando jogos...</p>
      </div>
    );
  }

  return (
    <div className="games-page">
      {/* Header */}
      <div className="games-header">
        <div className="header-content">
          <h1>
            <Trophy className="page-icon" />
            Jogos do Clube
          </h1>
          <p>Gerencie e participe dos jogos do Gorila'z Poker Club</p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            className="create-game-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Criar Jogo
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="games-controls">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar jogos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button 
            className={`filter-tab ${filter === 'scheduled' ? 'active' : ''}`}
            onClick={() => setFilter('scheduled')}
          >
            Agendados
          </button>
          <button 
            className={`filter-tab ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            Em Andamento
          </button>
          <button 
            className={`filter-tab ${filter === 'finished' ? 'active' : ''}`}
            onClick={() => setFilter('finished')}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="games-grid">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div 
              key={game.id} 
              className="game-card clickable"
              onClick={() => handleCardClick(game)}
            >
              <div className="game-header">
                <div className="game-title">
                  <h3>{game.name}</h3>
                  <div className="game-status">
                    {getStatusIcon(game.status)}
                    <span>{getStatusText(game.status)}</span>
                  </div>
                </div>
              </div>
              
              <div className="game-card-details">
                <div className="detail-item">
                  <Calendar className="detail-icon" />
                  <span>{formatDate(game.date)}</span>
                </div>
                
                <div className="detail-item">
                  <DollarSign className="detail-icon" />
                  <span>{formatCurrency(game.buy_in)}</span>
                </div>
                
                <div className="detail-item">
                  <Users className="detail-icon" />
                  <span>{game.participants?.length || 0}/{game.max_players}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); openTimerModal(game); }}
                  >
                    <Clock size={16} />
                    Timer
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Trophy size={64} />
            <h3>Nenhum jogo encontrado</h3>
            <p>Não há jogos que correspondam aos filtros selecionados.</p>
            {user?.role === 'admin' && (
              <button 
                className="create-first-game-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} />
                Criar Primeiro Jogo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Criar Novo Jogo</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateGame} className="game-form">
              <div className="form-group">
                <label>Nome do Jogo</label>
                <input
                  type="text"
                  value={newGame.name}
                  onChange={(e) => setNewGame({...newGame, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={newGame.date}
                    onChange={(e) => setNewGame({...newGame, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Buy-in (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newGame.buy_in}
                    onChange={(e) => setNewGame({...newGame, buy_in: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Valor Rebuy (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newGame.rebuy_value}
                    onChange={(e) => setNewGame({...newGame, rebuy_value: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Valor Add-on (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newGame.addon_value}
                    onChange={(e) => setNewGame({...newGame, addon_value: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Máximo de Jogadores</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={newGame.max_players}
                    onChange={(e) => setNewGame({...newGame, max_players: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Criar Jogo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Jogo</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditGame} className="game-form">
              <div className="form-group">
                <label>Nome do Jogo</label>
                <input
                  type="text"
                  value={editGame.name}
                  onChange={(e) => setEditGame({...editGame, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={editGame.date}
                    onChange={(e) => setEditGame({...editGame, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Buy-in (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGame.buy_in}
                    onChange={(e) => setEditGame({...editGame, buy_in: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Valor Rebuy (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGame.rebuy_value}
                    onChange={(e) => setEditGame({...editGame, rebuy_value: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Valor Add-on (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGame.addon_value}
                    onChange={(e) => setEditGame({...editGame, addon_value: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Máximo de Jogadores</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={editGame.max_players}
                    onChange={(e) => setEditGame({...editGame, max_players: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FinishGameModal
        isOpen={showFinishModal}
        onClose={() => {
          setShowFinishModal(false);
          setFinishingGame(null);
        }}
        game={finishingGame}
        onFinish={handleFinishGameSubmit}
      />

      <ManageParticipantsModal
        isOpen={showManageParticipantsModal}
        onClose={() => {
          setShowManageParticipantsModal(false);
          setManagingGame(null);
        }}
        game={managingGame}
        onUpdate={fetchGames}
      />

      <EditPositionsModal
        isOpen={showEditPositionsModal}
        onClose={() => {
          setShowEditPositionsModal(false);
          setEditingPositionsGame(null);
        }}
        game={editingPositionsGame}
        onUpdate={fetchGames}
      />

      <GameDetailsModal
        game={selectedGame}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        user={user}
        onJoin={() => handleJoinGame(selectedGame?.id)}
        onLeave={() => handleLeaveGame(selectedGame?.id)}
        onEdit={() => openEditModal(selectedGame)}
        onDelete={() => handleDeleteGame(selectedGame?.id)}
        onStart={() => handleStartGame(selectedGame?.id)}
        onFinish={() => handleFinishGame(selectedGame?.id)}
        onManage={() => openManageParticipantsModal(selectedGame)}
        onEditPositions={() => openEditPositionsModal(selectedGame)}
        onOpenTimer={() => openTimerModal(selectedGame)}
        onUpdateParticipantStats={handleUpdateParticipantStats}
      />

      {showTimerModal && timerGame && (
        <TimerModal
          isOpen={showTimerModal}
          onClose={() => setShowTimerModal(false)}
          game={timerGame}
          user={user}
        />
      )}
    </div>
  );
}

export default Games;
