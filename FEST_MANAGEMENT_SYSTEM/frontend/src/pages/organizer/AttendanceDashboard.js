import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById, getAttendanceDashboard, exportAttendanceCSV, manualAttendance } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const AttendanceDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  // Auto-refresh every 10 seconds when enabled
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, attendanceRes] = await Promise.all([
        getEventById(eventId),
        getAttendanceDashboard(eventId),
      ]);
      setEvent(eventRes.data);
      setAttendanceData(attendanceRes.data);
    } catch (error) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportAttendanceCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event?.eventName || 'attendance'}_attendance.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Attendance report exported');
    } catch (error) {
      toast.error('Failed to export attendance');
    }
  };

  const openManualOverride = (registration) => {
    setSelectedRegistration(registration);
    setOverrideReason('');
    setShowManualModal(true);
  };

  const handleManualOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for manual override');
      return;
    }
    setProcessing(true);
    try {
      await manualAttendance(eventId, {
        registrationId: selectedRegistration._id,
        reason: overrideReason,
      });
      toast.success(`Attendance manually marked for ${selectedRegistration.participant.firstName} ${selectedRegistration.participant.lastName}`);
      setShowManualModal(false);
      setSelectedRegistration(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getFilteredList = () => {
    if (!attendanceData) return [];
    let list;
    switch (activeTab) {
      case 'scanned':
        list = attendanceData.scanned || [];
        break;
      case 'not-scanned':
        list = attendanceData.notScanned || [];
        break;
      default:
        list = [...(attendanceData.scanned || []), ...(attendanceData.notScanned || [])];
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r) =>
        `${r.participant?.firstName} ${r.participant?.lastName}`.toLowerCase().includes(term) ||
        r.participant?.email?.toLowerCase().includes(term) ||
        r.ticketId?.toLowerCase().includes(term)
      );
    }

    return list;
  };

  const attendancePercentage = attendanceData
    ? attendanceData.totalRegistered > 0
      ? Math.round((attendanceData.totalScanned / attendanceData.totalRegistered) * 100)
      : 0
    : 0;

  if (loading) return <div className="loading">Loading attendance data...</div>;
  if (!event) return <div className="container">Event not found</div>;

  const filteredList = getFilteredList();

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/organizer/dashboard">Dashboard</Link>
            <Link to={`/organizer/qr-scanner/${eventId}`}>QR Scanner</Link>
            <Link to={`/organizer/event/${eventId}`}>Event</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2>Attendance - {event.eventName}</h2>
              <p>Live attendance tracking dashboard</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/organizer/qr-scanner/${eventId}`)}>
                Open QR Scanner
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                Export CSV
              </button>
              <button
                className={`btn btn-sm ${autoRefresh ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '⏸ Stop Auto-Refresh' : '▶ Auto-Refresh'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card" style={{ borderLeft: '4px solid #333' }}>
            <h3>{attendanceData?.totalRegistered || 0}</h3>
            <p>Total Registered</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #555' }}>
            <h3>{attendanceData?.totalScanned || 0}</h3>
            <p>Checked In</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #777' }}>
            <h3>{attendanceData?.totalNotScanned || 0}</h3>
            <p>Not Yet Scanned</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #999' }}>
            <h3>{attendancePercentage}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>Attendance Progress</span>
            <span>{attendanceData?.totalScanned || 0} / {attendanceData?.totalRegistered || 0}</span>
          </div>
          <div style={{ background: '#e9ecef', borderRadius: '10px', height: '24px', overflow: 'hidden' }}>
            <div style={{
              background: '#333',
              height: '100%',
              width: `${attendancePercentage}%`,
              borderRadius: '10px',
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              {attendancePercentage > 10 && `${attendancePercentage}%`}
            </div>
          </div>
          {autoRefresh && (
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Auto-refreshing every 10 seconds...
            </p>
          )}
        </div>

        {/* Search and Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              All ({attendanceData?.totalRegistered || 0})
            </button>
            <button className={`tab ${activeTab === 'scanned' ? 'active' : ''}`} onClick={() => setActiveTab('scanned')}>
              Scanned ({attendanceData?.totalScanned || 0})
            </button>
            <button className={`tab ${activeTab === 'not-scanned' ? 'active' : ''}`} onClick={() => setActiveTab('not-scanned')}>
              Not Scanned ({attendanceData?.totalNotScanned || 0})
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or ticket ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              width: '280px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Participants Table */}
        {filteredList.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No participants found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="participants-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Ticket ID</th>
                  <th>Status</th>
                  <th>Scan Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((reg, idx) => {
                  const isManual = reg.formData && (
                    (reg.formData instanceof Map && reg.formData.get('manualOverride')) ||
                    (typeof reg.formData === 'object' && reg.formData.manualOverride)
                  );
                  return (
                    <tr key={reg._id} style={{ background: reg.attended ? '#f0f0f0' : 'inherit' }}>
                      <td>{idx + 1}</td>
                      <td>{reg.participant?.firstName} {reg.participant?.lastName}</td>
                      <td>{reg.participant?.email}</td>
                      <td>{reg.participant?.contactNumber}</td>
                      <td>{reg.participant?.participantType}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{reg.ticketId}</td>
                      <td>
                        {reg.attended ? (
                          <span style={{ color: '#333', fontWeight: 'bold' }}>
                            ✅ Attended {isManual && '(Manual)'}
                          </span>
                        ) : (
                          <span style={{ color: '#666', fontWeight: 'bold' }}>❌ Not Scanned</span>
                        )}
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {reg.attendanceDate ? new Date(reg.attendanceDate).toLocaleTimeString() : '-'}
                      </td>
                      <td>
                        {!reg.attended && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => openManualOverride(reg)}
                            style={{ fontSize: '12px' }}
                          >
                            Manual Override
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showManualModal && selectedRegistration && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Manual Attendance Override</h2>
              <button className="modal-close" onClick={() => setShowManualModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #ddd' }}>
                <strong>⚠️ Audit Notice:</strong> This manual override will be logged with your ID, the reason, and timestamp for audit purposes.
              </div>

              <p><strong>Participant:</strong> {selectedRegistration.participant?.firstName} {selectedRegistration.participant?.lastName}</p>
              <p><strong>Email:</strong> {selectedRegistration.participant?.email}</p>
              <p><strong>Ticket ID:</strong> {selectedRegistration.ticketId}</p>

              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reason for Manual Override <span style={{ color: '#333' }}>*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., QR code damaged, phone dead, participant verified by ID card, etc."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-warning"
                onClick={handleManualOverride}
                disabled={processing || !overrideReason.trim()}
              >
                {processing ? 'Processing...' : 'Confirm Override'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
