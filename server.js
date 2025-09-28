const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const employeeRoutes = require('./routes/employees');
const callRoutes = require('./routes/calls');
const adminRoutes = require('./routes/admin');
const recordingRoutes = require('./routes/recordings');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statyczne pliki
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recordings', recordingRoutes);

// Socket.io dla real-time updates
io.on('connection', (socket) => {
  console.log('Użytkownik połączony:', socket.id);
  
  socket.on('join-employee-room', (employeeId) => {
    socket.join(`employee-${employeeId}`);
    console.log(`Pracownik ${employeeId} dołączył do pokoju`);
  });
  
  socket.on('disconnect', () => {
    console.log('Użytkownik rozłączony:', socket.id);
  });
});

// Przekaż io do routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Połączenie z MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-call-manager', {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  bufferCommands: false,
})
.then(() => {
  console.log('✅ Połączono z MongoDB Atlas');
})
.catch((error) => {
  console.error('❌ Błąd połączenia z MongoDB:', error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Wystąpił błąd serwera',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint nie znaleziony' 
  });
});

const PORT =  3006;

server.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
  console.log(`📱 Panel pracownika: http://localhost:${PORT}/employee`);
  console.log(`👨‍💼 Panel admina: http://localhost:${PORT}/admin`);
});
