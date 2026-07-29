require('dotenv').config();
const { Cashfree, CFEnvironment } = require('cashfree-pg'); 
const cf = new Cashfree(CFEnvironment.SANDBOX, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY, undefined, undefined, undefined, false, undefined); 
cf.XApiVersion = '2023-08-01'; 
cf.PGCreateOrder({ 
  order_id: 'cf_test_' + Date.now(), 
  order_amount: 150, 
  order_currency: 'INR', 
  customer_details: { 
    customer_id: 'cust_123', 
    customer_email: 'test@example.com', 
    customer_phone: '9999999999' 
  } 
}).then(res => console.log(res.data)).catch(e => console.error(e.response ? e.response.data : e.message));
