# Project Management API

API for managing projects, tasks, and resources. Includes functionality to import project data from Microsoft Project (.mpp) files.

## Features

- CRUD operations for Projects, Tasks, and Resources.
- Task dependency management.
- Resource assignment to tasks.
- Import project structure from `.mpp` files.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL with Sequelize ORM
- Multer for file uploads

## Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure environment variables in `.env` (database connection details, etc.).
4. Start the server: `npm start` or `npm run dev` for development mode.

## API Endpoints

(Details to be added)

## Project Structure

```
project-management-api/
├── src/
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection config
│   │   └── server.js          # Express server config
│   ├── controllers/
│   │   ├── projectController.js
│   │   └── importController.js # Controller for imports
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   └── upload.js          # File upload middleware
│   ├── models/
│   │   ├── project.js
│   │   ├── task.js
│   │   ├── resource.js
│   │   ├── taskDependency.js
│   │   └── resourceAssignment.js
│   ├── routes/
│   │   ├── projectRoutes.js
│   │   └── importRoutes.js
│   ├── services/
│   │   └── importService.js   # Logic for processing MS Project files
│   ├── utils/
│   │   └── mppParser.js       # Utility for parsing .mpp files
│   └── app.js                 # Application entry point
├── .env                       # Environment variables
├── package.json
└── README.md