import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById, scanAttendance } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualTicketId, setManualTicketId] = useState('');
  const [mode, setMode] = useState('camera'); // 'camera', 'upload', 'manual'
  const [processing, setProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEvent();
    return () => {
      stopCamera();
    };
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await getEventById(eventId);
      setEvent(res.data);
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setScanResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      // Start scanning loop
      requestAnimationFrame(scanFrame);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Please check permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scannerRef.current) {
      clearTimeout(scannerRef.current);
      scannerRef.current = null;
    }
  };

  const scanFrame = () => {
    if (!scanning && !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scannerRef.current = setTimeout(() => requestAnimationFrame(scanFrame), 200);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Use jsQR if available (loaded via CDN) or fallback
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          handleQRData(code.data);
          return;
        }
      }
    } catch (e) {
      // Continue scanning
    }

    scannerRef.current = setTimeout(() => requestAnimationFrame(scanFrame), 300);
  };

  const handleQRData = async (data) => {
    stopCamera();

    let ticketId = null;
    try {
      const parsed = JSON.parse(data);
      ticketId = parsed.ticketId;
    } catch {
      // If not JSON, treat as plain ticketId string
      ticketId = data.trim();
    }

    if (!ticketId) {
      setScanResult({ success: false, message: 'Invalid QR code: no ticket ID found' });
      return;
    }

    await submitTicketId(ticketId);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (window.jsQR) {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              handleQRData(code.data);
            } else {
              setScanResult({ success: false, message: 'No QR code found in the uploaded image' });
            }
          } else {
            toast.error('QR scanner library not loaded. Please refresh the page.');
          }
        } catch (err) {
          setScanResult({ success: false, message: 'Failed to process image' });
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTicketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    await submitTicketId(manualTicketId.trim());
    setManualTicketId('');
  };

  const submitTicketId = async (ticketId) => {
    setProcessing(true);
    try {
      const res = await scanAttendance(eventId, { ticketId });
      const result = {
        success: true,
        message: res.data.message,
        participant: res.data.registration?.participant,
        ticketId,
        timestamp: new Date().toLocaleTimeString(),
      };
      setScanResult(result);
      setScanHistory((prev) => [result, ...prev]);
      toast.success(`Attendance marked for ${result.participant?.firstName} ${result.participant?.lastName}`);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to mark attendance';
      const result = {
        success: false,
        message: errMsg,
        participant: error.response?.data?.participant,
        ticketId,
        timestamp: new Date().toLocaleTimeString(),
        duplicate: errMsg.includes('Duplicate') || errMsg.includes('already'),
      };
      setScanResult(result);
      setScanHistory((prev) => [result, ...prev]);
      if (result.duplicate) {
        toast.warning(errMsg);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!event) return <div className="container">Event not found</div>;

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <h1>Felicity</h1>
          <div className="nav-links">
            <Link to="/organizer/dashboard">Dashboard</Link>
            <Link to={`/organizer/attendance/${eventId}`}>Attendance</Link>
            <Link to={`/organizer/event/${eventId}`}>Event</Link>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="dashboard-header">
          <h2>QR Scanner - {event.eventName}</h2>
          <p>Scan participant QR codes to mark attendance</p>
        </div>

        {/* Mode Selector */}
        <div className="tabs" style={{ marginBottom: '20px' }}>
          <button className={`tab ${mode === 'camera' ? 'active' : ''}`} onClick={() => { setMode('camera'); stopCamera(); setScanResult(null); }}>
            📷 Camera Scan
          </button>
          <button className={`tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => { setMode('upload'); stopCamera(); setScanResult(null); }}>
            📁 Upload QR Image
          </button>
          <button className={`tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => { setMode('manual'); stopCamera(); setScanResult(null); }}>
            ⌨️ Manual Entry
          </button>
        </div>

        {/* Camera Mode */}
        {mode === 'camera' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              {!scanning ? (
                <button className="btn btn-primary" onClick={startCamera} style={{ padding: '12px 30px', fontSize: '16px' }}>
                  Start Camera
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopCamera} style={{ padding: '12px 30px', fontSize: '16px' }}>
                  Stop Camera
                </button>
              )}
            </div>

            <div style={{ position: 'relative', marginTop: '20px', textAlign: 'center' }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '8px',
                  display: scanning ? 'block' : 'none',
                  margin: '0 auto',
                }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {scanning && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: '3px solid #333',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 3000px rgba(0,0,0,0.3)',
                }} />
              )}
            </div>

            {scanning && (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
                Point the camera at a QR code...
              </p>
            )}
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: '15px' }}>Upload a QR code image to scan</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ marginBottom: '10px' }}
            />
          </div>
        )}

        {/* Manual Entry Mode */}
        {mode === 'manual' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ticket ID</label>
                <input
                  type="text"
                  value={manualTicketId}
                  onChange={(e) => setManualTicketId(e.target.value)}
                  placeholder="Enter ticket ID (e.g., FEL-XXXXX-XXXX)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={processing} style={{ padding: '10px 20px' }}>
                {processing ? 'Checking...' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            background: scanResult.success ? '#eee' : scanResult.duplicate ? '#f5f5f5' : '#e0e0e0',
            color: scanResult.success ? '#111' : scanResult.duplicate ? '#333' : '#222',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `1px solid ${scanResult.success ? '#ccc' : scanResult.duplicate ? '#ddd' : '#bbb'}`,
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>
              {scanResult.success ? '✅ Success' : scanResult.duplicate ? '⚠️ Duplicate Scan' : '❌ Error'}
            </h3>
            <p style={{ margin: '0 0 5px 0' }}>{scanResult.message}</p>
            {scanResult.participant && (
              <p style={{ margin: '0', fontWeight: 'bold' }}>
                Participant: {scanResult.participant.firstName} {scanResult.participant.lastName} ({scanResult.participant.email})
              </p>
            )}
            {scanResult.ticketId && (
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontFamily: 'monospace' }}>
                Ticket: {scanResult.ticketId}
              </p>
            )}
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setScanResult(null); if (mode === 'camera') startCamera(); }}
              >
                Scan Next
              </button>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '15px' }}>Recent Scans ({scanHistory.length})</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {scanHistory.map((scan, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    background: scan.success ? '#f0f0f0' : scan.duplicate ? '#f5f5f5' : '#e8e8e8',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold' }}>
                      {scan.success ? '✅' : scan.duplicate ? '⚠️' : '❌'}
                    </span>
                    {' '}
                    {scan.participant ? `${scan.participant.firstName} ${scan.participant.lastName}` : scan.ticketId}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {scan.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Load jsQR library */}
      <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
    </div>
  );
};

export default QRScanner;
