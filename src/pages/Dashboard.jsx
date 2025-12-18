import React, { useEffect, useState } from 'react';
import { adminService } from '../api/services';
import { Card, Input } from '../components/ResultComponents';
import UserDetailModal from '../components/UserDetailModal';
import { FaSearch, FaFilter } from 'react-icons/fa';

const Dashboard = ({ defaultDomain }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [defaultDomain]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const adminId = localStorage.getItem('adminId');
      let data;
      if (defaultDomain === 'tech') {
        data = await adminService.getTechUsers(adminId);
      } else if (defaultDomain === 'design') {
        data = await adminService.getDesignUsers(adminId);
      } else if (defaultDomain === 'management') {
        data = await adminService.getManagementUsers(adminId);
      } else {
        data = await adminService.getAllUsers(adminId);
      }
      const userList = data.data || []; 
      setUsers(userList);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.regno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ maxWidth: '1600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {defaultDomain ? defaultDomain.charAt(0).toUpperCase() + defaultDomain.slice(1) : 'Overview'} Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and track recruitment participants</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="status-card" style={{ backgroundColor: 'var(--bg-card)', padding: '16px 32px', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>TOTAL PARTICIPANTS</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>{users.length}</span>
          </div>
        </div>
      </div>

      <Card className="search-container" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <Input 
              placeholder="Search by name, reg no, or email..." 
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px' }}>Loading data...</div>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '20px', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '20px', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Reg No</th>
                <th style={{ padding: '20px', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Mobile</th>
                <th style={{ padding: '20px', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Domains</th>
                <th style={{ padding: '20px', textAlign: 'center', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row">
                    <td style={{ padding: '20px', fontWeight: '500', color: 'var(--text-main)' }}>{user.username}</td>
                    <td style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '14px' }}>{user.regno}</td>
                    <td style={{ padding: '20px', color: 'var(--text-muted)' }}>{user.mobile}</td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {user.domain && user.domain.map(d => (
                          <span key={d} className="badge" style={{ 
                            backgroundColor: d === 'tech' ? 'rgba(97, 131, 255, 0.15)' : d === 'design' ? 'rgba(255, 107, 157, 0.15)' : 'rgba(0, 255, 157, 0.15)',
                            color: d === 'tech' ? '#8aa3ff' : d === 'design' ? '#ff9dbf' : '#69ffc3',
                            border: `1px solid ${d === 'tech' ? 'rgba(97, 131, 255, 0.2)' : d === 'design' ? 'rgba(255, 107, 157, 0.2)' : 'rgba(0, 255, 157, 0.2)'}`
                          }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '20px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="action-btn"
                        style={{ 
                        border: 'none', 
                        background: 'rgba(252, 122, 0, 0.1)', 
                        color: 'var(--primary)', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        transition: 'all 0.2s'
                      }}>View</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
      
      <style>{`
        .table-row:hover {
            background-color: rgba(255, 255, 255, 0.03) !important;
        }
        .action-btn:hover {
            background-color: var(--primary) !important;
            color: white !important;
            transform: translateY(-1px);
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
