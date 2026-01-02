import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  ShieldOff, 
  Search,
  Filter,
  MoreVertical,
  Crown,
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [clubInfo, setClubInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);
  
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'player'
  });
  
  const [clubFormData, setClubFormData] = useState({
    club_name: '',
    club_description: '',
    default_buy_in: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchClubInfo();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubInfo = async () => {
    try {
      const response = await fetch('/api/club/info', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClubInfo(data);
        setClubFormData({
          club_name: data.club_name || 'Gorila\'z Poker Club',
          club_description: data.club_description || '',
          default_buy_in: data.default_buy_in || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar informações do clube:', error);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    if (!userFormData.username || !userFormData.email || (!editingUser && !userFormData.password)) {
      toast.error('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/auth/register';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { username: userFormData.username, email: userFormData.email, role: userFormData.role }
        : userFormData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        setShowUserModal(false);
        setEditingUser(null);
        setUserFormData({ username: '', email: '', password: '', role: 'player' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar usuário');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Usuário deletado com sucesso!');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao deletar usuário');
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success(`Usuário ${newRole === 'admin' ? 'promovido a' : 'rebaixado para'} ${newRole === 'admin' ? 'administrador' : 'jogador'}!`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao alterar função do usuário');
      }
    } catch (error) {
      console.error('Erro ao alterar função:', error);
      toast.error('Erro ao alterar função do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClubSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const response = await fetch('/api/club/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(clubFormData)
      });

      if (response.ok) {
        toast.success('Informações do clube atualizadas com sucesso!');
        setShowClubModal(false);
        fetchClubInfo();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao atualizar informações do clube');
      }
    } catch (error) {
      console.error('Erro ao atualizar clube:', error);
      toast.error('Erro ao atualizar informações do clube');
    } finally {
      setLoading(false);
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowUserModal(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserFormData({ username: '', email: '', password: '', role: 'player' });
    setShowUserModal(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-unauthorized">
        <Shield size={64} />
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="header-content">
          <h1>
            <Settings className="page-icon" />
            Administração
          </h1>
          <p>Gerencie usuários e configurações do clube</p>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          Usuários
        </button>
        <button 
          className={`tab-btn ${activeTab === 'club' ? 'active' : ''}`}
          onClick={() => setActiveTab('club')}
        >
          <Settings size={20} />
          Clube
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="users-section">
          <div className="section-header">
            <div className="search-controls">
              <div className="search-box">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-box">
                <Filter className="filter-icon" size={16} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todas as funções</option>
                  <option value="admin">Administradores</option>
                  <option value="player">Jogadores</option>
                </select>
              </div>
            </div>
            
            <button className="create-user-btn" onClick={openCreateUser}>
              <UserPlus size={20} />
              Novo Usuário
            </button>
          </div>

          {loading ? (
            <div className="admin-loading">
              <div className="loading-spinner"></div>
              <p>Carregando usuários...</p>
            </div>
          ) : (
            <div className="users-grid">
              {filteredUsers.map(u => (
                <div key={u.id} className="user-card">
                  <div className="user-header">
                    <div className="user-avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <h3>{u.username}</h3>
                      <p>{u.email}</p>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? (
                          <><Crown size={12} /> Administrador</>
                        ) : (
                          <><User size={12} /> Jogador</>
                        )}
                      </span>
                    </div>
                    <div className="user-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => openEditUser(u)}
                        title="Editar usuário"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={`action-btn toggle-role ${u.role}`}
                        onClick={() => handleToggleRole(u.id, u.role)}
                        title={u.role === 'admin' ? 'Rebaixar para jogador' : 'Promover para admin'}
                      >
                        {u.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      {u.id !== user.id && (
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Deletar usuário"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-stats">
                    <div className="stat">
                      <Trophy size={16} />
                      <span>{u.total_points || 0} pts</span>
                    </div>
                    <div className="stat">
                      <Target size={16} />
                      <span>{u.games_played || 0} jogos</span>
                    </div>
                    <div className="stat">
                      <Calendar size={16} />
                      <span>{formatDate(u.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>Nenhum usuário encontrado</h3>
                  <p>Tente ajustar os filtros de busca</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'club' && (
        <div className="club-section">
          <div className="section-header">
            <h2>Informações do Clube</h2>
            <button className="edit-club-btn" onClick={() => setShowClubModal(true)}>
              <Edit2 size={20} />
              Editar Informações
            </button>
          </div>

          {clubInfo && (
            <div className="club-info-card">
              <div className="club-header">
                <h3>{clubInfo.club_name || 'Gorila\'z Poker Club'}</h3>
                <p>{clubInfo.club_description || 'Clube de poker profissional'}</p>
              </div>
              
              <div className="club-details">
                <div className="detail-row">
                  <DollarSign size={16} />
                  <span>Buy-in Padrão:</span>
                  <span>{clubInfo.default_buy_in || '0.00'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button className="close-btn" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            
            <form className="user-form" onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label>Nome de Usuário *</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                  placeholder="Digite o nome de usuário"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  placeholder="Digite o email"
                  required
                />
              </div>
              
              {!editingUser && (
                <div className="form-group">
                  <label>Senha *</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    placeholder="Digite a senha"
                    required
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Função</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                >
                  <option value="player">Jogador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowUserModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Club Modal */}
      {showClubModal && (
        <div className="modal-overlay" onClick={() => setShowClubModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Informações do Clube</h2>
              <button className="close-btn" onClick={() => setShowClubModal(false)}>×</button>
            </div>
            
            <form className="club-form" onSubmit={handleClubSubmit}>
              <div className="form-group">
                <label>Nome do Clube</label>
                <input
                  type="text"
                  value={clubFormData.club_name}
                  onChange={(e) => setClubFormData({...clubFormData, club_name: e.target.value})}
                  placeholder="Nome do clube"
                />
              </div>
              
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={clubFormData.club_description}
                  onChange={(e) => setClubFormData({...clubFormData, club_description: e.target.value})}
                  placeholder="Descrição do clube"
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>Buy-in Padrão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={clubFormData.default_buy_in}
                  onChange={(e) => setClubFormData({...clubFormData, default_buy_in: e.target.value})}
                  placeholder="Ex: 50.00"
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowClubModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
