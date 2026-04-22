import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Mail, Lock, User, ArrowRight, Sparkles, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import GlitchText from "@/components/GlitchText";

type SignupRole = "teacher" | "student";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<SignupRole>("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const assignRole = async (userId: string, role: SignupRole) => {
    const { error } = await supabase.database
      .from("user_roles")
      .insert([{ user_id: userId, role }]);
    if (error && (error as any).code !== "23505") {
      console.error("Role assignment failed:", error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          name: fullName,
        });
        if (error) throw error;
        if (data.user) {
          await assignRole(data.user.id, signupRole);
          navigate("/");
        } else {
          toast.success("Account created! You can now sign in.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Save chosen role to localStorage so we can assign it after OAuth redirect
    localStorage.setItem("pending_role", signupRole);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(message);
      localStorage.removeItem("pending_role");
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    localStorage.setItem("pending_role", signupRole);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "GitHub sign-in failed";
      toast.error(message);
      localStorage.removeItem("pending_role");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}>

      {/* ── Animated gradient mesh background ── */}
      <style>{`
        @keyframes meshMove1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.15); }
          66% { transform: translate(-30px, 50px) scale(0.9); }
        }
        @keyframes meshMove2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 60px) scale(1.1); }
          66% { transform: translate(40px, -30px) scale(1.2); }
        }
        @keyframes meshMove3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 40px) scale(1.05); }
        }
        @keyframes meshMove4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-40px, -50px) scale(1.1); }
          80% { transform: translate(20px, 30px) scale(0.95); }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          25% { transform: translateY(-18px) translateX(8px); opacity: 0.7; }
          50% { transform: translateY(-8px) translateX(-12px); opacity: 0.5; }
          75% { transform: translateY(-22px) translateX(5px); opacity: 0.6; }
        }
        @keyframes gridShimmer {
          0% { opacity: 0.03; }
          50% { opacity: 0.06; }
          100% { opacity: 0.03; }
        }
      `}</style>

      {/* Mesh blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary large blob — top left */}
        <div style={{
          position: "absolute", top: "-20%", left: "-15%",
          width: "65vw", height: "65vw", maxWidth: 700, maxHeight: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(268 70% 55% / 0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "meshMove1 14s ease-in-out infinite",
        }} />
        {/* Accent blob — bottom right */}
        <div style={{
          position: "absolute", bottom: "-20%", right: "-15%",
          width: "60vw", height: "60vw", maxWidth: 650, maxHeight: 650,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(220 80% 60% / 0.14) 0%, transparent 70%)",
          filter: "blur(70px)",
          animation: "meshMove2 18s ease-in-out infinite",
        }} />
        {/* Mid blob — center right */}
        <div style={{
          position: "absolute", top: "30%", right: "5%",
          width: "40vw", height: "40vw", maxWidth: 450, maxHeight: 450,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(300 60% 55% / 0.10) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "meshMove3 22s ease-in-out infinite",
        }} />
        {/* Small accent — top right */}
        <div style={{
          position: "absolute", top: "5%", right: "20%",
          width: "25vw", height: "25vw", maxWidth: 280, maxHeight: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(268 90% 70% / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "meshMove4 16s ease-in-out infinite",
        }} />
        {/* Bottom left accent */}
        <div style={{
          position: "absolute", bottom: "10%", left: "10%",
          width: "30vw", height: "30vw", maxWidth: 320, maxHeight: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(200 70% 60% / 0.10) 0%, transparent 70%)",
          filter: "blur(45px)",
          animation: "meshMove1 20s ease-in-out infinite reverse",
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(hsl(268 70% 55% / 0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(268 70% 55% / 0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "gridShimmer 6s ease-in-out infinite",
        }} />

        {/* Floating dots */}
        {[
          { top: "12%", left: "8%", size: 4, delay: "0s", dur: "7s" },
          { top: "25%", left: "85%", size: 3, delay: "1.5s", dur: "9s" },
          { top: "60%", left: "6%", size: 5, delay: "3s", dur: "8s" },
          { top: "75%", left: "78%", size: 3, delay: "0.5s", dur: "11s" },
          { top: "40%", left: "92%", size: 4, delay: "2s", dur: "10s" },
          { top: "88%", left: "30%", size: 3, delay: "4s", dur: "7.5s" },
          { top: "18%", left: "55%", size: 2, delay: "1s", dur: "12s" },
          { top: "50%", left: "20%", size: 3, delay: "2.5s", dur: "9.5s" },
          { top: "8%", left: "40%", size: 2, delay: "3.5s", dur: "8.5s" },
          { top: "92%", left: "60%", size: 4, delay: "0.8s", dur: "10.5s" },
        ].map((dot, i) => (
          <div key={i} style={{
            position: "absolute",
            top: dot.top, left: dot.left,
            width: dot.size, height: dot.size,
            borderRadius: "50%",
            background: "hsl(268 70% 70% / 0.5)",
            animation: `floatDot ${dot.dur} ease-in-out infinite`,
            animationDelay: dot.delay,
          }} />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            <GlitchText speed={1.5} enableShadows={true} enableOnHover={true} className="text-3xl font-bold">
              Academic Suite
            </GlitchText>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isLogin ? "Sign in to your account" : "Create your account to get started"}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8">

          {/* Role Picker — always visible */}
          <div className="space-y-2 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
              {isLogin ? "Sign in as…" : "I am a…"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSignupRole("student")}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border-2 transition-all font-semibold text-sm
                  ${signupRole === "student"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
              >
                <Users className="w-6 h-6" />
                <span>Student</span>
                <span className="text-[10px] font-normal text-muted-foreground leading-tight text-center">View class timetables</span>
              </button>
              <button
                type="button"
                onClick={() => setSignupRole("teacher")}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border-2 transition-all font-semibold text-sm
                  ${signupRole === "teacher"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
              >
                <BookOpen className="w-6 h-6" />
                <span>Teacher</span>
                <span className="text-[10px] font-normal text-muted-foreground leading-tight text-center">Full access + teacher view</span>
              </button>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border-2 border-border bg-card hover:bg-secondary/60 transition-all font-semibold text-sm text-foreground disabled:opacity-50 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google as {signupRole === "student" ? "Student" : "Teacher"}
          </button>

          {/* GitHub Sign In */}
          <button
            onClick={handleGithubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border-2 border-border bg-card hover:bg-secondary/60 transition-all font-semibold text-sm text-foreground disabled:opacity-50 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Continue with GitHub as {signupRole === "student" ? "Student" : "Teacher"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">or email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm hover-lift disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Timetable Manager + AI Resume Screener
        </p>
      </div>
    </div>
  );
};

export default Auth;
