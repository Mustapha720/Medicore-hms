const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const { scheduleReminders } = require('./services/reminderScheduler')
scheduleReminders()

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/queue", require("./routes/queue")(io));
app.use("/api/tasks", require("./routes/tasks")(io));
app.use("/api/messages", require("./routes/messages")(io));
app.use("/api/prescriptions", require("./routes/prescriptions")(io));
app.use("/api/appointments", require("./routes/appointments")(io));
app.use("/api/admin", require("./routes/admin"));
app.use('/api/ai', require('./routes/aiChat'))

// Socket.io
require("./socket")(io);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "HMS Server is running" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`),
    );
  })
  .catch((err) => console.log("DB connection error:", err));

module.exports = { io };
