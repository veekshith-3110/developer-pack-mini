import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResumeInput {
  fileName: string;
  text: string;
}

interface CandidateResult {
  fileName: string;
  extractedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  rank: number;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, jobTitle, resumes } = await req.json() as {
      jobDescription: string;
      jobTitle: string;
      resumes: ResumeInput[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build prompt for AI analysis
    const resumesSummary = resumes
      .map((r, i) => `--- RESUME ${i + 1}: ${r.fileName} ---\n${r.text.slice(0, 3000)}`)
      .join("\n\n");

    const systemPrompt = `You are an expert AI recruiter that analyzes resumes against job descriptions.
You must return ONLY valid JSON with no markdown, no code blocks, no extra text.
Be objective. Extract skills, experience, education. Do NOT include personal names or gender identifiers in your analysis.`;

    const userPrompt = `Analyze these resumes against the job description and return a JSON ranking.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

RESUMES:
${resumesSummary}

Return this exact JSON structure:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "candidates": [
    {
      "fileName": "exact filename from above",
      "extractedSkills": ["skill1", "skill2", ...],
      "missingSkills": ["skill3", ...],
      "matchScore": 85.5,
      "summary": "Brief 2-sentence professional assessment without mentioning name or gender"
    }
  ]
}

Rules:
- matchScore is 0-100 (percentage match)
- extractedSkills: skills found in the resume relevant to the JD
- missingSkills: required skills NOT found in the resume
- Summary must be bias-free (no name, no gender pronouns)
- Sort candidates by matchScore descending`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";

    // Strip markdown code blocks if present
    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { requiredSkills: string[]; candidates: CandidateResult[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw content:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add rank field
    const rankedCandidates = parsed.candidates
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    return new Response(
      JSON.stringify({ requiredSkills: parsed.requiredSkills, candidates: rankedCandidates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("screen-resumes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
