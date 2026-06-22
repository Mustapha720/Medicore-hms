const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    notes: String
  }],
  consultationNotes: String,
  status: {
    type: String,
    enum: ['Pending', 'Dispensed', 'Completed'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);