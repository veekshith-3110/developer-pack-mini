import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractTextFromFile } from "@/lib/pdfParser";
import { generateLocalQuiz, generateSyllabusQuiz, generateImportantQuestions, type ImportantStudyQuestion } from "@/lib/quizQuestionBank";
import {
  ArrowLeft, Brain, Sparkles, ChevronRight, ChevronLeft, Trophy,
  RotateCcw, BookOpen, Zap, Target, Clock, CheckCircle2, XCircle,
  Download, Lightbulb, GraduationCap, Star, Upload, FileText,
  X, Hash, Layers, AlertCircle, Printer,
} from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

type Screen = "setup" | "analyzing" | "generating" | "quiz" | "results" | "important";
type Difficulty = "easy" | "medium" | "hard";
type QuizMode = "topic" | "syllabus";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "History",
  "Geography", "Computer Science", "Economics", "Literature", "Psychology",
  "Engineering", "Medicine", "Law", "Philosophy", "Art & Design",
];

const QUESTION_COUNTS = [5, 10, 15, 20];

const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string; border: string }> = {
  easy: { label: "Easy", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
  medium: { label: "Medium", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  hard: { label: "Hard", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

const scoreGrade = (pct: number) => {
  if (pct >= 90) return { grade: "A+", msg: "Outstanding! 🏆", color: "text-success" };
  if (pct >= 80) return { grade: "A", msg: "Excellent work! 🌟", color: "text-success" };
  if (pct >= 70) return { grade: "B", msg: "Great job! 👍", color: "text-primary" };
  if (pct >= 60) return { grade: "C", msg: "Good effort! 📚", color: "text-warning" };
  if (pct >= 50) return { grade: "D", msg: "Keep practicing! 💪", color: "text-warning" };
  return { grade: "F", msg: "Don't give up! 🔄", color: "text-destructive" };
};

const FloatingOrb = ({ className }: { className: string }) => (
  <div className={`absolute rounded-full opacity-[0.07] blur-3xl pointer-events-none ${className}`} />
);

interface Props { onBack: () => void; onViewHistory: () => void; }

const AIQuizGenerator = ({ onBack, onViewHistory }: Props) => {
  const { user, role } = useAuth();
  const quizStartTimeRef = useRef<number>(Date.now());

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [quizMode, setQuizMode] = useState<QuizMode>("topic");

  // ── Topic mode state ───────────────────────────────────────────────────────
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");

  // ── Syllabus mode state ────────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [detectedTopics, setDetectedTopics] = useState<string[]>([]);
  const [syllabySummary, setSyllabySummary] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Important questions state ──────────────────────────────────────────────
  const [importantQuestions, setImportantQuestions] = useState<ImportantStudyQuestion[]>([]);
  const [importantTopics, setImportantTopics] = useState<string[]>([]);
  const [importantSummary, setImportantSummary] = useState("");

  // ── Shared settings ────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);

  // ── Quiz state ─────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  // ── Auto-save quiz attempt when results screen is shown ──────────────────
  const attemptSavedRef = useRef(false);
  useEffect(() => {
    if (screen !== "results" || !user || questions.length === 0 || attemptSavedRef.current) return;
    attemptSavedRef.current = true;
    const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
    const pct = Math.round((correct / questions.length) * 100);
    const { grade } = scoreGrade(pct);
    const timeTaken = Math.round((Date.now() - quizStartTimeRef.current) / 1000);
    const label = quizMode === "syllabus" ? (detectedTopics[0] || "Syllabus Quiz") : topic;
    supabase.database.from("quiz_attempts").insert([{
      user_id: user.id,
      mode: quizMode,
      label,
      topic: quizMode === "topic" ? topic : null,
      subject: subject || null,
      difficulty,
      question_count: questions.length,
      correct_count: correct,
      score_pct: pct,
      grade,
      detected_topics: quizMode === "syllabus" ? detectedTopics : [],
      time_taken_seconds: timeTaken,
    }]).then(({ error }) => {
      if (!error) toast.success("Quiz saved to your history!");
    });
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { setTimerActive(false); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  // ── File handling ──────────────────────────────────────────────────────────
  const ACCEPTED = [".pdf", ".docx", ".doc", ".txt"];

  const processFiles = async (files: File[]) => {
    const valid = files.filter(f => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return ACCEPTED.includes(ext);
    });
    if (!valid.length) { toast.error("Please upload PDF, DOCX, DOC, or TXT files"); return; }

    setUploadedFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
    setExtracting(true);
    try {
      const texts = await Promise.all(valid.map(f => extractTextFromFile(f)));
      setExtractedText(prev => (prev + "\n\n" + texts.join("\n\n")).trim());
      toast.success(`${valid.length} file${valid.length > 1 ? "s" : ""} processed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setExtracting(false);
    }
  };

  const removeFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
    // Note: we don't re-extract; just clear all if no files remain
    if (uploadedFiles.length <= 1) setExtractedText("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const generateQuiz = async () => {
    if (quizMode === "topic" && !topic.trim()) { toast.error("Please enter a topic"); return; }
    if (quizMode === "syllabus" && !extractedText.trim()) { toast.error("Please upload at least one syllabus file"); return; }

    setScreen(quizMode === "syllabus" ? "analyzing" : "generating");
    try {
      // Simulate a brief loading delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      let data: { questions: QuizQuestion[]; detectedTopics?: string[]; syllabySummary?: string };

      if (quizMode === "syllabus") {
        data = generateSyllabusQuiz(extractedText, difficulty, count);
      } else {
        data = generateLocalQuiz(topic.trim(), subject, difficulty, count);
      }

      if (!data?.questions?.length) throw new Error("No questions returned");

      setQuestions(data.questions);
      if (data.detectedTopics?.length) setDetectedTopics(data.detectedTopics);
      if (data.syllabySummary) setSyllabySummary(data.syllabySummary);

      setAnswers(Array.from({ length: data.questions.length }, () => null));
      setCurrent(0); setSelected(null); setShowExplanation(false);
      setTimeLeft(data.questions.length * 30);
      setTimerActive(true);
      quizStartTimeRef.current = Date.now();
      attemptSavedRef.current = false;
      setScreen("quiz");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate quiz");
      setScreen("setup");
    }
  };

  // ── Quiz actions ───────────────────────────────────────────────────────────
  const selectAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const updated = [...answers]; updated[current] = idx; setAnswers(updated);
    setShowExplanation(true);
  };

  const goNext = () => {
    if (current + 1 >= questions.length) { setTimerActive(false); setScreen("results"); }
    else { setCurrent(c => c + 1); setSelected(answers[current + 1]); setShowExplanation(answers[current + 1] !== null); }
  };

  const goPrev = () => {
    if (current > 0) { setCurrent(c => c - 1); setSelected(answers[current - 1]); setShowExplanation(answers[current - 1] !== null); }
  };

  const resetAll = () => {
    setScreen("setup"); setQuestions([]); setAnswers([]); setCurrent(0);
    setSelected(null); setShowExplanation(false);
    setTopic(""); setSubject(""); setUploadedFiles([]); setExtractedText("");
    setDetectedTopics([]); setSyllabySummary("");
  };

  const retakeQuiz = () => {
    setAnswers(Array.from({ length: questions.length }, () => null));
    setCurrent(0); setSelected(null); setShowExplanation(false);
    setTimeLeft(questions.length * 30); setTimerActive(true);
    quizStartTimeRef.current = Date.now();
    setScreen("quiz");
  };

  const correctCount = answers.filter((a, i) => a === questions[i]?.correct).length;
  const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const quizLabel = quizMode === "syllabus" ? (detectedTopics[0] || "Syllabus Quiz") : topic;

  const downloadResults = () => {
    const lines = [
      `Quiz Results — ${quizLabel}`,
      `Difficulty: ${difficulty} | Score: ${correctCount}/${questions.length} (${scorePct}%)`,
      "=".repeat(60), "",
    ];
    questions.forEach((q, i) => {
      lines.push(`Q${i + 1}. [${q.topic}] ${q.question}`);
      q.options.forEach((opt, oi) => {
        const mk = oi === q.correct ? "✓" : oi === answers[i] && answers[i] !== q.correct ? "✗" : " ";
        lines.push(`  ${mk} ${String.fromCharCode(65 + oi)}. ${opt}`);
      });
      lines.push(`   → ${q.explanation}`, "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `quiz-${quizLabel.replace(/\s+/g, "-")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "setup") return (
    <div className="min-h-screen bg-background relative overflow-x-hidden" style={{
      backgroundImage: "radial-gradient(ellipse 70% 50% at 30% -5%, hsl(268 70% 45% / 0.11) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(300 50% 50% / 0.08) 0%, transparent 55%), radial-gradient(hsl(268 70% 45% / 0.03) 1px, transparent 1px)",
      backgroundSize: "100% 100%, 100% 100%, 22px 22px",
      backgroundColor: "hsl(var(--background))",
    }}>
      <FloatingOrb className="w-[32rem] h-[32rem] bg-primary top-[-14rem] right-[-10rem]" />
      <FloatingOrb className="w-80 h-80 bg-primary/60 bottom-10 left-[-8rem]" />

      {/* Header */}
      <header className="gradient-primary py-5 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px,transparent 1px),linear-gradient(90deg,hsl(0 0% 100%) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="max-w-3xl mx-auto relative z-10 flex items-center gap-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20">
            <ArrowLeft size={16} className="text-primary-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
              <Brain size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>AI Quiz Generator</h1>
              <p className="text-primary-foreground/60 text-xs">Powered by Gemini AI · For Students & Teachers</p>
            </div>
          </div>
          <button onClick={onViewHistory} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20 text-primary-foreground text-xs font-bold">
            <Star size={13} /> History
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
            <Sparkles size={12} /> AI-Powered • Instant • Personalized
          </div>
          <h2 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Test Your Knowledge</h2>
          <p className="text-muted-foreground text-sm">
            {role === "teacher" ? "Generate exam-ready question papers — from syllabus files or any topic." : "Study smarter: upload your syllabus or type a topic to get a custom quiz."}
          </p>
        </div>

        {/* ── MODE SELECTOR ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Topic Mode */}
          <button onClick={() => setQuizMode("topic")} className={`group relative rounded-3xl p-6 border-2 text-left transition-all duration-200 overflow-hidden ${quizMode === "topic" ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
            {quizMode === "topic" && (
              <div className="absolute inset-0 opacity-100 transition-opacity" style={{ background: "radial-gradient(ellipse at 80% 20%, hsl(268 70% 45% / 0.08) 0%, transparent 60%)" }} />
            )}
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow transition-transform group-hover:scale-105 ${quizMode === "topic" ? "gradient-primary" : "bg-secondary border border-border"}`}>
                <Hash size={22} className={quizMode === "topic" ? "text-primary-foreground" : "text-muted-foreground"} />
              </div>
              <h3 className={`font-bold text-sm mb-1 ${quizMode === "topic" ? "text-primary" : "text-foreground"}`}>Topic Quiz</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Type any topic — AI generates a focused quiz on it instantly.</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {["Any Subject", "Instant", "Focused"].map(t => (
                  <span key={t} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${quizMode === "topic" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground border border-border"}`}>{t}</span>
                ))}
              </div>
            </div>
          </button>

          {/* Syllabus Mode */}
          <button onClick={() => setQuizMode("syllabus")} className={`group relative rounded-3xl p-6 border-2 text-left transition-all duration-200 overflow-hidden ${quizMode === "syllabus" ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
            {quizMode === "syllabus" && (
              <div className="absolute inset-0 opacity-100 transition-opacity" style={{ background: "radial-gradient(ellipse at 80% 20%, hsl(268 70% 45% / 0.08) 0%, transparent 60%)" }} />
            )}
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow transition-transform group-hover:scale-105 ${quizMode === "syllabus" ? "gradient-primary" : "bg-secondary border border-border"}`}>
                <Upload size={22} className={quizMode === "syllabus" ? "text-primary-foreground" : "text-muted-foreground"} />
              </div>
              <h3 className={`font-bold text-sm mb-1 ${quizMode === "syllabus" ? "text-primary" : "text-foreground"}`}>Syllabus Upload</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Upload your syllabus — AI extracts key topics and builds a tailored quiz.</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {["PDF/DOCX", "Smart Extract", "Exam-Ready"].map(t => (
                  <span key={t} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${quizMode === "syllabus" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground border border-border"}`}>{t}</span>
                ))}
              </div>
            </div>
          </button>
        </div>

        {/* ── CONTENT AREA ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left column — mode-specific */}
          <div className="space-y-5">

            {/* ── TOPIC MODE ─────────────────────────────────────────── */}
            {quizMode === "topic" && (
              <>
                <div className="glass-card rounded-3xl p-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Quiz Topic *</label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && generateQuiz()}
                    placeholder="e.g., Photosynthesis, World War II, Calculus…"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="glass-card rounded-3xl p-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Subject Area</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SUBJECTS.slice(0, 9).map(s => (
                      <button key={s} onClick={() => setSubject(s === subject ? "" : s)}
                        className={`text-[11px] font-semibold px-2 py-2 rounded-xl border-2 transition-all ${subject === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {s}
                      </button>
                    ))}
                    <select value={subject} onChange={e => setSubject(e.target.value)}
                      className="col-span-3 text-xs px-3 py-2 rounded-xl border-2 border-dashed border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">More subjects…</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── SYLLABUS MODE ─────────────────────────────────────── */}
            {quizMode === "syllabus" && (
              <div className="glass-card rounded-3xl p-6 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload Syllabus Files *</label>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                >
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.txt" className="hidden"
                    onChange={e => processFiles(Array.from(e.target.files || []))} />
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all ${isDragging ? "gradient-primary" : "bg-secondary border border-border"}`}>
                    {extracting
                      ? <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      : <Upload size={24} className={isDragging ? "text-primary-foreground" : "text-muted-foreground"} />
                    }
                  </div>
                  {extracting ? (
                    <p className="text-sm font-semibold text-primary">Extracting text…</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-foreground mb-1">
                        {isDragging ? "Drop files here!" : "Drag & drop files here"}
                      </p>
                      <p className="text-xs text-muted-foreground">or click to browse</p>
                      <p className="text-[10px] text-muted-foreground mt-2">Supports PDF, DOCX, DOC, TXT</p>
                    </>
                  )}
                </div>

                {/* File list */}
                {uploadedFiles.length > 0 && (
                  <>
                    <div className="space-y-2">
                      {uploadedFiles.map(f => (
                        <div key={f.name} className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                            <FileText size={13} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button onClick={() => removeFile(f.name)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/20 transition-all">
                            <X size={11} className="text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 px-1 py-1">
                        <CheckCircle2 size={13} className="text-success" />
                        <span className="text-[11px] text-success font-semibold">{extractedText.length.toLocaleString()} characters extracted</span>
                      </div>
                    </div>

                    {/* View Important Questions button */}
                    <button
                      onClick={() => {
                        const result = generateImportantQuestions(extractedText);
                        setImportantQuestions(result.questions);
                        setImportantTopics(result.detectedTopics);
                        setImportantSummary(result.summary);
                        setScreen("important");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary font-bold text-xs hover:bg-primary/10 transition-all"
                    >
                      <Lightbulb size={14} /> View Important Questions to Study
                    </button>
                  </>
                )}

                {uploadedFiles.length === 0 && (
                  <div className="flex items-start gap-2 bg-muted/50 rounded-xl px-3 py-2.5">
                    <AlertCircle size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Upload your exam syllabus, study notes, or textbook chapters. AI will identify the most important topics and build targeted questions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column — shared settings */}
          <div className="space-y-5">
            {/* Difficulty */}
            <div className="glass-card rounded-3xl p-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
                  const cfg = difficultyConfig[d];
                  return (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all font-bold text-sm ${difficulty === d ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-border bg-card text-muted-foreground hover:border-primary/30"}`}>
                      {d === "easy" && <Zap size={16} />}
                      {d === "medium" && <Target size={16} />}
                      {d === "hard" && <Brain size={16} />}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count */}
            <div className="glass-card rounded-3xl p-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Number of Questions</label>
              <div className="grid grid-cols-4 gap-2">
                {QUESTION_COUNTS.map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`py-3 rounded-xl border-2 transition-all font-black text-lg ${count === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">~{count * 30}s estimated time</p>
            </div>

            {/* Generate Button */}
            <button onClick={generateQuiz}
              disabled={extracting || (quizMode === "syllabus" && !extractedText)}
              className="w-full py-4 gradient-primary text-primary-foreground rounded-2xl font-black text-base hover-lift shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
              <Sparkles size={18} />
              {quizMode === "syllabus" ? "Analyze & Generate Quiz" : "Generate Quiz with AI"}
              <ChevronRight size={18} />
            </button>

            {/* Important Questions from Topic Mode */}
            {quizMode === "topic" && topic.trim() && (
              <button
                onClick={() => {
                  // For topic mode, generate questions using the topic as document text
                  const searchText = `${topic} ${subject}`.trim();
                  const result = generateImportantQuestions(searchText);
                  setImportantQuestions(result.questions);
                  setImportantTopics(result.detectedTopics);
                  setImportantSummary(result.summary);
                  setScreen("important");
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 text-primary font-bold text-sm hover:bg-primary/10 transition-all"
              >
                <Lightbulb size={16} /> View Important Questions to Study
              </button>
            )}
          </div>
        </div>

        {/* Bottom info cards */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: Layers, label: "Smart Analysis", desc: quizMode === "syllabus" ? "Extracts key syllabus topics" : "AI picks best question types" },
            { icon: CheckCircle2, label: "Instant Feedback", desc: "See correct answers live" },
            { icon: Lightbulb, label: "Explanations", desc: "Learn from every answer" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card rounded-2xl p-4 text-center">
              <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icon size={15} className="text-primary-foreground" />
              </div>
              <p className="text-xs font-bold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORTANT QUESTIONS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "important") {
    const importanceColors = {
      high: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", label: "🔴 High Priority" },
      medium: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", label: "🟡 Medium Priority" },
      low: { bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "🟢 Good to Know" },
    };

    const handlePrint = () => {
      window.print();
    };

    const handleDownloadPDF = () => {
      // Generate a formatted text document for download
      const lines: string[] = [];
      lines.push("═══════════════════════════════════════════════════");
      lines.push("  IMPORTANT QUESTIONS TO STUDY");
      lines.push("═══════════════════════════════════════════════════");
      lines.push("");
      lines.push(importantSummary);
      lines.push("");
      lines.push(`Topics Covered: ${importantTopics.join(", ")}`);
      lines.push("");
      lines.push("───────────────────────────────────────────────────");
      lines.push("");

      importantQuestions.forEach((q, i) => {
        lines.push(`Q${i + 1}. [${q.importance.toUpperCase()}] [${q.difficulty.toUpperCase()}]`);
        lines.push(`    ${q.question}`);
        lines.push("");
        lines.push(`    Answer: ${q.answer}`);
        lines.push(`    Topic: ${q.topic} | Subject: ${q.subject}`);
        lines.push("");
        lines.push("───────────────────────────────────────────────────");
        lines.push("");
      });

      lines.push(`Total Questions: ${importantQuestions.length}`);
      lines.push(`Generated on: ${new Date().toLocaleDateString()}`);

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Important_Questions_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Questions downloaded!");
    };

    const highCount = importantQuestions.filter(q => q.importance === "high").length;
    const medCount = importantQuestions.filter(q => q.importance === "medium").length;
    const lowCount = importantQuestions.filter(q => q.importance === "low").length;

    return (
      <div className="min-h-screen bg-background print:bg-white" style={{
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -5%, hsl(268 70% 45% / 0.10) 0%, transparent 60%)",
        backgroundColor: "hsl(var(--background))",
      }}>
        {/* Header — hidden in print */}
        <div className="print:hidden gradient-primary py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen("setup")} className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20">
                <ArrowLeft size={16} className="text-primary-foreground" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground flex items-center gap-2">
                  <Lightbulb size={18} /> Important Questions to Study
                </h1>
                <p className="text-primary-foreground/60 text-xs">{importantQuestions.length} questions identified</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm font-bold hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20">
                <Printer size={14} /> Print
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm font-bold hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20">
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Print header — visible only in print */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-center">Important Questions to Study</h1>
            <p className="text-center text-sm text-gray-600 mt-1">{importantSummary}</p>
            <p className="text-center text-xs text-gray-400 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Summary card */}
          <div className="glass-card rounded-3xl p-6 mb-6 print:shadow-none print:border print:border-gray-200">
            <p className="text-sm text-foreground leading-relaxed print:text-gray-800">{importantSummary}</p>
            {importantTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {importantTopics.map(t => (
                  <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 print:bg-gray-100 print:text-gray-800 print:border-gray-300">{t}</span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-destructive/8 rounded-xl py-2 px-3 text-center">
                <p className="text-lg font-black text-destructive">{highCount}</p>
                <p className="text-[10px] text-muted-foreground">High Priority</p>
              </div>
              <div className="bg-warning/8 rounded-xl py-2 px-3 text-center">
                <p className="text-lg font-black text-warning">{medCount}</p>
                <p className="text-[10px] text-muted-foreground">Medium</p>
              </div>
              <div className="bg-success/8 rounded-xl py-2 px-3 text-center">
                <p className="text-lg font-black text-success">{lowCount}</p>
                <p className="text-[10px] text-muted-foreground">Good to Know</p>
              </div>
            </div>
          </div>

          {/* Questions list */}
          <div className="space-y-4">
            {importantQuestions.map((q) => {
              const imp = importanceColors[q.importance];
              const diff = difficultyConfig[q.difficulty];
              return (
                <div key={q.id} className={`glass-card rounded-2xl p-5 border-l-4 ${imp.border} print:shadow-none print:border print:border-gray-200 print:break-inside-avoid`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">Q{q.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${imp.bg} ${imp.text}`}>{imp.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${diff.bg} ${diff.color}`}>{diff.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{q.topic}</span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground mb-3 leading-relaxed print:text-gray-900">{q.question}</h3>

                  <div className="bg-success/5 border border-success/20 rounded-xl px-4 py-3 print:bg-gray-50 print:border-gray-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground leading-relaxed print:text-gray-800"><span className="font-bold text-success">Answer:</span> {q.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom actions — hidden in print */}
          <div className="print:hidden mt-8 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 text-primary font-bold text-sm hover:bg-primary/10 transition-all">
                <Printer size={16} /> Print Questions
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all">
                <Download size={16} /> Download as File
              </button>
            </div>
            <button onClick={() => setScreen("setup")} className="w-full flex items-center justify-center gap-2 py-3.5 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm hover-lift shadow-lg">
              <ArrowLeft size={16} /> Back to Quiz Setup
            </button>
            <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYZING / GENERATING SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  const isAnalyzing = screen === "analyzing";
  if (screen === "analyzing" || screen === "generating") return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" style={{
      backgroundImage: "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(268 70% 45% / 0.12) 0%, transparent 60%)",
      backgroundColor: "hsl(var(--background))",
    }}>
      <FloatingOrb className="w-96 h-96 bg-primary top-[-8rem] left-[-6rem] animate-float-slow" />
      <FloatingOrb className="w-72 h-72 bg-primary/60 bottom-[-4rem] right-[-4rem] animate-float-medium" />
      <div className="text-center relative z-10 space-y-6 px-4 max-w-sm">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-full gradient-primary flex items-center justify-center shadow-2xl mx-auto animate-pulse">
            {isAnalyzing ? <FileText size={50} className="text-primary-foreground" /> : <Brain size={52} className="text-primary-foreground" />}
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center">
            <Sparkles size={14} className="text-primary animate-spin" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isAnalyzing ? "Analyzing Your Syllabus…" : "Crafting Your Quiz…"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isAnalyzing
              ? <>Reading <span className="text-primary font-bold">{uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}</span>, extracting key topics &amp; building <span className="text-primary font-bold">{count} questions</span></>
              : <>Generating <span className="text-primary font-bold">{count} {difficulty}</span> questions on <span className="text-primary font-bold">"{topic}"</span></>
            }
          </p>
        </div>

        {/* Animated steps for syllabus mode */}
        {isAnalyzing && (
          <div className="space-y-2 text-left bg-card/60 rounded-2xl p-4 border border-border">
            {[
              { label: "Parsing document content", done: true },
              { label: "Identifying key topics", done: true },
              { label: "Building quiz questions", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs">
                {step.done
                  ? <CheckCircle2 size={14} className="text-success shrink-0" />
                  : <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                }
                <span className={step.done ? "text-foreground" : "text-primary font-semibold"}>{step.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{isAnalyzing ? "This may take 10–20 seconds" : "This usually takes 5–15 seconds"}</p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // QUIZ SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "quiz" && questions.length > 0) {
    const q = questions[current];
    const dcfg = difficultyConfig[q.difficulty];
    const progress = ((current + 1) / questions.length) * 100;
    const answered = answers.filter(a => a !== null).length;

    return (
      <div className="min-h-screen bg-background relative overflow-x-hidden" style={{
        backgroundImage: "radial-gradient(ellipse 60% 40% at 80% 0%, hsl(268 70% 45% / 0.10) 0%, transparent 55%), radial-gradient(hsl(268 70% 45% / 0.03) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 22px 22px",
        backgroundColor: "hsl(var(--background))",
      }}>
        <FloatingOrb className="w-72 h-72 bg-primary top-[-6rem] right-[-6rem]" />

        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setTimerActive(false); setScreen("setup"); }}
                  className="w-8 h-8 shrink-0 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-all">
                  <ArrowLeft size={14} className="text-foreground" />
                </button>
                <span className="text-sm font-bold text-foreground truncate">{quizLabel}</span>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${dcfg.bg} ${dcfg.color} ${dcfg.border}`}>{dcfg.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${timeLeft < 60 ? "text-destructive" : "text-muted-foreground"}`}>
                  <Clock size={14} /> {formatTime(timeLeft)}
                </div>
                <span className="text-xs text-muted-foreground font-medium">{current + 1}/{questions.length}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">

          {/* Topic badge (for syllabus mode) */}
          {quizMode === "syllabus" && q.topic && (
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-4 text-[11px] font-bold text-primary">
              <BookOpen size={11} /> {q.topic}
            </div>
          )}

          {/* Question card */}
          <div className="glass-card rounded-3xl p-7 mb-5 animate-fade-in">
            <div className="flex items-start gap-3 mb-2">
              <span className="shrink-0 w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xs font-black shadow">Q{current + 1}</span>
              <p className="text-foreground font-semibold text-base leading-relaxed">{q.question}</p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {q.options.map((opt, oi) => {
              const isCorrect = oi === q.correct;
              const isSelected = oi === selected;
              const revealed = selected !== null;
              let cls = "w-full text-left flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all font-medium text-sm ";
              if (!revealed) cls += "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
              else if (isCorrect) cls += "border-success/50 bg-success/10 text-success cursor-default";
              else if (isSelected) cls += "border-destructive/50 bg-destructive/10 text-destructive cursor-default";
              else cls += "border-border bg-card/50 text-muted-foreground cursor-default opacity-60";

              return (
                <button key={oi} onClick={() => selectAnswer(oi)} className={cls} disabled={revealed}>
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border-2 transition-all ${revealed && isCorrect ? "bg-success text-success-foreground border-success" :
                    revealed && isSelected ? "bg-destructive text-destructive-foreground border-destructive" :
                      "bg-secondary border-border text-muted-foreground"
                    }`}>
                    {revealed && isCorrect ? <CheckCircle2 size={14} /> :
                      revealed && isSelected ? <XCircle size={14} /> :
                        String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="glass-card rounded-2xl p-5 mb-6 border-l-4 border-primary animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} className="text-primary shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Explanation</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={goPrev} disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-secondary transition-all disabled:opacity-40">
              <ChevronLeft size={16} /> Previous
            </button>
            <div className="flex gap-1.5">
              {questions.map((_, i) => {
                const ans = answers[i];
                const right = ans !== null && ans === questions[i].correct;
                const wrong = ans !== null && ans !== questions[i].correct;
                return <button key={i} onClick={() => { setCurrent(i); setSelected(answers[i]); setShowExplanation(answers[i] !== null); }}
                  className={`h-2.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : right ? "w-2.5 bg-success" : wrong ? "w-2.5 bg-destructive" : "w-2.5 bg-border"}`} />;
              })}
            </div>
            {current + 1 < questions.length
              ? <button onClick={goNext} disabled={selected === null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold hover-lift shadow disabled:opacity-40">
                Next <ChevronRight size={16} />
              </button>
              : <button onClick={goNext} disabled={selected === null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold hover-lift shadow disabled:opacity-40">
                Finish <Trophy size={16} />
              </button>
            }
          </div>

          {answered >= 1 && (
            <div className="text-center mt-4">
              <button onClick={() => { setTimerActive(false); setScreen("results"); }} className="text-xs text-muted-foreground underline hover:text-foreground">
                Submit &amp; see results ({answered}/{questions.length} answered)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESULTS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "results") {
    const { grade, msg, color } = scoreGrade(scorePct);
    return (
      <div className="min-h-screen bg-background relative overflow-x-hidden" style={{
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -5%, hsl(268 70% 45% / 0.13) 0%, transparent 60%)",
        backgroundColor: "hsl(var(--background))",
      }}>
        <FloatingOrb className="w-96 h-96 bg-primary top-[-8rem] right-[-8rem] animate-float-slow" />
        <FloatingOrb className="w-72 h-72 bg-primary/60 bottom-10 left-[-6rem] animate-float-medium" />

        <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">

          {/* Score hero */}
          <div className="glass-card rounded-3xl p-8 text-center mb-6 relative overflow-hidden">
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <div className={`text-8xl font-black mb-1 ${color}`} style={{ fontFamily: "'Playfair Display', serif" }}>{grade}</div>
            <p className="text-2xl font-bold text-foreground mb-1">{msg}</p>
            <p className="text-muted-foreground text-sm mb-6">{quizLabel} · {difficultyConfig[difficulty].label}</p>

            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Score", value: `${scorePct}%`, icon: Star },
                { label: "Correct", value: `${correctCount}/${questions.length}`, icon: CheckCircle2 },
                { label: "Difficulty", value: difficultyConfig[difficulty].label, icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-secondary/60 rounded-2xl py-3 px-2">
                  <Icon size={16} className="mx-auto mb-1 text-primary" />
                  <p className="text-lg font-black text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all duration-1000" style={{ width: `${scorePct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{scorePct}% overall score</p>
          </div>

          {/* Detected topics (syllabus mode) */}
          {quizMode === "syllabus" && detectedTopics.length > 0 && (
            <div className="glass-card rounded-3xl p-5 mb-5">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                <Layers size={15} className="text-primary" /> Topics Covered From Your Syllabus
              </h3>
              {syllabySummary && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{syllabySummary}</p>}
              <div className="flex flex-wrap gap-2">
                {detectedTopics.map(t => (
                  <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={retakeQuiz} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 text-primary font-bold text-sm hover:bg-primary/10 transition-all">
              <RotateCcw size={16} /> Retake Quiz
            </button>
            <button onClick={downloadResults} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all">
              <Download size={16} /> Download Results
            </button>
            <button onClick={() => { setCurrent(0); setSelected(answers[0]); setShowExplanation(true); setScreen("quiz"); }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all">
              <BookOpen size={16} /> Review Answers
            </button>
            <button onClick={onViewHistory} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all">
              <Star size={16} className="text-warning" /> View History
            </button>
          </div>
          <button onClick={resetAll} className="w-full flex items-center justify-center gap-2 py-3.5 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm hover-lift shadow-lg mb-3">
            <Sparkles size={16} /> New Quiz
          </button>
          <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-border bg-card text-foreground font-bold text-sm hover:bg-secondary transition-all mb-6">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          {/* Quick review */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary" /> Quick Review
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const isRight = answers[i] === q.correct;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isRight ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                    <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 ${isRight ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                      {isRight ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">{q.topic}</p>
                      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{q.question}</p>
                      {!isRight && <p className="text-[10px] text-success mt-0.5">✓ {q.options[q.correct]}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AIQuizGenerator;
