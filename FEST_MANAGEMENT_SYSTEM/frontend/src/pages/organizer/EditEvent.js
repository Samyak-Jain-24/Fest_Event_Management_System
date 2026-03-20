import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, updateEvent } from '../../services/apiService';
import { toast } from 'react-toastify';

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [originalStatus, setOriginalStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Determine what can be edited based on status
  const canEditAll = originalStatus === 'Draft';
  const canEditLimited = originalStatus === 'Published';
  const cannotEdit = ['Ongoing', 'Completed', 'Closed'].includes(originalStatus);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await getEventById(id);
      const event = response.data;
      setOriginalStatus(event.status);
      setFormData({
        eventName: event.eventName,
        eventDescription: event.eventDescription,
        eventType: event.eventType,
        eligibility: event.eligibility,
        registrationDeadline: event.registrationDeadline.substring(0, 16),
        eventStartDate: event.eventStartDate.substring(0, 16),
        eventEndDate: event.eventEndDate.substring(0, 16),
        registrationLimit: event.registrationLimit,
        registrationFee: event.registrationFee,
        eventTags: event.eventTags.join(', '),
        status: event.status,
      });
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cannotEdit) {
      toast.error('This event cannot be edited. Only status changes are allowed from the event detail page.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        registrationFee: Number(formData.registrationFee),
        registrationLimit: Number(formData.registrationLimit),
        eventTags: formData.eventTags ? formData.eventTags.split(',').map((t) => t.trim()) : [],
      };

      // Add fields based on what's editable
      if (canEditAll) {
        Object.assign(payload, formData);
      } else if (canEditLimited) {
        payload.eventDescription = formData.eventDescription;
        payload.registrationDeadline = formData.registrationDeadline;
        payload.registrationLimit = formData.registrationLimit;
      }

      await updateEvent(id, payload);
      toast.success('Event updated successfully!');
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return <div className="loading">Loading event...</div>;
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
        <div className="profile-container">
          <h2>Edit Event</h2>

          {cannotEdit && (
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '20px' }}>
              <strong>⚠️ Editing Restricted:</strong> This event is {originalStatus}. Only status changes are allowed from the event detail page.
            </div>
          )}

          {canEditLimited && (
            <div style={{ padding: '15px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '20px' }}>
              <strong>ℹ️ Limited Editing:</strong> This event is Published. You can only edit description, extend deadline, and increase registration limit.
            </div>
          )}

          <div className="profile-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Event Name</label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  disabled={!canEditAll}
                  required={canEditAll}
                />
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Event Description *</label>
                <textarea
                  name="eventDescription"
                  value={formData.eventDescription}
                  onChange={handleChange}
                  rows="4"
                  disabled={cannotEdit}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Type</label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  disabled={!canEditAll}
                  required={canEditAll}
                >
                  <option value="Normal">Normal Event</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Eligibility</label>
                <select
                  name="eligibility"
                  value={formData.eligibility}
                  onChange={handleChange}
                  disabled={!canEditAll}
                  required={canEditAll}
                >
                  <option value="All">All Participants</option>
                  <option value="IIIT Only">IIIT Only</option>
                  <option value="Non-IIIT Only">Non-IIIT Only</option>
                </select>
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Registration Deadline *</label>
                <input
                  type="datetime-local"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  disabled={cannotEdit}
                  required={!cannotEdit}
                />
                {canEditLimited && <small style={{ color: '#555' }}>Can be extended for published events</small>}
              </div>

              <div className="form-group">
                <label>Event Start Date</label>
                <input
                  type="datetime-local"
                  name="eventStartDate"
                  value={formData.eventStartDate}
                  onChange={handleChange}
                  disabled={!canEditAll}
                  required={canEditAll}
                />
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Event End Date</label>
                <input
                  type="datetime-local"
                  name="eventEndDate"
                  value={formData.eventEndDate}
                  onChange={handleChange}
                  disabled={!canEditAll}
                  required={canEditAll}
                />
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Registration Limit *</label>
                <input
                  type="number"
                  name="registrationLimit"
                  value={formData.registrationLimit}
                  onChange={handleChange}
                  min="1"
                  disabled={cannotEdit}
                  required={!cannotEdit}
                />
                {canEditLimited && <small style={{ color: '#555' }}>Can be increased for published events</small>}
              </div>

              <div className="form-group">
                <label>Registration Fee (₹)</label>
                <input
                  type="number"
                  name="registrationFee"
                  value={formData.registrationFee}
                  onChange={handleChange}
                  min="0"
                  disabled={!canEditAll}
                />
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              <div className="form-group">
                <label>Event Tags (comma-separated)</label>
                <input
                  type="text"
                  name="eventTags"
                  value={formData.eventTags}
                  onChange={handleChange}
                  disabled={!canEditAll}
                />
                {!canEditAll && <small style={{ color: '#666' }}>Cannot be changed after publishing</small>}
              </div>

              {!cannotEdit && (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}

              {cannotEdit && (
                <div style={{ padding: '15px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '5px', marginTop: '20px' }}>
                  <strong>Editing is disabled for {originalStatus} events.</strong> Go to event detail page to change status.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
