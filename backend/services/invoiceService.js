const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Helper to fetch remote images
const fetchImageBuffer = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL'));
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to fetch image'));
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
};

/**
 * Generates a custom PDF invoice matching the screenshot design
 */
const generateInvoice = async (order) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const colors = {
        bg: '#FAF6F3',
        textDark: '#4A3B32',
        textLight: '#8A7B72',
        boxBg: '#FCECE6',
        line: '#EADCD2',
        primary: '#765241',
        secondary: '#A68270'
      };

      // Background color for the whole page
      doc.save()
         .fillColor(colors.bg)
         .rect(0, 0, doc.page.width, doc.page.height)
         .fill()
         .restore();
         
      // Border around the whole page
      doc.save()
         .strokeColor(colors.line)
         .lineWidth(1)
         .roundedRect(15, 15, doc.page.width - 30, doc.page.height - 30, 10)
         .stroke()
         .restore();

      // --- LOGO ---
      let logoDrawn = false;
      try {
        const CmsNavbar = require('../models/CmsNavbar');
        const navbar = await CmsNavbar.findOne();
        let logoUrlToFetch = null;
        
        if (navbar && navbar.logoUrl && navbar.logoUrl !== '/') {
            logoUrlToFetch = navbar.logoUrl;
        } else if (navbar && navbar.logo && navbar.logo.url) {
            logoUrlToFetch = navbar.logo.url;
        }
        
        if (logoUrlToFetch) {
            if (logoUrlToFetch.startsWith('/uploads')) {
               logoUrlToFetch = `http://localhost:5000${logoUrlToFetch}`;
            }
            const logoBuffer = await fetchImageBuffer(logoUrlToFetch);
            doc.image(logoBuffer, 40, 40, { fit: [80, 80], align: 'center', valign: 'center' });
            logoDrawn = true;
        }
      } catch (e) {
          console.error('Failed to load dynamic CMS logo', e);
      }

      if (!logoDrawn) {
        const logoPath = path.join(__dirname, '../assets/brand-logo.jpeg');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 40, 40, { width: 80 });
          logoDrawn = true;
        }
      }
      
      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor(colors.textDark)
         .text('MARAKATHAI', 130, 50);
         
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor(colors.textLight)
         .text('Every wood tells a story', 130, 75);

      // --- INVOICE HEADER (Right Side) ---
      doc.save()
         .fillColor(colors.boxBg)
         .roundedRect(400, 40, 160, 70, 8)
         .fill()
         .restore();

      doc.font('Helvetica-Bold')
         .fontSize(18)
         .fillColor(colors.textDark)
         .text('INVOICE', 400, 50, { width: 160, align: 'center' });

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(colors.textLight)
         .text(`#INV-${order._id.toString().slice(-8).toUpperCase()}`, 400, 75, { width: 160, align: 'center' });
         
      doc.text(`${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 400, 90, { width: 160, align: 'center' });

      // --- BILL TO / ORDER DETAILS ---
      let y = 150;
      
      // Headers
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(colors.textDark)
         .text('BILL TO', 40, y);
         
      doc.text('ORDER DETAILS', 320, y);
      
      y += 15;
      doc.strokeColor(colors.line)
         .lineWidth(1)
         .moveTo(40, y)
         .lineTo(250, y)
         .stroke();
         
      doc.moveTo(320, y)
         .lineTo(560, y)
         .stroke();
         
      y += 15;
      
      // Bill To Data
      const addr = order.shippingAddress || {};
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(colors.textDark)
         .text(addr.fullName || 'Customer', 40, y);
         
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.textLight);
         
      let billY = y + 15;
      if (addr.street) { doc.text(addr.street, 40, billY); billY += 15; }
      if (addr.city) { doc.text(`${addr.city}, ${addr.state || ''}`, 40, billY); billY += 15; }
      if (addr.country) { doc.text(`${addr.state || ''}, ${addr.zipCode || ''}`, 40, billY); billY += 15; }
      
      doc.text(addr.email || order.userEmail || '', 40, billY); billY += 15;
      doc.text(addr.phone || '', 40, billY);
      
      // Order Details Data
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.textLight);
         
      let orderY = y;
      
      const drawOrderRow = (label, value) => {
        doc.fillColor(colors.textLight).text(label, 320, orderY);
        doc.fillColor(colors.textDark).text(':', 400, orderY);
        doc.fillColor(colors.textLight).text(value, 415, orderY);
        orderY += 15;
      };
      
      drawOrderRow('Order ID', `ORD-${order._id.toString().slice(-8).toUpperCase()}`);
      drawOrderRow('Order Date', new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      drawOrderRow('Payment Method', order.paymentMethod || 'Online');
      drawOrderRow('Shipping Method', 'Standard Delivery');
      
      const estDate = new Date(order.createdAt);
      estDate.setDate(estDate.getDate() + 7);
      drawOrderRow('Delivery Date', estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

      // --- TABLE HEADER ---
      y = Math.max(billY, orderY) + 30;
      doc.save()
         .fillColor(colors.boxBg)
         .rect(40, y, 520, 30) // Full width header
         .fill()
         .restore();
         
      // Top and bottom borders for table header
      doc.strokeColor(colors.line)
         .lineWidth(1)
         .moveTo(40, y).lineTo(560, y).stroke()
         .moveTo(40, y + 30).lineTo(560, y + 30).stroke();

      doc.fillColor(colors.textDark)
         .font('Helvetica-Bold')
         .fontSize(9);
      
      doc.text('PRODUCT', 50, y + 10);
      doc.text('DESCRIPTION', 160, y + 10);
      doc.text('QTY', 340, y + 10, { width: 30, align: 'center' });
      doc.text('UNIT PRICE', 390, y + 10, { width: 80, align: 'center' });
      doc.text('TOTAL', 480, y + 10, { width: 70, align: 'center' });

      // --- TABLE ROWS ---
      y += 30;
      
      const items = order.orderItems || [];
      for (const item of items) {
        const rowHeight = 70;
        if (y + rowHeight > 620) {
          doc.addPage();
          // redraw background
          doc.save().fillColor(colors.bg).rect(0, 0, doc.page.width, doc.page.height).fill().restore();
          doc.save().strokeColor(colors.line).lineWidth(1).roundedRect(15, 15, doc.page.width - 30, doc.page.height - 30, 10).stroke().restore();
          y = 50;
        }

        // Product Image Background
        doc.save()
           .fillColor('#FFFFFF')
           .roundedRect(50, y + 10, 50, 50, 4)
           .fill()
           .restore();
           
        doc.save()
           .strokeColor(colors.line)
           .roundedRect(50, y + 10, 50, 50, 4)
           .stroke()
           .restore();

        // Fetch Product Image
        let imgUrl = item.image;
        if (imgUrl) {
          try {
            if (imgUrl.startsWith('/uploads')) {
               imgUrl = `http://localhost:5000${imgUrl}`;
            }
            const imgBuffer = await fetchImageBuffer(imgUrl);
            doc.image(imgBuffer, 52, y + 12, { fit: [46, 46], align: 'center', valign: 'center' });
          } catch (err) {
            console.error('Failed to load image for invoice', imgUrl);
          }
        }

        // Product Details
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.textDark).text(item.name, 160, y + 15, { width: 170 });
        if (item.variant && item.variant.size) {
            doc.font('Helvetica').fontSize(9).fillColor(colors.textLight).text(`Size: ${item.variant.size}`, 160, y + 30, { width: 170 });
        } else {
            doc.font('Helvetica').fontSize(9).fillColor(colors.textLight).text(`Handcrafted wooden toy`, 160, y + 30, { width: 170 });
        }
        
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(10);
        doc.text(item.qty.toString(), 340, y + 30, { width: 30, align: 'center' });
        doc.text(`₹${item.price.toLocaleString('en-IN')}`, 390, y + 30, { width: 80, align: 'center' });
        doc.text(`₹${(item.price * item.qty).toLocaleString('en-IN')}`, 480, y + 30, { width: 70, align: 'center' });

        y += rowHeight;
        
        // Bottom horizontal line for row
        doc.strokeColor(colors.line)
           .moveTo(40, y)
           .lineTo(560, y)
           .stroke();
      }

      // --- BOTTOM SECTION ---
      y += 20;
      
      // NOTES
      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.textDark).text('NOTES', 40, y);
      
      doc.save()
         .strokeColor(colors.line)
         .roundedRect(40, y + 15, 230, 80, 8)
         .stroke()
         .restore();
         
      doc.font('Helvetica').fontSize(9).fillColor(colors.textLight)
         .text('Thank you for shopping with Marakathai.', 50, y + 30, { width: 210 })
         .text('We hope you and your little ones enjoy our wooden toys!', 50, y + 60, { width: 210 });
         
      // Heart Icon Text
      doc.font('Helvetica').fontSize(10).fillColor(colors.textLight).text('♥', 40, y + 110);
      doc.fillColor(colors.textDark).text('Every wood tells a story.', 55, y + 110);

      // TOTALS
      doc.save()
         .strokeColor(colors.line)
         .roundedRect(300, y - 10, 260, 140, 8)
         .stroke()
         .restore();
         
      let totalY = y + 5;
      
      const drawTotalRowDynamic = (label, value) => {
        doc.font('Helvetica').fontSize(10).fillColor(colors.textLight).text(label, 320, totalY);
        doc.fillColor(colors.textDark).text(`₹${value.toLocaleString('en-IN')}`, 460, totalY, { width: 80, align: 'right' });
        totalY += 20;
      };

      if (order.subtotal) drawTotalRowDynamic('Subtotal', order.subtotal);
      if (order.shipping_fee > 0) drawTotalRowDynamic('Shipping Charges', order.shipping_fee);
      if (order.gift_fee > 0) drawTotalRowDynamic('Gift Fee', order.gift_fee);
      
      // As requested by user: Don't write static default tax, only show dynamic fees
      if (order.tax && order.tax > 0) drawTotalRowDynamic(`Tax`, order.tax);
      
      totalY += 5;
      
      // TOTAL Line
      doc.strokeColor(colors.line)
         .moveTo(300, totalY)
         .lineTo(560, totalY)
         .stroke();
         
      totalY += 15;
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.textDark).text('TOTAL', 320, totalY);
      doc.text(`₹${(order.totalPrice || 0).toLocaleString('en-IN')}`, 460, totalY, { width: 80, align: 'right' });
      
      totalY += 20;

      // You Saved (if discount exists)
      if (order.coupon_discount > 0) {
        doc.save()
           .fillColor(colors.boxBg)
           .rect(300, totalY, 260, 35)
           .fill()
           .restore();
           
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.textDark).text('You Saved', 320, totalY + 12);
        doc.text(`₹${order.coupon_discount.toLocaleString('en-IN')}`, 460, totalY + 12, { width: 80, align: 'right' });
      }

      // --- FOOTER ---
      const footerY = 750;
      
      doc.font('Helvetica').fontSize(9).fillColor(colors.textLight);
      
      // Emulating a clean footer layout
      doc.text('www.marakathai.com', 40, footerY, { width: 140, align: 'center' });
      doc.strokeColor(colors.line).moveTo(190, footerY).lineTo(190, footerY + 10).stroke();
      doc.text('marakathai3@gmail.com', 200, footerY, { width: 160, align: 'center' });
      doc.strokeColor(colors.line).moveTo(370, footerY).lineTo(370, footerY + 10).stroke();
      doc.text('+91 9876543210', 380, footerY, { width: 140, align: 'center' });
      
      doc.text('Thank you for choosing Marakathai!', 40, footerY + 30, { width: 520, align: 'center' });
      doc.text('Crafted with love ♥', 40, footerY + 45, { width: 520, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice,
};
