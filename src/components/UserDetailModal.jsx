import React, { useState } from 'react';
import { Card, Button } from './ResultComponents';
import { FaTimes, FaGithub, FaLinkedin, FaGlobe, FaLevelUpAlt, FaUndo, FaBan } from 'react-icons/fa';
import { adminService } from '../api/services';

const UserDetailModal = ({ user, onClose, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [updating, setUpdating] = useState(false);

  if (!user) return null;

  const domains = ['tech', 'design', 'management'];
  const userDomains = user.domain || [];

  const getTask = (domain) => {
    const taskKey = `${domain}Tasks`;
    const tasks = user[taskKey];
    return tasks && tasks.length > 0 ? tasks[0] : null;
  };

  const handleUpdateStatus = async (domain, action) => {
    setUpdating(true);
    try {
        let newLevel = user[domain] || 0;
        if (action === 'promote') newLevel += 1;
        if (action === 'reject') newLevel = -1;
        if (action === 'reset') newLevel = 0;

        const updates = { [domain]: newLevel };
        await adminService.updateUserStatus(user.regno, updates);
        
        if (onUserUpdate) onUserUpdate();
    } catch (error) {
        console.error("Failed to update status", error);
        alert("Failed to update status");
    } finally {
        setUpdating(false);
    }
  };

  const [notes, setNotes] = useState(user.adminNotes || "");

  const handleSaveNotes = async () => {
    setUpdating(true);
    try {
        await adminService.updateUserStatus(user.regno, { adminNotes: notes });
        if (onUserUpdate) onUserUpdate();
        alert("Notes saved successfully!");
    } catch (error) {
        console.error("Failed to save notes", error);
        alert("Failed to save notes");
    } finally {
        setUpdating(false);
    }
  };

  const renderTaskContent = (domain) => {
    const task = getTask(domain);
    const currentLevel = user[domain] !== undefined ? user[domain] : 0;
    
    const content = (
      <>
        <div style={{ padding: '16px', backgroundColor: 'rgba(252, 122, 0, 0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Current Level</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: currentLevel === -1 ? '#ef4444' : 'var(--primary)' }}>
                    {currentLevel === -1 ? 'REJECTED' : `Round ${currentLevel}`}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                    variant="primary" 
                    onClick={() => handleUpdateStatus(domain, 'promote')} 
                    disabled={updating || currentLevel >= 3 || currentLevel === -1}
                    title="Promote to Next Round"
                >
                    <FaLevelUpAlt /> Promote
                </Button>
                <Button 
                    variant="outline" 
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    onClick={() => handleUpdateStatus(domain, 'reject')}
                    disabled={updating || currentLevel === -1}
                    title="Reject Candidate"
                >
                    <FaBan /> Reject
                </Button>
                <Button 
                     variant="outline"
                     onClick={() => handleUpdateStatus(domain, 'reset')}
                     disabled={updating || currentLevel === 0}
                     title="Reset to Round 0"
                >
                    <FaUndo /> Reset
                </Button>
            </div>
        </div>

        {/* Interviewer Notes Section */}
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '8px' }}>Interviewer Notes</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add comments about the candidate here..."
                    style={{ 
                        flex: 1,
                        backgroundColor: 'var(--bg-dark)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        color: 'var(--text-main)', 
                        minHeight: '80px',
                        outline: 'none',
                        resize: 'vertical'
                    }}
                />
                <Button 
                    onClick={handleSaveNotes}
                    disabled={updating}
                    style={{ height: 'fit-content' }}
                >
                    Save
                </Button>
            </div>
        </div>

        {!task ? (
             userDomains.includes(domain) ? 
             <p style={{ color: 'var(--text-muted)' }}>User did not apply for {domain}.</p> : 
             <p style={{ color: 'var(--text-muted)' }}>No task submission found.</p>
        ) : (
            <>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-light)' }}>Status:</span>
                    <span className={`badge ${task.isDone ? 'success' : 'warning'}`}>
                        {task.isDone ? 'Submitted' : 'Draft / In Progress'}
                    </span>
                </div>
                
                {task.subdomain && (
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-light)' }}>Subdomains: </span>
                        <span style={{ color: 'var(--text-main)' }}>{task.subdomain.join(', ')}</span>
                    </div>
                )}

                {Object.keys(task)
                .filter(key => key.startsWith('question'))
                .sort((a, b) => parseInt(a.replace('question', '')) - parseInt(b.replace('question', '')))
                .map((qKey, index) => {
                    const answer = task[qKey];
                    const answerText = Array.isArray(answer) ? answer.join('\n') : answer;
                    if(!answerText) return null;

                    return (
                        <div key={qKey} style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Question {index + 1}
                            </h4>
                            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: '1.6', fontSize: '14px' }}>
                                {answerText}
                            </p>
                        </div>
                    )
                })}
            </>
        )}
      </>
    );

    return (
      <div style={{ marginTop: '16px' }} className="fade-in">
        {content}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-card)', borderRadius: '16px', width: '90%', maxWidth: '900px', height: '85%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border-color)',
        animation: 'slideIn 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.username}</h2>
            <p style={{ color: 'var(--text-light)', fontFamily: 'monospace' }}>{user.regno}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s' }}
           onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar Tabs */}
          <div style={{ width: '220px', backgroundColor: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border-color)', padding: '16px' }}>
            <button 
                onClick={() => setActiveTab('profile')}
                style={{ 
                    display: 'block', width: '100%', padding: '12px', textAlign: 'left', borderRadius: '8px', marginBottom: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'profile' ? 'white' : 'var(--text-muted)',
                    fontWeight: activeTab === 'profile' ? '600' : '500',
                    transition: 'all 0.2s'
                }}
            >
                Profile Info
            </button>
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '16px 0' }}></div>
            {domains.map(d => (
                <button 
                    key={d}
                    onClick={() => setActiveTab(d)}
                    style={{ 
                        display: 'block', width: '100%', padding: '12px', textAlign: 'left', borderRadius: '8px', marginBottom: '8px', border: 'none', cursor: 'pointer',
                        backgroundColor: activeTab === d ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: activeTab === d ? (d === 'tech' ? '#8aa3ff' : d === 'design' ? '#ff9dbf' : '#69ffc3') : 'var(--text-muted)',
                        fontWeight: activeTab === d ? '600' : '400',
                        borderLeft: activeTab === d ? `3px solid ${d === 'tech' ? '#8aa3ff' : d === 'design' ? '#ff9dbf' : '#69ffc3'}` : '3px solid transparent',
                        opacity: userDomains.includes(d) ? 1 : 0.4
                    }}
                >
                    {d.charAt(0).toUpperCase() + d.slice(1)} Task
                </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {activeTab === 'profile' && (
                <div className="fade-in">
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-main)' }}>Personal Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>Email (VIT)</label>
                            <div style={{ color: 'var(--text-main)', fontSize: '15px' }}>{user.email}</div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>Mobile</label>
                            <div style={{ color: 'var(--text-main)', fontSize: '15px' }}>{user.mobile || 'N/A'}</div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>Personal Email</label>
                            <div style={{ color: 'var(--text-main)', fontSize: '15px' }}>{user.emailpersonal || 'N/A'}</div>
                        </div>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '32px', marginBottom: '24px', color: 'var(--text-main)' }}>Links</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Button variant="outline"><FaGithub /> GitHub</Button>
                        <Button variant="outline"><FaLinkedin /> LinkedIn</Button>
                        <Button variant="outline"><FaGlobe /> Portfolio</Button>
                    </div>
                </div>
            )}

            {domains.includes(activeTab) && (
                <div className="fade-in">
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-main)' }}>
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Task Submission
                    </h3>
                    {renderTaskContent(activeTab)}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
