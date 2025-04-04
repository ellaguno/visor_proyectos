const { Sequelize } = require('sequelize');
require('dotenv').config(); // Asegura que las variables de entorno estén cargadas

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost', // Usa localhost si no se especifica
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectModule: require('mysql2') // Asegura que se use el driver correcto
  }
);

module.exports = { sequelize };