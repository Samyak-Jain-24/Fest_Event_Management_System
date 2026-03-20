import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrganizerById, toggleFollowOrganizer } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ClubDetails = () => {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchClubDetails();
  }, [id]);

  const fetchClubDetails = async () => {
    try {
      const response = await getOrganizerById(id);
      setData(response.data);
      setIsFollowing(response.data.isFollowing || false);
    } catch (error) {
      toast.error('Failed to load club details');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated || role !== 'participant') {
      toast.error('Only logged-in participants can follow clubs');
      return;
    }

    try {
      const response = await toggleFollowOrganizer(id);
      setIsFollowing(!isFollowing);
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data) {
    return <div className="container">Club not found</div>;
  }

  const { organizer, upcomingEvents, pastEvents } = data;

  return (
    <div className="event-details-page">
      <header className="page-header">
        <Link to="/clubs" className="back-link">← Back to Clubs</Link>
      </header>

      <div className="container">
        <div className="event-details-card">
          <div className="event-header">
            <h1>{organizer.organizerName}</h1>
            <p className="organizer-name">{organizer.category}</p>
            {isAuthenticated && role === 'participant' && (
              <button 
                className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} 
                onClick={handleFollow}
              >
                {isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>

          <div className="info-section">
            <h3>About</h3>
            <p>{organizer.description}</p>
          </div>

          <div className="info-section">
            <h3>Contact</h3>
            <p>Email: {organizer.contactEmail}</p>
          </div>

          <div className="info-section">
            <h3>Upcoming Events ({upcomingEvents.length})</h3>
            <div className="events-grid">
              {upcomingEvents.map((event) => (
                <div key={event._id} className="event-card">
                  <h4>{event.eventName}</h4>
                  <p>{new Date(event.eventStartDate).toLocaleDateString()}</p>
                  <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
            {upcomingEvents.length === 0 && <p>No upcoming events</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubDetails;
