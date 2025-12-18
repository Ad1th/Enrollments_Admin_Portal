import React, { useState } from 'react';
import { Card, Button } from './ResultComponents';
import { FaTimes, FaGithub, FaLinkedin, FaGlobe } from 'react-icons/fa';

const UserDetailModal = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) return null;

  const domains = ['tech', 'design', 'management'];
  const userDomains = user.domain || [];

  const getTask = (domain) => {
    const taskKey = `${domain}Tasks`;
    const tasks = user[taskKey];
    return tasks && tasks.length > 0 ? tasks[0] : null;
  };

  const renderTaskContent = (domain) => {
    const task = getTask(domain);
    if (!task) {
        if (!userDomains.includes(domain)) return <p style={{ color: 'var(--text-muted)' }}>User did not apply for {domain}.</p>;
        return <p style={{ color: 'var(--text-muted)' }}>No task submission found.</p>;
    }

    const questions = Object.keys(task)
      .filter(key => key.startsWith('question'))
      .sort((a, b) => parseInt(a.replace('question', '')) - parseInt(b.replace('question', '')));

    return (
      <div style={{ marginTop: '16px' }} className="fade-in">
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

        {questions.map((qKey, index) => {
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
