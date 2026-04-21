import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// The @insforge/sdk library doesn't strictly export User/Session types directly from the root 
// like Supabase in all versions. We'll use any or a defined structure locally to fix compilation
type AppRole = "teacher" | "student" | null;

interface AuthCtx {
  user: any | null;
  session: any | null;
  loading: boolean;
  role: AppRole;
  roleLoading: boolean;
  signOut: () => Promise<void>;
  isAppLocked: boolean;
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
  signOut: async () => { },
  isAppLocked: false,
  passkeyEnabled: false,
  hasPasskey: false,
  passkeyLoading: true,
  refreshHasPasskey: async () => { },
  unlockApp: async () => true,
  setupPasskey: async () => { },
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

  // Prevent duplicate fetchRole calls from race conditions
  const fetchingRoleRef = useRef(false);
  const initializedRef = useRef(false);
  const userRef = useRef<any>(null);

  const fetchRole = async (userId: string) => {
    // Prevent concurrent/duplicate calls
    if (fetchingRoleRef.current) return;
    fetchingRoleRef.current = true;
    setRoleLoading(true);

    try {
      // Use .limit(1) instead of .maybeSingle() to avoid PGRST116 error
      // when there are duplicate rows in user_roles
      const { data, error } = await supabase.database
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        console.error("Failed to fetch role:", error);
        setRole(null);
        setRoleLoading(false);
        fetchingRoleRef.current = false;
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      if (!firstRow?.role) {
        // Check if there's a pending role saved before Google OAuth redirect
        const pendingRole = localStorage.getItem("pending_role") as AppRole;
        if (pendingRole === "teacher" || pendingRole === "student") {
          localStorage.removeItem("pending_role");
          // Use upsert to prevent creating more duplicate rows
          const { error: insertError } = await supabase.database
            .from("user_roles")
            .upsert([{ user_id: userId, role: pendingRole }], { onConflict: "user_id" });
          if (!insertError) {
            setRole(pendingRole);
            setRoleLoading(false);
            fetchingRoleRef.current = false;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.database as any)
      .from('passkey_credentials')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    setHasPasskey(!error && Array.isArray(data) && data.length > 0);
    setPasskeyLoading(false);
  };

  const handleSession = (session: any) => {
    setSession(session);
    setUser(session?.user ?? null);
    userRef.current = session?.user ?? null;
    setLoading(false);
    if (session?.user) {
      fetchRole(session.user.id);
      fetchHasPasskey(session.user.id);
      const hasPasskeyLocal = !!localStorage.getItem(`passkey_${session.user.id}`);
      setPasskeyEnabled(hasPasskeyLocal);
      if (hasPasskeyLocal) setIsAppLocked(true);
    } else {
      setRole(null);
      setRoleLoading(false);
      setIsAppLocked(false);
      setPasskeyEnabled(false);
      setHasPasskey(false);
      setPasskeyLoading(false);
    }
  };

  const refreshHasPasskey = async () => {
    const uid = userRef.current?.id;
    if (uid) await fetchHasPasskey(uid);
  };

  const setupPasskey = async () => {
    if (!user) return;
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userIdBytes = new TextEncoder().encode(user.id);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Class Plan Hero" },
          user: {
            id: userIdBytes,
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
          timeout: 60000,
        }
      }) as PublicKeyCredential;

      if (credential) {
        localStorage.setItem(`passkey_${user.id}`, credential.id);
        setPasskeyEnabled(true);
        toast.success("Passkey registered successfully! App is now secured.");
      }
    } catch (error) {
      console.error("Passkey setup failed:", error);
      toast.error("Failed to setup passkey or cancelled.");
    }
  };

  const unlockApp = async (): Promise<boolean> => {
    if (!user) return false;
    const credIdStr = localStorage.getItem(`passkey_${user.id}`);
    if (!credIdStr) {
      setIsAppLocked(false);
      return true;
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const base64 = credIdStr.replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - base64.length % 4) % 4;
      const rawId = Uint8Array.from(atob(base64.padEnd(base64.length + padLen, '=')), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            type: "public-key",
            id: rawId,
          }],
          userVerification: "required",
        }
      });
      if (assertion) {
        setIsAppLocked(false);
        return true;
      }
    } catch (error) {
      console.error("Unlock failed:", error);
      toast.error("Authentication failed or cancelled.");
    }
    return false;
  };

  useEffect(() => {
    let subscription: any = null;

    // Type casting to avoid TS errors if InsForge SDK types are incomplete
    const auth: any = supabase.auth;

    // Set up auth state change listener
    if (auth.onAuthStateChange) {
      const res = auth.onAuthStateChange((_event: any, session: any) => {
        // If this is the first auth event, mark as initialized
        initializedRef.current = true;
        handleSession(session);
      });
      subscription = res?.data?.subscription;
    }

    // Also check current session immediately
    if (auth.getCurrentSession) {
      auth.getCurrentSession().then(({ data: { session } }: any) => {
        // Only process if onAuthStateChange hasn't already handled it
        if (!initializedRef.current) {
          initializedRef.current = true;
          handleSession(session);
        }
      }).catch((err: any) => {
        console.error("getCurrentSession error:", err);
        // Make sure loading resolves even on error
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          setRoleLoading(false);
        }
      });
    } else {
      // If getCurrentSession doesn't exist, ensure loading resolves
      // after a brief delay to give onAuthStateChange a chance
      setTimeout(() => {
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          setRoleLoading(false);
        }
      }, 2000);
    }

    // Safety timeout: never leave loading spinner on for more than 5 seconds
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
    // Reset all auth state immediately so ProtectedRoute shows Auth page
    setUser(null);
    setSession(null);
    setRole(null);
    setHasPasskey(false);
    setPasskeyEnabled(false);
    setIsAppLocked(false);
    setLoading(false);
    setRoleLoading(false);
    fetchingRoleRef.current = false;
    // Allow re-initialization on next login
    initializedRef.current = false;
    // Clear session-level UI flags
    sessionStorage.removeItem("passkey_prompt_dismissed");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleLoading, signOut, isAppLocked, passkeyEnabled, hasPasskey, passkeyLoading, refreshHasPasskey, unlockApp, setupPasskey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
