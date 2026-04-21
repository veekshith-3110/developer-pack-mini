import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    location: string;
    graduationDate: string;
    gpa?: string;
  }>;
  skills: string[];
  certifications: string[];
  jobTitle: string;
  jobDescription?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, resumeData } = body as { action: "score" | "optimize" | "suggest"; resumeData: ResumeData };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const resumeText = buildResumeText(resumeData);

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "score") {
      systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst. Analyze resumes and return ONLY valid JSON with no markdown or code blocks. Be precise and actionable.`;
      userPrompt = `Analyze this resume for ATS compatibility and return a score. Target role: ${resumeData.jobTitle}.
${resumeData.jobDescription ? `Job Description:\n${resumeData.jobDescription.slice(0, 1500)}\n` : ""}

RESUME:
${resumeText}

Return this exact JSON:
{
  "atsScore": 85,
  "breakdown": {
    "keywordsMatch": 80,
    "formatting": 90,
    "quantifiedAchievements": 75,
    "skillsRelevance": 85,
    "summaryQuality": 80
  },
  "improvements": [
    "Add more quantified achievements with specific numbers",
    "Include relevant keywords from the job description"
  ],
  "strongPoints": [
    "Clear contact information",
    "Well-structured experience section"
  ],
  "missingKeywords": ["keyword1", "keyword2"],
  "overallFeedback": "Brief 2-sentence overall assessment"
}

Rules:
- atsScore should be realistic (60-98 range)
- Give actionable improvements
- Focus on ATS parsing ability, keyword density, formatting`;

    } else if (action === "optimize") {
      systemPrompt = `You are an expert resume writer specializing in ATS-optimized resumes. Return ONLY valid JSON. Make the resume score 85+ on ATS systems.`;
      userPrompt = `Optimize this resume to achieve an ATS score of 85+. Target role: ${resumeData.jobTitle}.
${resumeData.jobDescription ? `Job Description:\n${resumeData.jobDescription.slice(0, 1500)}\n` : ""}

CURRENT RESUME DATA (JSON):
${JSON.stringify(resumeData, null, 2).slice(0, 4000)}

Return the OPTIMIZED resume data in EXACTLY this JSON structure:
{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "ATS-optimized professional summary with relevant keywords",
  "experience": [
    {
      "title": "",
      "company": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "bullets": ["• Achievement with quantified metric", "• Another achievement"]
    }
  ],
  "education": [
    { "degree": "", "school": "", "location": "", "graduationDate": "", "gpa": "" }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1"],
  "jobTitle": "${resumeData.jobTitle}"
}

Optimization rules:
- Keep all personal info unchanged
- Enhance summary with 3-4 sentences including job title keywords
- Add quantified achievements (numbers, %, $) to experience bullets
- Start bullets with strong action verbs
- Expand skills list with relevant keywords from the job description
- Keep content truthful but impactful`;

    } else if (action === "suggest") {
      systemPrompt = `You are an expert career coach. Provide actionable resume writing suggestions. Return ONLY valid JSON.`;
      userPrompt = `Give specific suggestions to improve this resume section by section. Target role: ${resumeData.jobTitle}.

RESUME:
${resumeText}

Return JSON:
{
  "summarySuggestion": "Rewrite suggestion for summary",
  "experienceSuggestions": ["Specific improvement for experience 1", "Add metrics to..."],
  "skillsSuggestions": ["Add these skills: ...", "Remove generic skills like..."],
  "generalTips": ["Tip 1", "Tip 2", "Tip 3"]
}`;
    }

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

    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw content:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ats-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildResumeText(r: ResumeData): string {
  const lines: string[] = [];
  lines.push(`Name: ${r.personalInfo.name}`);
  lines.push(`Email: ${r.personalInfo.email} | Phone: ${r.personalInfo.phone} | Location: ${r.personalInfo.location}`);
  if (r.personalInfo.linkedin) lines.push(`LinkedIn: ${r.personalInfo.linkedin}`);
  lines.push(`\nSUMMARY:\n${r.summary}`);
  lines.push(`\nEXPERIENCE:`);
  r.experience.forEach(e => {
    lines.push(`${e.title} at ${e.company} (${e.startDate} - ${e.endDate})`);
    e.bullets.forEach(b => lines.push(`  ${b}`));
  });
  lines.push(`\nEDUCATION:`);
  r.education.forEach(e => {
    lines.push(`${e.degree} — ${e.school} (${e.graduationDate})${e.gpa ? ` GPA: ${e.gpa}` : ""}`);
  });
  lines.push(`\nSKILLS: ${r.skills.join(", ")}`);
  if (r.certifications.length > 0) lines.push(`CERTIFICATIONS: ${r.certifications.join(", ")}`);
  return lines.join("\n");
}
