import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "teacher" | "student" | null;

interface AuthCtx {
  user: any | null;
  session: any | null;
  loading: boolean;
  role: AppRole;
  roleLoading: boolean;
  signOut: () => Promise<void>;
  isAppLocked: boolean;
  setIsAppLocked: (v: boolean) => void;
  passkeyEnabled: boolean;
  hasPasskey: boolean;
  passkeyLoading: boolean;
  refreshHasPasskey: () => Promise<void>;
  unlockApp: () => Promise<boolean>;
  setupPasskey: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  role: null,
  roleLoading: true,
  signOut: async () => {},
  isAppLocked: false,
  setIsAppLocked: () => {},
  passkeyEnabled: false,
  hasPasskey: false,
  passkeyLoading: true,
  refreshHasPasskey: async () => {},
  unlockApp: async () => true,
  setupPasskey: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(true);

  const fetchingRoleRef = useRef(false);
  const initializedRef = useRef(false);
  const userRef = useRef<any>(null);
  // Track whether we've already locked for this session to avoid re-locking after unlock
  const lockedThisSessionRef = useRef(false);

  const fetchRole = async (userId: string) => {
    if (fetchingRoleRef.current) return;
    fetchingRoleRef.current = true;
    setRoleLoading(true);
    try {
      const { data, error } = await supabase.database
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        console.error("Failed to fetch role:", error);
        setRole(null);
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      if (!firstRow?.role) {
        const pendingRole = localStorage.getItem("pending_role") as AppRole;
        if (pendingRole === "teacher" || pendingRole === "student") {
          localStorage.removeItem("pending_role");
          const { error: insertError } = await supabase.database
            .from("user_roles")
            .upsert([{ user_id: userId, role: pendingRole }], { onConflict: "user_id" });
          if (!insertError) {
            setRole(pendingRole);
            return;
          }
        }
      }
      setRole((firstRow?.role as AppRole) ?? null);
    } catch (err) {
      console.error("Role fetch error:", err);
      setRole(null);
    } finally {
      setRoleLoading(false);
      fetchingRoleRef.current = false;
    }
  };

  const fetchHasPasskey = async (userId: string) => {
    setPasskeyLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.database as any)
        .from("passkey_credentials")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      const found = !error && Array.isArray(data) && data.length > 0;
      setHasPasskey(found);
      setPasskeyEnabled(found);
      // Lock the app on first load if user has a passkey and we haven't locked yet
      if (found && !lockedThisSessionRef.current) {
        lockedThisSessionRef.current = true;
        setIsAppLocked(true);
      }
    } catch {
      setHasPasskey(false);
      setPasskeyEnabled(false);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSession = (session: any) => {
    setSession(session);
    setUser(session?.user ?? null);
    userRef.current = session?.user ?? null;
    setLoading(false);
    if (session?.user) {
      fetchRole(session.user.id);
      fetchHasPasskey(session.user.id);
    } else {
      setRole(null);
      setRoleLoading(false);
      setIsAppLocked(false);
      setPasskeyEnabled(false);
      setHasPasskey(false);
      setPasskeyLoading(false);
      lockedThisSessionRef.current = false;
    }
  };

  const refreshHasPasskey = async () => {
    const uid = userRef.current?.id;
    if (uid) await fetchHasPasskey(uid);
  };

  /** Registers a new passkey and saves it to the DB. */
  const setupPasskey = async () => {
    if (!user) return;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Academic Suite", id: window.location.hostname },
          user: {
            id: Uint8Array.from(user.id as string, (c: string) => c.charCodeAt(0)),
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return;

      // Safe base64 encoding — avoids stack overflow on large buffers
      const toBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };

      const attestation = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBuffer = attestation.getPublicKey?.() ?? new ArrayBuffer(0);
      const publicKeyB64 = toBase64(publicKeyBuffer) || 'unavailable';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.database as any)
        .from("passkey_credentials")
        .insert([{
          user_id: user.id,
          credential_id: credential.id,
          public_key: publicKeyB64,
          device_hint: navigator.userAgent.slice(0, 100),
        }]);

      if (error) {
        console.error("setupPasskey DB error:", error);
        throw new Error(error.message ?? "DB insert failed");
      }

      await refreshHasPasskey();
      toast.success("Passkey registered! Biometric login is now enabled.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return; // user cancelled silently
      console.error("setupPasskey error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to set up passkey: ${msg}`);
    }
  };

  /** Verifies identity via WebAuthn using DB-stored credential IDs. */
  const unlockApp = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.database as any)
        .from("passkey_credentials")
        .select("credential_id")
        .eq("user_id", user.id);

      if (error || !data?.length) {
        setIsAppLocked(false);
        return true;
      }

      const base64urlDecode = (str: string): ArrayBuffer => {
        const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      };

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allowCredentials: data.map((row: any) => ({
            type: "public-key" as PublicKeyCredentialType,
            id: base64urlDecode(row.credential_id),
          })),
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (assertion) {
        setIsAppLocked(false);
        return true;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Authentication cancelled.");
      } else {
        console.error("unlockApp error:", err);
        toast.error("Authentication failed. Please try again.");
      }
    }
    return false;
  };

  useEffect(() => {
    let subscription: any = null;
    const auth: any = supabase.auth;

    if (auth.onAuthStateChange) {
      const res = auth.onAuthStateChange((_event: any, session: any) => {
        initializedRef.current = true;
        handleSession(session);
      });
      subscription = res?.data?.subscription;
    }

    if (auth.getCurrentSession) {
      auth.getCurrentSession()
        .then(({ data: { session } }: any) => {
          if (!initializedRef.current) {
            initializedRef.current = true;
            handleSession(session);
          }
        })
        .catch((err: any) => {
          console.error("getCurrentSession error:", err);
          if (!initializedRef.current) {
            initializedRef.current = true;
            setLoading(false);
            setRoleLoading(false);
          }
        });
    } else {
      setTimeout(() => {
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          setRoleLoading(false);
        }
      }, 2000);
    }

    const safetyTimer = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("Auth initialization timed out, forcing load complete");
        initializedRef.current = true;
        setLoading(false);
        setRoleLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(safetyTimer);
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setHasPasskey(false);
    setPasskeyEnabled(false);
    setIsAppLocked(false);
    setLoading(false);
    setRoleLoading(false);
    fetchingRoleRef.current = false;
    initializedRef.current = false;
    lockedThisSessionRef.current = false;
    sessionStorage.removeItem("passkey_prompt_dismissed");
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, role, roleLoading, signOut,
        isAppLocked, setIsAppLocked,
        passkeyEnabled, hasPasskey, passkeyLoading,
        refreshHasPasskey, unlockApp, setupPasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
