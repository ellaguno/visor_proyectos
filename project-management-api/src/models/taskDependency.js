const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Task = require('./task');

const TaskDependency = sequelize.define('TaskDependency', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('FS', 'FF', 'SS', 'SF'), // Finish-to-Start, Finish-to-Finish, etc.
    defaultValue: 'FS'
  },
  lag: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // Lag time in hours
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relationships
TaskDependency.belongsTo(Task, { as: 'predecessor', foreignKey: 'predecessor_id' });
TaskDependency.belongsTo(Task, { as: 'successor', foreignKey: 'successor_id' });

Task.hasMany(TaskDependency, { as: 'successorDependencies', foreignKey: 'predecessor_id' });
Task.hasMany(TaskDependency, { as: 'predecessorDependencies', foreignKey: 'successor_id' });

module.exports = TaskDependency;