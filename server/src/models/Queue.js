const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  urgencyReason: String,
  aiSummary: String,
  possibleConditions: [String],
  status: {
    type: String,
    enum: ['Queued', 'Checked In', 'In Consultation', 'Completed', 'Expired'],
    default: 'Queued'
  },
  position: Number,
  estimatedWait: Number,
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  queueToken: {
    type: String,
    unique: true,
    sparse: true
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: Date,
  checkInDeadline: Date,  // 30 mins after joining
  expiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Queue', queueSchema);