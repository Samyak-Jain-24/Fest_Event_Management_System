import React from 'react';
import ReactDOM from 'react-dom/client';
// Import main stylesheet
import './index.css';
import App from './App';

// React 18 compatible root rendering
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
