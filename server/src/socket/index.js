const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { _id, role, name } = socket.user;
    console.log(`✅ ${name} (${role}) connected - socket: ${socket.id}`);

    socket.join(`role:${role}`);
    socket.join(`user:${_id}`);

    console.log(`📌 ${name} joined rooms: role:${role}, user:${_id}`);

    socket.on('join:queue', () => {
      socket.join('queue');
      console.log(`${name} joined queue room`);
    });

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${name} (${role}) disconnected`);
    });
  });

  io.on('connection', (socket) => {
    const { _id, role, name } = socket.user;
    console.log(`✅ ${name} (${role}) connected`);
  
    socket.join(`role:${role}`);
    socket.join(`user:${_id}`);
  
    console.log(`📌 Rooms: role:${role}, user:${_id}`);
  });
};