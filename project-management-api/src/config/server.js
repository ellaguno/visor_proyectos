// src/config/server.js
const express = require('express');
const cors = require('cors'); // Importar cors si se necesita
// Importar otros middlewares necesarios, como morgan para logging

const configureServer = (app) => {
  // Middlewares básicos
  app.use(cors()); // Habilitar CORS si es necesario
  app.use(express.json()); // Para parsear application/json
  app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

  // Configurar otros middlewares (ej. logging, seguridad)
  // app.use(morgan('dev'));

  // Rutas (se añadirán más adelante)
  app.get('/', (req, res) => {
    res.send('Project Management API is running!');
  });

  // Manejo de errores (básico)
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
};

module.exports = configureServer;