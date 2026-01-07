import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Trophy, 
  Users, 
  Star, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Crown,
  ChevronDown
} from 'lucide-react';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isUserMenuOpen]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: Home
    },
    {
      path: '/games',
      label: 'Jogos',
      icon: Trophy
    },
    {
      path: '/ranking',
      label: 'Ranking',
      icon: Users
    },
    {
      path: '/best-hands',
      label: 'Melhores Mãos',
      icon: Star
    }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo" onClick={closeMobileMenu}>
          <Crown className="logo-icon" />
          <span className="logo-text">Gorila'z Poker</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-menu">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className={`navbar-user ${isUserMenuOpen ? 'open' : ''}`} ref={userMenuRef}>
          <div className="user-info" onClick={toggleUserMenu} aria-expanded={isUserMenuOpen}>
            <div className="user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="user-details">
              <span className="username">{user?.username}</span>
              <span className="user-role">
                {user?.role === 'admin' ? 'Administrador' : 'Jogador'}
              </span>
            </div>
            <ChevronDown size={16} className="chevron-icon" />
          </div>

          <div className={`user-dropdown ${isUserMenuOpen ? 'open' : ''}`}>
            <Link to="/profile" className="user-dropdown-item">
              <User size={18} />
              <span>Perfil</span>
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="user-dropdown-item">
                <Settings size={18} />
                <span>Administração</span>
              </Link>
            )}
            <button onClick={handleLogout} className="user-dropdown-item logout">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <div className="mobile-user-info">
              <div className="user-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="user-details">
                <span className="username">{user?.username}</span>
                <span className="user-role">
                  {user?.role === 'admin' ? 'Administrador' : 'Jogador'}
                </span>
              </div>
            </div>
          </div>

          <div className="mobile-menu-items">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <IconComponent size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              to="/profile"
              className={`mobile-menu-item ${isActive('/profile') ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <User size={20} />
              <span>Perfil</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`mobile-menu-item ${isActive('/admin') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                <Settings size={20} />
                <span>Administração</span>
              </Link>
            )}

            <button 
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }} 
              className="mobile-menu-item logout"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
