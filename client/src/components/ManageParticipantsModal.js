import React, { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, UserMinus, Users, Search, Save, Check, AlertCircle } from 'lucide-react';
import './ManageParticipantsModal.css';

const ParticipantItem = ({ participant, gameId, onRemove, onUpdateStats, disabled, gameStatus }) => {
  const [rebuys, setRebuys] = useState(participant.rebuys || 0);
  const [addons, setAddons] = useState(participant.addons || 0);
  const [updating, setUpdating] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, success, error
  const [saveError, setSaveError] = useState('');

  // Update local state when prop changes (e.g. after refresh)
  useEffect(() => {
    setRebuys(participant.rebuys || 0);
    setAddons(participant.addons || 0);
  }, [participant.rebuys, participant.addons]);

  const handleBlur = async () => {
    // Convert to integers to compare properly
    const currentRebuys = parseInt(rebuys) || 0;
    const currentAddons = parseInt(addons) || 0;
    const originalRebuys = participant.rebuys || 0;
    const originalAddons = participant.addons || 0;

    // Only update if values changed
    if (currentRebuys === originalRebuys && currentAddons === originalAddons) {
      return;
    }

    setUpdating(true);
    setSaveStatus('saving');
    setSaveError('');
    
    // Ensure we send numbers
    const rebuysVal = currentRebuys;
    const addonsVal = currentAddons;

    const result = await onUpdateStats(participant.user_id, rebuysVal, addonsVal);
    
    setUpdating(false);
    if (result.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setSaveError(result.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="participant-item">
      <div className="participant-info">
        <Users size={16} />
        <span>{participant.username}</span>
        {participant.position && (
          <span className="position">#{participant.position}</span>
        )}
      </div>
      
      <div className="participant-actions">
        <div className="participant-stats">
          <div className="stat-input-group">
            <label>Rebuys</label>
            <input 
              type="number" 
              min="0"
              value={rebuys}
              onChange={(e) => setRebuys(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled || updating}
            />
          </div>
          <div className="stat-input-group">
            <label>Add-ons</label>
            <input 
              type="number" 
              min="0"
              value={addons}
              onChange={(e) => setAddons(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled || updating}
            />
          </div>
        </div>

        {saveStatus === 'saving' && <Save size={16} className="status-icon saving" />}
        {saveStatus === 'success' && <Check size={16} className="status-icon success" />}
        {saveStatus === 'error' && <AlertCircle size={16} className="status-icon error" title={saveError} />}

        {gameStatus !== 'finished' && (
          <button
            className="remove-btn"
            onClick={() => onRemove(participant.user_id)}
            disabled={disabled || updating}
            title="Remover participante"
          >
            <UserMinus size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const ManageParticipantsModal = ({ isOpen, onClose, game, onUpdate }) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const users = await response.json();
        const participantIds = game.participants?.map(p => p.user_id) || [];
        const filtered = users.filter(user => 
          user.role !== 'admin' && !participantIds.includes(user.id)
        );
        setAvailableUsers(filtered);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setError('Erro ao carregar usuários disponíveis');
    }
  }, [game]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, fetchAvailableUsers]);

  const handleAddParticipant = async (userId) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${game.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (response.ok) {
        await onUpdate(); // Atualizar lista de jogos
        await fetchAvailableUsers(); // Atualizar usuários disponíveis
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao adicionar participante');
      }
    } catch (error) {
      console.error('Erro ao adicionar participante:', error);
      setError('Erro ao adicionar participante');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${game.id}/participants/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await onUpdate(); // Atualizar lista de jogos
        await fetchAvailableUsers(); // Atualizar usuários disponíveis
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao remover participante');
      }
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      setError('Erro ao remover participante');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStats = async (userId, rebuys, addons) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${game.id}/participants/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rebuys, addons })
      });
      
      if (response.ok) {
        await onUpdate(); // Sync parent state
        return { success: true };
      } else {
        const data = await response.json();
        console.error('Error response from server:', data);
        setError(data.message || 'Erro ao atualizar estatísticas');
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
      setError('Erro ao atualizar estatísticas');
      return { success: false, message: 'Erro de conexão' };
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="manage-participants-modal">
        <div className="modal-header">
          <h2>
            <Users size={24} />
            Gerenciar Participantes - {game.name}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="modal-content">
          {/* Participantes Atuais */}
          <div className="current-participants">
            <h3>Participantes Atuais ({game.participants?.length || 0}/{game.max_players})</h3>
            {game.participants && game.participants.length > 0 ? (
              <div className="participants-list">
                {game.participants.map(participant => (
                  <ParticipantItem
                    key={participant.user_id}
                    participant={participant}
                    gameId={game.id}
                    onRemove={handleRemoveParticipant}
                    onUpdateStats={handleUpdateStats}
                    disabled={loading}
                    gameStatus={game.status}
                  />
                ))}
              </div>
            ) : (
              <p className="no-participants">Nenhum participante ainda</p>
            )}
          </div>

          {/* Adicionar Participantes */}
          {game.status !== 'finished' && game.participants?.length < game.max_players && (
            <div className="add-participants">
              <h3>Adicionar Participantes</h3>
              
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="available-users">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <Users size={16} />
                        <div>
                          <span className="username">{user.username}</span>
                          <span className="email">{user.email}</span>
                        </div>
                      </div>
                      <button
                        className="add-btn"
                        onClick={() => handleAddParticipant(user.id)}
                        disabled={loading}
                        title="Adicionar participante"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-users">
                    {searchTerm ? 'Nenhum usuário encontrado' : 'Todos os usuários já estão participando'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageParticipantsModal;
