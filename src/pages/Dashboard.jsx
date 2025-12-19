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
  
  // New States for Sorting/Filtering
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc' for meeting time
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const [selectedSubdomains, setSelectedSubdomains] = useState([]); // Array of strings

  useEffect(() => {
    fetchUsers();
    setSelectedSubdomains([]); // Reset subdomains on domain change
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

  // Extract unique subdomains from current user list
  const availableSubdomains = React.useMemo(() => {
    const subs = new Set();
    users.forEach(u => {
      let task = null;
      if (defaultDomain === 'tech' && u.techTasks) task = u.techTasks[0];
      if (defaultDomain === 'design' && u.designTasks) task = u.designTasks[0];
      if (defaultDomain === 'management' && u.managementTasks) task = u.managementTasks[0];

      if (task && task.subdomain && Array.isArray(task.subdomain)) {
        task.subdomain.forEach(s => subs.add(s));
      }
    });
    return Array.from(subs).sort();
  }, [users, defaultDomain]);

  const toggleSubdomain = (sub) => {
    setSelectedSubdomains(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  // Filter and Sort Logic
  const processedUsers = users.filter(user => {
    // Search Filter
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.regno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date Filter (Meeting Time)
    let matchesDate = true;
    if (filterDate && user.meetingTime) {
        const meetingDate = new Date(user.meetingTime).toISOString().split('T')[0];
        matchesDate = meetingDate === filterDate;
    } else if (filterDate && !user.meetingTime) {
        matchesDate = false; // Filter active but no meeting
    }

    // Subdomain Filter
    let matchesSubdomain = true;
    if (selectedSubdomains.length > 0 && defaultDomain) {
        let task = null;
        if (defaultDomain === 'tech' && user.techTasks) task = user.techTasks[0];
        if (defaultDomain === 'design' && user.designTasks) task = user.designTasks[0];
        if (defaultDomain === 'management' && user.managementTasks) task = user.managementTasks[0];
        
        if (!task || !task.subdomain) {
            matchesSubdomain = false;
        } else {
            // Check if user has ANY of the selected subdomains
            matchesSubdomain = task.subdomain.some(s => selectedSubdomains.includes(s));
        }
    }

    return matchesSearch && matchesDate && matchesSubdomain;
  }).sort((a, b) => {
    // Sort by Meeting Time
    if (!a.meetingTime) return 1; // Users without meetings go to bottom
    if (!b.meetingTime) return -1;
    const dateA = new Date(a.meetingTime);
    const dateB = new Date(b.meetingTime);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {/* Controls Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Card className="search-container" style={{ flex: 1, minWidth: '300px', padding: '12px 16px' }}>
                <div style={{ position: 'relative' }}>
                    <FaSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <Input 
                    placeholder="Search by name, reg no, or email..." 
                    style={{ paddingLeft: '48px', border: 'none', background: 'transparent' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>Filter Date:</span>
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{ 
                        background: 'transparent', border: 'none', color: 'var(--text-main)', 
                        padding: '12px', outline: 'none', colorScheme: 'dark' 
                    }}
                />
                {filterDate && (
                    <button 
                        onClick={() => setFilterDate('')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >✕</button>
                )}
            </div>

            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{
                    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                    padding: '0 24px', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                Start Time {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
        </div>

        {/* Subdomain Filter Row (Only if subdomains exist) */}
        {availableSubdomains.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', marginRight: '8px' }}>Filter Subdomains:</span>
                {availableSubdomains.map(sub => (
                    <button
                        key={sub}
                        onClick={() => toggleSubdomain(sub)}
                        style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                            border: `1px solid ${selectedSubdomains.includes(sub) ? 'var(--primary)' : 'var(--border-color)'}`,
                            backgroundColor: selectedSubdomains.includes(sub) ? 'var(--primary)' : 'transparent',
                            color: selectedSubdomains.includes(sub) ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {sub}
                    </button>
                ))}
                {selectedSubdomains.length > 0 && (
                     <button
                        onClick={() => setSelectedSubdomains([])}
                        style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >Clear</button>
                )}
            </div>
        )}
      </div>

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
                <th style={{ padding: '20px', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Meeting Time</th>
                <th style={{ padding: '20px', textAlign: 'center', fontWeight: '600', color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {processedUsers.length > 0 ? (
                processedUsers.map((user) => (
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
                    <td style={{ padding: '20px', color: 'var(--text-main)' }}>
                        {user.meetingTime ? (
                            <span style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600' }}>{new Date(user.meetingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(user.meetingTime).toLocaleDateString()}</span>
                            </span>
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not Scheduled</span>
                        )}
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
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <UserDetailModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            onUserUpdate={() => {
                fetchUsers();
                setSelectedUser(null); // Close modal on update to avoid stale data, or refetch user?
                // Better: keep modal open but we need to refetch selectedUser. 
                // For simplicity, close validation or simplistic update. 
                // User asked "option to promote", usually implies staying in context.
                // I'll close for now or handle refetch. Let's just close to be safe.
            }}
        />
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
