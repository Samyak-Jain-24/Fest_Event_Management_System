import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEvents } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './Events.css';

const BrowseEvents = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    eligibility: '',
    dateFrom: '',
    dateTo: '',
    followedOnly: false,
    trending: false,
  });

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.eligibility) params.eligibility = filters.eligibility;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.followedOnly) params.followed = 'true';
      if (filters.trending) params.trending = 'true';

      const response = await getEvents(params);
      setEvents(response.data.events);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

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

  return (
    <div className="events-page">
      <header className="page-header">
        <button onClick={handleBack} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>← Back to Dashboard</button>
        <h1>Browse Events</h1>
      </header>

      <div className="container">
        <div className="events-layout">
          <aside className="filters-sidebar">
            <h3>Filters</h3>
            
            <div className="form-group">
              <label>Search</label>
              <input
                type="text"
                name="search"
                placeholder="Search events..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label>Event Type</label>
              <select name="eventType" value={filters.eventType} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="Normal">Normal Event</option>
                <option value="Merchandise">Merchandise</option>
              </select>
            </div>

            <div className="form-group">
              <label>Eligibility</label>
              <select name="eligibility" value={filters.eligibility} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="IIIT Only">IIIT Only</option>
                <option value="Non-IIIT Only">Non-IIIT Only</option>
                <option value="All">Open to All</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date Range</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="followedOnly"
                  checked={filters.followedOnly}
                  onChange={handleFilterChange}
                />
                {' '}Show only followed clubs
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="trending"
                  checked={filters.trending}
                  onChange={handleFilterChange}
                />
                {' '}Trending (Top 5/24h)
              </label>
            </div>
          </aside>

          <main className="events-content">
            {events.length === 0 ? (
              <div className="no-events">
                <p>No events found matching your filters.</p>
              </div>
            ) : (
              <div className="events-grid">
                {events.map((event) => (
                  <div key={event._id} className="event-card">
                    <div className="event-type-badge">{event.eventType}</div>
                    {event.isRegistered && (
                      <div className="event-type-badge" style={{ 
                        backgroundColor: '#555', 
                        position: 'absolute', 
                        top: '50px', 
                        right: '10px' 
                      }}>
                        ✓ Registered
                      </div>
                    )}
                    <h3>{event.eventName}</h3>
                    <p className="event-organizer">
                      by {event.organizer?.organizerName}
                    </p>
                    <p className="event-description">
                      {event.eventDescription.substring(0, 100)}...
                    </p>
                    <div className="event-details">
                      <span>📅 {new Date(event.eventStartDate).toLocaleDateString()}</span>
                      <span>💰 {event.registrationFee ? `₹${event.registrationFee}` : 'Free'}</span>
                    </div>
                    <div className="event-details" style={{ marginTop: '5px' }}>
                      <span>👥 {event.registrationCount || 0}/{event.registrationLimit} registered</span>
                    </div>
                    <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BrowseEvents;
