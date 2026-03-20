const Registration = require('../models/Registration');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const Event = require('../models/Event');

// @desc    Scan QR code and mark attendance
// @route   POST /api/attendance/:eventId/scan
// @access  Private (Organizer)
const scanQRAndMarkAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find registration by ticketId and event
    const registration = await Registration.findOne({
      event: eventId,
      ticketId,
      status: { $ne: 'Cancelled' },
    }).populate('participant', 'firstName lastName email contactNumber participantType');

    if (!registration) {
      return res.status(404).json({ message: 'Invalid ticket. No registration found for this event.' });
    }

    // Check for duplicate scan
    if (registration.attended) {
      return res.status(400).json({
        message: 'Duplicate scan! This ticket has already been scanned.',
        attendanceDate: registration.attendanceDate,
        participant: registration.participant,
      });
    }

    registration.attended = true;
    registration.attendanceDate = new Date();
    registration.status = 'Attended';
    await registration.save();

    res.json({
      message: 'Attendance marked successfully',
      registration,
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Manual attendance override with audit log
// @route   POST /api/attendance/:eventId/manual
// @access  Private (Organizer)
const manualMarkAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId, reason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      event: eventId,
      status: { $ne: 'Cancelled' },
    }).populate('participant', 'firstName lastName email contactNumber');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.attended) {
      return res.status(400).json({ message: 'Attendance already marked for this participant' });
    }

    registration.attended = true;
    registration.attendanceDate = new Date();
    registration.status = 'Attended';

    // Store audit info in formData map
    if (!registration.formData) {
      registration.formData = new Map();
    }
    registration.formData.set('manualOverride', true);
    registration.formData.set('overrideReason', reason || 'Manual override by organizer');
    registration.formData.set('overrideBy', req.user._id.toString());
    registration.formData.set('overrideAt', new Date().toISOString());

    await registration.save();

    res.json({
      message: 'Attendance manually marked (override)',
      registration,
      audit: {
        manualOverride: true,
        reason: reason || 'Manual override by organizer',
        overrideBy: req.user._id,
        overrideAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance dashboard for an event
// @route   GET /api/attendance/:eventId
// @access  Private (Organizer)
const getAttendanceDashboard = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registrations = await Registration.find({
      event: eventId,
      status: { $ne: 'Cancelled' },
    }).populate('participant', 'firstName lastName email contactNumber participantType');

    const scanned = registrations.filter((r) => r.attended);
    const notScanned = registrations.filter((r) => !r.attended);

    res.json({
      eventName: event.eventName,
      totalRegistered: registrations.length,
      totalScanned: scanned.length,
      totalNotScanned: notScanned.length,
      scanned,
      notScanned,
    });
  } catch (error) {
    console.error('Attendance dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/attendance/:eventId/export
// @access  Private (Organizer)
const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registrations = await Registration.find({
      event: eventId,
      status: { $ne: 'Cancelled' },
    }).populate('participant', 'firstName lastName email contactNumber participantType');

    const headers = ['Name', 'Email', 'Contact', 'Type', 'Ticket ID', 'Attended', 'Attendance Time', 'Manual Override'];
    const rows = registrations.map((r) => {
      const isManual = r.formData && r.formData.get && r.formData.get('manualOverride');
      return [
        `${r.participant.firstName} ${r.participant.lastName}`,
        r.participant.email,
        r.participant.contactNumber,
        r.participant.participantType,
        r.ticketId,
        r.attended ? 'Yes' : 'No',
        r.attendanceDate ? new Date(r.attendanceDate).toLocaleString() : '',
        isManual ? 'Yes' : 'No',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.eventName}_attendance.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  scanQRAndMarkAttendance,
  manualMarkAttendance,
  getAttendanceDashboard,
  exportAttendanceCSV,
};
