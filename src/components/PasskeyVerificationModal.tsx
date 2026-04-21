import { useState } from "react";
import { Fingerprint, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePasskey } from "@/hooks/usePasskey";

interface PasskeyVerificationModalProps {
  onVerified: () => void;
  onSkip: () => void;
}

type VerificationState = "idle" | "verifying" | "error";

export function PasskeyVerificationModal({
  onVerified,
  onSkip,
}: PasskeyVerificationModalProps) {
  const { verify, credentials, loading: credLoading } = usePasskey();
  const { isSupported } = usePasskey();
  if (!isSupported) return null;
  const [state, setState] = useState<VerificationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleVerify = async () => {
    // Wait until credentials are loaded before attempting verification
    if (credLoading || credentials.length === 0) {
      setErrorMessage("No passkey credentials found. Please set up a passkey first.");
      setState("error");
      return;
    }
    setState("verifying");
    setErrorMessage("");

    try {
      const result = await verify();
      if (result.success) {
        onVerified();
      } else {
        setErrorMessage(result.error ?? "Verification failed. Please try again.");
        setState("error");
      }
    } catch (err) {
      console.error("[PasskeyVerificationModal] verify error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setState("error");
    }
  };

  const isLoading = state === "verifying" || credLoading;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing via Escape or overlay click while verifying
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            ) : (
              <Fingerprint className="h-7 w-7 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">Verify your identity</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {credLoading
              ? "Loading your passkey…"
              : isLoading
              ? "Waiting for biometric confirmation…"
              : "Use your passkey to securely verify it's you."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3">
          {state === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {state !== "error" ? (
            <Button
              onClick={handleVerify}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Verify with passkey
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleVerify}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Retry"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
                className="flex-1"
              >
                Skip
              </Button>
            </div>
          )}

          {state === "idle" && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
