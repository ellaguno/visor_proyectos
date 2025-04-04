const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Resource = sequelize.define('Resource', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('work', 'material', 'cost'),
    defaultValue: 'work'
  },
  capacity: {
    type: DataTypes.FLOAT,
    defaultValue: 100, // 100% capacity
    validate: {
      min: 0,
      max: 100
    }
  },
  costPerHour: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Permitir nulos
    // Quitar validación estricta
    // validate: {
    //   isEmail: true
    // }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Resource;