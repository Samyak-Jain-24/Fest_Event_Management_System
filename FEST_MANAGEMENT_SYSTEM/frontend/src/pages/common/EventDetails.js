import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById, registerForEvent } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import DiscussionForum from '../../components/DiscussionForum';
import CalendarExport from '../../components/CalendarExport';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  // For Normal Events - Custom Form Data
  const [formData, setFormData] = useState({});
  
  // For Merchandise Events - Item Selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await getEventById(id);
      setEvent(response.data);
      
      // Initialize formData for custom form fields
      if (response.data.eventType === 'Normal' && response.data.customForm) {
        const initialFormData = {};
        response.data.customForm.forEach(field => {
          initialFormData[field.name] = '';
        });
        setFormData(initialFormData);
      }
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleItemSelection = (item, quantity) => {
    const itemKey = `${item.size}-${item.color}-${item.variant}`;
    
    if (quantity > 0) {
      // Validate against purchase limit
      if (quantity > item.purchaseLimit) {
        toast.error(`Maximum purchase limit is ${item.purchaseLimit} for this item`);
        return;
      }
      
      // Validate against stock
      if (quantity > item.stock) {
        toast.error(`Only ${item.stock} items available in stock`);
        return;
      }
      
      // Update selected items
      const existingIndex = selectedItems.findIndex(
        si => si.size === item.size && si.color === item.color && si.variant === item.variant
      );
      
      if (existingIndex >= 0) {
        const updated = [...selectedItems];
        updated[existingIndex] = {
          size: item.size,
          color: item.color,
          variant: item.variant,
          quantity: parseInt(quantity)
        };
        setSelectedItems(updated);
      } else {
        setSelectedItems([...selectedItems, {
          size: item.size,
          color: item.color,
          variant: item.variant,
          quantity: parseInt(quantity)
        }]);
      }
      
      setItemQuantities({
        ...itemQuantities,
        [itemKey]: parseInt(quantity)
      });
    } else {
      // Remove item if quantity is 0
      setSelectedItems(selectedItems.filter(
        si => !(si.size === item.size && si.color === item.color && si.variant === item.variant)
      ));
      
      const newQuantities = { ...itemQuantities };
      delete newQuantities[itemKey];
      setItemQuantities(newQuantities);
    }
  };

  const validateNormalEventForm = () => {
    if (!event.customForm || event.customForm.length === 0) {
      return true; // No custom form, so valid
    }
    
    for (const field of event.customForm) {
      if (field.required && !formData[field.name]) {
        toast.error(`${field.label} is required`);
        return false;
      }
    }
    return true;
  };

  const validateMerchandiseSelection = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to purchase');
      return false;
    }
    return true;
  };

  const initiateRegistration = () => {
    if (!isAuthenticated) {
      toast.info('Please login to register');
      navigate('/login');
      return;
    }

    if (role !== 'participant') {
      toast.error('Only participants can register for events');
      return;
    }

    // For merchandise events, redirect to the dedicated merchandise order page
    // which requires payment proof upload
    if (event.eventType === 'Merchandise') {
      navigate(`/participant/merchandise-order/${id}`);
      return;
    }

    setShowRegistrationModal(true);
  };

  const handleRegister = async () => {
    // Validate based on event type
    if (event.eventType === 'Normal') {
      if (!validateNormalEventForm()) {
        return;
      }
    } else if (event.eventType === 'Merchandise') {
      if (!validateMerchandiseSelection()) {
        return;
      }
    }

    setRegistering(true);
    try {
      const payload = event.eventType === 'Normal' 
        ? { formData } 
        : { purchasedItems: selectedItems };
      
      await registerForEvent(id, payload);
      toast.success('Registration successful! Check your email for ticket details.');
      setShowRegistrationModal(false);
      navigate('/participant/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const renderFormField = (field) => {
    const commonProps = {
      name: field.name,
      placeholder: field.placeholder,
      required: field.required,
      onChange: handleFormChange,
      value: formData[field.name] || ''
    };

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.fieldType}
            {...commonProps}
            className="form-input"
          />
        );
      
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows="4"
            className="form-input"
          />
        );
      
      case 'dropdown':
        return (
          <select {...commonProps} className="form-input">
            <option value="">Select an option</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {field.options?.map((option, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={formData[field.name] === option}
                  onChange={handleFormChange}
                  required={field.required}
                />
                {option}
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              name={field.name}
              checked={formData[field.name] || false}
              onChange={handleFormChange}
            />
            <span>{field.label}</span>
          </div>
        );
      
      case 'file':
        return (
          <input
            type="file"
            name={field.name}
            required={field.required}
            onChange={handleFormChange}
            className="form-input"
          />
        );
      
      default:
        return <input type="text" {...commonProps} className="form-input" />;
    }
  };

  if (loading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (!event) {
    return <div className="container">Event not found</div>;
  }

  const isRegistrationOpen =
    event.status === 'Published' &&
    new Date() < new Date(event.registrationDeadline) &&
    event.registrationCount < event.registrationLimit;
  
  const isRegistered = event.isRegistered || false;
  const hasPendingOrder = event.hasPendingOrder || false;
  const merchandiseOrderStatus = event.merchandiseOrderStatus || null;

  return (
    <div className="event-details-page">
      <header className="page-header">
        <Link to="/events" className="back-link">← Back to Events</Link>
      </header>

      <div className="container">
        <div className="event-details-card">
          <div className="event-header">
            <div>
              <span className="event-type-badge">{event.eventType}</span>
              {isRegistered && !hasPendingOrder && (
                <span className="event-type-badge" style={{ 
                  backgroundColor: '#555', 
                  marginLeft: '10px' 
                }}>
                  ✓ Registered
                </span>
              )}
              {hasPendingOrder && merchandiseOrderStatus === 'Pending Approval' && (
                <span className="event-type-badge" style={{ 
                  backgroundColor: '#777', 
                  marginLeft: '10px' 
                }}>
                  ⏳ Order Pending Approval
                </span>
              )}
              {hasPendingOrder && merchandiseOrderStatus === 'Approved' && (
                <span className="event-type-badge" style={{ 
                  backgroundColor: '#555', 
                  marginLeft: '10px' 
                }}>
                  ✓ Order Approved
                </span>
              )}
              <h1>{event.eventName}</h1>
              <p className="organizer-name">
                Organized by {event.organizer?.organizerName}
              </p>
            </div>
          </div>

          <div className="event-info-grid">
            <div className="info-section">
              <h3>Description</h3>
              <p>{event.eventDescription}</p>
            </div>

            <div className="info-section">
              <h3>Event Details</h3>
              <div className="detail-item">
                <strong>Start Date:</strong> {new Date(event.eventStartDate).toLocaleDateString()}
              </div>
              <div className="detail-item">
                <strong>End Date:</strong> {new Date(event.eventEndDate).toLocaleDateString()}
              </div>
              <div className="detail-item">
                <strong>Registration Deadline:</strong>{' '}
                {new Date(event.registrationDeadline).toLocaleDateString()}
              </div>
              <div className="detail-item">
                <strong>Eligibility:</strong> {event.eligibility}
              </div>
              <div className="detail-item">
                <strong>Registration Fee:</strong>{' '}
                {event.registrationFee ? `₹${event.registrationFee}` : 'Free'}
              </div>
              <div className="detail-item">
                <strong>Available Slots:</strong>{' '}
                {event.registrationLimit - event.registrationCount} / {event.registrationLimit}
              </div>
            </div>

            {event.eventTags && event.eventTags.length > 0 && (
              <div className="info-section">
                <h3>Tags</h3>
                <div className="tags">
                  {event.eventTags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isRegistered ? (
            <div className="registration-section" style={{ 
              backgroundColor: hasPendingOrder && merchandiseOrderStatus === 'Pending Approval' ? '#fff3cd' : '#d4edda', 
              border: `1px solid ${hasPendingOrder && merchandiseOrderStatus === 'Pending Approval' ? '#ffeaa7' : '#c3e6cb'}`, 
              color: hasPendingOrder && merchandiseOrderStatus === 'Pending Approval' ? '#856404' : '#155724',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {hasPendingOrder && merchandiseOrderStatus === 'Pending Approval' ? (
                <>
                  <h3>⏳ Order Pending Approval</h3>
                  <p>Your merchandise order has been placed and is waiting for the organizer to verify your payment. No QR ticket will be generated until the payment is approved.</p>
                  <Link to="/participant/merchandise-orders" className="btn btn-primary">
                    View My Orders
                  </Link>
                </>
              ) : hasPendingOrder && merchandiseOrderStatus === 'Approved' ? (
                <>
                  <h3>✓ Order Approved!</h3>
                  <p>Your payment has been approved and your ticket with QR code has been generated.</p>
                  <Link to="/participant/merchandise-orders" className="btn btn-primary">
                    View My Orders & Ticket
                  </Link>
                </>
              ) : (
                <>
                  <h3>✓ You're Registered!</h3>
                  <p>You have successfully registered for this event. Check your dashboard for your ticket.</p>
                  <Link to="/participant/dashboard" className="btn btn-primary">
                    View My Tickets
                  </Link>
                </>
              )}
            </div>
          ) : isRegistrationOpen ? (
            <div className="registration-section">
              <button
                className="btn btn-primary btn-lg"
                onClick={initiateRegistration}
              >
                {event.eventType === 'Merchandise' ? 'Order Merchandise' : 'Register Now'}
              </button>
              {event.eventType === 'Merchandise' && (
                <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                  You'll need to upload a payment proof. Your order will be reviewed by the organizer before a ticket is generated.
                </p>
              )}
            </div>
          ) : (
            <div className="registration-closed">
              <p>Registration is closed for this event</p>
            </div>
          )}
          {/* Calendar Export - show when registered */}
          {isRegistered && isAuthenticated && role === 'participant' && (
            <CalendarExport
              mode="single"
              eventId={id}
              eventName={event.eventName}
            />
          )}
        </div>

        {/* Discussion Forum */}
        <DiscussionForum eventId={id} />
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {event.eventType === 'Normal' ? 'Complete Registration' : 'Select Items to Purchase'}
              </h2>
              <button className="modal-close" onClick={() => setShowRegistrationModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Normal Event - Custom Form */}
              {event.eventType === 'Normal' && (
                <div className="registration-form">
                  {event.customForm && event.customForm.length > 0 ? (
                    <>
                      <p style={{ marginBottom: '20px', color: '#666' }}>
                        Please fill out the registration form below:
                      </p>
                      {event.customForm.map((field, index) => (
                        <div key={index} className="form-group">
                          <label>
                            {field.label}
                            {field.required && <span style={{ color: 'red' }}> *</span>}
                          </label>
                          {renderFormField(field)}
                        </div>
                      ))}
                    </>
                  ) : (
                    <p>No additional information required. Click Register to complete your registration.</p>
                  )}
                </div>
              )}

              {/* Merchandise Event - Item Selection */}
              {event.eventType === 'Merchandise' && (
                <div className="merchandise-selection">
                  {event.items && event.items.length > 0 ? (
                    <>
                      <p style={{ marginBottom: '20px', color: '#666' }}>
                        Select items and quantities you wish to purchase:
                      </p>
                      <div className="items-grid">
                        {event.items.map((item, index) => {
                          const itemKey = `${item.size}-${item.color}-${item.variant}`;
                          const currentQuantity = itemQuantities[itemKey] || 0;
                          
                          return (
                            <div key={index} className="item-card">
                              <div className="item-details">
                                <h4>{item.variant}</h4>
                                {item.size && <p><strong>Size:</strong> {item.size}</p>}
                                {item.color && <p><strong>Color:</strong> {item.color}</p>}
                                <p><strong>Stock:</strong> {item.stock} available</p>
                                <p><strong>Max per person:</strong> {item.purchaseLimit}</p>
                              </div>
                              <div className="item-quantity">
                                <label>Quantity:</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.min(item.stock, item.purchaseLimit)}
                                  value={currentQuantity}
                                  onChange={(e) => handleItemSelection(item, e.target.value)}
                                  className="quantity-input"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {selectedItems.length > 0 && (
                        <div className="selected-items-summary">
                          <h4>Selected Items:</h4>
                          <ul>
                            {selectedItems.map((item, idx) => (
                              <li key={idx}>
                                {item.variant} ({item.size && `${item.size}, `}{item.color}) - Qty: {item.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>No items available for this merchandise event.</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRegistrationModal(false)}
                disabled={registering}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Processing...' : 'Complete Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
