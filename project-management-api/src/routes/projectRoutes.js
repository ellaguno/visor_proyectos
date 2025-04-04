const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
// Uncomment when auth middleware is implemented
// const { protect } = require('../middleware/auth');

// Project routes
router
  .route('/')
  .get(projectController.getAllProjects)
  .post(projectController.createProject);

router
  .route('/:id')
  .get(projectController.getProject)
  .patch(projectController.updateProject)
  .delete(projectController.deleteProject);

module.exports = router;