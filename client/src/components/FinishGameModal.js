import React, { useState, useEffect } from 'react';
import { X, Trophy, Users, Calculator, Check, AlertCircle } from 'lucide-react';
import './FinishGameModal.css';

function FinishGameModal({ isOpen, onClose, game, onFinish }) {
  const [results, setResults] = useState([]);
  const [prizePool, setPrizePool] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && game) {
      const initialResults = game.participants.map((participant) => ({
        user_id: participant.user_id,
        username: participant.username,
        avatar: participant.avatar,
        position: null,
        points_earned: 0,
        prize_amount: 0
      }));
      setResults(initialResults);

      const buyIn = parseFloat(game.buy_in ?? 0) || 0;
      const rebuyValue = parseFloat(game.rebuy_value ?? 0) || 0;
      const addonValue = parseFloat(game.addon_value ?? 0) || 0;
      const participantsCount = Array.isArray(game.participants) ? game.participants.length : 0;
      const totalBuyIns = buyIn * participantsCount;
      const totalRebuys = game.participants.reduce((sum, p) => {
        const count = parseInt(p.rebuys ?? 0, 10) || 0;
        return sum + count * rebuyValue;
      }, 0);
      const totalAddons = game.participants.reduce((sum, p) => {
        const count = parseInt(p.addons ?? 0, 10) || 0;
        return sum + count * addonValue;
      }, 0);

      setPrizePool(totalBuyIns + totalRebuys + totalAddons);
      setErrors({});
    }
  }, [isOpen, game]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value || 0) || 0);
  };

  // Calcular pontos baseado na posição
  const calculatePoints = (position, totalPlayers) => {
    if (!position || position < 1 || position > totalPlayers) return 0;
    return Math.max(0, (totalPlayers - position + 1) * 10);
  };

  // Atualizar posição de um jogador
  const updatePlayerPosition = (userId, position) => {
    setResults(prev => {
      const newResults = prev.map(result => {
        if (result.user_id === userId) {
          const points = calculatePoints(position, prev.length);
          return {
            ...result,
            position: position || null,
            points_earned: points
          };
        }
        return result;
      });
      return newResults;
    });
    
    // Limpar erros quando posição é atualizada
    if (errors[userId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[userId];
        return newErrors;
      });
    }
  };

  // Atualizar pontos manualmente
  const updatePlayerPoints = (userId, points) => {
    setResults(prev => prev.map(result => 
      result.user_id === userId 
        ? { ...result, points_earned: parseInt(points) || 0 }
        : result
    ));
  };

  // Atualizar prêmio
  const updatePlayerPrize = (userId, prize) => {
    setResults(prev => prev.map(result => 
      result.user_id === userId 
        ? { ...result, prize_amount: parseFloat(prize) || 0 }
        : result
    ));
  };

  // Validar resultados
  const validateResults = () => {
    const newErrors = {};
    const positions = results.map(r => r.position).filter(p => p !== null);
    const uniquePositions = [...new Set(positions)];
    
    // Verificar se todas as posições estão preenchidas
    results.forEach(result => {
      if (!result.position) {
        newErrors[result.user_id] = 'Posição é obrigatória';
      }
    });
    
    // Verificar posições duplicadas
    if (positions.length !== uniquePositions.length) {
      results.forEach(result => {
        if (result.position && positions.filter(p => p === result.position).length > 1) {
          newErrors[result.user_id] = 'Posição duplicada';
        }
      });
    }
    
    // Verificar se as posições são sequenciais (1, 2, 3, ...)
    const sortedPositions = uniquePositions.sort((a, b) => a - b);
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i] !== i + 1) {
        setErrors(prev => ({ ...prev, general: 'As posições devem ser sequenciais (1, 2, 3...)' }));
        return false;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Finalizar jogo
  const handleFinish = async () => {
    if (!validateResults()) {
      return;
    }
    
    setLoading(true);
    try {
      await onFinish({
        results: results.map(({ user_id, position, points_earned, prize_amount }) => ({
          user_id,
          position,
          points_earned,
          prize_amount
        })),
        prize_pool: prizePool
      });
      onClose();
    } catch (error) {
      console.error('Erro ao finalizar jogo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ordenar resultados por posição
  const sortedResults = [...results].sort((a, b) => {
    if (!a.position && !b.position) return 0;
    if (!a.position) return 1;
    if (!b.position) return -1;
    return a.position - b.position;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="finish-game-modal">
        <div className="modal-header">
          <h2>
            <Trophy className="modal-icon" />
            Finalizar Jogo
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="game-info">
            <h3>{game?.name}</h3>
            <div className="game-details">
              <span><Users size={16} /> {game?.participants?.length} jogadores</span>
              <span><Calculator size={16} /> Buy-in: {formatCurrency(parseFloat(game?.buy_in ?? 0) || 0)}</span>
            </div>
          </div>

          {errors.general && (
            <div className="error-message">
              <AlertCircle size={16} />
              {errors.general}
            </div>
          )}

          <div className="prize-pool-section">
            <label>
              <Calculator className="input-icon" />
              Prize Pool Total (R$)
            </label>
            <input
              type="number"
              value={prizePool}
              onChange={(e) => setPrizePool(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>

          <div className="results-section">
            <h4>Classificação Final</h4>
            <div className="results-grid">
              <div className="grid-header">
                <span>Jogador</span>
                <span>Posição</span>
                <span>Pontos</span>
                <span>Prêmio (R$)</span>
              </div>
              
              {sortedResults.map((result) => (
                <div key={result.user_id} className={`result-row ${errors[result.user_id] ? 'error' : ''}`}>
                  <div className="player-info">
                    <div className="player-avatar">
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.username} />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <span className="player-name">{result.username}</span>
                  </div>
                  
                  <div className="position-input">
                    <select
                      value={result.position || ''}
                      onChange={(e) => updatePlayerPosition(result.user_id, parseInt(e.target.value) || null)}
                      className={errors[result.user_id] ? 'error' : ''}
                    >
                      <option value="">Selecione</option>
                      {Array.from({ length: results.length }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}º</option>
                      ))}
                    </select>
                    {errors[result.user_id] && (
                      <span className="error-text">{errors[result.user_id]}</span>
                    )}
                  </div>
                  
                  <div className="points-input">
                    <input
                      type="number"
                      value={result.points_earned}
                      onChange={(e) => updatePlayerPoints(result.user_id, e.target.value)}
                      min="0"
                    />
                  </div>
                  
                  <div className="prize-input">
                    <input
                      type="number"
                      value={result.prize_amount}
                      onChange={(e) => updatePlayerPrize(result.user_id, e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-item">
              <span>Total de Pontos Distribuídos:</span>
              <span>{results.reduce((sum, r) => sum + (r.points_earned || 0), 0)}</span>
            </div>
            <div className="summary-item">
              <span>Total de Prêmios Distribuídos:</span>
              <span>R$ {results.reduce((sum, r) => sum + (r.prize_amount || 0), 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button 
            className="finish-button" 
            onClick={handleFinish} 
            disabled={loading || Object.keys(errors).length > 0}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Finalizando...
              </>
            ) : (
              <>
                <Check size={16} />
                Finalizar Jogo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinishGameModal;
