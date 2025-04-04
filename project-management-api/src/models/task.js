const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Project = require('./project');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  startDate: {
    type: DataTypes.DATE
  },
  endDate: {
    type: DataTypes.DATE
  },
  duration: {
    type: DataTypes.INTEGER,  // Duration in hours
    allowNull: true
  },
  progress: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('not-started', 'in-progress', 'completed', 'on-hold'),
    defaultValue: 'not-started'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relationships
Task.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(Task, { foreignKey: 'project_id' });

// Self-referencing relationship for task hierarchy
Task.belongsTo(Task, { as: 'parentTask', foreignKey: 'parent_task_id' });
Task.hasMany(Task, { as: 'subTasks', foreignKey: 'parent_task_id' });

module.exports = Task;