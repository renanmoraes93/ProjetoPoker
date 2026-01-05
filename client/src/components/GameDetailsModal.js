import React from 'react';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Edit,
  Trash2,
  Settings,
  UserPlus,
  UserMinus,
  Trophy,
  X,
  Timer as TimerIcon
} from 'lucide-react';
import './GameDetailsModal.css';

const GameDetailsModal = ({ 
  game, 
  isOpen, 
  onClose, 
  user,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onStart,
  onFinish,
  onManage,
  onEditPositions,
  onOpenTimer
}) => {
  if (!isOpen || !game) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
        return { icon: <Clock size={18} />, text: 'Agendado', class: 'scheduled' };
      case 'in_progress':
        return { icon: <AlertCircle size={18} />, text: 'Em Andamento', class: 'in-progress' };
      case 'finished':
        return { icon: <CheckCircle size={18} />, text: 'Finalizado', class: 'finished' };
      case 'cancelled':
        return { icon: <XCircle size={18} />, text: 'Cancelado', class: 'cancelled' };
      default:
        return { icon: <Clock size={18} />, text: status, class: '' };
    }
  };

  const isUserInGame = game.participants?.some(p => p.user_id === user?.id);
  const canJoin = game.status === 'scheduled' && 
                  game.participants?.length < game.max_players && 
                  !isUserInGame;
  const canLeave = game.status === 'scheduled' && isUserInGame;
  const calculateTotalSpent = (participant) => {
    const buyIn = parseFloat(game.buy_in || 0) || 0;
    const rebuysUnit = parseFloat(game.rebuy_value || 0) || 0;
    const addonsUnit = parseFloat(game.addon_value || 0) || 0;
    const rebuysCount = parseInt(participant.rebuys || 0) || 0;
    const addonsCount = parseInt(participant.addons || 0) || 0;
    return buyIn + (rebuysCount * rebuysUnit) + (addonsCount * addonsUnit);
  };

  const statusInfo = getStatusInfo(game.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content game-details-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header-section">
          <div className={`status-badge ${statusInfo.class}`}>
            {statusInfo.icon}
            <span>{statusInfo.text}</span>
          </div>
          <h2>{game.name}</h2>
          {game.description && <p className="game-description">{game.description}</p>}
        </div>

        <div className="modal-body-section">
          <div className="info-grid">
            <div className="info-item">
              <Calendar className="info-icon" />
              <div className="info-content">
                <span className="info-label">Data e Hora</span>
                <span className="info-value">{formatDate(game.date)}</span>
              </div>
            </div>
            
            <div className="info-item">
              <DollarSign className="info-icon" />
              <div className="info-content">
                <span className="info-label">Buy-in</span>
                <span className="info-value">{formatCurrency(game.buy_in)}</span>
              </div>
            </div>

            <div className="info-item">
              <Users className="info-icon" />
              <div className="info-content">
                <span className="info-label">Jogadores</span>
                <span className="info-value">{game.participants?.length || 0} / {game.max_players}</span>
              </div>
            </div>
          </div>

          <div className="participants-section">
            <h3>Participantes ({game.participants?.length || 0})</h3>
            <div className="participants-list-scroll">
              {game.participants && game.participants.length > 0 ? (
                game.participants.map((participant) => (
                  <div key={participant.user_id} className="participant-item">
                    <div className="participant-avatar">
                      <Users size={16} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span className="participant-name" style={{ flex: 'none' }}>{participant.username}</span>
                      <div className="participant-extra-info">
                        {(participant.rebuys > 0 || participant.addons > 0) && (
                          <>
                            {participant.rebuys > 0 && (
                              <span className="info-badge rebuy" title="Rebuys">
                                R: {participant.rebuys}
                              </span>
                            )}
                            {participant.addons > 0 && (
                              <span className="info-badge addon" title="Add-ons">
                                A: {participant.addons}
                              </span>
                            )}
                          </>
                        )}
                        <span className="info-badge total-spent" title="Total Investido">
                          {formatCurrency(calculateTotalSpent(participant))}
                        </span>
                      </div>
                    </div>
                    {participant.position && (
                      <span className="participant-position">#{participant.position}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-participants">Nenhum participante ainda.</p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer-section">
          <div className="player-actions">
            {canJoin && (
              <button className="action-button join" onClick={() => onJoin(game.id)}>
                <UserPlus size={18} />
                Participar do Jogo
              </button>
            )}
            
            {canLeave && (
              <button className="action-button leave" onClick={() => onLeave(game.id)}>
                <UserMinus size={18} />
                Sair do Jogo
              </button>
            )}
            <button className="action-button" onClick={() => onOpenTimer(game)}>
              <TimerIcon size={18} />
              Timer
            </button>
          </div>

          {user?.role === 'admin' && (
            <div className="admin-actions">
              <div className="admin-divider">
                <span>Área Administrativa</span>
              </div>
              
              <div className="admin-buttons-grid">
                <button className="admin-btn edit" onClick={() => onEdit(game)}>
                  <Edit size={16} /> Editar
                </button>
                
                {game.status === 'scheduled' && (
                  <button className="admin-btn start" onClick={() => onStart(game.id)}>
                    <Play size={16} /> Iniciar
                  </button>
                )}

                {game.status === 'in_progress' && (
                  <button className="admin-btn finish" onClick={() => onFinish(game.id)}>
                    <CheckCircle size={16} /> Finalizar
                  </button>
                )}

                {(game.status === 'scheduled' || game.status === 'in_progress') && (
                  <button className="admin-btn manage" onClick={() => onManage(game)}>
                    <Settings size={16} /> Gerenciar
                  </button>
                )}

                {game.status === 'finished' && (
                  <button className="admin-btn positions" onClick={() => onEditPositions(game)}>
                    <Trophy size={16} /> Posições
                  </button>
                )}

                <button className="admin-btn delete" onClick={() => onDelete(game.id)}>
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetailsModal;
