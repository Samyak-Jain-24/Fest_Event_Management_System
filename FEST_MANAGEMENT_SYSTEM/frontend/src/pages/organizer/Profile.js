import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizerProfile, updateOrganizerProfile, requestPasswordReset } from '../../services/apiService';
import { toast } from 'react-toastify';

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    organizerName: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Password reset state
  const [resetReason, setResetReason] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getOrganizerProfile();
      setProfile(response.data);
      setFormData({
        organizerName: response.data.organizerName,
        category: response.data.category,
        description: response.data.description,
        contactEmail: response.data.contactEmail,
        contactNumber: response.data.contactNumber || '',
        discordWebhook: response.data.discordWebhook || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateOrganizerProfile(formData);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <button onClick={() => navigate('/organizer/dashboard')} className="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="container"  >
        <div className="profile-container">
          <h2>Organizer Profile</h2>

          <div className="profile-card">
            <div className="profile-section">
              <h3>Account Information</h3>
              <div className="info-row">
                <strong>Login Email:</strong> {profile.email} (Non-editable)
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <h3>Editable Information</h3>
              
              <div className="form-group">
                <label>Organizer Name</label>
                <input
                  type="text"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Club">Club</option>
                  <option value="Council">Council</option>
                  <option value="Fest Team">Fest Team</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
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

              <div className="form-group">
                <label>Discord Webhook URL (Optional)</label>
                <input
                  type="url"
                  name="discordWebhook"
                  value={formData.discordWebhook}
                  onChange={handleChange}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <small className="text-muted">
                  Auto-post new events to Discord
                </small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password Reset Request Section */}
          <div className="profile-card" style={{ marginTop: '30px' }}>
            <h3>🔐 Password Reset</h3>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              If you need to reset your password, submit a request to the admin. Once approved, a new password will be generated and shared with you by the admin.
            </p>

            {!showResetForm ? (
              <button
                onClick={() => setShowResetForm(true)}
                className="btn btn-secondary"
                style={{ backgroundColor: '#555', borderColor: '#555', color: 'white' }}
              >
                Request Password Reset
              </button>
            ) : (
              <div style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                border: '1px solid #ddd',
              }}>
                <div className="form-group">
                  <label style={{ fontWeight: 'bold' }}>Reason for Reset *</label>
                  <textarea
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    placeholder="Please describe why you need a password reset..."
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={async () => {
                      if (!resetReason.trim()) {
                        toast.error('Please provide a reason for the reset');
                        return;
                      }
                      setRequestingReset(true);
                      try {
                        await requestPasswordReset({
                          email: profile.email,
                          userType: 'organizer',
                          reason: resetReason,
                        });
                        toast.success('Password reset request submitted! Please wait for admin approval.');
                        setShowResetForm(false);
                        setResetReason('');
                      } catch (error) {
                        toast.error(error.response?.data?.message || 'Failed to submit request');
                      } finally {
                        setRequestingReset(false);
                      }
                    }}
                    disabled={requestingReset}
                    className="btn btn-primary"
                  >
                    {requestingReset ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    onClick={() => { setShowResetForm(false); setResetReason(''); }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerProfile;
