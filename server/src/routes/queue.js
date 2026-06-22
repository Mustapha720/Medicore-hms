const express = require("express");
const router = express.Router();
const Queue = require("../models/Queue");
const { authenticate, authorize } = require("../middleware/auth");
const {
  analyzeSymptoms,
  getFollowUpQuestion,
} = require("../services/symptomChecker");

const generateToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "MED-";
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = (io) => {
  // Auto-expire patients who haven't checked in within 30 mins
  const checkExpiredEntries = async () => {
    try {
      const expired = await Queue.find({
        status: "Queued",
        checkedIn: false,
        checkInDeadline: { $lt: new Date() },
      }).populate("patientId", "name");

      for (const entry of expired) {
        entry.status = "Expired";
        await entry.save();
        console.log(`⏰ Queue entry expired for ${entry.patientId?.name}`);

        // Notify patient
        io.to(`user:${entry.patientId._id}`).emit("queue:expired", {
          message:
            "Your queue position has expired. Please re-join the queue when you arrive.",
          entry,
        });

        // Recalculate positions
        await recalculatePositions();

        // Notify doctors
        io.to("role:doctor").to("role:nurse").emit("queue:updated", {
          message: "Queue updated - expired entry removed",
        });
      }
    } catch (err) {
      console.log("Error checking expired entries:", err.message);
    }
  };

  // Recalculate queue positions
  const recalculatePositions = async () => {
    const waiting = await Queue.find({
      status: { $in: ["Queued", "Checked In"] },
    }).sort({ urgency: -1, createdAt: 1 });

    // High urgency first, then by time
    const urgencyOrder = { High: 0, Medium: 1, Low: 2 };
    waiting.sort((a, b) => {
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    for (let i = 0; i < waiting.length; i++) {
      waiting[i].position = i + 1;
      waiting[i].estimatedWait = (i + 1) * 10;
      await waiting[i].save();
    }
  };

  // Run expiry check every minute
  setInterval(checkExpiredEntries, 60 * 1000);

  // Preview analysis + get follow-up question (doesn't join queue yet)
  router.post("/preview", authenticate, async (req, res) => {
    try {
      const { symptoms } = req.body;

      const existing = await Queue.findOne({
        patientId: req.user._id,
        status: { $in: ["Queued", "Checked In", "In Consultation"] },
      });
      if (existing) {
        return res.status(400).json({ error: "You are already in the queue" });
      }

      const analysis = analyzeSymptoms(symptoms);
      const followUpQuestion = getFollowUpQuestion(symptoms, analysis.urgency);

      res.json({ analysis, followUpQuestion });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Patient submits symptoms and joins queue
  router.post("/join", authenticate, async (req, res) => {
    try {
      const { symptoms, aiUrgency, aiPossibleConditions, aiUrgencyReason } =
        req.body;

      const existing = await Queue.findOne({
        patientId: req.user._id,
        status: { $in: ["Queued", "Checked In", "In Consultation"] },
      });
      if (existing) {
        return res.status(400).json({
          error: "You are already in the queue",
          queueEntry: existing,
        });
      }

      // Use AI analysis if provided, otherwise fall back to rule-based
      let urgency, urgencyReason, possibleConditions;
      if (aiUrgency) {
        urgency = aiUrgency;
        urgencyReason = aiUrgencyReason || "Assessed by AI";
        possibleConditions = aiPossibleConditions || ["General illness"];
      } else {
        const analysis = analyzeSymptoms(symptoms);
        urgency = analysis.urgency;
        urgencyReason = analysis.urgencyReason;
        possibleConditions = analysis.possibleConditions;
      }

      const waitingCount = await Queue.countDocuments({
        status: { $in: ["Queued", "Checked In"] },
      });
      const position = urgency === "High" ? 1 : waitingCount + 1;

      if (urgency === "High") {
        await Queue.updateMany(
          { status: { $in: ["Queued", "Checked In"] } },
          { $inc: { position: 1, estimatedWait: 10 } },
        );
      }

      const checkInDeadline = new Date(Date.now() + 30 * 60 * 1000);

      const queueEntry = await Queue.create({
        patientId: req.user._id,
        symptoms,
        urgency,
        urgencyReason,
        aiSummary: symptoms,
        possibleConditions,
        position,
        estimatedWait: position * 10,
        status: "Queued",
        queueToken: generateToken(),
        checkInDeadline,
      });

      io.to("role:doctor").to("role:nurse").emit("queue:updated", {
        message: "New patient joined queue",
        urgency,
        patientId: req.user._id,
      });

      if (urgency === "High") {
        io.to("role:doctor").to("role:nurse").emit("notification:urgent", {
          message: `URGENT: Patient needs immediate attention`,
          queueEntry,
        });
      }

      res.status(201).json({ queueEntry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get full queue (doctors and nurses only)
  router.get(
    "/",
    authenticate,
    authorize("doctor", "nurse"),
    async (req, res) => {
      try {
        const queue = await Queue.find({
          status: { $in: ["Queued", "Checked In", "In Consultation"] },
        })
          .populate("patientId", "name email")
          .sort({ position: 1 });
        res.json(queue);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Patient checks their position
  router.get("/my-position", authenticate, async (req, res) => {
    try {
      const entry = await Queue.findOne({
        patientId: req.user._id,
        status: { $in: ["Queued", "Checked In", "In Consultation"] },
      });
      if (!entry) return res.status(404).json({ error: "Not in queue" });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lookup patient by token (receptionist/nurse)
  router.get("/lookup/:token", authenticate, async (req, res) => {
    try {
      const entry = await Queue.findOne({
        queueToken: req.params.token.toUpperCase(),
      }).populate("patientId", "name email");
      if (!entry) return res.status(404).json({ error: "Token not found" });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Nurse/receptionist checks patient in
  router.post(
    "/checkin",
    authenticate,
    authorize("nurse"),
    async (req, res) => {
      try {
        const { token } = req.body;
        const entry = await Queue.findOne({
          queueToken: token.toUpperCase(),
          status: "Queued",
        }).populate("patientId", "name email");

        if (!entry) {
          return res.status(404).json({
            error: "Token not found or patient already checked in",
          });
        }

        entry.status = "Checked In";
        entry.checkedIn = true;
        entry.checkedInAt = new Date();
        await entry.save();

        console.log(`✅ ${entry.patientId.name} checked in`);

        // Notify doctor
        io.to("role:doctor").emit("patient:checkedin", {
          message: `${entry.patientId.name} has arrived at the hospital`,
          entry,
        });

        // Notify patient
        io.to(`user:${entry.patientId._id}`).emit("queue:checkedin", {
          message: "You have been checked in. Please wait to be called.",
          entry,
        });

        // Update queue for everyone
        io.to("queue").emit("queue:updated", {
          message: "Patient checked in",
        });

        res.json({
          message: "Patient checked in successfully",
          patient: entry.patientId.name,
          urgency: entry.urgency,
          position: entry.position,
          entry,
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Doctor updates patient status
  router.patch(
    "/:id/status",
    authenticate,
    authorize("doctor", "nurse"),
    async (req, res) => {
      try {
        const { status } = req.body;

        // Only allow In Consultation if patient is Checked In
        if (status === "In Consultation") {
          const entry = await Queue.findById(req.params.id);
          if (entry && !entry.checkedIn) {
            return res.status(400).json({
              error: "Patient must be checked in before starting consultation",
            });
          }
        }

        const entry = await Queue.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true },
        ).populate("patientId", "name email");

        await recalculatePositions();

        io.to("queue").emit("queue:updated", {
          message: `Patient status updated to ${status}`,
          entry,
        });

        io.to(`user:${entry.patientId._id}`).emit("queue:statusupdated", {
          message: `Your status has been updated to: ${status}`,
          status,
        });

        res.json(entry);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Get queue history
  router.get("/history", authenticate, async (req, res) => {
    try {
      const filter =
        req.user.role === "patient" ? { patientId: req.user._id } : {};
      const history = await Queue.find(filter)
        .populate("patientId", "name email")
        .sort({ createdAt: -1 });
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
