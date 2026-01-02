import React, { useState, useEffect } from 'react';
import { X, Trophy, Save, RotateCcw } from 'lucide-react';
import './EditPositionsModal.css';

const EditPositionsModal = ({ isOpen, onClose, game, onUpdate }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && game?.participants) {
      // Inicializar posições com os dados atuais
      const initialPositions = game.participants
        .map(participant => ({
          user_id: participant.user_id,
          username: participant.username,
          position: participant.position || null,
          originalPosition: participant.position || null
        }))
        .sort((a, b) => {
          // Ordenar por posição (nulls por último)
          if (a.position === null && b.position === null) return 0;
          if (a.position === null) return 1;
          if (b.position === null) return -1;
          return a.position - b.position;
        });
      
      setPositions(initialPositions);
      setHasChanges(false);
      setError('');
    }
  }, [isOpen, game]);

  const updatePosition = (userId, newPosition) => {
    setPositions(prev => {
      const updated = prev.map(p => {
        if (p.user_id === userId) {
          return { ...p, position: newPosition === '' ? null : parseInt(newPosition) };
        }
        return p;
      });
      
      // Verificar se houve mudanças
      const changed = updated.some(p => p.position !== p.originalPosition);
      setHasChanges(changed);
      
      return updated;
    });
  };

  const validatePositions = () => {
    const filledPositions = positions.filter(p => p.position !== null);
    const positionNumbers = filledPositions.map(p => p.position);
    
    // Verificar posições duplicadas
    const duplicates = positionNumbers.filter((pos, index) => 
      positionNumbers.indexOf(pos) !== index
    );
    
    if (duplicates.length > 0) {
      setError(`Posições duplicadas encontradas: ${duplicates.join(', ')}`);
      return false;
    }
    
    // Verificar se as posições são sequenciais a partir de 1
    if (filledPositions.length > 0) {
      const sortedPositions = [...positionNumbers].sort((a, b) => a - b);
      for (let i = 0; i < sortedPositions.length; i++) {
        if (sortedPositions[i] !== i + 1) {
          setError('As posições devem ser sequenciais começando em 1');
          return false;
        }
      }
    }
    
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validatePositions()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const positionsToUpdate = positions
        .filter(p => p.position !== null)
        .map(p => ({
          user_id: p.user_id,
          position: p.position
        }));
      
      const response = await fetch(`/api/games/${game.id}/positions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ positions: positionsToUpdate })
      });
      
      if (response.ok) {
        await onUpdate(); // Atualizar lista de jogos
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao atualizar posições');
      }
    } catch (error) {
      console.error('Erro ao atualizar posições:', error);
      setError('Erro ao atualizar posições');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (game?.participants) {
      const resetPositions = game.participants.map(participant => ({
        user_id: participant.user_id,
        username: participant.username,
        position: participant.position || null,
        originalPosition: participant.position || null
      }));
      setPositions(resetPositions);
      setHasChanges(false);
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="edit-positions-modal">
        <div className="modal-header">
          <h2>
            <Trophy size={24} />
            Editar Posições Finais - {game.name}
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
          <div className="instructions">
            <p>Defina as posições finais dos participantes. As posições devem ser sequenciais começando em 1.</p>
            <p>Os pontos serão recalculados automaticamente usando a fórmula: (11 - posição) × 10</p>
          </div>

          <div className="positions-list">
            {positions.map((participant, index) => {
              const points = participant.position ? (11 - participant.position) * 10 : 0;
              
              return (
                <div key={participant.user_id} className="position-item">
                  <div className="participant-info">
                    <span className="username">{participant.username}</span>
                    {points > 0 && (
                      <span className="points">{points} pontos</span>
                    )}
                  </div>
                  
                  <div className="position-input">
                    <label>Posição:</label>
                    <select
                      value={participant.position || ''}
                      onChange={(e) => updatePosition(participant.user_id, e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Selecionar...</option>
                      {Array.from({ length: positions.length }, (_, i) => i + 1).map(pos => (
                        <option key={pos} value={pos}>
                          {pos}º lugar
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="reset-btn" 
            onClick={handleReset}
            disabled={loading || !hasChanges}
          >
            <RotateCcw size={16} />
            Resetar
          </button>
          
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar Posições'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPositionsModal;
