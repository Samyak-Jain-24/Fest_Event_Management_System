import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrganizers, createOrganizer, toggleOrganizerActive, deleteOrganizer } from '../../services/apiService';
import { toast } from 'react-toastify';

const ManageOrganizers = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newOrganizerCredentials, setNewOrganizerCredentials] = useState(null);
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    password: '',
    category: 'Club',
    description: '',
    contactEmail: '',
    contactNumber: '',
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await getAllOrganizers();
      setOrganizers(response.data.organizers);
    } catch (error) {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await createOrganizer(formData);
      setNewOrganizerCredentials(response.data.credentials);
      setShowCredentialsModal(true);
      setShowCreateForm(false);
      setFormData({
        organizerName: '',
        email: '',
        password: '',
        category: 'Club',
        description: '',
        contactEmail: '',
        contactNumber: '',
      });
      fetchOrganizers();
      toast.success('Organizer created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organizer');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleOrganizerActive(id);
      toast.success('Organizer status updated');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) {
      return;
    }

    try {
      await deleteOrganizer(id);
      toast.success('Organizer deleted');
      fetchOrganizers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete organizer');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity Admin</h1>
          <div className="nav-links">
            <button onClick={() => navigate('/admin/dashboard')} className="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Credentials Modal */}
      {showCredentialsModal && newOrganizerCredentials && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>Organizer Created Successfully!</h2>
            <p style={{ marginBottom: '20px', color: '#333', fontWeight: 'bold' }}>
              ⚠️ IMPORTANT: Save these credentials now! The password won't be shown again.
            </p>
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '5px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Email:</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newOrganizerCredentials.email}
                    readOnly
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <button
                    onClick={() => copyToClipboard(newOrganizerCredentials.email)}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password:</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newOrganizerCredentials.password}
                    readOnly
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => copyToClipboard(newOrganizerCredentials.password)}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCredentialsModal(false);
                setNewOrganizerCredentials(null);
              }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              I've Saved the Credentials
            </button>
          </div>
        </div>
      )}

      <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Manage Organizers</h2>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
            {showCreateForm ? 'Cancel' : 'Create New Organizer'}
          </button>
        </div>

        {showCreateForm && (
          <div className="profile-card" style={{ marginBottom: '30px' }}>
            <h3>Create New Organizer</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Organizer Name *</label>
                <input
                  type="text"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength="6"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="Club">Club</option>
                  <option value="Council">Council</option>
                  <option value="Fest Team">Fest Team</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn btn-primary">Create Organizer</button>
            </form>
          </div>
        )}

        <div className="organizers-list">
          <h3>All Organizers ({organizers.length})</h3>
          <div className="table-container">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((org) => (
                  <tr key={org._id}>
                    <td>{org.organizerName}</td>
                    <td>{org.category}</td>
                    <td>{org.email}</td>
                    <td>
                      <span className={`status-badge ${org.isActive ? 'status-registered' : 'status-cancelled'}`}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleToggleActive(org._id)}
                          className={`btn btn-sm ${org.isActive ? 'btn-warning' : 'btn-secondary'}`}
                        >
                          {org.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(org._id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;
