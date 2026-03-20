import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizers, updatePreferences } from '../../services/apiService';
import { toast } from 'react-toastify';

const Onboarding = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const interests = [
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
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await getOrganizers();
      setOrganizers(response.data.organizers);
    } catch (error) {
      toast.error('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleClub = (clubId) => {
    setSelectedClubs((prev) =>
      prev.includes(clubId)
        ? prev.filter((id) => id !== clubId)
        : [...prev, clubId]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        areasOfInterest: selectedInterests,
        followedClubs: selectedClubs,
      });
      toast.success('Preferences saved!');
      navigate('/participant/dashboard');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/participant/dashboard');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <h2>Welcome! Let's personalize your experience</h2>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
          Select your interests and clubs to follow (optional)
        </p>

        <div className="onboarding-section">
          <h3>Areas of Interest</h3>
          <div className="checkbox-group">
            {interests.map((interest) => (
              <div key={interest} className="checkbox-item">
                <input
                  type="checkbox"
                  id={interest}
                  checked={selectedInterests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                />
                <label htmlFor={interest}>{interest}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-section">
          <h3>Clubs to Follow</h3>
          <div className="checkbox-group">
            {organizers.map((organizer) => (
              <div key={organizer._id} className="checkbox-item">
                <input
                  type="checkbox"
                  id={organizer._id}
                  checked={selectedClubs.includes(organizer._id)}
                  onChange={() => toggleClub(organizer._id)}
                />
                <label htmlFor={organizer._id}>{organizer.organizerName}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-actions">
          <button onClick={handleSkip} className="btn btn-secondary">
            Skip for Now
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
