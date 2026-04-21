import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Brain, Trophy, Target, Clock, CheckCircle2, XCircle,
  Sparkles, TrendingUp, BookOpen, Upload, Calendar, Filter,
  Trash2, BarChart3, Star, Zap, Award, Hash, Layers, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface QuizAttempt {
  id: string;
  mode: "topic" | "syllabus";
  label: string;
  topic: string | null;
  subject: string | null;
  difficulty: "easy" | "medium" | "hard";
  question_count: number;
  correct_count: number;
  score_pct: number;
  grade: string;
  detected_topics: string[];
  time_taken_seconds: number | null;
  created_at: string;
}

type FilterMode = "all" | "topic" | "syllabus";
type FilterDiff = "all" | "easy" | "medium" | "hard";

const gradeColor: Record<string, string> = {
  "A+": "text-success", A: "text-success", B: "text-primary",
  C: "text-warning", D: "text-warning", F: "text-destructive",
};
const gradeBg: Record<string, string> = {
  "A+": "bg-success/10 border-success/30", A: "bg-success/10 border-success/30",
  B: "bg-primary/10 border-primary/30", C: "bg-warning/10 border-warning/30",
  D: "bg-warning/10 border-warning/30", F: "bg-destructive/10 border-destructive/30",
};
const diffColor = { easy: "text-success", medium: "text-warning", hard: "text-destructive" };
const diffBg = { easy: "bg-success/10 border-success/30", medium: "bg-warning/10 border-warning/30", hard: "bg-destructive/10 border-destructive/30" };

const FloatingOrb = ({ className }: { className: string }) => (
  <div className={`absolute rounded-full opacity-[0.07] blur-3xl pointer-events-none ${className}`} />
);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const formatTime = (s: number) =>
  s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

interface Props { onBack: () => void; }

