
const express = require('express');
const router = express.Router();
const connection = require('./db'); // Conexión a la base de datos
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, 'tu_clave_secreta', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.usuarioId = decoded.id;  // Guardamos el ID del usuario en la solicitud
    next();  // Continuamos con la ruta
  });
};

// 🔹 Obtener todos los usuarios
router.get('/usuarios', (req, res) => {
  connection.query('SELECT * FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ error: 'Error al obtener usuarios' });
      return;
    }
    res.json(results);
  });
});

router.get('/usuarios/nombre/:nombre', (req, res) => {
  const nombre = req.params.nombre;
  connection.query('SELECT * FROM usuarios WHERE nombre = ?', [nombre], (err, results) => {
      if (err) {
          console.error('Error al obtener usuario:', err);
          res.status(500).json({ error: 'Error al obtener usuario' });
          return;
      }
      if (results.length === 0) {
          res.status(404).json({ error: 'Usuario no encontrado' });
          return;
      }
      res.json(results);
  });
});



// 🔹 Obtener un usuario por ID
router.get('/usuarios/:id', (req, res) => {
  const id = req.params.id;
  connection.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error al obtener usuario:', err);
      res.status(500).json({ error: 'Error al obtener usuario' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(results[0]);
  });
});

// 🔹 Editar un usuario desde Dashboard
router.put('/usuarios/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const { email, telefono, rol_id } = req.body;

  if (!email || !telefono || !rol_id) {
    return res.status(400).json({ error: 'Email, teléfono y rol son obligatorios' });
  }

  const query = `
    UPDATE usuarios 
    SET email = ?, telefono = ?, rol_id = ?
    WHERE id = ?
  `;

  connection.query(query, [email, telefono, rol_id, id], (err, results) => {
    if (err) {
      console.error('Error al actualizar usuario:', err);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  });
});

// Ruta para eliminar un usuario
router.delete('/usuarios/:id', (req, res) => {
  const { id } = req.params;

  connection.query('DELETE FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error al eliminar usuario:', err);
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  });
});


// 🔹 Crear un nuevo usuario (registro)
router.post('/register', (req, res) => {
  const { nombre, email, telefono, password, rol_id } = req.body;
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error al hacer hash de la contraseña:', err);
      return res.status(500).json({ error: 'Error al registrar usuario' });
    }

    const nuevoUsuario = { nombre, email, telefono, password: hashedPassword, rol_id: rol_id || 2 };

    connection.query('INSERT INTO usuarios SET ?', nuevoUsuario, (err, results) => {
      if (err) {
        console.error('Error al registrar usuario:', err);
        res.status(500).json({ error: 'Error al registrar usuario' });
        return;
      }
      res.status(201).json({ message: 'Usuario registrado exitosamente', id: results.insertId });
    });
  });
});

// 🔹 Iniciar sesión (login)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  connection.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error al verificar usuario:', err);
      return res.status(500).json({ error: 'Error al verificar usuario' });
    }

    // Si no se encuentra el usuario
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = results[0];

    // Verifica que la contraseña sea correcta
    bcrypt.compare(password, usuario.password, (err, isMatch) => {
      if (err) {
        console.error('Error al comparar contraseñas:', err);
        return res.status(500).json({ error: 'Error al autenticar usuario' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      // Si la contraseña es correcta, genera un token
      const token = jwt.sign({ id: usuario.id, email: usuario.email }, 'tu_clave_secreta', { expiresIn: '1h' });

      // Envía el token al cliente
      res.json({
        message: 'Inicio de sesión exitoso',
        token: token,
      });
    });
  });
});

