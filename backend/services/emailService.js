const nodemailer = require('nodemailer');

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

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Marakathai" <no-reply@marakathai.com>',
      to: toEmail,
      subject: `Your Marakathai Order Invoice - ${order._id}`,
      text: `Dear ${order.user?.name || order.shippingAddress?.fullName || 'Customer'},\n\nThank you for shopping with Marakathai!\n\nWe have received your payment for order ${order._id}. Please find your invoice attached.\n\nBest Regards,\nThe Marakathai Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #444; padding: 20px;">
          <h2 style="color: #B0611C;">Marakathai</h2>
          <p>Dear ${order.user?.name || order.shippingAddress?.fullName || 'Customer'},</p>
          <p>Thank you for shopping with us! We have successfully received your payment for order <strong>${order._id}</strong>.</p>
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

module.exports = {
  sendInvoiceEmail,
};
