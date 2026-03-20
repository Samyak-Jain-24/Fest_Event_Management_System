const Registration = require('../models/Registration');
const Event = require('../models/Event');

// Helper: Format date to ICS format (UTC)
const formatDateToICS = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

// Helper: Generate a unique UID for ICS events
const generateUID = (eventId, participantId) => {
  return `${eventId}-${participantId}@felicity-events`;
};

// Helper: Escape special characters in ICS text
const escapeICSText = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

// Helper: Build VALARM (reminder) block
const buildReminder = (minutesBefore = 30) => {
  const hours = Math.floor(minutesBefore / 60);
  const mins = minutesBefore % 60;
  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (mins > 0) duration += `${mins}M`;
  if (hours === 0 && mins === 0) duration += '0M';

  return [
    'BEGIN:VALARM',
    'TRIGGER:-' + duration,
    'ACTION:DISPLAY',
    'DESCRIPTION:Event Reminder',
    'END:VALARM',
  ].join('\r\n');
};

// Helper: Build a single VEVENT block
const buildVEvent = (event, participantId, reminder = 30) => {
  const now = formatDateToICS(new Date());
  const uid = generateUID(event._id.toString(), participantId);
  const start = formatDateToICS(event.eventStartDate);
  const end = formatDateToICS(event.eventEndDate);
  const organizerName = event.organizer?.organizerName || 'Felicity';
  const description = escapeICSText(
    `${event.eventDescription || ''}\\n\\nOrganized by: ${organizerName}\\nType: ${event.eventType}\\nEligibility: ${event.eligibility || 'All'}${event.registrationFee ? '\\nFee: ₹' + event.registrationFee : '\\nFree Event'}`
  );

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICSText(event.eventName)}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=${escapeICSText(organizerName)}:MAILTO:noreply@felicity.events`,
    'STATUS:CONFIRMED',
    `CATEGORIES:${event.eventType}`,
  ];

  if (event.eventTags && event.eventTags.length > 0) {
    lines.push(`CATEGORIES:${event.eventTags.map(t => escapeICSText(t)).join(',')}`);
  }

  // Add reminder / alarm
  if (reminder > 0) {
    lines.push(buildReminder(reminder));
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
};

// Helper: Wrap VEVENTs in a VCALENDAR
const buildICSFile = (vevents) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Felicity Event Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Felicity Events',
    'X-WR-TIMEZONE:Asia/Kolkata',
    // VTIMEZONE for IST
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...vevents,
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};

// @desc    Export single event as .ics file
// @route   GET /api/calendar/export/:eventId
// @access  Private (participant)
const exportSingleEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const reminder = parseInt(req.query.reminder) || 30; // minutes before

    // Verify participant is registered
    const registration = await Registration.findOne({
      event: eventId,
      participant: req.user._id,
      status: { $in: ['Registered', 'Attended'] },
    });

    if (!registration) {
      return res.status(403).json({ message: 'You are not registered for this event' });
    }

    const event = await Event.findById(eventId).populate('organizer', 'organizerName email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const vevent = buildVEvent(event, req.user._id.toString(), reminder);
    const icsContent = buildICSFile([vevent]);

    const filename = `${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Calendar export error:', error);
    res.status(500).json({ message: 'Failed to export calendar event' });
  }
};

// @desc    Batch export multiple events as .ics file
// @route   POST /api/calendar/export-batch
// @access  Private (participant)
const exportBatchEvents = async (req, res) => {
  try {
    const { eventIds, reminder = 30 } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of event IDs' });
    }

    // Get all registrations for this participant for the given events
    const registrations = await Registration.find({
      event: { $in: eventIds },
      participant: req.user._id,
      status: { $in: ['Registered', 'Attended'] },
    });

    if (registrations.length === 0) {
      return res.status(403).json({ message: 'You are not registered for any of the selected events' });
    }

    const registeredEventIds = registrations.map((r) => r.event.toString());

    const events = await Event.find({ _id: { $in: registeredEventIds } }).populate(
      'organizer',
      'organizerName email'
    );

    const vevents = events.map((event) =>
      buildVEvent(event, req.user._id.toString(), parseInt(reminder))
    );

    const icsContent = buildICSFile(vevents);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="felicity_events.ics"');
    res.send(icsContent);
  } catch (error) {
    console.error('Batch calendar export error:', error);
    res.status(500).json({ message: 'Failed to export calendar events' });
  }
};

