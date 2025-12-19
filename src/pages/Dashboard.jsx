import React, { useState, useEffect } from 'react';
import { adminService } from '../api/services';
import { Button, Input, Card } from '../components/ResultComponents';
import Layout from '../components/Layout';
import { FaSearch, FaUserGraduate, FaCode, FaPaintBrush, FaTasks, FaDownload, FaChartPie, FaList } from 'react-icons/fa';
import UserDetailModal from '../components/UserDetailModal';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SUBDOMAINS = {
    tech: ['Frontend', 'Backend', 'Cyber Security', 'App Dev', 'AI/ML', 'Competitive Programming'],
    design: ['Graphic Design', 'UI/UX', '3D Modelling', 'Video Editing / Photography'],
    management: ['Outreach', 'General Ops', 'Publicity', 'Editorial']
};

const Dashboard = ({ defaultDomain }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true); // Default to true
  const [showUserList, setShowUserList] = useState(false); // Default to false
  
  // New States for Sorting/Filtering
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc' for meeting time
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const [selectedSubdomains, setSelectedSubdomains] = useState([]); // Array of strings

  useEffect(() => {
    fetchUsers();
    setSelectedSubdomains([]); // Reset subdomains on domain change
    setShowUserList(false); // Hide list on domain change
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

  const toggleSubdomain = (sub) => {
    const newSelection = selectedSubdomains.includes(sub) 
        ? selectedSubdomains.filter(s => s !== sub) 
        : [...selectedSubdomains, sub];
    
    setSelectedSubdomains(newSelection);
    
    // Auto-show list if at least one filter is active
    if (newSelection.length > 0) {
        setShowUserList(true);
    }
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
    if (selectedSubdomains.length > 0) {
        // Collect all subdomains for user across all tasks
        const userSubs = [];
        if (user.techTasks && user.techTasks[0] && user.techTasks[0].subdomain) userSubs.push(...user.techTasks[0].subdomain);
        if (user.designTasks && user.designTasks[0] && user.designTasks[0].subdomain) userSubs.push(...user.designTasks[0].subdomain);
        if (user.managementTasks && user.managementTasks[0] && user.managementTasks[0].subdomain) userSubs.push(...user.managementTasks[0].subdomain);
        
        // Check if user matches ANY selected subdomain (OR logic)
        // If user wants separate categories, they should select one at a time, or we can assume OR for multi-select
        matchesSubdomain = userSubs.some(s => selectedSubdomains.includes(s));
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

  // Helper to render Subdomain Grid
  const renderSubdomainGrid = (domainKey) => {
    if (!SUBDOMAINS[domainKey]) return null;
    return (
        <div key={domainKey} style={{ marginBottom: '24px' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>
                {domainKey.charAt(0).toUpperCase() + domainKey.slice(1)} Subdomains
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {SUBDOMAINS[domainKey].map(sub => {
                    const isSelected = selectedSubdomains.includes(sub);
                    return (
                        <div 
                            key={sub}
                            onClick={() => toggleSubdomain(sub)}
                            style={{
                                backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                                color: isSelected ? 'white' : 'var(--text-main)',
                                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                borderRadius: '8px',
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                fontWeight: '600',
                                boxShadow: isSelected ? '0 4px 12px rgba(252, 122, 0, 0.4)' : 'none',
                                transform: isSelected ? 'translateY(-2px)' : 'none'
                             }}
                             className="subdomain-card"
                        >
                            {sub}
                        </div>
                    )
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: '1600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {defaultDomain ? defaultDomain.charAt(0).toUpperCase() + defaultDomain.slice(1) : 'Overview'} Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Analytics & Management</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
           <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)} title="Toggle Analytics">
                <FaChartPie /> {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
           </Button>
          <div className="status-card" style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>TOTAL PARTICIPANTS</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{users.length}</span>
          </div>
        </div>
      </div>

      {showAnalytics && (
        <div className="fade-in" style={{ display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>
            <Card style={{ flex: 1, minWidth: '350px', height: '350px', padding: '24px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>Status Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
            <Card style={{ flex: 1, minWidth: '350px', height: '350px', padding: '24px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>Top 5 Subdomains</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={subData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
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

      {/* Subdomain Selectors */}
      <div style={{ marginBottom: '40px' }} className="fade-in">
         {defaultDomain ? (
             renderSubdomainGrid(defaultDomain)
         ) : (
             <>
                {renderSubdomainGrid('tech')}
                {renderSubdomainGrid('design')}
                {renderSubdomainGrid('management')}
             </>
         )}
      </div>

      {/* Toggle List View */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Button 
            variant="outline" 
            onClick={() => setShowUserList(!showUserList)}
            style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'center', gap: '10px' }}
          >
              <FaList /> {showUserList ? 'Hide Participant List' : `View ${processedUsers.length} Participants`}
          </Button>
      </div>

      {showUserList && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
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
        .subdomain-card:hover {
            transform: translateY(-4px) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
