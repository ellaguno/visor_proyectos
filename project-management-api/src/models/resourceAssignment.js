const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Task = require('./task');
const Resource = require('./resource');

const ResourceAssignment = sequelize.define('ResourceAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  units: {
    type: DataTypes.FLOAT,
    defaultValue: 100, // Percentage of resource allocated
    validate: {
      min: 0,
      max: 100
    }
  },
  startDate: {
    type: DataTypes.DATE
  },
  endDate: {
    type: DataTypes.DATE
  },
  workHours: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relationships
ResourceAssignment.belongsTo(Task, { foreignKey: 'task_id' });
ResourceAssignment.belongsTo(Resource, { foreignKey: 'resource_id' });

Task.hasMany(ResourceAssignment, { foreignKey: 'task_id' });
Resource.hasMany(ResourceAssignment, { foreignKey: 'resource_id' });

module.exports = ResourceAssignment;