// Configuration Example
// Copy this file to config.js and update with your email service credentials

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Email Service Configuration
  EMAIL_SERVICE: 'gmail', // Options: 'gmail', 'sendgrid', 'mailgun', 'smtp'
  
  // Gmail Configuration (requires App Password)
  EMAIL_USER: 'your-email@gmail.com',
  EMAIL_PASS: 'your-app-password',
  
  // SendGrid Configuration
  // SENDGRID_API_KEY: 'your-sendgrid-api-key',
  
  // Mailgun Configuration
  // MAILGUN_USER: 'your-mailgun-user',
  // MAILGUN_PASS: 'your-mailgun-password',
  
  // Custom SMTP Configuration
  // SMTP_HOST: 'smtp.your-provider.com',
  // SMTP_PORT: 587,
  // SMTP_SECURE: false,
  // SMTP_USER: 'your-smtp-user',
  // SMTP_PASS: 'your-smtp-password'
}; 