const express = require('express');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config.js');

const app = express();
const PORT = config.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to email endpoint
app.use('/api/send-email', limiter);

// Middleware
app.use(cors({
  origin: config.NODE_ENV === 'production' ? 'your-domain.com' : ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (your portfolio)
app.use(express.static(path.join(__dirname, '/')));

// Email service configuration
let transporter;
let resendClient;

// Function to create email service based on configuration
function createEmailService() {
  const emailService = config.EMAIL_SERVICE || 'resend';
  
  switch (emailService.toLowerCase()) {
    case 'resend':
      resendClient = new Resend(config.RESEND_API_KEY);
      console.log('✅ Resend email service initialized');
      break;
    
    case 'gmail':
      transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS // App password for Gmail
        }
      });
      break;
    
    case 'sendgrid':
      transporter = nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: config.SENDGRID_API_KEY
        }
      });
      break;
    
    case 'mailgun':
      transporter = nodemailer.createTransporter({
        service: 'Mailgun',
        auth: {
          user: config.MAILGUN_USER,
          pass: config.MAILGUN_PASS
        }
      });
      break;
    
    case 'smtp':
      transporter = nodemailer.createTransporter({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT || 587,
        secure: config.SMTP_SECURE === 'true',
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS
        }
      });
      break;
    
    default:
      console.error('Invalid email service specified');
      process.exit(1);
  }
}

// Initialize email service
createEmailService();

// Resend client initialized successfully

// Verify transporter configuration (for non-Resend services)
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter configuration error:', error);
    } else {
      console.log('✅ Email transporter is ready to send emails');
    }
  });
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
          min-width: 100px;
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
          font-style: italic;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          color: #666;
          font-size: 14px;
        }
        .timestamp {
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🚀 New Portfolio Contact</h1>
          <p>Message from your portfolio website</p>
        </div>
        
        <div class="message-details">
          <div class="detail-row">
            <span class="detail-label">Name:</span>
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
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date().toLocaleString()}</span>
          </div>
        </div>
        
        <div class="message-content">
          <h3>Message:</h3>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from your portfolio contact form.</p>
          <p class="timestamp">Sent on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// API endpoint to send email
app.post('/api/send-email', async (req, res) => {
  try {
    // Validate input
    const validation = validateInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const { name, email, subject, message } = req.body;
    
    let emailResult;
    
    // Send email using the configured service
    if (config.EMAIL_SERVICE === 'resend') {
      // Send using Resend
      emailResult = await resendClient.emails.send({
        from: `${name} <${config.FROM_EMAIL}>`,
        to: config.TO_EMAIL,
        subject: `Portfolio Contact: ${subject}`,
        html: createEmailTemplate({ name, email, subject, message }),
        reply_to: email
      });
      
      // Check if email was actually sent
      if (!emailResult || !emailResult.data || !emailResult.data.id) {
        throw new Error('Email sending failed - no result ID received');
      }
      
      console.log('✅ Email sent successfully from portfolio contact form');
      
    } else {
      // Send using Nodemailer (for other services)
      const mailOptions = {
        from: `"${name}" <${config.EMAIL_USER}>`,
        to: config.TO_EMAIL,
        subject: `Portfolio Contact: ${subject}`,
        html: createEmailTemplate({ name, email, subject, message }),
        replyTo: email
      };
      
      emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully from portfolio contact form');
    }
    
    const messageId = emailResult.data?.id || emailResult.messageId || 'unknown';
    
    res.json({
      success: true,
      message: 'Email sent successfully! Thank you for your message.',
      messageId: messageId
    });
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for the portfolio (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${config.EMAIL_SERVICE}`);
  console.log(`📨 Emails will be sent to: ${config.TO_EMAIL}`);
  console.log(`🌐 Portfolio available at: http://localhost:${PORT}`);
});

module.exports = app; 