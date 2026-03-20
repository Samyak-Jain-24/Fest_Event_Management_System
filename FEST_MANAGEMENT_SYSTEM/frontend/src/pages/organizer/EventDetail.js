import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById, getEventRegistrations, updateEvent } from '../../services/apiService';
import { toast } from 'react-toastify';
import DiscussionForum from '../../components/DiscussionForum';

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const [eventRes, regsRes] = await Promise.all([
        getEventById(id),
        getEventRegistrations(id),
      ]);
      setEvent(eventRes.data);
      setRegistrations(regsRes.data.registrations);
    } catch (error) {
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this event as ${newStatus}?`)) {
      return;
    }

    try {
      await updateEvent(id, { status: newStatus });
      toast.success(`Event status updated to ${newStatus}`);
      fetchEventDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Contact Number', 'Ticket ID', 'Registration Date', 'Payment Amount'];
    const rows = registrations.map((reg) => [
      `${reg.participant.firstName} ${reg.participant.lastName}`,
      reg.participant.email,
      reg.participant.contactNumber,
      reg.ticketId,
      new Date(reg.registrationDate).toLocaleDateString(),
      reg.paymentAmount,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob= new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.eventName}_registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (!event) {
    return <div className="container">Event not found</div>;
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

      <div className="container">
        <div className="event-details-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
            <div>
              <h2>{event.eventName}</h2>
              <div className="event-type-badge">{event.status}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {event.status === 'Draft' && (
                <>
                  <button onClick={() => navigate(`/organizer/edit-event/${id}`)} className="btn btn-secondary btn-sm">
                    Edit Event
                  </button>
                  <button onClick={() => handleStatusChange('Published')} className="btn btn-primary btn-sm">
                    Publish Event
                  </button>
                </>
              )}
              {event.status === 'Published' && (
                <>
                  <button onClick={() => navigate(`/organizer/edit-event/${id}`)} className="btn btn-secondary btn-sm">
                    Edit Event
                  </button>
                  <button onClick={() => handleStatusChange('Ongoing')} className="btn btn-primary btn-sm">
                    Mark as Ongoing
                  </button>
                  <button onClick={() => handleStatusChange('Closed')} className="btn btn-warning btn-sm">
                    Close Registrations
                  </button>
                </>
              )}
              {event.status === 'Ongoing' && (
                <>
                  <button onClick={() => handleStatusChange('Completed')} className="btn btn-primary btn-sm">
                    Mark as Completed
                  </button>
                  <button onClick={() => handleStatusChange('Closed')} className="btn btn-warning btn-sm">
                    Close Event
                  </button>
                </>
              )}
              {event.status === 'Completed' && (
                <button onClick={() => handleStatusChange('Closed')} className="btn btn-warning btn-sm">
                  Close Event
                </button>
              )}
            </div>
          </div>

          <div className="info-section">
            <h3>Event Overview</h3>
            <div className="detail-item">
              <strong>Type:</strong> {event.eventType}
            </div>
            <div className="detail-item">
              <strong>Date:</strong> {new Date(event.eventStartDate).toLocaleDateString()} - {new Date(event.eventEndDate).toLocaleDateString()}
            </div>
            <div className="detail-item">
              <strong>Eligibility:</strong> {event.eligibility}
            </div>
            <div className="detail-item">
              <strong>Fee:</strong> {event.registrationFee ? `₹${event.registrationFee}` : 'Free'}
            </div>
          </div>

          <div className="info-section">
            <h3>Analytics</h3>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>{registrations.length}</h3>
                <p>Total Registrations</p>
              </div>
              <div className="stat-card">
                <h3>{registrations.filter((r) => r.attended).length}</h3>
                <p>Attendance</p>
              </div>
              <div className="stat-card">
                <h3>₹{registrations.reduce((sum, r) => sum + r.paymentAmount, 0)}</h3>
                <p>Revenue</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="info-section">
            <h3>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
              {event.eventType === 'Merchandise' && (
                <Link to={`/organizer/payment-approval/${id}`} className="btn btn-primary btn-sm">
                  💳 Payment Approvals
                </Link>
              )}
              {['Published', 'Ongoing', 'Completed'].includes(event.status) && (
                <>
                  <Link to={`/organizer/qr-scanner/${id}`} className="btn btn-primary btn-sm">
                    📷 QR Scanner
                  </Link>
                  <Link to={`/organizer/attendance/${id}`} className="btn btn-primary btn-sm">
                    📊 Attendance Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="info-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Participants ({registrations.length})</h3>
              {registrations.length > 0 && (
                <button onClick={exportCSV} className="btn btn-secondary btn-sm">
                  Export CSV
                </button>
              )}
            </div>

            {registrations.length === 0 ? (
              <p>No registrations yet</p>
            ) : (
              <div className="table-container">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Ticket ID</th>
                      <th>Registration Date</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg._id}>
                        <td>{reg.participant.firstName} {reg.participant.lastName}</td>
                        <td>{reg.participant.email}</td>
                        <td>{reg.participant.contactNumber}</td>
                        <td>{reg.ticketId}</td>
                        <td>{new Date(reg.registrationDate).toLocaleDateString()}</td>
                        <td>₹{reg.paymentAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Discussion Forum */}
          <DiscussionForum eventId={id} />
        </div>
      </div>
    </div>
  );
};

export default OrganizerEventDetail;
