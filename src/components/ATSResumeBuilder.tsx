import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, FileText, Sparkles, Download, Printer, Plus, Trash2, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Zap, User, Briefcase,
  GraduationCap, Star, RefreshCw, Eye, EyeOff, Target
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface PersonalInfo {
  name: string; email: string; phone: string; location: string;
  linkedin: string; portfolio: string;
}
interface Experience {
  id: string; title: string; company: string; location: string;
  startDate: string; endDate: string; bullets: string[];
}
interface Education {
  id: string; degree: string; school: string; location: string;
  graduationDate: string; gpa: string;
}
interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  jobTitle: string;
  jobDescription: string;
}
interface ATSResult {
  atsScore: number;
  breakdown: { keywordsMatch: number; formatting: number; quantifiedAchievements: number; skillsRelevance: number; summaryQuality: number; };
  improvements: string[];
  strongPoints: string[];
  missingKeywords: string[];
  overallFeedback: string;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="hsl(260 15% 88%)" strokeWidth="8" />
        <circle cx="56" cy="56" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-black text-foreground">{score}</p>
        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">ATS Score</p>
      </div>
    </div>
  );
};

// ─── Mini Bar ─────────────────────────────────────────────────────────────────
const MiniBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${value}%` }} />
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, label, step }: { icon: React.ElementType; label: string; step: number }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
    <Icon size={15} className="text-primary" />
    <h3 className="font-bold text-foreground text-sm">{label}</h3>
  </div>
);

const uid = () => Math.random().toString(36).slice(2);

const EMPTY_EXP = (): Experience => ({ id: uid(), title: "", company: "", location: "", startDate: "", endDate: "", bullets: [""] });
const EMPTY_EDU = (): Education => ({ id: uid(), degree: "", school: "", location: "", graduationDate: "", gpa: "" });

const INPUT = "w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const TEXTAREA = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none";

// ─── Resume Preview (print-friendly) ─────────────────────────────────────────
const ResumePreview = ({ data }: { data: ResumeData }) => (
  <div id="resume-print" className="bg-white text-gray-900 p-8 font-sans text-sm leading-relaxed max-w-[794px] mx-auto shadow-2xl rounded-2xl print:shadow-none print:rounded-none print:p-6">
    {/* Header */}
    <div className="border-b-2 border-gray-800 pb-4 mb-4">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">{data.personalInfo.name || "Your Name"}</h1>
      <p className="text-base font-semibold text-gray-600 mb-2">{data.jobTitle || "Job Title"}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {data.personalInfo.email && <span>✉ {data.personalInfo.email}</span>}
        {data.personalInfo.phone && <span>📞 {data.personalInfo.phone}</span>}
        {data.personalInfo.location && <span>📍 {data.personalInfo.location}</span>}
        {data.personalInfo.linkedin && <span>🔗 {data.personalInfo.linkedin}</span>}
        {data.personalInfo.portfolio && <span>🌐 {data.personalInfo.portfolio}</span>}
      </div>
    </div>
    {/* Summary */}
    {data.summary && (
      <div className="mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5 border-b border-gray-200 pb-1">Professional Summary</h2>
        <p className="text-sm text-gray-800 leading-relaxed">{data.summary}</p>
      </div>
    )}
    {/* Experience */}
    {data.experience.some(e => e.title) && (
      <div className="mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">Work Experience</h2>
        {data.experience.filter(e => e.title).map(exp => (
          <div key={exp.id} className="mb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900">{exp.title}</p>
                <p className="text-gray-600 text-xs">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
              </div>
              <p className="text-xs text-gray-500 shrink-0 ml-2">{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}</p>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {exp.bullets.filter(b => b.trim()).map((b, i) => (
                <li key={i} className="text-sm text-gray-800 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-gray-400">{b.replace(/^•\s*/, "")}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )}
    {/* Education */}
    {data.education.some(e => e.degree) && (
      <div className="mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">Education</h2>
        {data.education.filter(e => e.degree).map(edu => (
          <div key={edu.id} className="flex justify-between items-start mb-1.5">
            <div>
              <p className="font-bold text-gray-900">{edu.degree}</p>
              <p className="text-xs text-gray-600">{edu.school}{edu.location ? ` · ${edu.location}` : ""}{edu.gpa ? ` | GPA: ${edu.gpa}` : ""}</p>
            </div>
            <p className="text-xs text-gray-500 shrink-0 ml-2">{edu.graduationDate}</p>
          </div>
        ))}
      </div>
    )}
    {/* Skills */}
    {data.skills.filter(s => s.trim()).length > 0 && (
      <div className="mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">Skills</h2>
        <p className="text-sm text-gray-800">{data.skills.filter(s => s.trim()).join(" • ")}</p>
      </div>
    )}
    {/* Certifications */}
    {data.certifications.filter(c => c.trim()).length > 0 && (
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">Certifications</h2>
        <ul className="space-y-0.5">
          {data.certifications.filter(c => c.trim()).map((c, i) => (
            <li key={i} className="text-sm text-gray-800 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-gray-400">{c}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const ATSResumeBuilder = ({ onBack }: { onBack: () => void }) => {
  const [resume, setResume] = useState<ResumeData>({
    personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" },
    summary: "",
    experience: [EMPTY_EXP()],
    education: [EMPTY_EDU()],
    skills: [""],
    certifications: [""],
    jobTitle: "",
    jobDescription: "",
  });

  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("personal");

  // ── Personal info ──
  const setPI = (k: keyof PersonalInfo, v: string) =>
    setResume(r => ({ ...r, personalInfo: { ...r.personalInfo, [k]: v } }));

  // ── Experience ──
  const addExp = () => setResume(r => ({ ...r, experience: [...r.experience, EMPTY_EXP()] }));
  const removeExp = (id: string) => setResume(r => ({ ...r, experience: r.experience.filter(e => e.id !== id) }));
  const setExp = (id: string, k: keyof Experience, v: string | string[]) =>
    setResume(r => ({ ...r, experience: r.experience.map(e => e.id === id ? { ...e, [k]: v } : e) }));
  const setExpBullet = (id: string, i: number, v: string) =>
    setResume(r => ({ ...r, experience: r.experience.map(e => e.id === id ? { ...e, bullets: e.bullets.map((b, bi) => bi === i ? v : b) } : e) }));
  const addBullet = (id: string) =>
    setResume(r => ({ ...r, experience: r.experience.map(e => e.id === id ? { ...e, bullets: [...e.bullets, ""] } : e) }));
  const removeBullet = (id: string, i: number) =>
    setResume(r => ({ ...r, experience: r.experience.map(e => e.id === id ? { ...e, bullets: e.bullets.filter((_, bi) => bi !== i) } : e) }));

  // ── Education ──
  const addEdu = () => setResume(r => ({ ...r, education: [...r.education, EMPTY_EDU()] }));
  const removeEdu = (id: string) => setResume(r => ({ ...r, education: r.education.filter(e => e.id !== id) }));
  const setEdu = (id: string, k: keyof Education, v: string) =>
    setResume(r => ({ ...r, education: r.education.map(e => e.id === id ? { ...e, [k]: v } : e) }));

  // ── Skills / Certs ──
  const setSkill = (i: number, v: string) => setResume(r => ({ ...r, skills: r.skills.map((s, si) => si === i ? v : s) }));
  const setCert = (i: number, v: string) => setResume(r => ({ ...r, certifications: r.certifications.map((c, ci) => ci === i ? v : c) }));

  // ── AI Score ──
  const handleScore = async () => {
    setError("");
    setScoring(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ats-resume", {
        body: { action: "score", resumeData: resume },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setAtsResult(data as ATSResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed. Please try again.");
    } finally {
      setScoring(false);
    }
  };

  // ── AI Optimize ──
  const handleOptimize = async () => {
    setError("");
    setOptimizing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ats-resume", {
        body: { action: "optimize", resumeData: resume },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      const optimized = data as ResumeData;
      setResume(r => ({
        ...optimized,
        personalInfo: r.personalInfo, // keep original personal info
        jobTitle: r.jobTitle,
        jobDescription: r.jobDescription,
        experience: (optimized.experience || r.experience).map((e, i) => ({ ...e, id: r.experience[i]?.id || uid() })),
        education: (optimized.education || r.education).map((e, i) => ({ ...e, id: r.education[i]?.id || uid() })),
      }));
      // Re-score after optimization
      setTimeout(() => handleScore(), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed. Please try again.");
    } finally {
      setOptimizing(false);
    }
  };

  // ── Print / Download ──
  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 400);
  };

  const toggle = (s: string) => setActiveSection(activeSection === s ? null : s);

  const scoreColor = !atsResult ? "" : atsResult.atsScore >= 80 ? "text-green-600" : atsResult.atsScore >= 60 ? "text-amber-500" : "text-destructive";

  return (
    <div className="min-h-screen bg-background ats-bg">
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #resume-print, #resume-print * { display: block !important; }
          #resume-print { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-card border-b border-border py-4 px-4 sticky top-0 z-20 backdrop-blur-sm bg-card/95">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} /> Dashboard
            </button>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <Target size={18} className="text-primary" />
              <span className="font-bold text-foreground text-sm">ATS Resume Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-border bg-secondary text-foreground hover:bg-accent transition-colors">
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Hide" : "Preview"}
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-border bg-secondary text-foreground hover:bg-accent transition-colors">
              <Printer size={13} /> Print / PDF
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl gradient-primary text-primary-foreground shadow hover:opacity-90 transition-opacity">
              <Download size={13} /> Download
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"}`}>

          {/* ── LEFT: Form ── */}
          <div className="space-y-4">

            {/* Target Role */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <SectionHeader icon={Target} label="Target Role" step={1} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title *</label>
                  <input className={INPUT} placeholder="e.g. Senior Software Engineer"
                    value={resume.jobTitle} onChange={e => setResume(r => ({ ...r, jobTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Description (optional, for better scoring)</label>
                  <textarea className={`${TEXTAREA} text-xs`} rows={2} placeholder="Paste job description for accurate ATS scoring..."
                    value={resume.jobDescription} onChange={e => setResume(r => ({ ...r, jobDescription: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => toggle("personal")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                  <User size={14} className="text-primary" />
                  <span className="font-bold text-foreground text-sm">Personal Information</span>
                </div>
                {activeSection === "personal" ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {activeSection === "personal" && (
                <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
                  {(["name", "email", "phone", "location", "linkedin", "portfolio"] as const).map(k => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1 capitalize">{k === "linkedin" ? "LinkedIn URL" : k === "portfolio" ? "Portfolio / GitHub" : k}</label>
                      <input className={INPUT} placeholder={k === "linkedin" ? "linkedin.com/in/you" : k === "portfolio" ? "github.com/you" : `Your ${k}`}
                        value={resume.personalInfo[k]} onChange={e => setPI(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => toggle("summary")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                  <FileText size={14} className="text-primary" />
                  <span className="font-bold text-foreground text-sm">Professional Summary</span>
                </div>
                {activeSection === "summary" ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {activeSection === "summary" && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <textarea className={TEXTAREA} rows={4}
                    placeholder="Write a compelling 3-4 sentence summary highlighting your expertise, years of experience, and key value proposition. Include relevant keywords for your target role."
                    value={resume.summary} onChange={e => setResume(r => ({ ...r, summary: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1.5">Tip: Include your job title, years of experience, and 2-3 key skills.</p>
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => toggle("experience")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
                  <Briefcase size={14} className="text-primary" />
                  <span className="font-bold text-foreground text-sm">Work Experience</span>
                </div>
                {activeSection === "experience" ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {activeSection === "experience" && (
                <div className="px-5 pb-5 border-t border-border pt-4 space-y-5">
                  {resume.experience.map((exp, ei) => (
                    <div key={exp.id} className="border border-border rounded-xl p-4 space-y-3 relative bg-secondary/30">
                      {resume.experience.length > 1 && (
                        <button onClick={() => removeExp(exp.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <p className="text-xs font-bold text-muted-foreground">Experience #{ei + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">Job Title *</label>
                          <input className={INPUT} placeholder="Software Engineer" value={exp.title} onChange={e => setExp(exp.id, "title", e.target.value)} /></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">Company *</label>
                          <input className={INPUT} placeholder="Google Inc." value={exp.company} onChange={e => setExp(exp.id, "company", e.target.value)} /></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                          <input className={INPUT} placeholder="New York, NY" value={exp.location} onChange={e => setExp(exp.id, "location", e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
                            <input className={INPUT} placeholder="Jan 2022" value={exp.startDate} onChange={e => setExp(exp.id, "startDate", e.target.value)} /></div>
                          <div><label className="block text-xs font-medium text-muted-foreground mb-1">End</label>
                            <input className={INPUT} placeholder="Present" value={exp.endDate} onChange={e => setExp(exp.id, "endDate", e.target.value)} /></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Achievements / Responsibilities</label>
                        <p className="text-[10px] text-muted-foreground mb-2">Use action verbs + quantify (e.g. "Increased revenue by 30%")</p>
                        {exp.bullets.map((b, bi) => (
                          <div key={bi} className="flex gap-2 mb-1.5">
                            <textarea className={`${TEXTAREA} flex-1 text-xs`} rows={2} placeholder="• Led a team of 5 engineers to deliver feature X, reducing load time by 40%"
                              value={b} onChange={e => setExpBullet(exp.id, bi, e.target.value)} />
                            {exp.bullets.length > 1 && (
                              <button onClick={() => removeBullet(exp.id, bi)} className="text-muted-foreground hover:text-destructive transition-colors self-start mt-1">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addBullet(exp.id)} className="text-xs text-primary flex items-center gap-1 hover:underline mt-1">
                          <Plus size={11} /> Add bullet point
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addExp} className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Experience
                  </button>
                </div>
              )}
            </div>

            {/* Education */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => toggle("education")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">5</span>
                  <GraduationCap size={14} className="text-primary" />
                  <span className="font-bold text-foreground text-sm">Education</span>
                </div>
                {activeSection === "education" ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {activeSection === "education" && (
                <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                  {resume.education.map((edu, i) => (
                    <div key={edu.id} className="border border-border rounded-xl p-4 space-y-3 bg-secondary/30 relative">
                      {resume.education.length > 1 && (
                        <button onClick={() => removeEdu(edu.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <p className="text-xs font-bold text-muted-foreground">Education #{i + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">Degree / Certificate</label>
                          <input className={INPUT} placeholder="B.S. Computer Science" value={edu.degree} onChange={e => setEdu(edu.id, "degree", e.target.value)} /></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">School / University</label>
                          <input className={INPUT} placeholder="MIT" value={edu.school} onChange={e => setEdu(edu.id, "school", e.target.value)} /></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                          <input className={INPUT} placeholder="Cambridge, MA" value={edu.location} onChange={e => setEdu(edu.id, "location", e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Graduation</label>
                            <input className={INPUT} placeholder="May 2023" value={edu.graduationDate} onChange={e => setEdu(edu.id, "graduationDate", e.target.value)} /></div>
                          <div><label className="block text-xs font-medium text-muted-foreground mb-1">GPA (optional)</label>
                            <input className={INPUT} placeholder="3.8/4.0" value={edu.gpa} onChange={e => setEdu(edu.id, "gpa", e.target.value)} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addEdu} className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Education
                  </button>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => toggle("skills")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">6</span>
                  <Star size={14} className="text-primary" />
                  <span className="font-bold text-foreground text-sm">Skills & Certifications</span>
                </div>
                {activeSection === "skills" ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {activeSection === "skills" && (
                <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">Technical & Soft Skills</label>
                    <p className="text-[10px] text-muted-foreground mb-2">Enter one skill per line. Include both technical and soft skills.</p>
                    {resume.skills.map((s, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5">
                        <input className={`${INPUT} flex-1`} placeholder={`Skill ${i + 1}`} value={s} onChange={e => setSkill(i, e.target.value)} />
                        {resume.skills.length > 1 && (
                          <button onClick={() => setResume(r => ({ ...r, skills: r.skills.filter((_, si) => si !== i) }))} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setResume(r => ({ ...r, skills: [...r.skills, ""] }))} className="text-xs text-primary flex items-center gap-1 hover:underline mt-1">
                      <Plus size={11} /> Add skill
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">Certifications</label>
                    {resume.certifications.map((c, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5">
                        <input className={`${INPUT} flex-1`} placeholder="e.g. AWS Certified Solutions Architect" value={c} onChange={e => setCert(i, e.target.value)} />
                        {resume.certifications.length > 1 && (
                          <button onClick={() => setResume(r => ({ ...r, certifications: r.certifications.filter((_, ci) => ci !== i) }))} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setResume(r => ({ ...r, certifications: [...r.certifications, ""] }))} className="text-xs text-primary flex items-center gap-1 hover:underline mt-1">
                      <Plus size={11} /> Add certification
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* AI Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={handleScore} disabled={!resume.jobTitle || scoring || optimizing}
                className="py-3.5 bg-card border-2 border-primary/30 text-primary rounded-2xl font-bold text-sm hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                {scoring ? <><Loader2 size={16} className="animate-spin" /> Calculating…</> : <><Target size={16} /> Check ATS Score</>}
              </button>
              <button onClick={handleOptimize} disabled={!resume.jobTitle || scoring || optimizing}
                className="py-3.5 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all">
                {optimizing ? <><Loader2 size={16} className="animate-spin" /> AI Optimizing…</> : <><Sparkles size={16} /> AI Optimize (80+ ATS)</>}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Fill in Job Title to enable AI features</p>

            {/* ATS Score Panel */}
            {atsResult && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-fade-in">
                <div className="flex items-center gap-5 flex-wrap">
                  <ScoreRing score={atsResult.atsScore} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xl font-black mb-0.5 ${scoreColor}`}>
                      {atsResult.atsScore >= 80 ? "🏆 Excellent ATS Score!" : atsResult.atsScore >= 60 ? "⚠️ Needs Improvement" : "❌ Low ATS Score"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{atsResult.overallFeedback}</p>
                    {atsResult.atsScore < 80 && (
                      <button onClick={handleOptimize} disabled={optimizing}
                        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors">
                        <RefreshCw size={11} /> Auto-fix with AI
                      </button>
                    )}
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Score Breakdown</p>
                  <MiniBar label="Keywords Match" value={atsResult.breakdown.keywordsMatch} />
                  <MiniBar label="Formatting" value={atsResult.breakdown.formatting} />
                  <MiniBar label="Quantified Achievements" value={atsResult.breakdown.quantifiedAchievements} />
                  <MiniBar label="Skills Relevance" value={atsResult.breakdown.skillsRelevance} />
                  <MiniBar label="Summary Quality" value={atsResult.breakdown.summaryQuality} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strong Points */}
                  {atsResult.strongPoints?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-green-500" /> Strong Points
                      </p>
                      <ul className="space-y-1">
                        {atsResult.strongPoints.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-green-500 shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Improvements */}
                  {atsResult.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                        <Zap size={11} className="text-amber-500" /> Improvements Needed
                      </p>
                      <ul className="space-y-1">
                        {atsResult.improvements.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-amber-500 shrink-0">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Missing Keywords */}
                {atsResult.missingKeywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                      <AlertCircle size={11} className="text-destructive" /> Missing Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {atsResult.missingKeywords.map(k => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Preview ── */}
          {showPreview && (
            <div className="lg:sticky lg:top-20 h-fit">
              <div className="bg-card border border-border rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><FileText size={12} className="text-primary" /> Resume Preview</p>
                  <div className="flex gap-2">
                    <button onClick={handlePrint} className="text-xs text-primary flex items-center gap-1 hover:underline"><Printer size={11} /> Print / PDF</button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto rounded-2xl border border-border max-h-[80vh] shadow-xl">
                <div className="scale-[0.85] origin-top-left w-[117%]">
                  <ResumePreview data={resume} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full-page hidden print version */}
        {!showPreview && (
          <div className="hidden">
            <ResumePreview data={resume} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSResumeBuilder;
