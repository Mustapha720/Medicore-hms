const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedRole: {
    type: String,
    enum: ['nurse', 'pharmacist', 'lab_tech']
  },
  relatedPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  taskType: {
    type: String,
    enum: ['lab_test', 'medication', 'vital_check', 'other']
  },
  notes: String,
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);