// 🔹 Obtener información del usuario autenticado (requiere token JWT)
router.get('/usuario-info', verificarToken, (req, res) => {
  connection.query('SELECT id, nombre, email, telefono, rol_id FROM usuarios WHERE id = ?', [req.usuarioId], (err, results) => {
    if (err) {
      console.error('Error al obtener la información del usuario:', err);
      return res.status(500).json({ error: 'Error al obtener la información del usuario' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Enviar rol_id junto con los demás datos
    res.json(results[0]);
  });
});

router.post('/importacion', async (req, res) => {
  const { usuarios } = req.body;  // Recibe el array de usuarios

  if (!usuarios || !Array.isArray(usuarios)) {
      return res.status(400).json({ error: 'El formato de datos es incorrecto' });
  }

  console.log('📥 Usuarios a importar:', usuarios);

  try {
      for (let usuario of usuarios) {
          const { nombre, email, telefono, password, rol_id } = usuario;

          if (!nombre || !email || !telefono || !password) {
              console.warn('⚠️ Usuario omitido por datos incompletos:', usuario);
              continue;
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const nuevoUsuario = { nombre, email, telefono, password: hashedPassword, rol_id: rol_id || 2 };

          await connection.query('INSERT INTO usuarios SET ?', nuevoUsuario);
      }

      res.status(201).json({ message: '✅ Usuarios importados exitosamente' });
  } catch (err) {
      console.error('❌ Error al importar usuarios:', err);
      res.status(500).json({ error: 'Error al importar usuarios', details: err.sqlMessage });
  }
});

// 🔹 Obtener perfil del usuario autenticado (requiere token JWT y agrega más información)
router.get('/usuarios/perfil', verificarToken, (req, res) => {
  connection.query(`
    SELECT 
      u.id, u.nombre, u.email, u.telefono, u.fecha_registro, r.nombre AS rol,
      b.modelo AS baston, b.fecha_asignacion, 
      loc.latitud, loc.longitud, loc.direccion, 
      ce.nombre AS contacto_nombre, ce.telefono AS contacto_telefono, ce.email AS contacto_email
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    LEFT JOIN bastones b ON u.id = b.usuario_id
    LEFT JOIN ubicaciones loc ON u.id = loc.usuario_id
    LEFT JOIN contactos_emergencia ce ON u.id = ce.usuario_id
    WHERE u.id = ?
  `, [req.usuarioId], (err, results) => {
    if (err) {
      console.error('Error al obtener perfil:', err);
      return res.status(500).json({ error: 'Error al obtener perfil' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(results[0]);  // Devuelve la información del perfil con datos adicionales
  });
});

// 🔹 Crear un nuevo bastón
router.post('/bastones', verificarToken, (req, res) => {
  const { usuario_id, modelo } = req.body;

  // Verificar que los parámetros sean correctos
  if (!usuario_id || !modelo) {
    return res.status(400).json({ error: 'El ID del usuario y el modelo son obligatorios' });
  }

  // Verificar si el usuario existe
  connection.query('SELECT * FROM usuarios WHERE id = ?', [usuario_id], (err, results) => {
    if (err) {
      console.error('Error al verificar usuario:', err);
      return res.status(500).json({ error: 'Error al verificar usuario' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Insertar el nuevo bastón
    const nuevoBaston = { usuario_id, modelo };

    connection.query('INSERT INTO bastones SET ?', nuevoBaston, (err, results) => {
      if (err) {
        console.error('Error al registrar bastón:', err);
        return res.status(500).json({ error: 'Error al registrar bastón' });
      }
      res.status(201).json({ message: 'Bastón registrado exitosamente', id: results.insertId });
    });
  });
});

// 🔹 Obtener todos los bastones
router.get('/bastones/tod', verificarToken, (req, res) => {
  connection.query('SELECT * FROM bastones', (err, results) => {
    if (err) {
      console.error('Error al obtener bastones:', err);
      return res.status(500).json({ error: 'Error al obtener bastones' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No se encontraron bastones' });
    }

    res.json(results);  // Devuelve todos los bastones
  });
});

// 🔹 Eliminar un bastón
router.delete('/bastones/:id', verificarToken, (req, res) => {
  const { id } = req.params;

  // Verificar si el bastón existe
  connection.query('SELECT * FROM bastones WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error al buscar bastón:', err);
      return res.status(500).json({ error: 'Error al buscar bastón' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Bastón no encontrado' });
    }

    // Eliminar el bastón
    connection.query('DELETE FROM bastones WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error('Error al eliminar bastón:', err);
        return res.status(500).json({ error: 'Error al eliminar bastón' });
      }

      // Si la eliminación fue exitosa
      res.status(200).json({ message: 'Bastón eliminado exitosamente' });
    });
  });
});

module.exports = router;





