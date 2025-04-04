const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter for MS Project files
const fileFilter = (req, file, cb) => {
  // Accept .mpp, .mppx, .xml and .mpx files
  const allowedExtensions = ['.mpp', '.mppx', '.xml', '.mpx'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (
    file.mimetype === 'application/vnd.ms-project' || // Common for .mpp
    file.mimetype === 'application/octet-stream' || // Sometimes used for .mpp/.mppx
    file.mimetype === 'application/xml' ||
    file.mimetype === 'text/xml' ||
    allowedExtensions.includes(fileExt)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload a MS Project or XML file.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
  }
});

module.exports = upload;