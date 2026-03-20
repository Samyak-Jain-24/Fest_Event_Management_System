import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h1>403 - Unauthorized</h1>
      <p>You don't have permission to access this page.</p>
      <Link to="/" className="btn btn-primary">
        Go Back to Home
      </Link>
    </div>
  );
};

export default Unauthorized;
