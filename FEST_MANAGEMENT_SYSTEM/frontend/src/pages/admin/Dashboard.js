import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity Admin</h1>
          <div className="nav-links">
            <Link to="/admin/dashboard">Dashboard</Link>
            <Link to="/admin/organizers">Manage Organizers</Link>
            <Link to="/admin/password-resets">Password Resets</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Manage organizers, clubs, and system settings</p>
        </div>

        <div className="admin-actions">
          <Link to="/admin/organizers" className="action-card">
            <h3>Manage Organizers</h3>
            <p>Create, disable, or remove organizer accounts</p>
          </Link>

          <Link to="/admin/password-resets" className="action-card">
            <h3>Password Reset Requests</h3>
            <p>Review and approve password reset requests</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
