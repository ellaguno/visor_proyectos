const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const upload = require('../middleware/upload');

// Route for importing MS Project files
router.post('/msproject', upload.single('projectFile'), importController.importMSProject);

module.exports = router;