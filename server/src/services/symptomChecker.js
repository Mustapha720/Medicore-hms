const HIGH_URGENCY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "shortness of breath",
  "unconscious",
  "seizure",
  "stroke",
  "heart attack",
  "severe bleeding",
  "coughing blood",
  "vomiting blood",
  "severe headache",
  "paralysis",
  "overdose",
  "suicide",
  "severe allergic",
  "anaphylaxis",
  "high fever",
  "not breathing",
  "choking",
  "severe burn",
  "head injury",
  "loss of consciousness",
];

const MEDIUM_URGENCY_KEYWORDS = [
  "fever",
  "vomiting",
  "diarrhea",
  "moderate pain",
  "dizziness",
  "fainting",
  "infection",
  "swelling",
  "rash",
  "allergic",
  "abdominal pain",
  "back pain",
  "migraine",
  "fracture",
  "sprain",
  "burning",
  "nausea",
  "headache",
  "cough",
  "sore throat",
  "ear pain",
];

const getUrgency = (text) => {
  const lower = text.toLowerCase();
  if (HIGH_URGENCY_KEYWORDS.some((k) => lower.includes(k))) return "High";
  if (MEDIUM_URGENCY_KEYWORDS.some((k) => lower.includes(k))) return "Medium";
  return "Low";
};

const getPossibleConditions = (text) => {
  const lower = text.toLowerCase();
  const conditions = [];
  if (lower.includes("chest") || lower.includes("heart"))
    conditions.push("Cardiac issue", "Angina");
  if (lower.includes("fever") || lower.includes("temperature"))
    conditions.push("Viral infection", "Flu");
  if (lower.includes("headache") || lower.includes("migraine"))
    conditions.push("Migraine", "Hypertension");
  if (lower.includes("cough") || lower.includes("breathing"))
    conditions.push("Respiratory infection", "Asthma");
  if (
    lower.includes("stomach") ||
    lower.includes("abdominal") ||
    lower.includes("vomit")
  )
    conditions.push("Gastritis", "Food poisoning");
  if (lower.includes("rash") || lower.includes("skin"))
    conditions.push("Allergic reaction", "Dermatitis");
  if (conditions.length === 0)
    conditions.push("General illness", "Requires examination");
  return conditions;
};

const getFollowUpQuestion = (symptoms, urgency) => {
  const lower = symptoms.toLowerCase();

  if (urgency === "High") {
    if (lower.includes("chest") || lower.includes("heart")) {
      return "Has the pain spread to your arm, jaw, or back? And on a scale of 1-10, how would you rate it right now?";
    }
    if (lower.includes("breathing") || lower.includes("breath")) {
      return "Are you able to speak in full sentences, or do you need to pause for breath? Has this come on suddenly or gradually?";
    }
    return "How long has this been going on, and has it gotten worse recently?";
  }

  if (urgency === "Medium") {
    if (lower.includes("fever")) {
      return "Do you know your temperature, and have you noticed any other symptoms like chills, body aches, or a rash?";
    }
    if (lower.includes("vomit") || lower.includes("nausea")) {
      return "How many times have you vomited, and are you able to keep any fluids down?";
    }
    if (lower.includes("headache") || lower.includes("migraine")) {
      return "Is this headache different from headaches you've had before? Any sensitivity to light or sound?";
    }
    return "How long have you been feeling this way, and is it getting better, worse, or staying the same?";
  }

  return "How long have you had these symptoms, and is there anything that makes them better or worse?";
};

