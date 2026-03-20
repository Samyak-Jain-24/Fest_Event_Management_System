import api from './api';

// Register participant
export const registerParticipant = (data) => {
  return api.post('/auth/register/participant', data);
};

// Login
export const login = (data) => {
  return api.post('/auth/login', data);
};

// Get current user
export const getCurrentUser = () => {
  return api.get('/auth/me');
};

// Get all events
export const getEvents = (params) => {
  return api.get('/events', { params });
};

// Get event by ID
export const getEventById = (id) => {
  return api.get(`/events/${id}`);
};

// Register for event
export const registerForEvent = (eventId, data) => {
  return api.post(`/registrations/${eventId}`, data);
};

// Get my registrations
export const getMyRegistrations = (params) => {
  return api.get('/registrations', { params });
};

// Cancel registration
export const cancelRegistration = (id) => {
  return api.put(`/registrations/${id}/cancel`);
};

// Get participant profile
export const getParticipantProfile = () => {
  return api.get('/participants/profile');
};

// Update participant profile
export const updateParticipantProfile = (data) => {
  return api.put('/participants/profile', data);
};

// Update preferences
export const updatePreferences = (data) => {
  return api.put('/participants/preferences', data);
};

// Follow/unfollow organizer
export const toggleFollowOrganizer = (organizerId) => {
  return api.post(`/participants/follow/${organizerId}`);
};

// Change participant password
export const changeParticipantPassword = (data) => {
  return api.put('/participants/change-password', data);
};

// Get all organizers
export const getOrganizers = (params) => {
  return api.get('/organizers', { params });
};

// Get organizer by ID
export const getOrganizerById = (id) => {
  return api.get(`/organizers/${id}`);
};

// Organizer - Create event
export const createEvent = (data) => {
  return api.post('/events', data);
};

// Organizer - Update event
export const updateEvent = (id, data) => {
  return api.put(`/events/${id}`, data);
};

// Organizer - Delete event
export const deleteEvent = (id) => {
  return api.delete(`/events/${id}`);
};

// Organizer - Get my events
export const getOrganizerEvents = () => {
  return api.get('/events/organizer/my-events');
};

// Organizer - Get event registrations
export const getEventRegistrations = (eventId) => {
  return api.get(`/registrations/event/${eventId}`);
};

// Organizer - Get profile
export const getOrganizerProfile = () => {
  return api.get('/organizers/me/profile');
};

// Organizer - Update profile
export const updateOrganizerProfile = (data) => {
  return api.put('/organizers/me/profile', data);
};

// Organizer - Get analytics
export const getOrganizerAnalytics = () => {
  return api.get('/organizers/me/analytics');
};

// Organizer - Mark attendance
export const markAttendance = (registrationId) => {
  return api.put(`/registrations/${registrationId}/attendance`);
};

// Admin - Create organizer
export const createOrganizer = (data) => {
  return api.post('/admin/organizers', data);
};

// Admin - Get all organizers
export const getAllOrganizers = () => {
  return api.get('/admin/organizers');
};

// Admin - Toggle organizer active
export const toggleOrganizerActive = (id) => {
  return api.put(`/admin/organizers/${id}/toggle-active`);
};

// Admin - Delete organizer
export const deleteOrganizer = (id) => {
  return api.delete(`/admin/organizers/${id}`);
};

// Admin - Get password reset requests
export const getPasswordResets = (status) => {
  return api.get('/admin/password-resets', { params: { status } });
};

// Admin - Approve password reset
export const approvePasswordReset = (id, data) => {
  return api.put(`/admin/password-resets/${id}/approve`, data);
};

// Admin - Reject password reset
export const rejectPasswordReset = (id, data) => {
  return api.put(`/admin/password-resets/${id}/reject`, data);
};

// Request password reset
export const requestPasswordReset = (data) => {
  return api.post('/admin/password-reset-request', data);
};

// ===== Merchandise Order APIs =====
export const placeMerchandiseOrder = (eventId, data) => {
  return api.post(`/merchandise-orders/${eventId}`, data);
};

export const getMyMerchandiseOrders = () => {
  return api.get('/merchandise-orders/my-orders');
};

export const getEventMerchandiseOrders = (eventId) => {
  return api.get(`/merchandise-orders/event/${eventId}`);
};

export const approveMerchandiseOrder = (orderId) => {
  return api.put(`/merchandise-orders/${orderId}/approve`);
};

export const rejectMerchandiseOrder = (orderId, data) => {
  return api.put(`/merchandise-orders/${orderId}/reject`, data);
};

// ===== Attendance APIs =====
export const scanAttendance = (eventId, data) => {
  return api.post(`/attendance/${eventId}/scan`, data);
};

export const manualAttendance = (eventId, data) => {
  return api.post(`/attendance/${eventId}/manual`, data);
};

export const getAttendanceDashboard = (eventId) => {
  return api.get(`/attendance/${eventId}`);
};

export const exportAttendanceCSV = (eventId) => {
  return api.get(`/attendance/${eventId}/export`, { responseType: 'blob' });
};

// ===== Forum APIs =====
export const getForumMessages = (eventId, page = 1) => {
  return api.get(`/forum/${eventId}?page=${page}`);
};

export const getThreadReplies = (eventId, messageId) => {
  return api.get(`/forum/${eventId}/thread/${messageId}`);
};

export const postForumMessage = (eventId, data) => {
  return api.post(`/forum/${eventId}`, data);
};

export const deleteForumMessage = (eventId, messageId) => {
  return api.delete(`/forum/${eventId}/message/${messageId}`);
};

export const togglePinMessage = (eventId, messageId) => {
  return api.put(`/forum/${eventId}/message/${messageId}/pin`);
};

export const toggleMessageReaction = (eventId, messageId, data) => {
  return api.put(`/forum/${eventId}/message/${messageId}/react`, data);
};

// ===== Notification APIs =====
export const getNotifications = (unreadOnly, eventId) => {
  return api.get('/notifications', { params: { unreadOnly, eventId } });
};

export const markNotificationRead = (id) => {
  return api.put(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = (eventId) => {
  return api.put('/notifications/read-all', { eventId });
};

// ===== Calendar Integration APIs =====
export const exportCalendarEvent = (eventId, reminder = 30) => {
  return api.get(`/calendar/export/${eventId}?reminder=${reminder}`, { responseType: 'blob' });
};

export const exportCalendarBatch = (eventIds, reminder = 30) => {
  return api.post('/calendar/export-batch', { eventIds, reminder }, { responseType: 'blob' });
};

export const getGoogleCalendarLink = (eventId) => {
  return api.get(`/calendar/google/${eventId}`);
};

export const getOutlookCalendarLink = (eventId) => {
  return api.get(`/calendar/outlook/${eventId}`);
};

export const getCalendarEventInfo = (eventId) => {
  return api.get(`/calendar/event-info/${eventId}`);
};
