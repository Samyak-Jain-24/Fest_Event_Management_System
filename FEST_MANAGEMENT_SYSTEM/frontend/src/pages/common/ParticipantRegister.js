import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerParticipant } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const ParticipantRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    participantType: 'IIIT',
    contactNumber: '',
    college: '',
    organizationName: '',
  });
  const [loading, setLoading] = useState(false);

  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    participantType,
    contactNumber,
    college,
    organizationName,
  } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (participantType === 'IIIT' && !email.endsWith('@students.iiit.ac.in') && !email.endsWith('@research.iiit.ac.in')) {
      toast.error('IIIT participants must use IIIT email (@students.iiit.ac.in or @research.iiit.ac.in)');
      return;
    }

    setLoading(true);

    try {
      const response = await registerParticipant(formData);
      const { token, user } = response.data;
      
      login(token, user, 'participant');
      toast.success('Registration successful!');
      navigate('/participant/onboarding');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Participant Registration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Participant Type</label>
            <select
              name="participantType"
              value={participantType}
              onChange={handleChange}
              required
            >
              <option value="IIIT">IIIT Student</option>
              <option value="Non-IIIT">Non-IIIT Participant</option>
            </select>
          </div>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder={
                participantType === 'IIIT'
                  ? 'your.email@students.iiit.ac.in'
                  : 'your.email@example.com'
              }
              required
            />
            {participantType === 'IIIT' && (
              <small className="text-muted">Must be an IIIT email address</small>
            )}
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="tel"
              name="contactNumber"
              value={contactNumber}
              onChange={handleChange}
              placeholder="Enter your contact number"
              required
            />
          </div>

          {participantType === 'IIIT' ? (
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={organizationName}
                onChange={handleChange}
                placeholder="e.g., IIIT Hyderabad"
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>College/Organization</label>
              <input
                type="text"
                name="college"
                value={college}
                onChange={handleChange}
                placeholder="Enter your college/organization name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParticipantRegister;
