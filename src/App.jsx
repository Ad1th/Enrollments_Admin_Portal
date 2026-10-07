import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Similarity from './pages/Similarity';
import Questions from './pages/Questions';
import Interviewers from './pages/Interviewers';
import Interviews from './pages/Interviews';
import Comms from './pages/Comms';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading, token } = useAuth();
  
  if (loading) return <div>Loading...</div>; // Or a spinner
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="participants" element={<Dashboard />} />
        <Route path="tech" element={<Dashboard defaultDomain="tech" />} />
        <Route path="design" element={<Dashboard defaultDomain="design" />} />
        <Route path="management" element={<Dashboard defaultDomain="management" />} />
        <Route path="similarity" element={<Similarity />} />
        <Route path="questions" element={<Questions />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="interviewers" element={<Interviewers />} />
        <Route path="comms" element={<Comms />} />
        <Route path="stats" element={<Stats />} />
        <Route path="links" element={<Settings />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;
