import { supabase } from '@/integrations/supabase/client';

// ── Exported interfaces ──────────────────────────────────────────────────────

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  device_hint: string;
  created_at: string;
}

export interface RegisterPasskeyResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface VerifyPasskeyResult {
  success: boolean;
  error?: string;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function base64urlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ── Core WebAuthn functions ──────────────────────────────────────────────────

/**
 * Initiates passkey registration for the given user via navigator.credentials.create().
 * Returns the raw PublicKeyCredential on success.
 * Re-throws NotAllowedError as-is; wraps all other errors.
 */
export async function registerPasskey(
  userId: string,
  userEmail: string,
): Promise<PublicKeyCredential> {
  const options: PublicKeyCredentialCreationOptions = {
    rp: {
      name: 'Academic Suite',
      id: window.location.hostname,
    },
    user: {
      id: Uint8Array.from(userId, (c) => c.charCodeAt(0)),
      name: userEmail,
      displayName: userEmail,
    },
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
  };

  try {
    const credential = await navigator.credentials.create({ publicKey: options });
    return credential as PublicKeyCredential;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw err;
    }
    console.error('[passkeyService] registerPasskey error:', err);
    throw new Error(
      err instanceof Error ? err.message : 'Passkey registration failed',
    );
  }
}

/**
 * Initiates passkey verification via navigator.credentials.get().
 * Re-throws NotAllowedError as-is; wraps all other errors.
 */
export async function verifyPasskey(
  credentialIds: string[],
): Promise<VerifyPasskeyResult> {
  const options: PublicKeyCredentialRequestOptions = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rpId: window.location.hostname,
    allowCredentials: credentialIds.map((id) => ({
      type: 'public-key' as PublicKeyCredentialType,
      id: base64urlDecode(id),
    })),
    userVerification: 'required',
    timeout: 60000,
  };

  try {
    await navigator.credentials.get({ publicKey: options });
    return { success: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw err;
    }
    console.error('[passkeyService] verifyPasskey error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Passkey verification failed',
    };
  }
}

// ── Database operations ──────────────────────────────────────────────────────

/**
 * Persists a newly registered credential to passkey_credentials.
 */
export async function saveCredential(
  userId: string,
  credential: PublicKeyCredential,
  deviceHint: string,
): Promise<void> {
  const attestation = credential.response as AuthenticatorAttestationResponse;
  const publicKeyBuffer = attestation.getPublicKey?.() ?? new ArrayBuffer(0);
  const publicKeyB64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKeyBuffer)),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.database as any)
    .from('passkey_credentials')
    .insert([
      {
        user_id: userId,
        credential_id: credential.id,
        public_key: publicKeyB64,
        device_hint: deviceHint,
      },
    ]);

  if (error) {
    console.error('[passkeyService] saveCredential error:', error);
    throw new Error(error.message ?? 'Failed to save passkey credential');
  }
}

/**
 * Removes a credential from passkey_credentials by its credential_id.
 */
export async function deleteCredential(credentialId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.database as any)
    .from('passkey_credentials')
    .delete()
    .eq('credential_id', credentialId);

  if (error) {
    console.error('[passkeyService] deleteCredential error:', error);
    throw new Error(error.message ?? 'Failed to delete passkey credential');
  }
}

/**
 * Fetches all passkey credentials for a given user.
 */
export async function fetchCredentials(
  userId: string,
): Promise<PasskeyCredential[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.database as any)
    .from('passkey_credentials')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[passkeyService] fetchCredentials error:', error);
    throw new Error(error.message ?? 'Failed to fetch passkey credentials');
  }

  return (data ?? []) as PasskeyCredential[];
}
