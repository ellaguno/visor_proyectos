// src/middleware/auth.js

// Middleware para verificar la autenticación del usuario (ej. usando JWT)

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Si no hay token, no autorizado
  }

  // Aquí iría la lógica para verificar el token (ej. con jwt.verify)
  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
  //   if (err) {
  //     return res.sendStatus(403); // Token inválido o expirado
  //   }
  //   req.user = user; // Añadir información del usuario al request
  //   next(); // Continuar al siguiente middleware o controlador
  // });

  // Placeholder mientras no se implementa JWT
  console.log('Auth middleware bypassed (implement JWT verification)');
  next();
};

module.exports = authenticateToken;