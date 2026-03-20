require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/error');

// Import routes
const authRoutes = require('./routes/authRoutes');
const participantRoutes = require('./routes/participantRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const merchandiseOrderRoutes = require('./routes/merchandiseOrderRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

// ...existing code...

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ...existing code...
// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Felicity Event Management System API',
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/merchandise-orders', merchandiseOrderRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