const getEmpathyResponse = (symptoms, urgency) => {
  const lower = symptoms.toLowerCase();

  // Opening — always empathetic
  const openings = [
    "I'm really sorry to hear you're not feeling well. 💙",
    "Thank you for reaching out — I'm here to help you. 💙",
    "I can hear that you're going through something difficult right now. 💙",
    "I'm so sorry you're feeling this way. You did the right thing by seeking help. 💙",
  ];
  const opening = openings[Math.floor(Math.random() * openings.length)];

  // First aid advice based on symptoms
  let firstAid = "";
  let emotionalSupport = "";

  if (urgency === "High") {
    if (lower.includes("chest pain") || lower.includes("heart")) {
      firstAid = `🚨 **This sounds serious and needs immediate attention.**\n\nWhile you wait for help:\n• Sit or lie down in a comfortable position\n• Loosen any tight clothing\n• If you have aspirin and are not allergic, chew one tablet\n• Try to stay calm and breathe slowly\n• Call emergency services (911) or have someone drive you to the hospital immediately`;
      emotionalSupport =
        "Please don't try to drive yourself. You are important and getting you the right care quickly is our priority.";
    } else if (lower.includes("breathing") || lower.includes("breath")) {
      firstAid = `🚨 **Difficulty breathing requires immediate attention.**\n\nRight now:\n• Sit upright — don't lie flat\n• Try to stay calm, as panic can make breathing harder\n• Open a window for fresh air if possible\n• If you have an inhaler, use it now\n• Call emergency services immediately`;
      emotionalSupport =
        "I know this is scary. Try to focus on slow, steady breaths. Help is coming.";
    } else if (lower.includes("bleeding")) {
      firstAid = `🚨 **For severe bleeding:**\n\n• Apply firm, direct pressure to the wound with a clean cloth\n• Keep pressing — do not remove the cloth even if it soaks through\n• Elevate the injured area above heart level if possible\n• Call emergency services immediately`;
      emotionalSupport =
        "Stay as calm as you can. You're doing the right thing by getting help.";
    } else {
      firstAid = `🚨 **Your symptoms suggest you need urgent medical attention.**\n\nWhile you prepare to come in:\n• Sit or lie down comfortably\n• Do not eat or drink anything until seen by a doctor\n• If symptoms worsen rapidly, call emergency services (911)\n• Have someone stay with you if possible`;
      emotionalSupport =
        "Please don't be alone right now. Your safety is the most important thing.";
    }
  } else if (urgency === "Medium") {
    if (lower.includes("fever")) {
      firstAid = `🌡️ **For fever:**\n\n• Rest as much as possible — your body needs energy to fight infection\n• Drink plenty of fluids (water, clear broths, herbal tea)\n• You can take paracetamol or ibuprofen to reduce fever (follow dosage instructions)\n• Use a cool damp cloth on your forehead\n• Wear light clothing and keep the room well ventilated\n• Monitor your temperature every few hours`;
      emotionalSupport =
        "Fevers are your body's way of fighting off infection — you're stronger than you think. 💪";
    } else if (lower.includes("vomit") || lower.includes("nausea")) {
      firstAid = `🤢 **For nausea and vomiting:**\n\n• Sip small amounts of clear fluids (water, ginger ale, electrolyte drinks)\n• Avoid solid food until vomiting stops\n• Rest in a position that feels comfortable\n• Avoid strong smells or bright screens\n• Try ginger — it's a natural anti-nausea remedy\n• If vomiting persists more than 24 hours, seek medical attention`;
      emotionalSupport =
        "Take it one moment at a time. Your body is working hard and rest is the best medicine right now.";
    } else if (lower.includes("headache") || lower.includes("migraine")) {
      firstAid = `🤕 **For headache/migraine:**\n\n• Lie down in a quiet, dark room\n• Apply a cold or warm compress to your forehead or neck\n• Stay hydrated — dehydration often causes headaches\n• You can take over-the-counter pain relief (paracetamol/ibuprofen)\n• Avoid screens and bright lights\n• Try gentle neck stretches`;
      emotionalSupport =
        "Headaches can be really draining. Be gentle with yourself and rest as much as you can.";
    } else if (lower.includes("dizziness") || lower.includes("dizzy")) {
      firstAid = `😵 **For dizziness:**\n\n• Sit or lie down immediately to prevent falling\n• Move slowly when changing positions\n• Drink water — dizziness is often caused by dehydration\n• Avoid sudden head movements\n• Eat something light if you haven't eaten recently\n• Do not drive until the dizziness completely passes`;
      emotionalSupport =
        "Dizziness can be unsettling but it often passes with rest and hydration. Take your time.";
    } else if (lower.includes("cough") || lower.includes("throat")) {
      firstAid = `😷 **For cough/sore throat:**\n\n• Drink warm liquids (honey and lemon tea is especially soothing)\n• Gargle with warm salt water\n• Use throat lozenges for relief\n• Inhale steam from a bowl of hot water (carefully)\n• Rest your voice as much as possible\n• Keep your environment humidified`;
      emotionalSupport =
        "Being sick is exhausting. Make sure you're getting enough rest — it truly is the best healer.";
    } else {
      firstAid = `💊 **General advice while you wait:**\n\n• Rest and avoid strenuous activity\n• Stay well hydrated with water or clear fluids\n• Monitor your symptoms and note if they worsen\n• Avoid self-medicating with multiple drugs\n• Keep warm and comfortable`;
      emotionalSupport =
        "Your body is telling you it needs care right now. Listen to it and be kind to yourself.";
    }
  } else {
    firstAid = `💙 **General wellness advice:**\n\n• Rest and give your body time to recover\n• Stay hydrated — drink at least 8 glasses of water\n• Eat light, nutritious meals\n• Monitor your symptoms over the next few hours\n• Avoid stress and get adequate sleep`;
    emotionalSupport =
      "It's good that you're paying attention to how you're feeling. Taking care of yourself matters.";
  }

  return { opening, firstAid, emotionalSupport };
};

const analyzeSymptoms = (symptoms) => {
  const urgency = getUrgency(symptoms);
  const possibleConditions = getPossibleConditions(symptoms);
  const { opening, firstAid, emotionalSupport } = getEmpathyResponse(
    symptoms,
    urgency,
  );

  const urgencyMessages = {
    High: "Your symptoms suggest this may be a medical emergency requiring immediate attention.",
    Medium: "Your symptoms suggest you should be seen by a doctor fairly soon.",
    Low: "Your symptoms appear to be non-critical but still deserve medical attention.",
  };

  const recommendedActions = {
    High: [
      "Call emergency services if symptoms worsen",
      "Come to the clinic immediately",
      "Do not be alone",
    ],
    Medium: [
      "Visit the clinic today",
      "Monitor symptoms closely",
      "Rest and stay hydrated",
    ],
    Low: [
      "Schedule a consultation",
      "Monitor symptoms",
      "Rest and stay hydrated",
    ],
  };

  return {
    summary: symptoms,
    urgency,
    urgencyReason: urgencyMessages[urgency],
    possibleConditions,
    recommendedActions: recommendedActions[urgency],
    empathyResponse: { opening, firstAid, emotionalSupport },
  };
};
module.exports = { analyzeSymptoms, getFollowUpQuestion };
