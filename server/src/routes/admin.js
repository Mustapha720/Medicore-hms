const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Queue = require("../models/Queue");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const Task = require("../models/Task");
const { authenticate, authorize } = require("../middleware/auth");

// All admin routes require admin role
router.use(authenticate, authorize("admin"));

// Dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalNurses,
      totalPharmacists,
      totalLabTechs,
      totalQueue,
      totalAppointments,
      totalPrescriptions,
      totalTasks,
      pendingTasks,
      completedTasks,
      todayQueue,
      highUrgency,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "nurse" }),
      User.countDocuments({ role: "pharmacist" }),
      User.countDocuments({ role: "lab_tech" }),
      Queue.countDocuments(),
      Appointment.countDocuments(),
      Prescription.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: "Pending" }),
      Task.countDocuments({ status: "Completed" }),
      Queue.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      Queue.countDocuments({ urgency: "High" }),
    ]);

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPatients = await User.countDocuments({
      role: "patient",
      createdAt: { $gte: last7Days },
    });
    const recentAppointments = await Appointment.countDocuments({
      createdAt: { $gte: last7Days },
    });

    res.json({
      users: {
        total: totalUsers,
        patients: totalPatients,
        doctors: totalDoctors,
        nurses: totalNurses,
        pharmacists: totalPharmacists,
        labTechs: totalLabTechs,
        recentPatients,
      },
      queue: { total: totalQueue, today: todayQueue, highUrgency },
      appointments: { total: totalAppointments, recent: recentAppointments },
      prescriptions: { total: totalPrescriptions },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        completed: completedTasks,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users with filters
router.get("/users", async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== "all") filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);
    res.json({ users, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle user active status
router.patch("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all queue entries
router.get("/queue", async (req, res) => {
  try {
    const queue = await Queue.find()
      .populate("patientId", "name email")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all appointments
router.get("/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patientId", "name email")
      .populate("doctorId", "name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics data
router.get('/analytics', async (req, res) => {
  try {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setHours(23, 59, 59, 999)

      const [patients, appointments, queue] = await Promise.all([
        User.countDocuments({ role: 'patient', createdAt: { $gte: date, $lte: nextDate } }),
        Appointment.countDocuments({ createdAt: { $gte: date, $lte: nextDate } }),
        Queue.countDocuments({ createdAt: { $gte: date, $lte: nextDate } }),
      ])

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        patients,
        appointments,
        queue
      })
    }

    // Urgency breakdown
    const [lowUrgency, mediumUrgency, highUrgency] = await Promise.all([
      Queue.countDocuments({ urgency: 'Low' }),
      Queue.countDocuments({ urgency: 'Medium' }),
      Queue.countDocuments({ urgency: 'High' }),
    ])

    // Appointment status breakdown
    const [pending, confirmed, completed, cancelled] = await Promise.all([
      Appointment.countDocuments({ status: 'Pending' }),
      Appointment.countDocuments({ status: 'Confirmed' }),
      Appointment.countDocuments({ status: 'Completed' }),
      Appointment.countDocuments({ status: 'Cancelled' }),
    ])

    // Task completion rate
    const [totalTasks, completedTasks] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'Completed' }),
    ])

    // User role distribution
    const userRoles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])

    res.json({
      last7Days,
      urgency: [
        { name: 'Low', value: lowUrgency, color: '#10b981' },
        { name: 'Medium', value: mediumUrgency, color: '#f59e0b' },
        { name: 'High', value: highUrgency, color: '#ef4444' },
      ],
      appointmentStatus: [
        { name: 'Pending', value: pending, color: '#f59e0b' },
        { name: 'Confirmed', value: confirmed, color: '#10b981' },
        { name: 'Completed', value: completed, color: '#7F77DD' },
        { name: 'Cancelled', value: cancelled, color: '#ef4444' },
      ],
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      userRoles: userRoles.map(r => ({
        name: r._id.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value: r.count,
        color: {
          patient: '#06b6d4',
          doctor: '#7F77DD',
          nurse: '#1D9E75',
          pharmacist: '#D85A30',
          lab_tech: '#f59e0b',
          admin: '#e11d48'
        }[r._id] || '#9ca3af'
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router;
