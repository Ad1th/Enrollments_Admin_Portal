import React, { useState, useEffect } from 'react';
import { adminService } from '../api/services';
import { Button, Input, Card } from '../components/ResultComponents';
import Layout from '../components/Layout';
import { FaSearch, FaUserGraduate, FaCode, FaPaintBrush, FaTasks, FaDownload, FaChartPie } from 'react-icons/fa';
import UserDetailModal from '../components/UserDetailModal';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = ({ defaultDomain }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
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

  // Export to CSV
  const handleExportCSV = () => {
    if (processedUsers.length === 0) return;

    const headers = ['Name', 'RegNo', 'Mobile', 'Email', 'Tech Status', 'Design Status', 'Management Status', 'Meeting Time'];
    const rows = processedUsers.map(u => [
        u.username,
        u.regno,
        u.mobile,
        u.email,
        u.tech,
        u.design,
        u.management,
        u.meetingTime ? new Date(u.meetingTime).toLocaleString() : 'Not Scheduled'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mfc_recruitment_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Analytics Data Preparation
  const getAnalyticsData = () => {
    // Status Distribution
    const statusCounts = { 'Rejected': 0, 'Round 0': 0, 'Round 1': 0, 'Round 2': 0, 'Round 3': 0 };
    users.forEach(u => {
        let level = 0;
        if (defaultDomain) level = u[defaultDomain];
        else level = Math.max(u.tech, u.design, u.management); // Aggregate max for overview

        if (level === -1) statusCounts['Rejected']++;
        else if (level >= 0 && level <= 3) statusCounts[`Round ${level}`]++;
    });
    
    const statusData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

    // Subdomain Distribution
    const subCounts = {};
    users.forEach(u => {
         // Aggregate all tasks
         const tasks = [...(u.techTasks || []), ...(u.designTasks || []), ...(u.managementTasks || [])];
         tasks.forEach(t => {
             if (t && t.subdomain) {
                 t.subdomain.forEach(s => {
                     subCounts[s] = (subCounts[s] || 0) + 1;
                 });
             }
         });
    });
    const subData = Object.keys(subCounts).map(k => ({ name: k, value: subCounts[k] })).sort((a,b) => b.value - a.value).slice(0, 5); // Top 5

    return { statusData, subData };
  };

  const { statusData, subData } = getAnalyticsData();

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
           <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)} title="Toggle Analytics">
                <FaChartPie /> {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
           </Button>
          <div className="status-card" style={{ backgroundColor: 'var(--bg-card)', padding: '16px 32px', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>TOTAL PARTICIPANTS</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>{users.length}</span>
          </div>
        </div>
      </div>

      {showAnalytics && (
        <div className="fade-in" style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <Card style={{ flex: 1, minWidth: '300px', height: '300px', padding: '20px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '16px', fontSize: '16px' }}>Status Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
            <Card style={{ flex: 1, minWidth: '300px', height: '300px', padding: '20px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '16px', fontSize: '16px' }}>Top Subdomains</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={subData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                            {subData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        </div>
      )}

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

            <button 
                onClick={handleExportCSV}
                style={{
                    backgroundColor: 'var(--primary)', border: 'none', borderRadius: '12px',
                    padding: '0 24px', color: 'white', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <FaDownload /> Export CSV
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
                setSelectedUser(null); 
            }}
        />
      )}
      
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .table-row:hover { background-color: rgba(255,255,255,0.03) !important; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
