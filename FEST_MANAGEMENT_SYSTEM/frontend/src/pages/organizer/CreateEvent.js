import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../../services/apiService';
import { toast } from 'react-toastify';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    eventName: '',
    eventDescription: '',
    eventType: 'Normal',
    eligibility: 'All',
    registrationDeadline: '',
    eventStartDate: '',
    eventEndDate: '',
    registrationLimit: '',
    registrationFee: 0,
    eventTags: '',
    status: 'Draft',
  });

  // For Normal Event - Custom Form Fields
  const [customForm, setCustomForm] = useState([]);
  const [newField, setNewField] = useState({
    fieldType: 'text',
    label: '',
    name: '',
    placeholder: '',
    required: false,
    options: '',
  });

  // For Merchandise Event - Items
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    size: '',
    color: '',
    variant: '',
    stock: '',
    purchaseLimit: 1,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Form Builder Functions
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField({
      ...newField,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const addFormField = () => {
    if (!newField.label || !newField.name) {
      toast.error('Field label and name are required');
      return;
    }

    const field = {
      ...newField,
      options: newField.options ? newField.options.split(',').map(o => o.trim()) : undefined,
    };

    setCustomForm([...customForm, field]);
    setNewField({
      fieldType: 'text',
      label: '',
      name: '',
      placeholder: '',
      required: false,
      options: '',
    });
    toast.success('Form field added');
  };

  const removeFormField = (index) => {
    setCustomForm(customForm.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newForm = [...customForm];
    [newForm[index - 1], newForm[index]] = [newForm[index], newForm[index - 1]];
    setCustomForm(newForm);
  };

  const moveFieldDown = (index) => {
    if (index === customForm.length - 1) return;
    const newForm = [...customForm];
    [newForm[index], newForm[index + 1]] = [newForm[index + 1], newForm[index]];
    setCustomForm(newForm);
  };

  // Merchandise Item Functions
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const addItem = () => {
    if (!newItem.variant || !newItem.stock) {
      toast.error('Variant name and stock quantity are required');
      return;
    }

    setItems([...items, {
      ...newItem,
      stock: Number(newItem.stock),
      purchaseLimit: Number(newItem.purchaseLimit),
    }]);
    
    setNewItem({
      size: '',
      color: '',
      variant: '',
      stock: '',
      purchaseLimit: 1,
    });
    toast.success('Item variant added');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        registrationFee: Number(formData.registrationFee),
        registrationLimit: Number(formData.registrationLimit),
        eventTags: formData.eventTags ? formData.eventTags.split(',').map((t) => t.trim()) : [],
      };

      // Add event-type-specific data
      if (formData.eventType === 'Normal' && customForm.length > 0) {
        payload.customForm = customForm;
      }

      if (formData.eventType === 'Merchandise' && items.length > 0) {
        payload.items = items;
      }

      await createEvent(payload);
      toast.success('Event created successfully!');
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

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
          <h2>Create New Event</h2>

          <div className="profile-card">
            <form onSubmit={handleSubmit}>
              <h3>Basic Information</h3>

              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Description *</label>
                <textarea
                  name="eventDescription"
                  value={formData.eventDescription}
                  onChange={handleChange}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Type *</label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  required
                >
                  <option value="Normal">Normal Event</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>

              <div className="form-group">
                <label>Eligibility *</label>
                <select
                  name="eligibility"
                  value={formData.eligibility}
                  onChange={handleChange}
                  required
                >
                  <option value="All">All Participants</option>
                  <option value="IIIT Only">IIIT Only</option>
                  <option value="Non-IIIT Only">Non-IIIT Only</option>
                </select>
              </div>

              <div className="form-group">
                <label>Registration Deadline *</label>
                <input
                  type="datetime-local"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Start Date *</label>
                <input
                  type="datetime-local"
                  name="eventStartDate"
                  value={formData.eventStartDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event End Date *</label>
                <input
                  type="datetime-local"
                  name="eventEndDate"
                  value={formData.eventEndDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Registration Limit *</label>
                <input
                  type="number"
                  name="registrationLimit"
                  value={formData.registrationLimit}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Registration Fee (₹)</label>
                <input
                  type="number"
                  name="registrationFee"
                  value={formData.registrationFee}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Event Tags (comma-separated)</label>
                <input
                  type="text"
                  name="eventTags"
                  value={formData.eventTags}
                  onChange={handleChange}
                  placeholder="e.g., workshop, technical, cultural"
                />
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="Draft">Draft (Can edit later)</option>
                  <option value="Published">Published (Limited edits)</option>
                </select>
              </div>

              {/* Form Builder for Normal Events */}
              {formData.eventType === 'Normal' && (
                <>
                  <hr style={{ margin: '30px 0' }} />
                  <h3>Registration Form Builder (Optional)</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Create custom registration form fields for participants
                  </p>

                  {customForm.length > 0 && (
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                      <h4>Current Form Fields:</h4>
                      {customForm.map((field, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'white', marginBottom: '10px', borderRadius: '4px' }}>
                          <div>
                            <strong>{field.label}</strong> ({field.fieldType})
                            {field.required && <span style={{ color: 'red' }}> *</span>}
                            {field.options && <div style={{ fontSize: '0.9em', color: '#666' }}>Options: {field.options.join(', ')}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button type="button" onClick={() => moveFieldUp(index)} className="btn btn-secondary btn-sm" disabled={index === 0}>↑</button>
                            <button type="button" onClick={() => moveFieldDown(index)} className="btn btn-secondary btn-sm" disabled={index === customForm.length - 1}>↓</button>
                            <button type="button" onClick={() => removeFormField(index)} className="btn btn-danger btn-sm">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '20px' }}>
                    <h4>Add New Field</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="form-group">
                        <label>Field Type</label>
                        <select name="fieldType" value={newField.fieldType} onChange={handleFieldChange}>
                          <option value="text">Text Input</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="textarea">Text Area</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="radio">Radio Buttons</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="file">File Upload</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Field Label *</label>
                        <input type="text" name="label" value={newField.label} onChange={handleFieldChange} placeholder="e.g., Full Name" />
                      </div>
                      <div className="form-group">
                        <label>Field Name (no spaces) *</label>
                        <input type="text" name="name" value={newField.name} onChange={handleFieldChange} placeholder="e.g., fullName" />
                      </div>
                      <div className="form-group">
                        <label>Placeholder</label>
                        <input type="text" name="placeholder" value={newField.placeholder} onChange={handleFieldChange} placeholder="Optional hint text" />
                      </div>
                      {['dropdown', 'radio', 'checkbox'].includes(newField.fieldType) && (
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Options (comma-separated) *</label>
                          <input type="text" name="options" value={newField.options} onChange={handleFieldChange} placeholder="e.g., Option 1, Option 2, Option 3" />
                        </div>
                      )}
                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" name="required" checked={newField.required} onChange={handleFieldChange} id="fieldRequired" />
                        <label htmlFor="fieldRequired" style={{ margin: 0 }}>Required Field</label>
                      </div>
                    </div>
                    <button type="button" onClick={addFormField} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                      Add Field
                    </button>
                  </div>
                </>
              )}

              {/* Merchandise Item Management */}
              {formData.eventType === 'Merchandise' && (
                <>
                  <hr style={{ margin: '30px 0' }} />
                  <h3>Merchandise Item Details</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Add item variants with sizes, colors, stock, and purchase limits
                  </p>

                  {items.length > 0 && (
                    <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                      <table className="participants-table">
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Color</th>
                            <th>Variant</th>
                            <th>Stock</th>
                            <th>Purchase Limit</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.size || '-'}</td>
                              <td>{item.color || '-'}</td>
                              <td>{item.variant}</td>
                              <td>{item.stock}</td>
                              <td>{item.purchaseLimit}</td>
                              <td>
                                <button type="button" onClick={() => removeItem(index)} className="btn btn-danger btn-sm">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '20px'}}>
                    <h4>Add New Item Variant</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                      <div className="form-group">
                        <label>Size</label>
                        <input type="text" name="size" value={newItem.size} onChange={handleItemChange} placeholder="e.g., S, M, L, XL" />
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input type="text" name="color" value={newItem.color} onChange={handleItemChange} placeholder="e.g., Red, Blue" />
                      </div>
                      <div className="form-group">
                        <label>Variant Name *</label>
                        <input type="text" name="variant" value={newItem.variant} onChange={handleItemChange} placeholder="e.g., T-Shirt Black M" />
                      </div>
                      <div className="form-group">
                        <label>Stock Quantity *</label>
                        <input type="number" name="stock" value={newItem.stock} onChange={handleItemChange} min="0" />
                      </div>
                      <div className="form-group">
                        <label>Purchase Limit per Participant</label>
                        <input type="number" name="purchaseLimit" value={newItem.purchaseLimit} onChange={handleItemChange} min="1" />
                      </div>
                    </div>
                    <button type="button" onClick={addItem} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                      Add Item Variant
                    </button>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
