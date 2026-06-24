const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,  // Force IPv4
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const sendPrescriptionReady = async (
  patientEmail,
  patientName,
  diagnosis,
  medications,
) => {
  try {
    const medList = medications
      .map(
        (m) =>
          `<li><strong>${m.name}</strong> — ${m.dosage}, ${m.duration}</li>`,
      )
      .join("");

    await transporter.sendMail({
      from: `"MediCore HMS" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: "💊 Your Prescription is Ready",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem; border-radius: 12px;">
          <div style="background: #0d1117; padding: 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #1D9E75; margin: 0; font-size: 1.5rem;">MediCore HMS</h1>
            <p style="color: #9ca3af; margin: 0.5rem 0 0; font-size: 0.9rem;">Hospital Management System</p>
          </div>
          
          <h2 style="color: #0f172a;">Hello ${patientName},</h2>
          <p style="color: #374151;">Your prescription is ready for collection at the pharmacy.</p>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; margin: 1.5rem 0;">
            <h3 style="color: #0f172a; margin-top: 0;">Diagnosis</h3>
            <p style="color: #374151; background: #f0fdf4; padding: 0.75rem; border-radius: 8px; border-left: 4px solid #1D9E75;">${diagnosis}</p>
            
            <h3 style="color: #0f172a;">Medications</h3>
            <ul style="color: #374151; line-height: 2;">${medList}</ul>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #166534; margin: 0; font-size: 0.9rem;">
              ✅ Please visit the pharmacy with your queue token to collect your medication.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 0.82rem; text-align: center;">
            This is an automated message from MediCore HMS. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    console.log(`📧 Prescription email sent to ${patientEmail}`);
    return true;
  } catch (err) {
    console.log("❌ Email error:", err.message);
    return false;
  }
};

const sendAppointmentConfirmation = async (
  patientEmail,
  patientName,
  doctorName,
  date,
  timeSlot,
) => {
  try {
    await transporter.sendMail({
      from: `"MediCore HMS" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: "📅 Appointment Confirmed — MediCore HMS",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem; border-radius: 12px;">
          <div style="background: #0d1117; padding: 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #1D9E75; margin: 0; font-size: 1.5rem;">MediCore HMS</h1>
            <p style="color: #9ca3af; margin: 0.5rem 0 0; font-size: 0.9rem;">Hospital Management System</p>
          </div>
          
          <h2 style="color: #0f172a;">Hello ${patientName},</h2>
          <p style="color: #374151;">Your appointment has been confirmed.</p>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; margin: 1.5rem 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 0.75rem; color: #6b7280; font-size: 0.9rem;">Doctor</td>
                <td style="padding: 0.75rem; color: #0f172a; font-weight: 600;">Dr. ${doctorName.replace(/^Dr\.?\s*/i, "")}</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 0.75rem; color: #6b7280; font-size: 0.9rem;">Date</td>
                <td style="padding: 0.75rem; color: #0f172a; font-weight: 600;">${new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td>
              </tr>
              <tr>
                <td style="padding: 0.75rem; color: #6b7280; font-size: 0.9rem;">Time</td>
                <td style="padding: 0.75rem; color: #1D9E75; font-weight: 700; font-size: 1.1rem;">${timeSlot}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #1e40af; margin: 0; font-size: 0.9rem;">
              📋 Please arrive 10 minutes early and bring your queue token.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 0.82rem; text-align: center;">
            This is an automated message from MediCore HMS. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    console.log(`📧 Appointment confirmation sent to ${patientEmail}`);
    return true;
  } catch (err) {
    console.log("❌ Email error:", err.message);
    return false;
  }
};

const sendAppointmentReminder = async (
  patientEmail,
  patientName,
  doctorName,
  date,
  timeSlot,
) => {
  try {
    await transporter.sendMail({
      from: `"MediCore HMS" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: "⏰ Appointment Reminder — Tomorrow",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem; border-radius: 12px;">
          <div style="background: #0d1117; padding: 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #1D9E75; margin: 0;">MediCore HMS</h1>
          </div>
          <h2 style="color: #0f172a;">Reminder: Appointment Tomorrow</h2>
          <p style="color: #374151;">Hello ${patientName}, this is a reminder about your appointment tomorrow.</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; margin: 1.5rem 0;">
            <p><strong>Doctor:</strong> Dr. ${doctorName.replace(/^Dr\.?\s*/i, "")}</p>
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> <span style="color: #1D9E75; font-weight: 700;">${timeSlot}</span></p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.log("❌ Reminder email error:", err.message);
    return false;
  }
};

module.exports = {
  sendPrescriptionReady,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
};
