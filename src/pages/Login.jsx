import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/services';
import { Input, Button, Card } from '../components/ResultComponents';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await authService.login(email, password);
      if (data && data.accessToken) {
        // Assuming response structure: { accessToken: "...", user: {...} } or similar
        // Adjust based on actual login response if needed
        login(data.user || {}, data.accessToken);
        navigate('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#f5f7fb' 
    }}>
      <Card style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '12px', 
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '28px'
          }}>M</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--gray-900)' }}>Admin Portal</h2>
          <p style={{ color: 'var(--gray-600)' }}>Sign in to manage recruitments</p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(220, 53, 69, 0.1)', 
            color: 'var(--danger)', 
            borderRadius: '8px', 
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--gray-700)' }}>Email</label>
            <Input 
              type="email" 
              placeholder="admin@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--gray-700)' }}>Password</label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <Button 
            type="submit" 
            style={{ width: '100%' }} 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
