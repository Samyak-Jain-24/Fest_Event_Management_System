import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPasswordResets, approvePasswordReset, rejectPasswordReset } from '../../services/apiService';
import { toast } from 'react-toastify';

const PasswordResets = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [generatedPasswords, setGeneratedPasswords] = useState({});
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getPasswordResets(activeTab);
      setRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to load password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this password reset? A new password will be auto-generated.')) return;
    setProcessing(id);
    try {
      const response = await approvePasswordReset(id, {});
      const newPassword = response.data.generatedPassword;
      setGeneratedPasswords(prev => ({ ...prev, [id]: newPassword }));
      toast.success('Password reset approved! New password generated.');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve password reset');
    } finally {
      setProcessing(null);
    }
  };

  const handleOpenRejectModal = (req) => {
    setRejectTarget(req);
    setAdminComment('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget._id);
    try {
      await rejectPasswordReset(rejectTarget._id, { adminComment });
      toast.success('Password reset request rejected');
      setShowRejectModal(false);
      setRejectTarget(null);
      setAdminComment('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const tabs = ['Pending', 'Approved', 'Rejected', 'All'];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { backgroundColor: '#777', color: 'white' };
      case 'Approved':
        return { backgroundColor: '#333', color: 'white' };
      case 'Rejected':
        return { backgroundColor: '#666', color: 'white' };
      default:
        return { backgroundColor: '#999', color: 'white' };
    }
  };

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity Admin</h1>
          <div className="nav-links">
            <button onClick={() => navigate('/admin/dashboard')} className="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <h2>Password Reset Requests</h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: activeTab === tab ? '2px solid #333' : '1px solid #ddd',
                backgroundColor: activeTab === tab ? '#333' : 'white',
                color: activeTab === tab ? 'white' : '#333',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                fontSize: '14px',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="no-data" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <p>No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} password reset requests</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map((req) => (
              <div
                key={req._id}
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '10px',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          ...getStatusStyle(req.status),
                        }}
                      >
                        {req.status}
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: req.userType === 'organizer' ? '#555' : '#777',
                          color: 'white',
                        }}
                      >
                        {req.userType}
                      </span>
                    </div>

                    <h4 style={{ margin: '4px 0' }}>{req.email}</h4>

                    {req.userType === 'organizer' && req.organizerName && (
                      <p style={{ margin: '4px 0', color: '#555' }}>
                        <strong>Club/Organizer:</strong> {req.organizerName}
                        {req.category && ` (${req.category})`}
                      </p>
                    )}

                    {req.reason && (
                      <p style={{ margin: '4px 0', color: '#555' }}>
                        <strong>Reason:</strong> {req.reason}
                      </p>
                    )}

                    <p style={{ margin: '4px 0', color: '#888', fontSize: '13px' }}>
                      <strong>Requested:</strong> {new Date(req.requestedAt).toLocaleString()}
                    </p>

                    {req.processedAt && (
                      <p style={{ margin: '4px 0', color: '#888', fontSize: '13px' }}>
                        <strong>Processed:</strong> {new Date(req.processedAt).toLocaleString()}
                      </p>
                    )}

                    {req.adminComment && (
                      <p style={{ margin: '8px 0 0', padding: '8px 12px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Admin Comment:</strong> {req.adminComment}
                      </p>
                    )}

                    {/* Show generated password for approved requests */}
                    {req.status === 'Approved' && (generatedPasswords[req._id] || req.generatedPassword) && (
                      <div style={{
                        margin: '10px 0 0',
                        padding: '10px 14px',
                        backgroundColor: '#eee',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                      }}>
                        <strong>Generated Password:</strong>{' '}
                        <code style={{ 
                          backgroundColor: '#fff', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                        }}>
                          {generatedPasswords[req._id] || req.generatedPassword}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPasswords[req._id] || req.generatedPassword);
                            toast.success('Password copied to clipboard!');
                          }}
                          style={{
                            marginLeft: '10px',
                            border: 'none',
                            background: '#333',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions - only for pending */}
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <button
                        onClick={() => handleApprove(req._id)}
                        disabled={processing === req._id}
                        className="btn btn-secondary btn-sm"
                        style={{
                          backgroundColor: '#333',
                          borderColor: '#333',
                          color: 'white',
                          padding: '8px 16px',
                          opacity: processing === req._id ? 0.7 : 1,
                        }}
                      >
                        {processing === req._id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(req)}
                        disabled={processing === req._id}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '8px 16px' }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && rejectTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Reject Password Reset</h3>
            <p style={{ color: '#666', marginBottom: '4px' }}>
              <strong>Email:</strong> {rejectTarget.email}
            </p>
            {rejectTarget.organizerName && (
              <p style={{ color: '#666', marginBottom: '4px' }}>
                <strong>Organizer:</strong> {rejectTarget.organizerName}
              </p>
            )}
            {rejectTarget.reason && (
              <p style={{ color: '#666', marginBottom: '16px' }}>
                <strong>Reason:</strong> {rejectTarget.reason}
              </p>
            )}

            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
              Admin Comment (optional)
            </label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Provide a reason for rejection..."
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectTarget._id}
                className="btn btn-danger btn-sm"
                style={{ padding: '8px 16px' }}
              >
                {processing === rejectTarget._id ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResets;
