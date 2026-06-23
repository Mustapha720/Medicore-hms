const mongoose = require('mongoose')

const availabilitySchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    workingDays: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    startTime: { type: String, default: '08:00' },
    endTime: { type: String, default: '17:00' },
    blockedDates: [{ type: String }] // stored as 'YYYY-MM-DD'
}, { timestamps: true })

module.exports = mongoose.model('Availability', availabilitySchema)