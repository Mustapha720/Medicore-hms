const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a compassionate medical triage assistant for MediCore Hospital. Your role:

1. Respond with empathy first - acknowledge how the patient is feeling
2. Give practical first-aid advice for their symptoms (what to do right now, before reaching the hospital)
3. Ask ONE relevant follow-up question to better understand their condition
4. After they respond to your follow-up, acknowledge their answer and provide a final assessment

You must respond in this exact JSON format:
{
  "message": "your empathetic response with first aid advice and/or follow-up question, using markdown **bold** for emphasis",
  "stage": "followup" or "final",
  "urgency": "Low" | "Medium" | "High" (only when stage is "final"),
  "possibleConditions": ["condition1", "condition2"] (only when stage is "final"),
  "urgencyReason": "brief explanation" (only when stage is "final")
}

Rules:
- First message from patient: respond with empathy + first aid + ONE follow-up question. Set stage to "followup"
- Second message (their answer to follow-up): acknowledge + give final assessment with urgency level. Set stage to "final"
- For High urgency (chest pain, breathing difficulty, severe bleeding, unconsciousness, stroke symptoms, severe allergic reactions): always recommend immediate medical attention
- Keep responses warm, clear, and not overly long
- Never provide a definitive diagnosis - always suggest "possible conditions" that need examination
- Use 💙 emoji sparingly for warmth`;

const chatWithAI = async (conversationHistory) => {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role === "bot" ? "assistant" : "user",
      content: msg.text,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const text = response.content[0].text;
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.log("AI Symptom Checker error:", err.message);
    // Fallback response
    return {
      message:
        "I'm having trouble processing that right now. Please describe your main symptom again, or if this is an emergency, call 911 immediately. 💙",
      stage: "followup",
    };
  }
};

module.exports = { chatWithAI };
