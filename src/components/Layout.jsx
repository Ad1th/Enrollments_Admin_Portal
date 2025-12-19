import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaUsers, FaLaptopCode, FaPaintBrush, FaTasks, FaSignOutAlt } from 'react-icons/fa';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: <FaHome />, label: 'Dashboard' },
    { path: '/participants', icon: <FaUsers />, label: 'Participants' },
    { path: '/tech', icon: <FaLaptopCode />, label: 'Tech' },
    { path: '/design', icon: <FaPaintBrush />, label: 'Design' },
    { path: '/management', icon: <FaTasks />, label: 'Management' },
  ];

  return (
    <div style={{
      width: '260px',
      backgroundColor: 'var(--bg-card)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
      zIndex: 10
    }}>
      <div className="logo" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'var(--primary)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          boxShadow: '0 4px 10px rgba(252, 122, 0, 0.3)'
        }}>M</div>
        <span style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--text-main)' }}>MFC Admin</span>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'rgba(252, 122, 0, 0.1)' : 'transparent',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button 
        onClick={handleLogout}
        className="logout-button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontWeight: '600',
          marginTop: 'auto',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
          justifyContent: 'flex-start'
        }}
      >
        <FaSignOutAlt style={{ transition: 'transform 0.3s' }} className="logout-icon" />
        <span>Logout</span>
      </button>

      <style>{`
        .logout-button:hover {
          background-color: rgba(252, 122, 0, 0.1) !important;
          color: var(--primary) !important;
          border-color: rgba(252, 122, 0, 0.2) !important;
          transform: translateX(4px);
        }
        .logout-button:hover .logout-icon {
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
};

const Layout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ marginLeft: '260px', flex: 1, padding: '32px', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
        <div className="fade-in">
            <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
