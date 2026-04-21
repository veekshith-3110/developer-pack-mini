import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export const PasskeyPrompt = () => {
    const { user, setupPasskey, passkeyEnabled } = useAuth();
    const [hidden, setHidden] = useState(false);

    if (passkeyEnabled || hidden || !user) return null;
    if (localStorage.getItem(`passkey_skip_${user.id}`)) return null;

    const skip = () => {
        localStorage.setItem(`passkey_skip_${user.id}`, "true");
        setHidden(true);
    };

    const handleSetup = async () => {
        await setupPasskey();
        setHidden(true);
    };

    return (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm glass-card rounded-2xl p-6 shadow-2xl border-2 border-primary/20 animate-in slide-in-from-bottom-5">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Secure your app
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                Add a biometric passkey (Face ID/Fingerprint) to lock the app when you're away.
            </p>
            <div className="flex gap-3">
                <button 
                    onClick={handleSetup} 
                    className="flex-1 px-4 py-2 gradient-primary text-primary-foreground rounded-xl font-bold text-sm"
                >
                    Enable
                </button>
                <button 
                    onClick={skip} 
                    className="px-4 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-xl font-bold text-sm transition-colors"
                >
                    Maybe Later
                </button>
            </div>
        </div>
    );
};
