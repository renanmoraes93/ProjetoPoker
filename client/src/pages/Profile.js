import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Trophy, Target, TrendingUp, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || ''
      });
      fetchUserStats();
    }
  }, [user, fetchUserStats]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        setEditing(false);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Todos os campos de senha são obrigatórios');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Nova senha e confirmação não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
        toast.success('Senha alterada com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      username: user.username || '',
      email: user.email || ''
    });
    setEditing(false);
  };

  const cancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordForm(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleDisplay = (role) => {
    return role === 'admin' ? 'Administrador' : 'Jogador';
  };

  const getRoleBadgeClass = (role) => {
    return role === 'admin' ? 'admin' : 'player';
  };

  if (!user) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="header-content">
          <h1>
            <User className="page-icon" />
            Meu Perfil
          </h1>
          <p>Gerencie suas informações pessoais e estatísticas</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Informações Básicas */}
        <div className="profile-card">
          <div className="card-header">
            <h2>Informações Pessoais</h2>
            {!editing ? (
              <button 
                className="edit-btn"
                onClick={() => setEditing(true)}
                disabled={loading}
              >
                <Edit2 size={16} />
                Editar
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={cancelEdit}
                  disabled={loading}
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="profile-info">
            <div className="avatar-section">
              <div className="avatar">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div className="role-badge-container">
                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                  {getRoleDisplay(user.role)}
                </span>
              </div>
            </div>

            <div className="info-fields">
              <div className="field-group">
                <label>Nome de Usuário</label>
                {editing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Digite seu nome de usuário"
                  />
                ) : (
                  <div className="field-value">
                    <User size={16} />
                    {user.username}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label>Email</label>
                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Digite seu email"
                  />
                ) : (
                  <div className="field-value">
                    <Mail size={16} />
                    {user.email}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label>Membro desde</label>
                <div className="field-value">
                  <Calendar size={16} />
                  {formatDate(user.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alterar Senha */}
        <div className="profile-card">
          <div className="card-header">
            <h2>Segurança</h2>
            {!showPasswordForm ? (
              <button 
                className="edit-btn"
                onClick={() => setShowPasswordForm(true)}
              >
                <Edit2 size={16} />
                Alterar Senha
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn"
                  onClick={handleChangePassword}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Alterando...' : 'Alterar'}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={cancelPasswordChange}
                  disabled={loading}
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {showPasswordForm && (
            <div className="password-form">
              <div className="field-group">
                <label>Senha Atual</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label>Nova Senha</label>
                <div className="password-input">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label>Confirmar Nova Senha</label>
                <div className="password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="profile-card">
            <div className="card-header">
              <h2>Minhas Estatísticas</h2>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">
                  <Trophy size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.total_points || 0}</div>
                  <div className="stat-label">Pontos Totais</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <Target size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.games_played || 0}</div>
                  <div className="stat-label">Jogos Disputados</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.games_won || 0}</div>
                  <div className="stat-label">Vitórias</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <Trophy size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">
                    {stats.games_played > 0 
                      ? `${((stats.games_won / stats.games_played) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                  <div className="stat-label">Taxa de Vitória</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <Target size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">
                    {stats.games_played > 0 
                      ? (stats.total_points / stats.games_played).toFixed(1)
                      : '0'
                    }
                  </div>
                  <div className="stat-label">Média de Pontos</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <Trophy size={24} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.best_hands_count || 0}</div>
                  <div className="stat-label">Melhores Mãos</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