// @desc    Get Google Calendar link for an event
// @route   GET /api/calendar/google/:eventId
// @access  Private (participant)
const getGoogleCalendarLink = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify registration
    const registration = await Registration.findOne({
      event: eventId,
      participant: req.user._id,
      status: { $in: ['Registered', 'Attended'] },
    });

    if (!registration) {
      return res.status(403).json({ message: 'You are not registered for this event' });
    }

    const event = await Event.findById(eventId).populate('organizer', 'organizerName email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const startDate = formatDateToICS(event.eventStartDate);
    const endDate = formatDateToICS(event.eventEndDate);
    const organizerName = event.organizer?.organizerName || 'Felicity';
    const description = `${event.eventDescription || ''}\n\nOrganized by: ${organizerName}\nType: ${event.eventType}\nEligibility: ${event.eligibility || 'All'}${event.registrationFee ? '\nFee: ₹' + event.registrationFee : '\nFree Event'}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.eventName,
      dates: `${startDate}/${endDate}`,
      details: description,
      ctz: 'Asia/Kolkata',
    });

    const googleUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

    res.json({ url: googleUrl });
  } catch (error) {
    console.error('Google Calendar link error:', error);
    res.status(500).json({ message: 'Failed to generate Google Calendar link' });
  }
};

// @desc    Get Outlook Calendar link for an event
// @route   GET /api/calendar/outlook/:eventId
// @access  Private (participant)
const getOutlookCalendarLink = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify registration
    const registration = await Registration.findOne({
      event: eventId,
      participant: req.user._id,
      status: { $in: ['Registered', 'Attended'] },
    });

    if (!registration) {
      return res.status(403).json({ message: 'You are not registered for this event' });
    }

    const event = await Event.findById(eventId).populate('organizer', 'organizerName email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const organizerName = event.organizer?.organizerName || 'Felicity';
    const description = `${event.eventDescription || ''}\n\nOrganized by: ${organizerName}\nType: ${event.eventType}\nEligibility: ${event.eligibility || 'All'}${event.registrationFee ? '\nFee: ₹' + event.registrationFee : '\nFree Event'}`;

    // Outlook Web format
    const startISO = new Date(event.eventStartDate).toISOString();
    const endISO = new Date(event.eventEndDate).toISOString();

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.eventName,
      startdt: startISO,
      enddt: endISO,
      body: description,
    });

    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;

    res.json({ url: outlookUrl });
  } catch (error) {
    console.error('Outlook Calendar link error:', error);
    res.status(500).json({ message: 'Failed to generate Outlook Calendar link' });
  }
};

// @desc    Get calendar data (links + info) for a single event
// @route   GET /api/calendar/event-info/:eventId
// @access  Private (participant)
const getCalendarEventInfo = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify registration
    const registration = await Registration.findOne({
      event: eventId,
      participant: req.user._id,
      status: { $in: ['Registered', 'Attended'] },
    });

    if (!registration) {
      return res.status(403).json({ message: 'You are not registered for this event' });
    }

    const event = await Event.findById(eventId).populate('organizer', 'organizerName email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const organizerName = event.organizer?.organizerName || 'Felicity';
    const description = `${event.eventDescription || ''}\n\nOrganized by: ${organizerName}\nType: ${event.eventType}`;

    // Google Calendar link
    const startDate = formatDateToICS(event.eventStartDate);
    const endDate = formatDateToICS(event.eventEndDate);

    const googleParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.eventName,
      dates: `${startDate}/${endDate}`,
      details: description,
      ctz: 'Asia/Kolkata',
    });

    // Outlook link
    const outlookParams = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.eventName,
      startdt: new Date(event.eventStartDate).toISOString(),
      enddt: new Date(event.eventEndDate).toISOString(),
      body: description,
    });

    res.json({
      event: {
        _id: event._id,
        eventName: event.eventName,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
        eventType: event.eventType,
        organizerName,
        timezone: 'Asia/Kolkata',
      },
      links: {
        google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
        icsDownload: `/api/calendar/export/${eventId}`,
      },
    });
  } catch (error) {
    console.error('Calendar event info error:', error);
    res.status(500).json({ message: 'Failed to get calendar event info' });
  }
};

module.exports = {
  exportSingleEvent,
  exportBatchEvents,
  getGoogleCalendarLink,
  getOutlookCalendarLink,
  getCalendarEventInfo,
};
