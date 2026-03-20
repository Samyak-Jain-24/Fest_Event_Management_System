import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, placeMerchandiseOrder } from '../../services/apiService';
import { toast } from 'react-toastify';

const MerchandiseOrderPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentProof, setPaymentProof] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await getEventById(eventId);
      setEvent(res.data);
      if (res.data.items) {
        setSelectedItems(res.data.items.map((item) => ({
          size: item.size,
          color: item.color,
          variant: item.variant,
          quantity: 0,
          stock: item.stock,
          purchaseLimit: item.purchaseLimit,
        })));
      }
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (index, value) => {
    const updated = [...selectedItems];
    const qty = Math.max(0, Math.min(parseInt(value) || 0, updated[index].purchaseLimit, updated[index].stock));
    updated[index].quantity = qty;
    setSelectedItems(updated);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result);
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const totalQuantity = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = totalQuantity * (event?.registrationFee || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = selectedItems.filter((i) => i.quantity > 0).map(({ size, color, variant, quantity }) => ({ size, color, variant, quantity }));
    if (items.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    if (!paymentProof) {
      toast.error('Please upload payment proof');
      return;
    }
    setSubmitting(true);
    try {
      await placeMerchandiseOrder(eventId, { items, paymentProof });
      toast.success('Order placed! Waiting for payment approval.');
      navigate('/participant/merchandise-orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
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
            <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">Back</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h2>Order Merchandise - {event.eventName}</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Select items and upload your payment proof. Your order will be reviewed by the organizer.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Available Items</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="participants-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Size</th>
                    <th>Color</th>
                    <th>Stock</th>
                    <th>Limit</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.variant || '-'}</td>
                      <td>{item.size || '-'}</td>
                      <td>{item.color || '-'}</td>
                      <td>{item.stock}</td>
                      <td>{item.purchaseLimit}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={Math.min(item.purchaseLimit, item.stock)}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          style={{ width: '70px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                          disabled={item.stock === 0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {event.registrationFee > 0 && (
              <div style={{ marginTop: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                Total: ₹{totalAmount} ({totalQuantity} item{totalQuantity !== 1 ? 's' : ''})
              </div>
            )}
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Payment Proof</h3>
            <p style={{ color: '#666', marginBottom: '10px' }}>Upload a screenshot of your payment (UPI, bank transfer, etc.)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginBottom: '15px' }}
            />
            {previewUrl && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={previewUrl}
                  alt="Payment proof preview"
                  style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || totalQuantity === 0 || !paymentProof}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MerchandiseOrderPage;
