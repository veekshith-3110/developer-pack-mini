import { useAuth } from "@/hooks/useAuth";
import { Lock, Fingerprint } from "lucide-react";
import { useState } from "react";

export const AppLockOverlay = () => {
  const { isAppLocked, unlockApp, user, signOut } = useAuth();
  const [unlocking, setUnlocking] = useState(false);

  if (!isAppLocked || !user) return null;

  const handleUnlock = async () => {
    setUnlocking(true);
    await unlockApp();
    setUnlocking(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">App Locked</h1>
      <p className="text-muted-foreground text-center mb-10 max-w-sm">
        Class Plan Hero is secured with a physical passkey. Please authenticate to continue.
      </p>

      <button
        onClick={handleUnlock}
        disabled={unlocking}
        className="flex items-center gap-3 px-8 py-4 gradient-primary text-primary-foreground rounded-2xl font-bold hover-lift shadow-lg disabled:opacity-50"
      >
        <Fingerprint className="w-5 h-5" />
        {unlocking ? "Verifying..." : "Unlock with Passkey"}
      </button>

      <button 
        onClick={signOut}
        className="mt-8 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign out instead
      </button>
    </div>
  );
};
