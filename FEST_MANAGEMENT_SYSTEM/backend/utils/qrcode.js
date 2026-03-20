const QRCode = require('qrcode');

// Generate unique ticket ID
const generateTicketId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `FEL-${timestamp}-${randomStr}`.toUpperCase();
};

// Generate QR Code
const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(data));
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateTicketId,
  generateQRCode,
};
