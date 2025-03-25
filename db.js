const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'database-1.cbs4y06s6sd3.us-east-2.rds.amazonaws.com', // Sustituye por el endpoint de tu base de datos en AWS
  user: 'ec2-user',            // Sustituye por el nombre de usuario de tu base de datos
  password: 'Luis166Islas',     // Sustituye por la contraseña de tu base de datos
  database: 'sistema_bastones'   // El nombre de tu base de datos
});

connection.connect((err) => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err);
    return;
  }
  console.log('Conexión a la base de datos exitosa');
});
