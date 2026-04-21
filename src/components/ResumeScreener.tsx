import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/pdfParser";
import {
  ArrowLeft, FileSearch, Upload, X, Loader2, Trophy,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Trash2, FileText
} from "lucide-react";

interface CandidateResult {
  fileName: string;
  extractedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  rank: number;
  summary: string;
}

interface ScreeningResult {
  requiredSkills: string[];
  candidates: CandidateResult[];
}

interface Props {
  onBack: () => void;
}

const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const medalBg = ["bg-yellow-50 border-yellow-200", "bg-slate-50 border-slate-200", "bg-amber-50 border-amber-200"];

const ScoreBar = ({ score }: { score: number }) => {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-destructive";
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
};

const CandidateCard = ({ candidate }: { candidate: CandidateResult }) => {
  const [open, setOpen] = useState(false);
  const rank = candidate.rank;
  const rankColor = rank <= 3 ? medalColors[rank - 1] : "text-muted-foreground";
  const rankBg = rank <= 3 ? medalBg[rank - 1] : "bg-card border-border";

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${rankBg}`}>
      <button
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-black/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {/* Rank badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${rankColor} border ${rank <= 3 ? "border-current/30 bg-current/10" : "border-border bg-muted"}`}>
          #{rank}
        </div>

        {/* File name */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{candidate.fileName}</p>
          <div className="flex items-center gap-2 mt-1">
            <ScoreBar score={candidate.matchScore} />
            <span className="text-xs font-bold text-foreground shrink-0">{candidate.matchScore.toFixed(1)}%</span>
          </div>
        </div>

        {/* Expand */}
        {open ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
          <p className="text-sm text-muted-foreground italic">{candidate.summary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-success" /> Matched Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.extractedSkills.length > 0 ? candidate.extractedSkills.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                    {s}
                  </span>
                )) : <span className="text-xs text-muted-foreground">None found</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <AlertCircle size={12} className="text-destructive" /> Missing Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.missingSkills.length > 0 ? candidate.missingSkills.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                    {s}
                  </span>
                )) : <span className="text-xs text-muted-foreground">No gaps — great match!</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResumeScreener = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const allowed = Array.from(newFiles).filter(f =>
      ["pdf", "docx", "doc", "txt"].includes(f.name.split(".").pop()?.toLowerCase() ?? "")
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...allowed.filter(f => !existing.has(f.name))];
    });
  };

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || files.length === 0) return;
    setError("");
    setResult(null);
    setExtracting(true);

    // Extract text from all files
    const resumes: { fileName: string; text: string }[] = [];
    for (const file of files) {
      try {
        const text = await extractTextFromFile(file);
        resumes.push({ fileName: file.name, text });
      } catch (e) {
        console.warn("Could not parse", file.name, e);
        resumes.push({ fileName: file.name, text: `[Could not extract text from ${file.name}]` });
      }
    }
    setExtracting(false);
    setAnalyzing(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("screen-resumes", {
        body: { jobTitle, jobDescription, resumes },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as ScreeningResult);

      // Persist to DB
      if (user) {
        const { data: screening } = await supabase.database
          .from("resume_screenings")
          .insert([{
            user_id: user.id,
            job_title: jobTitle,
            job_description: jobDescription,
            required_skills: data.requiredSkills ?? [],
          }])
          .select("id")
          .single();

        if (screening?.id) {
          await supabase.database.from("resume_candidates").insert(
            (data as ScreeningResult).candidates.map(c => ({
              screening_id: screening.id,
              file_name: c.fileName,
              extracted_skills: c.extractedSkills,
              missing_skills: c.missingSkills,
              match_score: c.matchScore,
              rank: c.rank,
              summary: c.summary,
            }))
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFiles([]);
    setJobTitle("");
    setJobDescription("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-background screener-bg">
      {/* Header */}
      <header className="bg-card border-b border-border py-4 px-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <FileSearch size={18} className="text-foreground" />
            <span className="font-bold text-foreground text-sm">AI Resume Screener</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Input Section */}
        {!result && (
          <div className="space-y-5 animate-fade-in">
            {/* Step 1 – Job Details */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-bold text-foreground text-sm">Job Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title</label>
                  <input
                    type="text"
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. Senior Software Engineer"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Description</label>
                  <textarea
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={6}
                    placeholder="Paste the full job description here including required skills, experience, responsibilities..."
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 2 – Upload Resumes */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-bold text-foreground text-sm">Upload Resumes</h3>
                <span className="text-xs text-muted-foreground">(PDF, DOCX, TXT)</span>
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={28} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">Drop resumes here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports PDF, DOCX, DOC, TXT · Multiple files allowed</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map(f => (
                    <div key={f.name} className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-2.5 border border-border">
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => removeFile(f.name)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!jobDescription.trim() || files.length === 0 || extracting || analyzing}
              className="w-full py-4 gradient-primary text-primary-foreground rounded-2xl font-bold text-base hover-lift disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-xl"
            >
              {(extracting || analyzing) ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {extracting ? "Extracting text from resumes…" : "AI is analyzing candidates…"}
                </>
              ) : (
                <>
                  <FileSearch size={20} /> Analyze & Rank Candidates
                </>
              )}
            </button>
            {(!jobDescription.trim() || files.length === 0) && (
              <p className="text-center text-xs text-muted-foreground">
                Add a job description and at least one resume to continue.
              </p>
            )}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-5 animate-fade-in">
            {/* Summary */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Trophy size={20} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Analysis Complete</p>
                  <p className="text-xs text-muted-foreground">
                    {result.candidates.length} candidate{result.candidates.length !== 1 ? "s" : ""} ranked · {result.requiredSkills.length} required skills identified
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors border border-border rounded-xl px-3 py-2"
              >
                <Trash2 size={13} /> New Screening
              </button>
            </div>

            {/* Required Skills */}
            {result.requiredSkills.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-foreground mb-3">Required Skills from JD</p>
                <div className="flex flex-wrap gap-2">
                  {result.requiredSkills.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ranked Candidates */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground px-1">Ranked Candidates</h3>
              {result.candidates.map(c => (
                <CandidateCard key={c.fileName} candidate={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeScreener;
