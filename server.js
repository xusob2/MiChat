const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs'); // Para encriptar contraseñas
dotenv.config();

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server);

const JWT_SECRET = process.env.JWT_SECRET;
const mongoURI = process.env.MONGO_URI;

// Verificar si las variables de entorno están definidas
if (!JWT_SECRET || !mongoURI) {
    console.error('❌ Error: Variables de entorno no definidas.');
    process.exit(1);
}

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'Usuarios', // Asegurar que use la base de datos correcta
})
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch((err) => {
        console.error('❌ Error al conectar a MongoDB:', err);
        process.exit(1);
    });

// Definir rutas para servir archivos HTML
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.get('/register', (req, res) => res.sendFile(__dirname + '/public/register.html'));
app.get('/chat', (req, res) => res.sendFile(__dirname + '/public/chat.html'));

// Esquema de usuario
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Contraseña encriptada
});

// Modelo de usuario
const User = mongoose.model('Usuarios', userSchema, 'Usuarios');

// Middleware para autenticar rutas protegidas
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
}

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        // Comparar contraseña encriptada con bcrypt
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        console.log("✅ Token generado:", token);
        res.json({ token });
    } catch (err) {
        console.error('❌ Error en /login:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Ruta para registrar usuario
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }
        // Hashear la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (err) {
        console.error('❌ Error en /register:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Ruta para refrescar el token
app.post('/refresh-token', authenticateToken, (req, res) => {
    const { username, id } = req.user;
    const newToken = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '1h' });
    console.log("🔄 Nuevo token generado:", newToken);
    res.json({ token: newToken });
});

// Middleware de autenticación para WebSockets
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log("🔹 Token recibido por socket.io:", token);
    if (!token) {
        console.error("❌ Error: No se envió token en la conexión de socket.io");
        return next(new Error('No autorizado'));
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("✅ Token decodificado correctamente:", decoded);
        socket.user = decoded;
        next();
    } catch (err) {
        console.error("❌ Error al decodificar el token en socket.io:", err.message);
        return next(new Error('Token inválido'));
    }
});

// Manejador de conexiones WebSocket
let connectedUsers = {}; 

io.on('connection', (socket) => {
    console.log(`✅ Usuario conectado: ${socket.user.username}`);

    connectedUsers[socket.id] = socket.user.username;
    io.emit('update user list', Object.values(connectedUsers));

    // Escuchar mensajes públicos
    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', { username: socket.user.username, msg: data.msg });
    });

    // 🔹 CORRECCIÓN DE MENSAJES PRIVADOS (Lógica correcta)
    socket.on('private message', ({ destinatario, msg }) => {
        const receptorSocketId = Object.keys(connectedUsers).find(id => connectedUsers[id] === destinatario);
        if (receptorSocketId) {
            io.to(receptorSocketId).emit('private message', {
                emisor: connectedUsers[socket.id],
                msg
            });
        } else {
            socket.emit('private message error', 'El destinatario no está disponible.');
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log(`❌ Usuario desconectado: ${socket.user.username}`);
        delete connectedUsers[socket.id];
        io.emit('update user list', Object.values(connectedUsers));
    });
});

// Inicializar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
