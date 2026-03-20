import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParticipantProfile, updateParticipantProfile, toggleFollowOrganizer, changeParticipantPassword } from '../../services/apiService';
import { toast } from 'react-toastify';
import './Profile.css';

const ParticipantProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    college: '',
    organizationName: '',
    areasOfInterest: [],
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const availableInterests = [
    'Technology',
    'Music',
    'Dance',
    'Sports',
    'Art',
    'Drama',
    'Entrepreneurship',
    'Photography',
    'Literature',
    'Gaming',
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getParticipantProfile();
      setProfile(response.data);
      setFormData({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        contactNumber: response.data.contactNumber,
        college: response.data.college || '',
        organizationName: response.data.organizationName || '',
        areasOfInterest: response.data.areasOfInterest || [],
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

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(interest)
        ? prev.areasOfInterest.filter(i => i !== interest)
        : [...prev.areasOfInterest, interest]
    }));
  };

  const handleUnfollow = async (clubId) => {
    try {
      await toggleFollowOrganizer(clubId);
      toast.success('Unfollowed successfully');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to unfollow club');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateParticipantProfile(formData);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);

    try {
      await changeParticipantPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
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
            <button onClick={() => navigate('/participant/dashboard')} className="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="profile-container">
          <h2>My Profile</h2>

          <div className="profile-card">
            <div className="profile-section">
              <h3>Account Information</h3>
              <div className="info-row">
                <strong>Email:</strong> {profile.email}
              </div>
              <div className="info-row">
                <strong>Participant Type:</strong> {profile.participantType}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <h3>Editable Information</h3>
              
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
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
                  required
                />
              </div>

              {profile.participantType === 'IIIT' ? (
                <div className="form-group">
                  <label>Organization Name</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>College/Organization</label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Areas of Interest</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                  {availableInterests.map((interest) => (
                    <div key={interest} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={interest}
                        checked={formData.areasOfInterest.includes(interest)}
                        onChange={() => toggleInterest(interest)}
                      />
                      <label htmlFor={interest} style={{ margin: 0, cursor: 'pointer' }}>
                        {interest}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="profile-card" style={{ marginTop: '20px' }}>
            <h3>Security Settings</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min 6 characters)"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
          {profile.followedClubs && profile.followedClubs.length > 0 && (
            <div className="profile-card" style={{ marginTop: '20px' }}>
              <h3>Followed Clubs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {profile.followedClubs.map((club) => (
                  <div
                    key={club._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '5px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div>
                      <strong>{club.organizerName}</strong>
                      <div style={{ fontSize: '0.9em', color: '#666' }}>{club.category}</div>
                    </div>
                    <button
                      onClick={() => handleUnfollow(club._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantProfile;
