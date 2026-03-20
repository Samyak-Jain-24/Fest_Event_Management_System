import React, { useState } from 'react';
import {
  exportCalendarEvent,
  exportCalendarBatch,
  getGoogleCalendarLink,
  getOutlookCalendarLink,
} from '../services/apiService';
import { toast } from 'react-toastify';

/**
 * CalendarExport component
 * 
 * Props:
 *   - eventId: string (single event mode)
 *   - eventIds: string[] (batch mode — pass array of event IDs)
 *   - eventName: string (for filename in single mode)
 *   - mode: 'single' | 'batch' | 'inline' (default: 'single')
 *     - 'single': shows full card with all options for one event
 *     - 'batch': shows batch export button for multiple events
 *     - 'inline': shows compact inline buttons (for use inside cards/lists)
 */
const CalendarExport = ({ eventId, eventIds = [], eventName = 'event', mode = 'single' }) => {
  const [reminder, setReminder] = useState(30);
  const [showOptions, setShowOptions] = useState(false);
  const [exporting, setExporting] = useState(false);

  const REMINDER_OPTIONS = [
    { value: 0, label: 'No reminder' },
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: 1440, label: '1 day before' },
    { value: 10080, label: '1 week before' },
  ];

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadICS = async () => {
    setExporting(true);
    try {
      if (mode === 'batch' && eventIds.length > 0) {
        const response = await exportCalendarBatch(eventIds, reminder);
        downloadBlob(new Blob([response.data]), 'felicity_events.ics');
        toast.success(`Exported ${eventIds.length} events to .ics file`);
      } else if (eventId) {
        const response = await exportCalendarEvent(eventId, reminder);
        const safeName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
        downloadBlob(new Blob([response.data]), `${safeName}.ics`);
        toast.success('Event exported to .ics file');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export calendar event');
    } finally {
      setExporting(false);
    }
  };

  const handleGoogleCalendar = async () => {
    try {
      const response = await getGoogleCalendarLink(eventId);
      window.open(response.data.url, '_blank');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open Google Calendar');
    }
  };

  const handleOutlookCalendar = async () => {
    try {
      const response = await getOutlookCalendarLink(eventId);
      window.open(response.data.url, '_blank');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open Outlook Calendar');
    }
  };

  // =============== INLINE MODE ===============
  if (mode === 'inline') {
    return (
      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
        <button
          onClick={handleDownloadICS}
          disabled={exporting}
          title="Download .ics file"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
          }}
        >
          📅
        </button>
        <button
          onClick={handleGoogleCalendar}
          title="Add to Google Calendar"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px',
            fontWeight: 'bold',
            color: '#4285f4',
          }}
        >
          G
        </button>
        <button
          onClick={handleOutlookCalendar}
          title="Add to Outlook Calendar"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px',
            fontWeight: 'bold',
            color: '#0078d4',
          }}
        >
          O
        </button>
      </div>
    );
  }

  // =============== BATCH MODE ===============
  if (mode === 'batch') {
    return (
      <div
        style={{
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#333' }}>
              📅 Export to Calendar
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
              {eventIds.length > 0
                ? `Export ${eventIds.length} selected event${eventIds.length > 1 ? 's' : ''} to your calendar`
                : 'Select events to export'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={reminder}
              onChange={(e) => setReminder(parseInt(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '13px',
                backgroundColor: '#fff',
              }}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleDownloadICS}
              disabled={exporting || eventIds.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: eventIds.length > 0 ? '#333' : '#ccc',
                color: '#fff',
                cursor: eventIds.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {exporting ? 'Exporting...' : '⬇ Download .ics'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============== SINGLE MODE (full card) ===============
  return (
    <div
      style={{
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setShowOptions(!showOptions)}
      >
        <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
          📅 Add to Calendar
        </h4>
        <span style={{ fontSize: '14px', color: '#333' }}>
          {showOptions ? '▲ Hide' : '▼ Show Options'}
        </span>
      </div>

      {showOptions && (
        <div style={{ marginTop: '16px' }}>
          {/* Reminder Configuration */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#555',
                marginBottom: '6px',
              }}
            >
              ⏰ Reminder
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                width: '100%',
                maxWidth: '280px',
                backgroundColor: '#fff',
              }}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone Info */}
          <div
            style={{
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#eee',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#555',
            }}
          >
            🌐 Timezone: <strong>Asia/Kolkata (IST)</strong> — automatically applied
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Download .ics */}
            <button
              onClick={handleDownloadICS}
              disabled={exporting}
              style={{
                flex: '1',
                minWidth: '140px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s',
                opacity: exporting ? 0.7 : 1,
              }}
            >
              📥 {exporting ? 'Downloading...' : 'Download .ics'}
            </button>

            {/* Google Calendar */}
            <button
              onClick={handleGoogleCalendar}
              style={{
                flex: '1',
                minWidth: '140px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#333">
                <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.2 17.8H6.8V6.2h10.4v11.6zM17 7H7v10h10V7zm-2 3H9v1.5h6V10zm0 3H9v1.5h6V13z" />
              </svg>
              Google Calendar
            </button>

            {/* Outlook */}
            <button
              onClick={handleOutlookCalendar}
              style={{
                flex: '1',
                minWidth: '140px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #555',
                background: '#fff',
                color: '#555',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
                <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.352.232-.578.232h-8.26v-12.5h8.26c.226 0 .418.08.578.234.158.152.238.344.238.574v.406zM14.924 5.09v14.572l-9.11-1.572V6.91l9.11-1.82zM7.5 13.974c.167.24.39.36.672.36.105 0 .206-.02.3-.057l.002-.002c.282-.116.45-.366.502-.746l.6-4.292c.04-.28-.03-.525-.207-.734-.18-.21-.41-.314-.695-.314-.107 0-.207.02-.3.057-.283.117-.45.366-.503.748l-.6 4.29c-.04.28.03.524.21.732l.02.002zm14.692-8.26H14.4L4.8 4.2v16.4l9.6 1.6h9.6V6.12c0-.226-.078-.418-.234-.578-.156-.158-.348-.238-.574-.238z" />
              </svg>
              Outlook Calendar
            </button>
          </div>

          <p
            style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#999',
              textAlign: 'center',
            }}
          >
            The .ics file works with Apple Calendar, Thunderbird, and any calendar app that supports iCalendar format.
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarExport;