const QuizHistory = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterDiff, setFilterDiff] = useState<FilterDiff>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAttempts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.database
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load history");
    else setAttempts((data as QuizAttempt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAttempts(); }, [user]);

  const deleteAttempt = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.database.from("quiz_attempts").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Attempt removed"); setAttempts(p => p.filter(a => a.id !== id)); }
    setDeleting(null);
  };

  const filtered = attempts.filter(a =>
    (filterMode === "all" || a.mode === filterMode) &&
    (filterDiff === "all" || a.difficulty === filterDiff)
  );

  // Stats
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.score_pct, 0) / totalAttempts) : 0;
  const best = attempts.reduce((b, a) => (a.score_pct > (b?.score_pct ?? -1) ? a : b), null as QuizAttempt | null);
  const recentTrend = attempts.slice(0, 5).map(a => a.score_pct);
  const trendUp = recentTrend.length >= 2 && recentTrend[0] >= recentTrend[recentTrend.length - 1];

  // Score bar segment helper
  const scoreBar = (pct: number) => {
    if (pct >= 90) return "gradient-primary";
    if (pct >= 70) return "bg-primary/70";
    if (pct >= 50) return "bg-warning";
    return "bg-destructive/70";
  };

  return (
    <div
      className="min-h-screen bg-background relative overflow-x-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 50% at 30% -5%, hsl(268 70% 45% / 0.11) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(300 50% 50% / 0.08) 0%, transparent 55%), radial-gradient(hsl(268 70% 45% / 0.03) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 100% 100%, 22px 22px",
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <FloatingOrb className="w-[32rem] h-[32rem] bg-primary top-[-14rem] right-[-10rem]" />
      <FloatingOrb className="w-80 h-80 bg-primary/60 bottom-10 left-[-8rem]" />

      {/* Header */}
      <header className="gradient-primary py-5 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100%) 1px,transparent 1px),linear-gradient(90deg,hsl(0 0% 100%) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-4xl mx-auto relative z-10 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
          >
            <ArrowLeft size={16} className="text-primary-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
              <BarChart3 size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1
                className="text-xl font-bold text-primary-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Quiz History
              </h1>
              <p className="text-primary-foreground/60 text-xs">Track your learning progress over time</p>
            </div>
          </div>
          <button
            onClick={fetchAttempts}
            className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
            title="Refresh"
          >
            <RefreshCw size={15} className="text-primary-foreground" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">

        {/* Stats cards */}
        {totalAttempts > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Quizzes",
                value: totalAttempts,
                icon: Brain,
                sub: "attempts",
                color: "text-primary",
                bg: "bg-primary/10 border-primary/20",
              },
              {
                label: "Avg Score",
                value: `${avgScore}%`,
                icon: TrendingUp,
                sub: trendUp ? "↑ improving" : "keep going",
                color: avgScore >= 70 ? "text-success" : avgScore >= 50 ? "text-warning" : "text-destructive",
                bg: avgScore >= 70 ? "bg-success/10 border-success/20" : avgScore >= 50 ? "bg-warning/10 border-warning/20" : "bg-destructive/10 border-destructive/20",
              },
              {
                label: "Best Score",
                value: best ? `${best.score_pct}%` : "—",
                icon: Trophy,
                sub: best ? best.label.slice(0, 14) : "",
                color: "text-warning",
                bg: "bg-warning/10 border-warning/20",
              },
              {
                label: "Questions Done",
                value: attempts.reduce((s, a) => s + a.question_count, 0),
                icon: CheckCircle2,
                sub: `${attempts.reduce((s, a) => s + a.correct_count, 0)} correct`,
                color: "text-success",
                bg: "bg-success/10 border-success/20",
              },
            ].map(({ label, value, icon: Icon, sub, color, bg }) => (
              <div key={label} className={`glass-card rounded-2xl p-4 border ${bg} animate-fade-in`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
                  <Icon size={14} className={color} />
                </div>
                <p className={`text-2xl font-black ${color}`} style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Mini progress chart for last 10 attempts */}
        {attempts.length >= 3 && (
          <div className="glass-card rounded-3xl p-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <BarChart3 size={15} className="text-primary" /> Score Trend (Last {Math.min(10, attempts.length)} Quizzes)
              </h3>
              <span className="text-xs text-muted-foreground">newest → oldest</span>
            </div>
            <div className="flex items-end gap-2 h-20">
              {attempts.slice(0, 10).reverse().map((a, i) => (
                <div key={a.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t-lg transition-all ${scoreBar(a.score_pct)}`}
                    style={{ height: `${Math.max(8, (a.score_pct / 100) * 68)}px` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-popover border border-border rounded-xl px-2 py-1 text-[10px] font-bold text-foreground whitespace-nowrap shadow-lg">
                      {a.score_pct}% · {a.label.slice(0, 12)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-0.5">
              <span>Older</span>
              <span>Recent</span>
            </div>
          </div>
        )}

        {/* Filters */}
        {totalAttempts > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 bg-card/80 border border-border rounded-2xl p-1.5">
              <Filter size={12} className="text-muted-foreground ml-1" />
              {(["all", "topic", "syllabus"] as FilterMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all ${filterMode === m ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {m === "all" && <Star size={10} />}
                  {m === "topic" && <Hash size={10} />}
                  {m === "syllabus" && <Upload size={10} />}
                  {m === "all" ? "All" : m === "topic" ? "Topic" : "Syllabus"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 bg-card/80 border border-border rounded-2xl p-1.5">
              {(["all", "easy", "medium", "hard"] as FilterDiff[]).map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDiff(d)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all capitalize ${filterDiff === d ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {d === "all" ? "Any Difficulty" : d}
                </button>
              ))}
            </div>
            {filtered.length !== totalAttempts && (
              <span className="text-xs text-muted-foreground">
                Showing {filtered.length} of {totalAttempts}
              </span>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-xl animate-pulse">
              <Brain size={26} className="text-primary-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Loading your quiz history…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && totalAttempts === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 animate-fade-in">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl">
                <Trophy size={42} className="text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
            </div>
            <div className="text-center max-w-xs">
              <h3 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                No Quizzes Yet!
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Take your first AI-generated quiz and your results will appear here with detailed progress tracking.
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm hover-lift shadow-lg"
            >
              <Brain size={16} /> Take a Quiz
            </button>
          </div>
        )}

        {/* No results for filter */}
        {!loading && totalAttempts > 0 && filtered.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
              <Filter size={22} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-bold mb-1">No matches for these filters</p>
            <p className="text-muted-foreground text-sm">Try adjusting the mode or difficulty filter.</p>
          </div>
        )}

        {/* Attempt list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((attempt, idx) => (
              <div
                key={attempt.id}
                className="glass-card rounded-3xl p-5 border border-border hover:border-primary/30 transition-all duration-200 animate-fade-in group"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Grade badge */}
                  <div className={`shrink-0 w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-sm ${gradeBg[attempt.grade] ?? "bg-secondary border-border"}`}>
                    <span className={`text-lg font-black leading-none ${gradeColor[attempt.grade] ?? "text-foreground"}`}>
                      {attempt.grade}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold mt-0.5">GRADE</span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-foreground text-sm truncate max-w-[220px]">{attempt.label}</span>
                          {/* Mode chip */}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${attempt.mode === "topic"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-secondary text-muted-foreground border-border"
                            }`}>
                            {attempt.mode === "topic" ? <Hash size={8} /> : <Upload size={8} />}
                            {attempt.mode === "topic" ? "Topic" : "Syllabus"}
                          </span>
                          {/* Difficulty chip */}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border capitalize ${diffBg[attempt.difficulty]} ${diffColor[attempt.difficulty]}`}>
                            {attempt.difficulty === "easy" && <Zap size={8} />}
                            {attempt.difficulty === "medium" && <Target size={8} />}
                            {attempt.difficulty === "hard" && <Brain size={8} />}
                            {attempt.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {formatDate(attempt.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={10} className="text-success" />
                            {attempt.correct_count}/{attempt.question_count} correct
                          </span>
                          {attempt.time_taken_seconds != null && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {formatTime(attempt.time_taken_seconds)}
                            </span>
                          )}
                          {attempt.subject && (
                            <span className="flex items-center gap-1">
                              <BookOpen size={10} /> {attempt.subject}
                            </span>
                          )}
                        </div>

                        {/* Detected topics (syllabus) */}
                        {attempt.detected_topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {attempt.detected_topics.slice(0, 4).map(t => (
                              <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                                {t}
                              </span>
                            ))}
                            {attempt.detected_topics.length > 4 && (
                              <span className="text-[9px] text-muted-foreground px-1.5 py-0.5">+{attempt.detected_topics.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score circle + delete */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-2xl font-black ${gradeColor[attempt.grade] ?? "text-foreground"}`}>
                            {attempt.score_pct}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">score</p>
                        </div>
                        <button
                          onClick={() => deleteAttempt(attempt.id)}
                          disabled={deleting === attempt.id}
                          className="w-8 h-8 rounded-xl bg-muted opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-destructive/20 transition-all disabled:opacity-50"
                          title="Delete attempt"
                        >
                          {deleting === attempt.id
                            ? <div className="w-3.5 h-3.5 border border-destructive/40 border-t-destructive rounded-full animate-spin" />
                            : <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Score progress bar */}
                    <div className="h-1.5 rounded-full bg-secondary/70 overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${scoreBar(attempt.score_pct)}`}
                        style={{ width: `${attempt.score_pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance insight footer */}
        {!loading && totalAttempts >= 3 && (
          <div className="mt-8 glass-card rounded-3xl p-6 border border-primary/10 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-primary" />
              <h3 className="font-bold text-foreground text-sm">Performance Insights</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Best Difficulty",
                  value: (() => {
                    const byDiff = (["easy", "medium", "hard"] as const).map(d => {
                      const filtered = attempts.filter(a => a.difficulty === d);
                      return { d, avg: filtered.length ? filtered.reduce((s, a) => s + a.score_pct, 0) / filtered.length : 0, count: filtered.length };
                    }).filter(x => x.count > 0);
                    const best = byDiff.sort((a, b) => b.avg - a.avg)[0];
                    return best ? `${best.d.charAt(0).toUpperCase() + best.d.slice(1)} (${Math.round(best.avg)}%)` : "—";
                  })(),
                  icon: Star,
                  color: "text-warning",
                },
                {
                  label: "Favorite Mode",
                  value: (() => {
                    const t = attempts.filter(a => a.mode === "topic").length;
                    const s = attempts.filter(a => a.mode === "syllabus").length;
                    return t >= s ? `Topic (${t})` : `Syllabus (${s})`;
                  })(),
                  icon: Layers,
                  color: "text-primary",
                },
                {
                  label: "Consistency",
                  value: (() => {
                    if (attempts.length < 3) return "Keep going!";
                    const recent5 = attempts.slice(0, 5).map(a => a.score_pct);
                    const variance = Math.sqrt(recent5.map(v => (v - avgScore) ** 2).reduce((s, v) => s + v, 0) / recent5.length);
                    return variance < 10 ? "🏆 Very Consistent" : variance < 20 ? "📈 Getting There" : "📚 Keep Practicing";
                  })(),
                  icon: TrendingUp,
                  color: "text-success",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="text-center">
                  <Icon size={16} className={`${color} mx-auto mb-1`} />
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-xs font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizHistory;
