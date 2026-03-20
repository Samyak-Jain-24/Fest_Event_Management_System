import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrganizerEvents, getOrganizerAnalytics } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, analyticsRes] = await Promise.all([
        getOrganizerEvents(),
        getOrganizerAnalytics(),
      ]);
      setEvents(eventsRes.data.events);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const now = new Date();

  const draftEvents = events.filter((e) => e.status === 'Draft');

  // Published / upcoming: events explicitly marked Published, preferably with start date in the future
  const publishedEvents = events.filter((e) => {
    if (e.status !== 'Published') return false;
    if (!e.eventStartDate) return true; // if dates missing, still treat as published
    const start = new Date(e.eventStartDate);
    return start > now;
  });

  // Ongoing: anything explicitly marked Ongoing, OR Published whose dates indicate it has started but not ended
  const ongoingEvents = events.filter((e) => {
    if (e.status === 'Ongoing') return true;
    if (e.status !== 'Published') return false;
    if (!e.eventStartDate || !e.eventEndDate) return false;
    const start = new Date(e.eventStartDate);
    const end = new Date(e.eventEndDate);
    return start <= now && now <= end;
  });

  // Completed: explicitly Completed/Closed, OR Published/Ongoing whose end date has passed
  const completedEvents = events.filter((e) => {
    if (['Completed', 'Closed'].includes(e.status)) return true;
    if (!e.eventEndDate) return false;
    const end = new Date(e.eventEndDate);
    return ['Published', 'Ongoing'].includes(e.status) && end < now;
  });

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/organizer/dashboard">Dashboard</Link>
            <Link to="/organizer/create-event">Create Event</Link>
            <Link to="/organizer/ongoing-events">Ongoing Events</Link>
            <Link to="/organizer/profile">Profile</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h2>Organizer Dashboard</h2>
          <p>Manage your events and track performance</p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{events.length}</h3>
            <p>Total Events</p>
          </div>
          <div className="stat-card">
            <h3>{publishedEvents.length}</h3>
            <p>Published Events</p>
          </div>
          <div className="stat-card">
            <h3>{analytics?.totalRegistrations || 0}</h3>
            <p>Total Registrations</p>
          </div>
          <div className="stat-card">
            <h3>₹{analytics?.totalRevenue || 0}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="events-carousel">
          <div className="carousel-header">
            <h3>Events Overview</h3>
            <Link to="/organizer/create-event" className="btn btn-primary">
              Create New Event
            </Link>
          </div>

          <div className="tabs">
            <div className="tab-section">
              <h4>Draft ({draftEvents.length})</h4>
              <div className="events-grid">
                {draftEvents.map((event) => (
                  <EventCard key={event._id} event={event} navigate={navigate} />
                ))}
                {draftEvents.length === 0 && <p className="no-data">No draft events</p>}
              </div>
            </div>

            <div className="tab-section">
              <h4>Published ({publishedEvents.length})</h4>
              <div className="events-grid">
                {publishedEvents.map((event) => (
                  <EventCard key={event._id} event={event} navigate={navigate} />
                ))}
                {publishedEvents.length === 0 && <p className="no-data">No published events</p>}
              </div>
            </div>

            <div className="tab-section">
              <h4>Ongoing ({ongoingEvents.length})</h4>
              <div className="events-grid">
                {ongoingEvents.map((event) => (
                  <EventCard key={event._id} event={event} navigate={navigate} />
                ))}
                {ongoingEvents.length === 0 && <p className="no-data">No ongoing events</p>}
              </div>
            </div>

            <div className="tab-section">
              <h4>Completed ({completedEvents.length})</h4>
              <div className="events-grid">
                {completedEvents.map((event) => (
                  <EventCard key={event._id} event={event} navigate={navigate} />
                ))}
                {completedEvents.length === 0 && <p className="no-data">No completed events</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventCard = ({ event, navigate }) => (
  <div className="event-card">
    <div className="event-type-badge">{event.status}</div>
    <h4>{event.eventName}</h4>
    <p>Type: {event.eventType}</p>
    <p>Registrations: {event.registrationCount} / {event.registrationLimit}</p>
    <p>Date: {new Date(event.eventStartDate).toLocaleDateString()}</p>
    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
      <button
        onClick={() => navigate(`/organizer/event/${event._id}`)}
        className="btn btn-primary btn-sm"
      >
        View
      </button>
      {event.status === 'Draft' && (
        <button
          onClick={() => navigate(`/organizer/edit-event/${event._id}`)}
          className="btn btn-secondary btn-sm"
        >
          Edit
        </button>
      )}
    </div>
  </div>
);

export default OrganizerDashboard;
