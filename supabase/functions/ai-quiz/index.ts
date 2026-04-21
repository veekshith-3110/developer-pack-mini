import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

interface ExtractedTopics {
  topics: string[];
  summary: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      mode = "topic",           // "topic" | "syllabus"
      topic = "",
      subject = "",
      syllabusText = "",
      count = 10,
      difficulty = "medium",
      role = "student",
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const difficultyGuide = {
      easy: "straightforward, factual questions suitable for beginners",
      medium: "moderately challenging questions testing understanding",
      hard: "advanced, analytical questions requiring deep knowledge",
    }[difficulty as string] ?? "moderately challenging";

    const roleHint =
      role === "teacher"
        ? "Include questions suitable for exam papers with detailed explanations."
        : "Focus on practice questions to help students test and reinforce knowledge.";

    let prompt: string;

    if (mode === "syllabus" && syllabusText) {
      // Truncate syllabus to ~12000 chars to stay within token limits
      const truncated = syllabusText.slice(0, 12000);

      prompt = `You are an expert educator. Below is a student's syllabus/study material.

=== SYLLABUS CONTENT ===
${truncated}
=== END OF SYLLABUS ===

Your tasks:
1. Identify the ${count} most important and frequently-tested topics from this syllabus.
2. Generate exactly ${count} multiple-choice quiz questions — one per important topic — at "${difficulty}" difficulty.
   Difficulty guide: ${difficultyGuide}.
3. ${roleHint}

Return ONLY a valid JSON object (no markdown, no code fences) with this exact shape:
{
  "detectedTopics": ["Topic 1", "Topic 2", ...],
  "syllabySummary": "2-3 sentence summary of the syllabus",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this answer is correct.",
      "difficulty": "${difficulty}",
      "topic": "Topic name this question covers"
    }
  ]
}

Rules:
- "correct" is the zero-based index (0–3) of the correct answer
- All 4 options must be plausible
- Explanations should be 1–2 sentences
- Cover a broad range of topics from the syllabus
- Return exactly ${count} questions`;
    } else {
      // Standard topic-based quiz
      prompt = `You are an expert educator. Generate exactly ${count} multiple-choice quiz questions about "${topic}" in the subject area of "${subject || topic}".

Difficulty: ${difficulty} — ${difficultyGuide}.
${roleHint}

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why the answer is correct.",
    "difficulty": "${difficulty}",
    "topic": "${topic}"
  }
]

Rules:
- "correct" is the zero-based index of the correct option (0–3)
- Make all 4 options plausible
- Keep questions clear and unambiguous
- Explanations should be 1–2 sentences
- Vary question types: definition, application, comparison, analysis
- Return exactly ${count} questions`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 6000,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI usage limit reached. Please add credits.");
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const rawText: string = aiData.choices?.[0]?.message?.content || "";

    // Strip any markdown code fences
    const cleaned = rawText.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();

    let questions: QuizQuestion[];
    let detectedTopics: string[] = [];
    let syllabySummary = "";

    if (mode === "syllabus") {
      try {
        const parsed = JSON.parse(cleaned);
        questions = parsed.questions;
        detectedTopics = parsed.detectedTopics || [];
        syllabySummary = parsed.syllabySummary || "";
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Could not parse AI response");
        const parsed = JSON.parse(match[0]);
        questions = parsed.questions;
        detectedTopics = parsed.detectedTopics || [];
        syllabySummary = parsed.syllabySummary || "";
      }
    } else {
      try {
        questions = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (!match) throw new Error("Could not parse AI response as JSON");
        questions = JSON.parse(match[0]);
      }
    }

    return new Response(JSON.stringify({ questions, detectedTopics, syllabySummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
