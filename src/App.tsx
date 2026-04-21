import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users } from "lucide-react";
import { toast } from "sonner";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import ResumeScreener from "./components/ResumeScreener";
import ATSResumeBuilder from "./components/ATSResumeBuilder";
import AIQuizGenerator from "./components/AIQuizGenerator";
import QuizHistory from "./components/QuizHistory";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AppLockOverlay } from "@/components/AppLockOverlay";
import { PasskeyPrompt } from "@/components/PasskeyPrompt";
import { PasskeyRegistrationPrompt } from "@/components/PasskeyRegistrationPrompt";
import { usePasskey } from "@/hooks/usePasskey";

const queryClient = new QueryClient();

/** Modal shown to Google-OAuth users who have no role yet */
const RoleSetupModal = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const pick = async (role: "teacher" | "student") => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.database
        .from("user_roles")
        .upsert([{ user_id: user.id, role }], { onConflict: "user_id" });
      if (error) {
        // 23505 = unique violation = role already exists, which is fine
        toast.error("Could not save role. Please try again.");
        setSaving(false);
        return;
      }
      // Brief delay to let DB write settle, then refresh
      toast.success(`Role set to ${role}!`);
      await new Promise(r => setTimeout(r, 300));
      window.location.reload();
    } catch (err) {
      toast.error("Could not save role. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome!</h2>
          <p className="text-sm text-muted-foreground">Please choose your role to continue.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => pick("student")}
            disabled={saving}
            className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-50"
          >
            <Users className="w-7 h-7 text-primary" />
            <span className="font-bold text-sm">Student</span>
            <span className="text-[10px] text-muted-foreground text-center">View class timetables</span>
          </button>
          <button
            onClick={() => pick("teacher")}
            disabled={saving}
            className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-50"
          >
            <BookOpen className="w-7 h-7 text-primary" />
            <span className="font-bold text-sm">Teacher</span>
            <span className="text-[10px] text-muted-foreground text-center">Full access + teacher view</span>
          </button>
        </div>
        {saving && (
          <div className="flex justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, roleLoading, hasPasskey, passkeyLoading, isAppLocked } = useAuth();
  const { isSupported } = usePasskey();

  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(() => {
    return sessionStorage.getItem("passkey_prompt_dismissed") !== "true";
  });

  const dismissPasskeyPrompt = () => {
    sessionStorage.setItem("passkey_prompt_dismissed", "true");
    setShowPasskeyPrompt(false);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → show Auth page directly (no redirect)
  if (!user) return <Auth />;

  // OAuth users with no role yet → show role picker overlay
  if (!role) return <RoleSetupModal />;

  // AppLockOverlay handles the lock screen — it renders on top when isAppLocked=true
  // No need for a separate PasskeyVerificationModal in this route

  // Show registration prompt only when:
  // 1. Passkey check is complete
  // 2. User has NO passkey
  // 3. WebAuthn is supported
  // 4. User hasn't dismissed it this session
  // 5. App is not currently locked (avoid showing prompt behind lock screen)
  const showPrompt = !passkeyLoading && !hasPasskey && isSupported && showPasskeyPrompt && !isAppLocked;

  return (
    <>
      <AppLockOverlay />
      <PasskeyPrompt />
      {showPrompt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <PasskeyRegistrationPrompt onDismiss={dismissPasskeyPrompt} />
        </div>
      )}
      {children}
    </>
  );
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const AppHome = () => {
  const [feature, setFeature] = useState<"dashboard" | "timetable" | "resume" | "builder" | "quiz" | "quiz-history">("dashboard");

  if (feature === "timetable") return <Index onBack={() => setFeature("dashboard")} />;
  if (feature === "resume") return <ResumeScreener onBack={() => setFeature("dashboard")} />;
  if (feature === "builder") return <ATSResumeBuilder onBack={() => setFeature("dashboard")} />;
  if (feature === "quiz") return <AIQuizGenerator onBack={() => setFeature("dashboard")} onViewHistory={() => setFeature("quiz-history")} />;
  if (feature === "quiz-history") return <QuizHistory onBack={() => setFeature("quiz")} />;
  return <Dashboard onSelect={setFeature} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
