import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchCredentials,
  registerPasskey,
  saveCredential,
  verifyPasskey,
  deleteCredential,
} from '@/services/passkeyService';
import type {
  PasskeyCredential,
  RegisterPasskeyResult,
  VerifyPasskeyResult,
} from '@/services/passkeyService';
export interface UsePasskeyReturn {
  isSupported: boolean;
  credentials: PasskeyCredential[];
  loading: boolean;
  register: () => Promise<RegisterPasskeyResult>;
  verify: () => Promise<VerifyPasskeyResult>;
  remove: (credentialId: string) => Promise<void>;
}

export function usePasskey(): UsePasskeyReturn {
  const { user, refreshHasPasskey } = useAuth();

  const isSupported =
    typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(false);

  // On mount (or when user changes), fetch existing credentials
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);

    fetchCredentials(user.id)
      .then((creds) => {
        if (!cancelled) setCredentials(creds);
      })
      .catch((err) => {
        console.error('[usePasskey] fetchCredentials error:', err);
        if (!cancelled) setCredentials([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const register = async (): Promise<RegisterPasskeyResult> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const credential = await registerPasskey(user.id, user.email);
      await saveCredential(
        user.id,
        credential,
        navigator.userAgent.slice(0, 100),
      );

      // Refresh credentials list and update hasPasskey in auth context
      try {
        const updated = await fetchCredentials(user.id);
        setCredentials(updated);
        await refreshHasPasskey(); // so verification modal shows on next login
      } catch (err) {
        console.error('[usePasskey] refresh after register error:', err);
      }

      return { success: true, credentialId: credential.id };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        // User cancelled — silent failure
        return { success: false };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Passkey registration failed',
      };
    }
  };

  const verify = async (): Promise<VerifyPasskeyResult> => {
    return verifyPasskey(credentials.map((c) => c.credential_id));
  };

  const remove = async (credentialId: string): Promise<void> => {
    await deleteCredential(credentialId);
    setCredentials((prev) => prev.filter((c) => c.credential_id !== credentialId));
  };

  return { isSupported, credentials, loading, register, verify, remove };
}
