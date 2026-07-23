const multer = require('multer');

// Memory storage to use with Cloudinary upload_stream
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime' // .mov is quicktime
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP, AVIF, SVG, GIF, MP4, WEBM, MOV are allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB global limit, we can adjust per route if needed
  },
});

module.exports = upload;
