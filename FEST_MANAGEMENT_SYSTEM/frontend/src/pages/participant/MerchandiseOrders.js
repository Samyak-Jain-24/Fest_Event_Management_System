import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyMerchandiseOrders } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const MerchandiseOrders = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await getMyMerchandiseOrders();
      setOrders(res.data.orders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Approved': return '#333';
      case 'Rejected': return '#666';
      default: return '#777';
    }
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/participant/dashboard">Dashboard</Link>
            <Link to="/events">Browse Events</Link>
            <Link to="/participant/merchandise-orders">My Orders</Link>
            <Link to="/participant/profile">Profile</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h2>My Merchandise Orders</h2>
          <p>Track the status of your merchandise purchases</p>
        </div>

        {orders.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No merchandise orders yet</p>
            <Link to="/events" className="btn btn-primary" style={{ marginTop: '10px' }}>Browse Events</Link>
          </div>
        ) : (
          <div className="registrations-list">
            {orders.map((order) => (
              <div key={order._id} className="registration-card" style={{ marginBottom: '15px' }}>
                <div className="registration-info">
                  <h3>{order.event?.eventName}</h3>
                  <p>Organized by {order.event?.organizer?.organizerName}</p>
                  <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p><strong>Items:</strong></p>
                  <ul style={{ marginLeft: '20px' }}>
                    {order.items.map((item, idx) => (
                      <li key={idx}>{item.variant} {item.size && `(${item.size})`} {item.color && `- ${item.color}`} x{item.quantity}</li>
                    ))}
                  </ul>
                  <p><strong>Total:</strong> ₹{order.totalAmount}</p>
                  <p>
                    <strong>Status: </strong>
                    <span style={{ color: statusColor(order.paymentStatus), fontWeight: 'bold' }}>
                      {order.paymentStatus}
                    </span>
                  </p>
                  {order.paymentStatus === 'Rejected' && order.rejectionReason && (
                    <p style={{ color: '#666' }}><strong>Reason:</strong> {order.rejectionReason}</p>
                  )}
                  {order.ticketId && (
                    <p><strong>Ticket ID:</strong> {order.ticketId}</p>
                  )}
                </div>
                <div className="registration-actions">
                  {order.paymentProof && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </button>
                  )}
                  {order.event?._id && (
                    <Link to={`/events/${order.event._id}`} className="btn btn-secondary btn-sm">
                      View Event
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Event:</strong> {selectedOrder.event?.eventName}</p>
              <p><strong>Status:</strong> <span style={{ color: statusColor(selectedOrder.paymentStatus), fontWeight: 'bold' }}>{selectedOrder.paymentStatus}</span></p>
              <p><strong>Total Amount:</strong> ₹{selectedOrder.totalAmount}</p>

              <h4 style={{ marginTop: '15px' }}>Items Ordered</h4>
              <ul style={{ marginLeft: '20px' }}>
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx}>{item.variant} {item.size && `(${item.size})`} {item.color && `- ${item.color}`} x{item.quantity}</li>
                ))}
              </ul>

              {selectedOrder.paymentProof && (
                <div style={{ marginTop: '15px' }}>
                  <h4>Payment Proof</h4>
                  <img
                    src={selectedOrder.paymentProof}
                    alt="Payment proof"
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginTop: '10px' }}
                  />
                </div>
              )}

              {selectedOrder.qrCode && (
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                  <h4>Your Ticket QR Code</h4>
                  <img src={selectedOrder.qrCode} alt="QR Code" style={{ maxWidth: '200px', marginTop: '10px' }} />
                  <p style={{ fontSize: '14px', color: '#666' }}>Ticket ID: {selectedOrder.ticketId}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchandiseOrders;
