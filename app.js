const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
     origin: 'http://localhost:5174', // Permite solicitudes solo desde este origen
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
     allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
}));

app.use(express.json()); // Para manejar datos JSON
app.use('/api', require('./routes')); // Rutas de tu API

app.listen(3000, () => console.log('Servidor ejecutándose en el puerto 3000'));