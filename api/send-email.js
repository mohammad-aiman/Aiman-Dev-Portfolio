const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Initialize services
let resendClient;
let transporter;

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map();

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;
  
  const key = `rate_limit_${ip}`;
  const requests = rateLimitStore.get(key) || [];
  
  // Remove old requests
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  return true;
}

// Input validation
function validateInput(data) {
  const { name, email, subject, message } = data;
  
  if (!name || !email || !subject || !message) {
    return { isValid: false, error: 'All fields are required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (name.length < 2 || name.length > 100) {
    return { isValid: false, error: 'Name must be between 2 and 100 characters' };
  }
  
  if (subject.length < 5 || subject.length > 200) {
    return { isValid: false, error: 'Subject must be between 5 and 200 characters' };
  }
  
  if (message.length < 10 || message.length > 1000) {
    return { isValid: false, error: 'Message must be between 10 and 1000 characters' };
  }
  
  return { isValid: true };
}

// HTML email template
function createEmailTemplate(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New Portfolio Contact Message</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .email-container {
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          padding: 30px;
          margin: 20px 0;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #00ffff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #0a0a0a;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 5px 0 0 0;
        }
        .message-details {
          background: #f8f9fa;
          border-left: 4px solid #00ffff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 5px 5px 0;
        }
        .detail-row {
          margin: 15px 0;
        }
        .detail-label {
          font-weight: bold;
          color: #0a0a0a;
          display: inline-block;
          width: 80px;
        }
        .detail-value {
          color: #333;
        }
        .message-content {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 5px;
          padding: 20px;
          margin: 20px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          color: #666;
          font-size: 14px;
        }
        .tech-signature {
          color: #00ffff;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>New Portfolio Message</h1>
          <p>You have received a new message from your portfolio website</p>
        </div>
        
        <div class="message-details">
          <div class="detail-row">
            <span class="detail-label">From:</span>
            <span class="detail-value">${data.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${data.email}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Subject:</span>
            <span class="detail-value">${data.subject}</span>
          </div>
        </div>
        
        <div class="message-content">
          <h3>Message:</h3>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="footer">
          <p>This message was sent from your portfolio website contact form.</p>
          <p class="tech-signature">Powered by AIMAN DEV</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Function to create email service
function createEmailService() {
  const emailService = process.env.EMAIL_SERVICE || 'resend';
  
  switch (emailService.toLowerCase()) {
    case 'resend':
      resendClient = new Resend(process.env.RESEND_API_KEY);
      break;
    
    case 'gmail':
      transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      break;
    
    case 'sendgrid':
      transporter = nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
      break;
    
    case 'mailgun':
      transporter = nodemailer.createTransporter({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASS
        }
      });
      break;
    
    case 'smtp':
      transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      break;
    
    default:
      throw new Error('Invalid email service specified');
  }
}

// Send email function
async function sendEmail(data) {
  const emailService = process.env.EMAIL_SERVICE || 'resend';
  const htmlContent = createEmailTemplate(data);
  
  const mailOptions = {
    to: process.env.TO_EMAIL,
    from: process.env.FROM_EMAIL,
    subject: `Portfolio Contact: ${data.subject}`,
    html: htmlContent,
    text: `
      New message from ${data.name} (${data.email})
      Subject: ${data.subject}
      Message: ${data.message}
    `
  };
  
  if (emailService === 'resend') {
    return await resendClient.emails.send(mailOptions);
  } else {
    return await transporter.sendMail(mailOptions);
  }
}

// Main handler function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    // Get client IP for rate limiting
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress || 
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }
    
    const { name, email, subject, message } = req.body;
    
    // Validate input
    const validation = validateInput({ name, email, subject, message });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    // Initialize email service
    createEmailService();
    
    // Send email
    const result = await sendEmail({ name, email, subject, message });
    
    console.log('Email sent successfully:', result);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully!'
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.'
    });
  }
}; 