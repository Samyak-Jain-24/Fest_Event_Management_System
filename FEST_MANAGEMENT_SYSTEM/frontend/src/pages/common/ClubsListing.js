import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrganizers, toggleFollowOrganizer } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ClubsListing = () => {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: '', category: '' });

  useEffect(() => {
    fetchOrganizers();
  }, [filter]);

  const fetchOrganizers = async () => {
    try {
      const params = {};
      if (filter.search) params.search = filter.search;
      if (filter.category) params.category = filter.category;

      const response = await getOrganizers(params);
      setOrganizers(response.data.organizers);
    } catch (error) {
      toast.error('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (organizerId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated || role !== 'participant') {
      toast.error('Only logged-in participants can follow clubs');
      return;
    }

    try {
      const response = await toggleFollowOrganizer(organizerId);
      toast.success(response.data.message);
      // Refresh the organizers list to update follow status
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const handleBack = () => {
    if (role === 'participant') {
      navigate('/participant/dashboard');
    } else if (role === 'organizer') {
      navigate('/organizer/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <div className="loading">Loading clubs...</div>;
  }

  return (
    <div className="events-page">
      <header className="page-header">
        <button onClick={handleBack} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>← Back to Dashboard</button>
        <h1>Clubs & Organizers</h1>
      </header>

      <div className="container">
        <div className="form-group" style={{ maxWidth: '400px', marginBottom: '30px' }}>
          <input
            type="text"
            placeholder="Search clubs..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        <div className="events-grid">
          {organizers.map((organizer) => (
            <div key={organizer._id} className="event-card">
              <h3>{organizer.organizerName}</h3>
              <p className="event-organizer">{organizer.category}</p>
              <p className="event-description">
                {organizer.description.substring(0, 100)}...
              </p>
              {isAuthenticated && role === 'participant' && (
                <div style={{ marginBottom: '10px' }}>
                  {organizer.isFollowing ? (
                    <button 
                      onClick={(e) => handleToggleFollow(organizer._id, e)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginBottom: '10px' }}
                    >
                      ✓ Following
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => handleToggleFollow(organizer._id, e)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginBottom: '10px' }}
                    >
                      + Follow
                    </button>
                  )}
                </div>
              )}
              <Link to={`/clubs/${organizer._id}`} className="btn btn-primary btn-sm">
                View Profile
              </Link>
            </div>
          ))}
        </div>

        {organizers.length === 0 && (
          <div className="no-events">
            <p>No clubs found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsListing;
