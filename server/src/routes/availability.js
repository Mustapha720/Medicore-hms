const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const Availability = require('../models/Availability')

// Get doctor's own availability
router.get('/my', authenticate, authorize('doctor'), async (req, res) => {
    try {
        let availability = await Availability.findOne({ doctorId: req.user._id })
        if (!availability) {
            // Create default availability if none exists
            availability = await Availability.create({ doctorId: req.user._id })
        }
        res.json(availability)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Update doctor's availability
router.put('/my', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const { workingDays, startTime, endTime, blockedDates } = req.body
        const availability = await Availability.findOneAndUpdate(
            { doctorId: req.user._id },
            { workingDays, startTime, endTime, blockedDates },
            { new: true, upsert: true }
        )
        res.json(availability)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Get specific doctor's availability (for patients booking)
router.get('/:doctorId', authenticate, async (req, res) => {
    try {
        let availability = await Availability.findOne({ doctorId: req.params.doctorId })
        if (!availability) {
            availability = { workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '08:00', endTime: '17:00', blockedDates: [] }
        }
        res.json(availability)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router