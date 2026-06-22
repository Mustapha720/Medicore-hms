const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { authenticate, authorize } = require("../middleware/auth");

module.exports = (io) => {
  // Doctor creates a task
  router.post("/", authenticate, authorize("doctor"), async (req, res) => {
    try {
      const {
        title,
        description,
        assignedRole,
        assignedTo,
        relatedPatient,
        priority,
        taskType,
        notes,
      } = req.body;

      const task = await Task.create({
        title,
        description,
        createdBy: req.user._id,
        assignedTo,
        assignedRole,
        relatedPatient,
        priority,
        taskType,
        notes,
      });

      // Notify the assigned role
      io.to(`role:${assignedRole}`).emit("task:assigned", {
        message: `New task assigned: ${title}`,
        task,
      });

      // If lab test notify lab tech
      if (taskType === "lab_test") {
        io.to("role:lab_tech").emit("notification:lab_test", {
          message: "New lab test requested",
          task,
        });
      }

      // If medication notify pharmacist
      if (taskType === "medication") {
        io.to("role:pharmacist").emit("notification:medication", {
          message: "New medication preparation requested",
          task,
        });
      }

      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get tasks for logged in staff member
  router.get("/my-tasks", authenticate, async (req, res) => {
    try {
      const tasks = await Task.find({
        $or: [{ assignedTo: req.user._id }, { assignedRole: req.user.role }],
      })
        .populate("createdBy", "name role")
        .populate("relatedPatient", "name")
        .sort({ priority: -1, createdAt: -1 });

      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all tasks (doctor view)
  router.get("/", authenticate, authorize("doctor"), async (req, res) => {
    try {
      const tasks = await Task.find()
        .populate("createdBy", "name role")
        .populate("assignedTo", "name role")
        .populate("relatedPatient", "name")
        .sort({ priority: -1, createdAt: -1 });

      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update task status
  router.patch("/:id/status", authenticate, async (req, res) => {
    try {
      const { status, notes } = req.body;

      const updateData = { status };
      if (notes) updateData.notes = notes;
      if (status === "Completed") updateData.completedAt = new Date();

      const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      }).populate("createdBy", "name role");

      // If medication task completed, update prescription status
      if (status === "Completed" && task.taskType === "medication") {
        const Prescription = require("../models/Prescription");
        const User = require("../models/User");
        const { sendPrescriptionReady } = require("../services/emailService");

        const prescription = await Prescription.findOneAndUpdate(
          { patientId: task.relatedPatient },
          { status: "Dispensed" },
          { new: true },
        )
          .populate("patientId", "name email")
          .populate("doctorId", "name");

        if (prescription?.patientId?.email) {
          await sendPrescriptionReady(
            prescription.patientId.email,
            prescription.patientId.name,
            prescription.diagnosis,
            prescription.medications,
          );
          console.log(
            "📧 Prescription email sent to",
            prescription.patientId.email,
          );

          // Notify patient via socket
          io.to(`user:${prescription.patientId._id}`).emit(
            "prescription:dispensed",
            {
              message: "💊 Your prescription is ready for collection!",
              prescription,
            },
          );
        }
      }

      // Notify doctor when task is completed
      if (status === "Completed") {
        io.to(`user:${task.createdBy._id}`).emit("task:completed", {
          message: `Task "${task.title}" has been completed`,
          task,
        });

        // If lab results ready notify doctor
        if (task.taskType === "lab_test") {
          io.to("role:doctor").emit("lab:results_ready", {
            message: "Lab test results are ready",
            task,
          });
        }
      }

      // Notify task update to everyone
      io.to("role:doctor").emit("task:updated", { task });

      res.json(task);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lab tech sees completed lab tasks
  router.get(
    "/lab-history",
    authenticate,
    authorize("lab_tech"),
    async (req, res) => {
      try {
        const tasks = await Task.find({
          assignedRole: "lab_tech",
          taskType: "lab_test",
        })
          .populate("createdBy", "name")
          .populate("relatedPatient", "name")
          .sort({ createdAt: -1 });
        res.json(tasks);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  return router;
};
