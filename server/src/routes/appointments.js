const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const { sendAppointmentConfirmation } = require("../services/emailService");

module.exports = (io) => {
  // Get all doctors
  router.get("/doctors", authenticate, async (req, res) => {
    try {
      const doctors = await User.find({ role: "doctor" }).select(
        "name specialization",
      );
      res.json(doctors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get available slots for a doctor on a date
    router.get("/slots/:doctorId/:date", authenticate, async (req, res) => {
    try {
      const { doctorId, date } = req.params;
      const Availability = require("../models/Availability");

      // Get doctor availability
      let availability = await Availability.findOne({ doctorId });
      if (!availability) {
        availability = {
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: "08:00",
          endTime: "17:00",
          blockedDates: [],
        };
      }

      // Check if date is blocked
      if (availability.blockedDates?.includes(date)) {
        return res.json({
          availableSlots: [],
          reason: "Doctor is not available on this date",
        });
      }

      // Check if date falls on a working day
      const dayName = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (!availability.workingDays.includes(dayName)) {
        return res.json({
          availableSlots: [],
          reason: `Doctor does not work on ${dayName}s`,
        });
      }

      // Generate slots based on doctor's hours
      const [startHour, startMin] = availability.startTime
        .split(":")
        .map(Number);
      const [endHour, endMin] = availability.endTime.split(":").map(Number);

      const slots = [];
      let current = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;

      while (current + 30 <= end) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const ampm = h >= 12 ? "PM" : "AM";
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        slots.push(`${displayH}:${m.toString().padStart(2, "0")} ${ampm}`);
        current += 30;
      }

      // Remove already booked slots
      const booked = await Appointment.find({
        doctorId,
        date: new Date(date),
        status: { $in: ["Pending", "Confirmed"] },
      });
      const bookedSlots = booked.map((a) => a.timeSlot);
      const availableSlots = slots.filter((s) => !bookedSlots.includes(s));

      res.json({ availableSlots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Book appointment
  router.post("/", authenticate, authorize("patient"), async (req, res) => {
    try {
      const { doctorId, date, timeSlot, reason } = req.body;

      // Check slot not already taken
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await Appointment.findOne({
        doctorId,
        date: { $gte: startOfDay, $lte: endOfDay },
        timeSlot,
        status: { $in: ["Pending", "Confirmed"] },
      });

      if (existing) {
        return res.status(400).json({ error: "This slot is already booked" });
      }

      const appointment = await Appointment.create({
        patientId: req.user._id,
        doctorId,
        date,
        timeSlot,
        reason,
        status: "Pending",
      });

      const populated = await Appointment.findById(appointment._id)
        .populate("doctorId", "name")
        .populate("patientId", "name email");

      // Notify doctor
      io.to(`user:${doctorId}`).emit("appointment:new", {
        message: `New appointment booked by ${req.user.name}`,
        appointment: populated,
      });

      // Send confirmation email
      await sendAppointmentConfirmation(
        req.user.email,
        req.user.name,
        populated.doctorId.name,
        date,
        timeSlot,
      );

      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get patient's appointments
  router.get(
    "/my-appointments",
    authenticate,
    authorize("patient"),
    async (req, res) => {
      try {
        const appointments = await Appointment.find({ patientId: req.user._id })
          .populate("doctorId", "name specialization")
          .sort({ date: 1 });
        res.json(appointments);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Get doctor's appointments
  router.get(
    "/doctor-appointments",
    authenticate,
    authorize("doctor"),
    async (req, res) => {
      try {
        const appointments = await Appointment.find({ doctorId: req.user._id })
          .populate("patientId", "name email")
          .sort({ date: 1, timeSlot: 1 });
        res.json(appointments);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Doctor confirms or cancels appointment
  router.patch(
    "/:id/status",
    authenticate,
    authorize("doctor"),
    async (req, res) => {
      try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true },
        )
          .populate("patientId", "name email")
          .populate("doctorId", "name");

        // Notify patient
        io.to(`user:${appointment.patientId._id}`).emit("appointment:updated", {
          message: `Your appointment has been ${status.toLowerCase()}`,
          appointment,
        });

        res.json(appointment);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Cancel appointment (patient)
  router.patch(
    "/:id/cancel",
    authenticate,
    authorize("patient"),
    async (req, res) => {
      try {
        const appointment = await Appointment.findByIdAndUpdate(
          req.params.id,
          { status: "Cancelled" },
          { new: true },
        ).populate("doctorId", "name");

        io.to(`user:${appointment.doctorId._id}`).emit(
          "appointment:cancelled",
          {
            message: "An appointment has been cancelled",
            appointment,
          },
        );

        res.json(appointment);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  return router;
};
