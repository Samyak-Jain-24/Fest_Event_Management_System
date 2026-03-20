import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <nav className="home-nav">
          <div className="nav-container">
            <h1 className="logo">Felicity</h1>
            <div className="nav-links">
              <Link to="/events" className="nav-link">Browse Events</Link>
              <Link to="/clubs" className="nav-link">Clubs</Link>
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/register" className="btn btn-secondary">Register</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section className="features-section">
          <h2>Why Choose Felicity?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Easy Registration</h3>
              <p>Register for events with just a few clicks. Get instant confirmation and QR tickets.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Personalized Experience</h3>
              <p>Set your preferences and get event recommendations based on your interests.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Merchandise Store</h3>
              <p>Buy exclusive fest merchandise with easy inventory management.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Track Participation</h3>
              <p>View your participation history and upcoming events in one place.</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Join the Fest?</h2>
          <p>Create your account and start exploring events!</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Register Now
          </Link>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2026 Felicity Event Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
