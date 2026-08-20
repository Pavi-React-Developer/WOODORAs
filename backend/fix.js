const fs = require('fs'); 
let content = fs.readFileSync('controllers/orderController.js', 'utf8'); 
content = content.replace('isGiftOrder: isGiftOrder || giftToggle === true || !!giftOrderItem || false,', 'isGiftOrder: isGiftOrder === true || isGiftOrder === "true" || giftToggle === true || giftToggle === "true" || !!giftOrderItem || false,'); 
content = content.replace('const { orderItems, shippingAddress, paymentMethod, orderNotes, giftMessage, giftMessageStyle, deliveryDate, isGiftOrder, giftFee, giftToggle, totalCartVolume, dynamicBoxSize, dynamicProductFee, ...otherProps } = req.body;', 'const { orderItems, shippingAddress, paymentMethod, orderNotes, giftMessage, giftMessageStyle, deliveryDate, isGiftOrder, giftFee, giftToggle, totalCartVolume, dynamicBoxSize, dynamicProductFee, orderId, invoiceId, ...otherProps } = req.body;'); 
fs.writeFileSync('controllers/orderController.js', content);
