const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const { sendAppointmentReminder } = require("./emailService");

const scheduleReminders = () => {
  // Run every day at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ Running appointment reminder job...");

    try {
      // Get tomorrow's date range
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setHours(23, 59, 59, 999);

      // Find all confirmed appointments for tomorrow
      const appointments = await Appointment.find({
        date: { $gte: tomorrow, $lte: dayAfter },
        status: "Confirmed",
      })
        .populate("patientId", "name email")
        .populate("doctorId", "name");

      console.log(`📅 Found ${appointments.length} appointments for tomorrow`);

      for (const apt of appointments) {
        if (apt.patientId?.email) {
          await sendAppointmentReminder(
            apt.patientId.email,
            apt.patientId.name,
            apt.doctorId.name,
            apt.date,
            apt.timeSlot,
          );
          console.log(`📧 Reminder sent to ${apt.patientId.email}`);
        }
      }

      console.log("✅ Reminder job completed");
    } catch (err) {
      console.log("❌ Reminder job error:", err.message);
    }
  });

  console.log(
    "⏰ Appointment reminder scheduler started — runs daily at 8:00 AM",
  );
};

module.exports = { scheduleReminders };
