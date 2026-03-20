import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrganizerEvents } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const OngoingEvents = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await getOrganizerEvents();
      const allEvents = res.data.events || res.data || [];
      const ongoingAndPublished = allEvents.filter(
        (e) => e.status === 'Ongoing' || e.status === 'Published'
      );
      setEvents(ongoingAndPublished);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/organizer/dashboard">Dashboard</Link>
            <Link to="/organizer/ongoing-events" style={{ fontWeight: 'bold' }}>Ongoing Events</Link>
            <Link to="/organizer/profile">Profile</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h2>Ongoing & Active Events</h2>
          <p>Manage attendance and payment approvals for your active events</p>
        </div>

        {events.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No ongoing or published events</p>
            <Link to="/organizer/create-event" className="btn btn-primary" style={{ marginTop: '10px' }}>
              Create New Event
            </Link>
          </div>
        ) : (
          <div className="registrations-list">
            {events.map((event) => (
              <div
                key={event._id}
                className="registration-card"
                style={{ marginBottom: '15px', padding: '20px' }}
              >
                <div className="registration-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0 }}>{event.eventName}</h3>
                    <span
                      style={{
                        background: event.status === 'Ongoing' ? '#333' : '#555',
                        color: '#fff',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    >
                      {event.status}
                    </span>
                    <span
                      style={{
                        background: event.eventType === 'Merchandise' ? '#555' : '#999',
                        color: '#fff',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    >
                      {event.eventType}
                    </span>
                  </div>
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(event.eventStartDate).toLocaleDateString()} -{' '}
                    {new Date(event.eventEndDate).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Registrations:</strong> {event.registrationCount} / {event.registrationLimit}
                  </p>
                </div>
                <div className="registration-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link to={`/organizer/event/${event._id}`} className="btn btn-secondary btn-sm">
                    Details
                  </Link>
                  <Link to={`/organizer/qr-scanner/${event._id}`} className="btn btn-primary btn-sm">
                    QR Scanner
                  </Link>
                  <Link to={`/organizer/attendance/${event._id}`} className="btn btn-primary btn-sm">
                    Attendance
                  </Link>
                  {event.eventType === 'Merchandise' && (
                    <Link to={`/organizer/payment-approval/${event._id}`} className="btn btn-warning btn-sm">
                      Payments
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OngoingEvents;
