import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById, getEventMerchandiseOrders, approveMerchandiseOrder, rejectMerchandiseOrder } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const PaymentApproval = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending Approval');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, ordersRes] = await Promise.all([
        getEventById(eventId),
        getEventMerchandiseOrders(eventId),
      ]);
      setEvent(eventRes.data);
      setOrders(ordersRes.data.orders);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId) => {
    if (!window.confirm('Approve this order? Stock will be decremented and a ticket will be generated.')) return;
    setProcessing(true);
    try {
      await approveMerchandiseOrder(orderId);
      toast.success('Order approved! Ticket generated and email sent.');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (orderId) => {
    setRejectingOrderId(orderId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      await rejectMerchandiseOrder(rejectingOrderId, { reason: rejectReason });
      toast.success('Order rejected');
      setShowRejectModal(false);
      setRejectingOrderId(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject order');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredOrders = orders.filter((o) => o.paymentStatus === activeTab);

  const statusColor = (status) => {
    switch (status) {
      case 'Approved': return '#333';
      case 'Rejected': return '#666';
      default: return '#777';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!event) return <div className="container">Event not found</div>;

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/organizer/dashboard">Dashboard</Link>
            <Link to={`/organizer/event/${eventId}`}>Event Details</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h2>Payment Approval - {event.eventName}</h2>
          <p>Review and manage merchandise payment proofs</p>
        </div>

        {/* Summary Stats */}
        <div className="dashboard-stats">
          <div className="stat-card" style={{ borderLeft: '4px solid #777' }}>
            <h3>{orders.filter((o) => o.paymentStatus === 'Pending Approval').length}</h3>
            <p>Pending</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #333' }}>
            <h3>{orders.filter((o) => o.paymentStatus === 'Approved').length}</h3>
            <p>Approved</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #666' }}>
            <h3>{orders.filter((o) => o.paymentStatus === 'Rejected').length}</h3>
            <p>Rejected</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #999' }}>
            <h3>₹{orders.filter((o) => o.paymentStatus === 'Approved').reduce((s, o) => s + o.totalAmount, 0)}</h3>
            <p>Revenue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['Pending Approval', 'Approved', 'Rejected'].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({orders.filter((o) => o.paymentStatus === tab).length})
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No {activeTab.toLowerCase()} orders</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="participants-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Order Date</th>
                  <th>Payment Proof</th>
                  <th>Status</th>
                  {activeTab === 'Pending Approval' && <th>Actions</th>}
                  {activeTab === 'Approved' && <th>Ticket ID</th>}
                  {activeTab === 'Rejected' && <th>Reason</th>}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.participant?.firstName} {order.participant?.lastName}</td>
                    <td>{order.participant?.email}</td>
                    <td>{order.participant?.contactNumber}</td>
                    <td>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '13px' }}>
                          {item.variant || '-'} {item.size && `(${item.size})`} {item.color && `- ${item.color}`} ×{item.quantity}
                        </div>
                      ))}
                    </td>
                    <td>₹{order.totalAmount}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      {order.paymentProof ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Proof
                        </button>
                      ) : (
                        <span style={{ color: '#999' }}>No proof</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: statusColor(order.paymentStatus), fontWeight: 'bold' }}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    {activeTab === 'Pending Approval' && (
                      <td>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(order._id)}
                            disabled={processing}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => openRejectModal(order._id)}
                            disabled={processing}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === 'Approved' && (
                      <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{order.ticketId || '-'}</td>
                    )}
                    {activeTab === 'Rejected' && (
                      <td style={{ fontSize: '13px', color: '#666' }}>{order.rejectionReason || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Proof Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <p><strong>Participant:</strong> {selectedOrder.participant?.firstName} {selectedOrder.participant?.lastName}</p>
                  <p><strong>Email:</strong> {selectedOrder.participant?.email}</p>
                  <p><strong>Contact:</strong> {selectedOrder.participant?.contactNumber}</p>
                  <p><strong>Type:</strong> {selectedOrder.participant?.participantType}</p>
                </div>
                <div>
                  <p><strong>Order Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p><strong>Total Amount:</strong> ₹{selectedOrder.totalAmount}</p>
                  <p><strong>Status:</strong>{' '}
                    <span style={{ color: statusColor(selectedOrder.paymentStatus), fontWeight: 'bold' }}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>

              <h4>Items Ordered</h4>
              <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx}>{item.variant || '-'} {item.size && `(${item.size})`} {item.color && `- ${item.color}`} × {item.quantity}</li>
                ))}
              </ul>

              <h4>Payment Proof</h4>
              {selectedOrder.paymentProof ? (
                <img
                  src={selectedOrder.paymentProof}
                  alt="Payment Proof"
                  style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', marginTop: '10px', border: '1px solid #ddd' }}
                />
              ) : (
                <p style={{ color: '#999' }}>No payment proof uploaded</p>
              )}

              {selectedOrder.qrCode && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <h4>Generated QR Code</h4>
                  <img src={selectedOrder.qrCode} alt="QR Code" style={{ maxWidth: '200px', marginTop: '10px' }} />
                  <p style={{ color: '#666', fontSize: '13px' }}>Ticket ID: {selectedOrder.ticketId}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedOrder.paymentStatus === 'Pending Approval' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { handleApprove(selectedOrder._id); setSelectedOrder(null); }}
                    disabled={processing}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => { openRejectModal(selectedOrder._id); setSelectedOrder(null); }}
                    disabled={processing}
                  >
                    Reject
                  </button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Reject Order</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for rejecting this order:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Payment proof is unclear, amount doesn't match, etc."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  marginTop: '10px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleReject} disabled={processing}>
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApproval;
