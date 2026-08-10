const nodemailer = require('nodemailer');
const CmsNavbar = require('../models/CmsNavbar');

/**
 * Creates and returns a transporter.
 * Uses SMTP from environment variables if present,
 * otherwise creates a test Ethereal email account for development.
 */
const getTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    console.log('No SMTP credentials found in .env. Using Ethereal test account.');
    
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
};

/**
 * Sends an invoice email to the user with the PDF attached
 * @param {Object} order - The populated mongoose order object
 * @param {Buffer} pdfBuffer - The PDF invoice buffer
 */
const sendInvoiceEmail = async (order, pdfBuffer) => {
  try {
    const transporter = await getTransporter();
    
    // Determine the email address (from user populated or shipping address fallback)
    let toEmail = order.user?.email || order.shippingAddress?.email;
    if (!toEmail) {
      console.warn(`[Email Service] Cannot send invoice for order ${order._id}. No email address found.`);
      return;
    }

    let logoUrl = '';
    try {
      const CmsNavbar = require('../models/CmsNavbar');
      const navbar = await CmsNavbar.findOne();
      if (navbar && navbar.logo && navbar.logo.url) {
        logoUrl = navbar.logo.url;
      }
    } catch (e) {
      console.log('Error fetching logo for email', e);
    }
    
    const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Marakathai Logo" style="max-height: 80px; margin-bottom: 15px;" />` : `<h2 style="color: #7B6154; margin-bottom: 5px;">Marakathai</h2>`;

    const displayOrderId = order.orderId || order._id.toString();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Marakathai Support" <marakathai.support@gmail.com>',
      to: toEmail,
      subject: `Your Marakathai Order Invoice - ${displayOrderId}`,
      text: `Dear ${order.user?.name || order.shippingAddress?.fullName || 'Customer'},\n\nThank you for shopping with Marakathai!\n\nWe have received your payment for order ${displayOrderId}. Please find your invoice attached.\n\nBest Regards,\nThe Marakathai Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #444; padding: 20px;">
          ${logoHtml}
          <p>Dear ${order.user?.name || order.shippingAddress?.fullName || 'Customer'},</p>
          <p>Thank you for shopping with us! We have successfully received your payment for order <strong>${displayOrderId}</strong>.</p>
          <p>Please find your invoice attached to this email.</p>
          <p>Best Regards,<br>The Marakathai Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${order._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Invoice email sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    // If using Ethereal, log the preview URL
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log(`[Email Service] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

  } catch (error) {
    console.error(`[Email Service] Failed to send invoice email for order ${order._id}:`, error);
  }
};

/**
 * Sends a password reset email to the user
 * @param {string} email - The user's email address
 * @param {string} resetUrl - The password reset URL
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    const transporter = await getTransporter();
    
    let logoUrl = '';
    try {
      const navbar = await CmsNavbar.findOne();
      if (navbar && navbar.logo && navbar.logo.url) {
        logoUrl = navbar.logo.url;
      }
    } catch (e) {
      console.log('Error fetching logo for email', e);
    }
    
    const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Marakathai Logo" style="max-height: 80px; margin-bottom: 15px;" />` : `<h2 style="color: #7B6154; margin-bottom: 5px;">MARAKATHAI ❤️</h2><p style="font-style: italic; color: #8C7E76; margin-top: 0;">Every wood tells a story</p>`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Marakathai Support" <marakathai.support@gmail.com>',
      to: email,
      subject: 'Reset Your Marakathai Password',
      text: `Reset Your Password\n\nWe received a request to reset your Marakathai account password.\n\nPlease click the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\n© 2026 Marakathai. All rights reserved.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #4A3B32; padding: 20px; max-width: 500px; margin: 0 auto; text-align: center;">
          ${logoHtml}
          <hr style="border: 0; border-top: 1px solid #EAE5DF; margin: 20px 0;">
          <h3 style="color: #4A3B32;">Reset Your Password</h3>
          <p>We received a request to reset your Marakathai account password.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #B88673; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          <p style="font-size: 13px; color: #8C7E76;">This link will expire in 15 minutes.</p>
          <p style="font-size: 13px; color: #8C7E76;">If you did not request this password reset, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #EAE5DF; margin: 20px 0;">
          <p style="font-size: 11px; color: #A39992;">© 2026 Marakathai. All rights reserved.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    
    // If using Ethereal, log the preview URL
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log(`[Email Service] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

  } catch (error) {
    console.error(`[Email Service] Failed to send password reset email to ${email}:`, error);
  }
};

module.exports = {
  sendInvoiceEmail,
  sendPasswordResetEmail,
};
