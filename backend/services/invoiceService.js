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

      const greenColor = '#4a5d3f'; // Match screenshot green
      const lightGreen = '#f0f3eb';
      const grayText = '#6D625C';
      
      // Top Left Corner Arc/Shape
      doc.save()
         .fillColor(greenColor)
         .roundedRect(0, 0, 300, 30, 15)
         .fill()
         .restore();
      
      // Clear top left corner properly by just drawing a rectangle over the corner
      doc.save()
         .fillColor('#ffffff')
         .rect(0, 0, 40, 40)
         .fill()
         .restore();
         
      doc.save()
         .fillColor(greenColor)
         .roundedRect(-20, -20, 200, 50, 25)
         .fill()
         .restore();

      // --- LOGO ---
      const logoPath = path.join(__dirname, '../assets/brand-logo.jpeg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 50, { width: 140 });
      } else {
        doc.fontSize(24).fillColor(greenColor).text('Marakathai', 40, 60);
      }

      // --- INVOICE HEADER (Right Side) ---
      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor(greenColor)
         .text('INVOICE', 350, 50, { align: 'right' });

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333');
      
      // Detail lines
      const detailStartX = 380;
      let y = 100;
      doc.text('Invoice Number', detailStartX, y);
      doc.text(':', detailStartX + 70, y);
      doc.text(`${order._id}`, detailStartX + 80, y);
      y += 20;

      doc.text('Date', detailStartX, y);
      doc.text(':', detailStartX + 70, y);
      doc.text(`${new Date(order.createdAt).toLocaleDateString('en-IN')}`, detailStartX + 80, y);
      y += 20;

      doc.text('Status', detailStartX, y);
      doc.text(':', detailStartX + 70, y);
      
      // Status Badge
      doc.save()
         .fillColor('#FDE68A') // yellow badge
         .roundedRect(detailStartX + 75, y - 4, 70, 18, 9)
         .fill()
         .restore();
      
      doc.fillColor('#92400E')
         .font('Helvetica-Bold')
         .text(`${order.status}`, detailStartX + 80, y, { width: 60, align: 'center' });
      doc.fillColor('#333333').font('Helvetica');

      // --- BILL TO / SHIP TO ---
      y = 200;
      
      // Location Icon placeholder (circle)
      doc.save()
         .fillColor(greenColor)
         .circle(60, y + 10, 15)
         .fill()
         .restore();
      
      doc.fillColor('#ffffff').fontSize(14).text('O', 55, y + 4);

      doc.fillColor(greenColor)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('BILL TO / SHIP TO', 90, y);
      
      doc.fillColor('#333333')
         .fontSize(12);
      
      const addr = order.shippingAddress;
      y += 20;
      if (addr) {
        doc.font('Helvetica-Bold').text(addr.fullName || 'Customer', 90, y);
        doc.font('Helvetica').fontSize(10);
        y += 18;
        doc.text(addr.city || '', 90, y);
        y += 15;
        doc.text(`${addr.state || ''}, ${addr.country || 'India'}`, 90, y);
      }

      // Separator line
      y += 30;
      doc.strokeColor('#E6DFD4')
         .lineWidth(1)
         .moveTo(40, y)
         .lineTo(250, y)
         .dash(2, { space: 2 })
         .stroke()
         .undash();

      // Phone
      y += 15;
      doc.save()
         .fillColor(greenColor)
         .circle(60, y + 5, 15)
         .fill()
         .restore();
      doc.fillColor('#ffffff').fontSize(14).text('P', 55, y - 1);
      
      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(10)
         .text(`Phone: ${addr?.phone || 'N/A'}`, 90, y + 1);

      // --- DYNAMIC PRODUCT IMAGE (Right Side) ---
      // Fetch the first product's image if available
      try {
        if (order.orderItems && order.orderItems.length > 0) {
          const firstItem = order.orderItems[0];
          let imgUrl = firstItem.image;
          if (imgUrl) {
            if (imgUrl.startsWith('/uploads')) {
               imgUrl = `http://localhost:5000${imgUrl}`;
            }
            const imgBuffer = await fetchImageBuffer(imgUrl);
            doc.image(imgBuffer, 320, 170, { fit: [200, 150], align: 'center', valign: 'center' });
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic product image for PDF', err);
      }

      // --- TABLE HEADER ---
      y = 350;
      doc.save()
         .fillColor(greenColor)
         .roundedRect(40, y, 515, 30, 8) // Full width header
         .fill()
         .restore();

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(10);
      
      doc.text('ITEM', 60, y + 10);
      doc.text('DESCRIPTION', 180, y + 10);
      doc.text('QTY', 330, y + 10, { width: 40, align: 'center' });
      doc.text('UNIT PRICE', 390, y + 10, { width: 80, align: 'center' });
      doc.text('TOTAL', 480, y + 10, { width: 60, align: 'center' });

      // --- TABLE ROWS ---
      y += 30;
      doc.fillColor('#333333').font('Helvetica').fontSize(10);
      
      const items = order.orderItems || [];
      items.forEach((item, idx) => {
        const rowHeight = 70;
        if (y + rowHeight > 600) {
          doc.addPage();
          y = 50;
        }

        // Left vertical border
        doc.strokeColor('#E6DFD4').lineWidth(1);
        doc.moveTo(40, y).lineTo(40, y + rowHeight).stroke();
        // Right vertical border
        doc.moveTo(555, y).lineTo(555, y + rowHeight).stroke();
        // Inner vertical dividers
        doc.moveTo(170, y).lineTo(170, y + rowHeight).stroke();
        doc.moveTo(330, y).lineTo(330, y + rowHeight).stroke();
        doc.moveTo(390, y).lineTo(390, y + rowHeight).stroke();
        doc.moveTo(480, y).lineTo(480, y + rowHeight).stroke();
        
        // Item Image Box
        doc.save()
           .strokeColor('#E6DFD4')
           .roundedRect(50, y + 10, 50, 50, 5)
           .stroke()
           .restore();

        doc.font('Helvetica-Bold').text(item.name, 180, y + 25, { width: 140 });
        if (item.variant && item.variant.size) {
            doc.font('Helvetica').fillColor(grayText).text(`(Size: ${item.variant.size})`, 180, y + 40, { width: 140 });
        }
        
        doc.fillColor('#333333').font('Helvetica');
        doc.text(item.qty.toString(), 330, y + 30, { width: 40, align: 'center' });
        doc.text(`Rs ${item.price.toLocaleString('en-IN')}`, 390, y + 30, { width: 80, align: 'center' });
        doc.text(`Rs ${(item.price * item.qty).toLocaleString('en-IN')}`, 480, y + 30, { width: 60, align: 'center' });

        y += rowHeight;
        
        // Bottom horizontal line for row
        doc.strokeColor('#E6DFD4')
           .moveTo(40, y)
           .lineTo(555, y)
           .stroke();
      });

      // --- TOTALS BOX ---
      y += 20;
      doc.save()
         .fillColor('#F8F8F8')
         .roundedRect(300, y, 255, 120, 8)
         .fill()
         .restore();
      
      doc.strokeColor('#E6DFD4')
         .roundedRect(300, y, 255, 120, 8)
         .stroke();
      
      let totalY = y + 15;
      doc.font('Helvetica').fontSize(10);
      
      const drawTotalRow = (label, value) => {
        doc.fillColor('#333333').text(label, 320, totalY);
        doc.fillColor('#333333').text(value, 450, totalY, { width: 85, align: 'right' });
        totalY += 20;
      };

      drawTotalRow('Subtotal', `Rs ${order.subtotal ? order.subtotal.toLocaleString('en-IN') : 0}`);
      
      if (order.shipping_fee > 0) {
        drawTotalRow('Shipping Fee', `Rs ${order.shipping_fee.toLocaleString('en-IN')}`);
      }
      if (order.coupon_discount > 0) {
        doc.fillColor(greenColor).text('Discount', 320, totalY);
        doc.fillColor('#D97706').text(`- Rs ${order.coupon_discount.toLocaleString('en-IN')}`, 450, totalY, { width: 85, align: 'right' });
        totalY += 20;
      }
      if (order.gift_fee > 0) {
        drawTotalRow('Gift Fee', `Rs ${order.gift_fee.toLocaleString('en-IN')}`);
      }
      
      totalY += 5;
      // Divider
      doc.strokeColor('#E6DFD4')
         .moveTo(300, totalY)
         .lineTo(555, totalY)
         .stroke();
      
      totalY += 15;
      
      doc.fillColor(greenColor)
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('TOTAL', 320, totalY);
         
      doc.fillColor(greenColor)
         .text(`Rs ${order.totalPrice ? order.totalPrice.toLocaleString('en-IN') : 0}`, 450, totalY, { width: 85, align: 'right' });

      // --- THANK YOU BOX ---
      const thankYouY = 650;
      doc.save()
         .fillColor(lightGreen)
         .roundedRect(40, thankYouY, 515, 80, 8)
         .fill()
         .restore();

      // Heart Icon Circle
      doc.save()
         .fillColor(greenColor)
         .circle(90, thankYouY + 40, 25)
         .fill()
         .restore();
      
      doc.fillColor('#ffffff').fontSize(20).text('H', 81, thankYouY + 28);

      doc.fillColor(greenColor)
         .font('Helvetica-Bold')
         .fontSize(16)
         .text('Thank you!', 140, thankYouY + 20);
         
      doc.fillColor('#333333')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Thank you for shopping with Marakathai.', 140, thankYouY + 40);
      
      doc.font('Helvetica')
         .text('We hope you enjoy your premium wooden toys!', 140, thankYouY + 52);

      // --- BOTTOM FOOTER ---
      doc.save()
         .fillColor(greenColor)
         .roundedRect(40, 750, 515, 30, 8)
         .fill()
         .restore();
         
      doc.fillColor('#ffffff')
         .font('Helvetica')
         .fontSize(9);
         
      doc.text('www.marakathai.com', 60, 760);
      doc.text('support@marakathai.com', 220, 760);
      doc.text('+91 97899 66044', 380, 760);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice,
};
