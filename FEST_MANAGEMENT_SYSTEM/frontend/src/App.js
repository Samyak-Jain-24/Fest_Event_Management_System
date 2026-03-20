import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Common pages
import Login from './pages/common/Login';
import ParticipantRegister from './pages/common/ParticipantRegister';
import Home from './pages/common/Home';
import Unauthorized from './pages/common/Unauthorized';
import BrowseEvents from './pages/common/BrowseEvents';
import EventDetails from './pages/common/EventDetails';
import ClubsListing from './pages/common/ClubsListing';
import ClubDetails from './pages/common/ClubDetails';
import ForgotPassword from './pages/common/ForgotPassword';
import ResetPassword from './pages/common/ResetPassword';

// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import ParticipantProfile from './pages/participant/Profile';
import Onboarding from './pages/participant/Onboarding';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerProfile from './pages/organizer/Profile';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import OngoingEvents from './pages/organizer/OngoingEvents';
import PaymentApproval from './pages/organizer/PaymentApproval';
import QRScanner from './pages/organizer/QRScanner';
import AttendanceDashboard from './pages/organizer/AttendanceDashboard';

// Participant extra pages
import MerchandiseOrderPage from './pages/participant/MerchandiseOrderPage';
import MerchandiseOrders from './pages/participant/MerchandiseOrders';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResets from './pages/admin/PasswordResets';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<ParticipantRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/events" element={<BrowseEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/clubs" element={<ClubsListing />} />
            <Route path="/clubs/:id" element={<ClubDetails />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Participant routes */}
            <Route
              path="/participant/dashboard"
              element={
                <PrivateRoute allowedRoles={['participant']}>
                  <ParticipantDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/participant/profile"
              element={
                <PrivateRoute allowedRoles={['participant']}>
                  <ParticipantProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/participant/onboarding"
              element={
                <PrivateRoute allowedRoles={['participant']}>
                  <Onboarding />
                </PrivateRoute>
              }
            />

            {/* Organizer routes */}
            <Route
              path="/organizer/dashboard"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <OrganizerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/profile"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <OrganizerProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/create-event"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <CreateEvent />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/edit-event/:id"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <EditEvent />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/event/:id"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <OrganizerEventDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/ongoing-events"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <OngoingEvents />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/payment-approval/:eventId"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <PaymentApproval />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/qr-scanner/:eventId"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <QRScanner />
                </PrivateRoute>
              }
            />
            <Route
              path="/organizer/attendance/:eventId"
              element={
                <PrivateRoute allowedRoles={['organizer']}>
                  <AttendanceDashboard />
                </PrivateRoute>
              }
            />

            {/* Participant merchandise routes */}
            <Route
              path="/participant/merchandise-order/:eventId"
              element={
                <PrivateRoute allowedRoles={['participant']}>
                  <MerchandiseOrderPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/participant/merchandise-orders"
              element={
                <PrivateRoute allowedRoles={['participant']}>
                  <MerchandiseOrders />
                </PrivateRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/organizers"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <ManageOrganizers />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/password-resets"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <PasswordResets />
                </PrivateRoute>
              }
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
