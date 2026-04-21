import { toast } from "sonner";
import { Fingerprint, Trash2, Plus, Monitor, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePasskey } from "@/hooks/usePasskey";

export function PasskeyManagement() {
  const { isSupported, credentials, loading, register, remove } = usePasskey();

  if (!isSupported) return null;

  const handleRegister = async () => {
    const result = await register();
    if (result.success) {
      toast.success("Passkey registered successfully!");
    } else if (result.error) {
      toast.error(result.error ?? "Failed to register passkey");
    }
    // cancelled (no error, no success) — silent
  };

  const handleRemove = async (credentialId: string) => {
    try {
      await remove(credentialId);
    } catch {
      toast.error("Failed to remove passkey");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Manage your registered passkeys for biometric login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading passkeys...
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-2">
            {credentials.map((cred) => (
              <li
                key={cred.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium" data-testid="credential-device-hint">
                      {cred.device_hint}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="credential-created-at">
                      {new Date(cred.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(cred.credential_id)}
                  aria-label={`Remove passkey ${cred.device_hint}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button onClick={handleRegister} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Register new passkey
        </Button>
      </CardContent>
    </Card>
  );
}
