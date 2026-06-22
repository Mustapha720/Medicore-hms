const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");
const { authenticate, authorize } = require("../middleware/auth");
const { sendPrescriptionReady } = require("../services/emailService");

module.exports = (io) => {
  const User = require("../models/User");
  // Doctor creates prescription
  const Task = require("../models/Task");

  router.post("/", authenticate, authorize("doctor"), async (req, res) => {
    try {
      const { patientId, diagnosis, medications, consultationNotes } = req.body;

      const prescription = await Prescription.create({
        patientId,
        doctorId: req.user._id,
        diagnosis,
        medications,
        consultationNotes,
      });

      console.log("💊 Prescription created:", prescription._id);

      // Create a task for pharmacist
      const task = await Task.create({
        title: `Dispense medication for: ${diagnosis}`,
        description: medications
          .map((m) => `${m.name} - ${m.dosage}`)
          .join(", "),
        createdBy: req.user._id,
        assignedRole: "pharmacist",
        relatedPatient: patientId,
        priority: "High",
        taskType: "medication",
        status: "Pending",
      });

      console.log("📋 Task created for pharmacist:", task._id);

      // Notify pharmacist via socket
      const sockets = await io.in("role:pharmacist").fetchSockets();
      console.log(`👥 Pharmacists connected: ${sockets.length}`);

      io.to("role:pharmacist").emit("task:assigned", {
        message: `New prescription to dispense: ${diagnosis}`,
        task,
      });

      io.to("role:pharmacist").emit("prescription:created", {
        message: "New prescription requires dispensing",
        prescription,
      });

      console.log("📤 Notified pharmacist");

      res.status(201).json(prescription);
    } catch (err) {
      console.log("❌ Prescription error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all prescriptions (pharmacist and doctor)
  router.get(
    "/",
    authenticate,
    authorize("doctor", "pharmacist"),
    async (req, res) => {
      try {
        const prescriptions = await Prescription.find()
          .populate("patientId", "name email")
          .populate("doctorId", "name")
          .sort({ createdAt: -1 });

        res.json(prescriptions);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Get patient's own prescriptions
  router.get(
    "/my-prescriptions",
    authenticate,
    authorize("patient"),
    async (req, res) => {
      try {
        const prescriptions = await Prescription.find({
          patientId: req.user._id,
        })
          .populate("doctorId", "name")
          .sort({ createdAt: -1 });

        res.json(prescriptions);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Pharmacist updates prescription status
  router.patch(
    "/:id/status",
    authenticate,
    authorize("pharmacist"),
    async (req, res) => {
      try {
        const { status } = req.body;
        const prescription = await Prescription.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true },
        ).populate("doctorId", "name");

        // Notify doctor
        io.to(`user:${prescription.doctorId._id}`).emit(
          "prescription:updated",
          {
            message: `Prescription status updated to ${status}`,
            prescription,
          },
        );

        res.json(prescription);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Doctor sees all prescriptions they wrote
  router.get(
    "/my-consultations",
    authenticate,
    authorize("doctor"),
    async (req, res) => {
      try {
        const prescriptions = await Prescription.find({
          doctorId: req.user._id,
        })
          .populate("patientId", "name email")
          .sort({ createdAt: -1 });
        res.json(prescriptions);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  router.patch(
    "/:id/status",
    authenticate,
    authorize("pharmacist"),
    async (req, res) => {
      try {
        const { status } = req.body;
        const prescription = await Prescription.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true },
        )
          .populate("doctorId", "name")
          .populate("patientId", "name email");

        // Send email when dispensed
        if (status === "Dispensed") {
          await sendPrescriptionReady(
            prescription.patientId.email,
            prescription.patientId.name,
            prescription.diagnosis,
            prescription.medications,
          );

          io.to(`user:${prescription.patientId._id}`).emit(
            "prescription:dispensed",
            {
              message: "💊 Your prescription is ready for collection!",
              prescription,
            },
          );
        }

        io.to(`user:${prescription.doctorId._id}`).emit(
          "prescription:updated",
          {
            message: `Prescription status updated to ${status}`,
            prescription,
          },
        );

        res.json(prescription);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  return router;
};
