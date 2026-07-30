const https = require('https');

https.get('https://api.cloudinary.com/v1_1/ping', (res) => {
  console.log('statusCode:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
}).on('error', (e) => {
  console.error(e);
});
