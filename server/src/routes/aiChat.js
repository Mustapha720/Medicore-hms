const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { chatWithAI } = require("../services/aiSymptomChecker");

router.post("/chat", authenticate, async (req, res) => {
  try {
    const { conversationHistory } = req.body;
    const result = await chatWithAI(conversationHistory);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
