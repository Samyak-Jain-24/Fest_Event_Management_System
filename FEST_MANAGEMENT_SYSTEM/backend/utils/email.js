const nodemailer = require('nodemailer');

/**
 * Utility: Email Transporter Dispatch Factory
 * Generates an SMTP instance customized to environmental configurations
 * Enables TLS by default when port 465 is provided
 */
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 465;
  const secure = port === 465; // Use implicit TLS for port 465

  console.log('[EmailService] Initializing transporter configurations:', {
    host: process.env.EMAIL_HOST,
    port: port,
    secure: secure,
    user: process.env.EMAIL_USER,
    passConfigured: !!process.env.EMAIL_PASS
  });
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

// Send registration email with ticket
const sendTicketEmail = async (to, eventDetails, ticketData) => {
  try {
    console.log('=== Attempting to send ticket email ===');
    console.log('Recipient:', to);
    console.log('Event:', eventDetails.eventName);
    
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `Registration Confirmed - ${eventDetails.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Registration Confirmed!</h2>
          <p>Dear Pa  rticipant,</p>
          <p>Your registration for <strong>${eventDetails.eventName}</strong> has been confirmed.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Event Details:</h3>
            <p><strong>Event:</strong> ${eventDetails.eventName}</p>
            <p><strong>Date:</strong> ${new Date(eventDetails.eventStartDate).toLocaleDateString()}</p>
            <p><strong>Ticket ID:</strong> ${ticketData.ticketId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="${ticketData.qrCode}" alt="QR Code" style="max-width: 200px;" />
            <p style="font-size: 12px; color: #666;">Please show this QR code at the event entrance</p>
          </div>
          
          <p>Best regards,<br/>Felicity Team</p>
        </div>
      `,
    };

    console.log('Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully to:', to);
    console.log('Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('✗ ERROR sending email:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    // Don't throw error - registration should succeed even if email fails
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Felicity account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br/>Felicity Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendTicketEmail,
  sendPasswordResetEmail,
};
