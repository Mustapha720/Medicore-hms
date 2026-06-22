const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

module.exports = (io) => {
  // Get all users to message (excluding self)
  router.get("/users", authenticate, async (req, res) => {
    try {
      const users = await User.find({
        _id: { $ne: req.user._id },
      }).select("name role email");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send a message
  router.post("/send", authenticate, async (req, res) => {
    try {
      const { receiverId, content } = req.body;

      const conversationId = [req.user._id.toString(), receiverId]
        .sort()
        .join("_");

      const message = await Message.create({
        senderId: req.user._id,
        receiverId,
        content,
        conversationId,
      });

      const populated = await Message.findById(message._id)
        .populate("senderId", "name role")
        .populate("receiverId", "name role");

      console.log(`📨 Message from ${req.user.name} to user:${receiverId}`);

      // Check if receiver is connected
      const sockets = await io.in(`user:${receiverId}`).fetchSockets();
      console.log(`👤 Receiver sockets connected: ${sockets.length}`);

      io.to(`user:${receiverId}`).emit("message:new", {
        message: populated,
        conversationId,
      });

      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get conversation between two users
  router.get("/conversation/:userId", authenticate, async (req, res) => {
    try {
      const conversationId = [req.user._id.toString(), req.params.userId]
        .sort()
        .join("_");

      const messages = await Message.find({ conversationId })
        .populate("senderId", "name role")
        .populate("receiverId", "name role")
        .sort({ createdAt: 1 });

      // Mark messages as read
      await Message.updateMany(
        { conversationId, receiverId: req.user._id, readAt: null },
        { readAt: new Date() },
      );

      io.to(`user:${req.params.userId}`).emit("message:read", {
        conversationId,
        readBy: req.user._id,
      });

      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all conversations for logged in user
  router.get("/conversations", authenticate, async (req, res) => {
    try {
      const messages = await Message.find({
        $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      })
        .populate("senderId", "name role")
        .populate("receiverId", "name role")
        .sort({ createdAt: -1 });

      // Group by conversationId — get last message per conversation
      const conversations = {};
      messages.forEach((msg) => {
        if (!conversations[msg.conversationId]) {
          conversations[msg.conversationId] = msg;
        }
      });

      res.json(Object.values(conversations));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
