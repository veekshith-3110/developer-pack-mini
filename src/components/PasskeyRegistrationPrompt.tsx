import { useState } from "react";
import { toast } from "sonner";
import { Fingerprint, Shield, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePasskey } from "@/hooks/usePasskey";

interface PasskeyRegistrationPromptProps {
  onDismiss: () => void;
}

export function PasskeyRegistrationPrompt({ onDismiss }: PasskeyRegistrationPromptProps) {
  const { isSupported, register } = usePasskey();
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isSupported) return null;

  const handleSetUp = async () => {
    setIsRegistering(true);
    try {
      const result = await register();
      if (result.success) {
        toast.success("Passkey set up successfully!");
        onDismiss();
      } else if (!result.error) {
        // User cancelled (NotAllowedError) — dismiss silently
        onDismiss();
      } else {
        toast.error(result.error ?? "Failed to set up passkey");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="flex items-start gap-4 p-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Set up a passkey for faster sign-in
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use your fingerprint, face, or device PIN to sign in securely without a password.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSetUp}
              disabled={isRegistering}
              className="gap-1.5"
            >
              {isRegistering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Fingerprint className="h-3.5 w-3.5" />
              )}
              {isRegistering ? "Setting up…" : "Set up passkey"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              disabled={isRegistering}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
