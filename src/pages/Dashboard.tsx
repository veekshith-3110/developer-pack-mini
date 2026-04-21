import { GraduationCap, FileSearch, LogOut, User, Sparkles, ChevronRight, BookOpen, Users, Target, Brain, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onSelect: (feature: "timetable" | "resume" | "builder" | "quiz" | "quiz-history") => void;
}

const roleBadge: Record<string, { label: string; classes: string }> = {
  teacher: { label: "Teacher", classes: "bg-primary/10 text-primary border-primary/20" },
  student: { label: "Student", classes: "bg-secondary text-secondary-foreground border-border" },
};

const FloatingShape = ({ className }: { className: string }) => (
  <div className={`absolute rounded-full opacity-10 blur-3xl pointer-events-none ${className}`} />
);

const Dashboard = ({ onSelect }: Props) => {
  const { user, role, signOut } = useAuth();
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const badge = role ? roleBadge[role] : null;

  return (
    <div className="min-h-screen dashboard-bg relative overflow-x-hidden">
      {/* Floating ambient blobs */}
      <FloatingShape className="w-96 h-96 bg-primary top-[-10rem] left-[-8rem] animate-float-slow" />
      <FloatingShape className="w-72 h-72 bg-primary/60 bottom-20 right-[-6rem] animate-float-medium" />
      <FloatingShape className="w-56 h-56 bg-accent top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Header */}
      <header className="gradient-primary py-6 px-4 relative overflow-hidden">
        {/* Mesh overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(300 60% 80% / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(220 80% 80% / 0.2) 0%, transparent 50%)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20 shadow-lg">
                <Sparkles size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Students Developer Pack
                </h1>
                <p className="text-primary-foreground/60 text-xs">Powerful tools for student developers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-primary-foreground/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full ring-2 ring-primary-foreground/30" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <span className="text-primary-foreground text-sm font-medium">{displayName}</span>
                {badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground/80 border border-primary-foreground/20">
                    {badge.label}
                  </span>
                )}
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground text-sm font-medium hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        {/* Role info banner */}
        {role && (
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 mb-8 border text-sm font-medium backdrop-blur-sm ${role === "teacher"
            ? "bg-primary/5 border-primary/20 text-primary"
            : "bg-secondary/80 border-border text-secondary-foreground"
            }`}>
            {role === "teacher" ? <BookOpen className="w-4 h-4 shrink-0" /> : <Users className="w-4 h-4 shrink-0" />}
            <span>
              {role === "teacher"
                ? "You're logged in as a Teacher — you have full access including the Teacher-wise schedule view."
                : "You're logged in as a Student — you can view class timetables, search subjects, and build your resume."}
            </span>
          </div>
        )}

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Choose Your Tool
          </h2>
          <p className="text-muted-foreground text-sm">Four powerful AI tools in one dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Timetable Card */}
          <button
            onClick={() => onSelect("timetable")}
            className="group text-left bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-7 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-ring relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(268 70% 45% / 0.06) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <GraduationCap size={24} className="text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                Timetable Manager
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Create conflict-free college timetables. Add faculty, sections, generate schedules, and print them.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["Generator", "Drag & Drop", "PDF", "Cloud"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{tag}</span>
                ))}
                {role === "student" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold border border-border">Student View</span>
                )}
              </div>
              <div className="flex items-center text-primary text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                Open <ChevronRight size={13} />
              </div>
            </div>
          </button>

          {/* Resume Screening Card */}
          <button
            onClick={() => onSelect("resume")}
            className="group text-left bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-7 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-ring relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(268 70% 45% / 0.06) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-accent border border-border flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <FileSearch size={24} className="text-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                AI Resume Screener
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Upload a job description + resumes. AI ranks candidates by match score, extracts skills, highlights gaps.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["AI-Powered", "PDF/DOCX", "Skill Gap", "Ranking"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold border border-border">{tag}</span>
                ))}
              </div>
              <div className="flex items-center text-muted-foreground text-xs font-bold gap-1 group-hover:gap-2 group-hover:text-foreground transition-all">
                Open <ChevronRight size={13} />
              </div>
            </div>
          </button>

          {/* ATS Resume Builder Card */}
          <button
            onClick={() => onSelect("builder")}
            className="group text-left bg-card/80 backdrop-blur-sm border border-primary/30 rounded-3xl p-7 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-ring relative overflow-hidden"
          >
            {/* "New" badge */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full gradient-primary text-primary-foreground shadow">NEW</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(268 70% 45% / 0.08) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Target size={24} className="text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                ATS Resume Builder
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Build ATS-optimized resumes with AI. Get real-time ATS scores (80+), auto-optimize content, and download as PDF.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["ATS Score", "AI Optimize", "80+ Score", "PDF/Print"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{tag}</span>
                ))}
              </div>
              <div className="flex items-center text-primary text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                Build Resume <ChevronRight size={13} />
              </div>
            </div>
          </button>

          {/* AI Quiz Generator Card */}
          <button
            onClick={() => onSelect("quiz")}
            className="group text-left bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-7 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-ring relative overflow-hidden"
          >
            {/* "HOT" badge */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground shadow">🔥 HOT</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(268 70% 45% / 0.07) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/80 to-primary border border-primary/30 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Brain size={24} className="text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                AI Quiz Generator
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Generate instant quizzes on any topic. Students practice, teachers create exam papers. Live scores & explanations.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["Any Topic", "Explanations", "Score", "Export"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold border border-border">{tag}</span>
                ))}
              </div>
              <div className="flex items-center text-primary text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                Start Quiz <ChevronRight size={13} />
              </div>
            </div>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-10">
          {[
            { label: "Tools Available", value: "4" },
            { label: "AI-Powered", value: "100%" },
            { label: "Min ATS Score", value: "80+" },
            { label: "Quiz Topics", value: "∞" },
          ].map(s => (
            <div key={s.label} className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl px-4 py-4 text-center">
              <p className="text-2xl font-black gradient-text">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick access to quiz history */}
        <button
          onClick={() => onSelect("quiz-history")}
          className="group w-full mt-5 flex items-center justify-between px-6 py-4 bg-card/60 backdrop-blur-sm border border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow group-hover:scale-110 transition-transform">
              <BarChart3 size={16} className="text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Quiz History & Progress</p>
              <p className="text-xs text-muted-foreground">Track your scores, streaks, and performance insights</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </button>

      </div>

      <footer className="border-t border-border py-6 mt-8 relative z-10 bg-card/30 backdrop-blur-sm">
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Students Developer Pack
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
