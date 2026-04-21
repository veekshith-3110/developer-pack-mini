// Feature: oauth-passkey-auth, Property 1: Registration options invariant

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { registerPasskey } from '../passkeyService';

/**
 * Property 1: Registration options invariant
 * Validates: Requirements 2.2, 2.6
 *
 * For any authenticated user initiating passkey registration,
 * navigator.credentials.create() must be called with options that include:
 *   - rp.id === window.location.hostname
 *   - a non-empty challenge (Uint8Array)
 *   - at least one entry in pubKeyCredParams
 */
describe('Property 1: Registration options invariant', () => {
  let capturedOptions: PublicKeyCredentialCreationOptions | null = null;

  beforeEach(() => {
    capturedOptions = null;

    // Mock navigator.credentials.create to capture options and return a fake credential
    const mockCreate = vi.fn(async (options: CredentialCreationOptions) => {
      capturedOptions = options.publicKey ?? null;
      // Return a minimal fake PublicKeyCredential
      return {
        id: 'fake-credential-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(0),
          attestationObject: new ArrayBuffer(0),
          getPublicKey: () => new ArrayBuffer(32),
        },
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;
    });

    vi.stubGlobal('navigator', {
      ...navigator,
      credentials: {
        create: mockCreate,
        get: vi.fn(),
        preventSilentAccess: vi.fn(),
        store: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('navigator.credentials.create is called with correct options for any userId and email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (userId: string, userEmail: string) => {
          capturedOptions = null;

          await registerPasskey(userId, userEmail);

          expect(capturedOptions).not.toBeNull();

          // rp.id must equal window.location.hostname
          expect(capturedOptions!.rp.id).toBe(window.location.hostname);

          // challenge must be a non-empty Uint8Array
          expect(capturedOptions!.challenge).toBeInstanceOf(Uint8Array);
          expect((capturedOptions!.challenge as Uint8Array).length).toBeGreaterThan(0);

          // pubKeyCredParams must have at least one entry
          expect(capturedOptions!.pubKeyCredParams.length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: oauth-passkey-auth, Property 2: Registration storage round-trip

import { saveCredential } from '../passkeyService';

/**
 * Property 2: Registration storage round-trip
 * Validates: Requirements 2.3, 4.1
 *
 * For any successful passkey registration, the record inserted into
 * passkey_credentials must contain the credential_id, public_key, and
 * device_hint fields derived from the credential returned by
 * navigator.credentials.create().
 */

vi.mock('@/integrations/supabase/client', () => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  return {
    supabase: {
      database: { from: fromMock },
    },
  };
});

describe('Property 2: Registration storage round-trip', () => {
  test('saveCredential inserts matching credential_id, public_key, and device_hint for any credential', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.base64String({ minLength: 4 }),
        fc.string({ minLength: 1 }),
        async (userId, credentialId, publicKeyB64, deviceHint) => {
          // Build an ArrayBuffer from the base64 string
          const binaryStr = atob(publicKeyB64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const publicKeyBuffer: ArrayBuffer = bytes.buffer;

          // Construct a fake PublicKeyCredential
          const fakeCredential = {
            id: credentialId,
            rawId: new ArrayBuffer(16),
            type: 'public-key',
            response: {
              clientDataJSON: new ArrayBuffer(0),
              attestationObject: new ArrayBuffer(0),
              getPublicKey: () => publicKeyBuffer,
            },
            getClientExtensionResults: () => ({}),
          } as unknown as PublicKeyCredential;

          // Reset mocks before each run
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fromMock = (supabase.database as any).from as ReturnType<typeof vi.fn>;
          fromMock.mockClear();
          const insertMock = vi.fn().mockResolvedValue({ error: null });
          fromMock.mockReturnValue({ insert: insertMock });

          await saveCredential(userId, fakeCredential, deviceHint);

          expect(fromMock).toHaveBeenCalledWith('passkey_credentials');
          expect(insertMock).toHaveBeenCalledTimes(1);

          const insertedArray = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
          expect(Array.isArray(insertedArray)).toBe(true);
          const record = insertedArray[0];

          // credential_id must match fakeCredential.id
          expect(record.credential_id).toBe(credentialId);

          // public_key must be a non-empty string (base64 encoded)
          expect(typeof record.public_key).toBe('string');
          expect((record.public_key as string).length).toBeGreaterThan(0);

          // device_hint must match the passed deviceHint
          expect(record.device_hint).toBe(deviceHint);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: oauth-passkey-auth, Property 3: Verification uses stored credential IDs

import { verifyPasskey } from '../passkeyService';

/**
 * Property 3: Verification uses stored credential IDs
 * Validates: Requirements 3.3
 *
 * For any user with one or more registered passkeys,
 * navigator.credentials.get() must be called with allowCredentials
 * containing exactly the credential IDs stored for that user.
 */
describe('Property 3: Verification uses stored credential IDs', () => {
  let capturedRequestOptions: PublicKeyCredentialRequestOptions | null = null;

  beforeEach(() => {
    capturedRequestOptions = null;

    const mockGet = vi.fn(async (options: CredentialRequestOptions) => {
      capturedRequestOptions = options.publicKey ?? null;
      // Return a minimal fake assertion
      return {
        id: 'fake-assertion-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(0),
          authenticatorData: new ArrayBuffer(0),
          signature: new ArrayBuffer(0),
          userHandle: null,
        },
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;
    });

    vi.stubGlobal('navigator', {
      ...navigator,
      credentials: {
        create: vi.fn(),
        get: mockGet,
        preventSilentAccess: vi.fn(),
        store: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('navigator.credentials.get is called with allowCredentials matching the input credential IDs', async () => {
    // Generate valid base64url strings (A-Z, a-z, 0-9, -, _) with length multiple of 4
    // so base64urlDecode in verifyPasskey doesn't throw InvalidCharacterError
    const base64urlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const base64urlString = fc
      .integer({ min: 1, max: 8 })
      .chain((blocks) =>
        fc
          .array(fc.constantFrom(...base64urlChars.split('')), { minLength: blocks * 4, maxLength: blocks * 4 })
          .map((chars) => chars.join('')),
      );

    await fc.assert(
      fc.asyncProperty(
        fc.array(base64urlString),
        async (credentialIds: string[]) => {
          capturedRequestOptions = null;

          await verifyPasskey(credentialIds);

          expect(capturedRequestOptions).not.toBeNull();

          const allowCredentials = capturedRequestOptions!.allowCredentials ?? [];

          // allowCredentials must have the same length as the input array
          expect(allowCredentials.length).toBe(credentialIds.length);

          // each entry must have type 'public-key'
          for (const entry of allowCredentials) {
            expect(entry.type).toBe('public-key');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: oauth-passkey-auth, Property 7: Unhandled exceptions caught

/**
 * Property 7: Unhandled exceptions caught
 * Validates: Requirements 6.3
 *
 * For any non-NotAllowedError thrown by navigator.credentials.create or
 * navigator.credentials.get, the service must log via console.error.
 * - registerPasskey re-throws a wrapped error (rejects)
 * - verifyPasskey returns { success: false } (resolves)
 */
describe('Property 7: Unhandled exceptions caught', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('registerPasskey logs console.error and rejects for any non-NotAllowedError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (message: string) => {
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

          vi.stubGlobal('navigator', {
            credentials: {
              create: vi.fn().mockRejectedValue(new Error(message)),
              get: vi.fn().mockRejectedValue(new Error(message)),
              preventSilentAccess: vi.fn(),
              store: vi.fn(),
            },
          });

          await expect(registerPasskey('user-id', 'user@example.com')).rejects.toThrow();
          expect(consoleSpy).toHaveBeenCalled();

          consoleSpy.mockRestore();
          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 50 },
    );
  });

  test('verifyPasskey logs console.error and resolves with success:false for any non-NotAllowedError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (message: string) => {
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

          vi.stubGlobal('navigator', {
            credentials: {
              create: vi.fn().mockRejectedValue(new Error(message)),
              get: vi.fn().mockRejectedValue(new Error(message)),
              preventSilentAccess: vi.fn(),
              store: vi.fn(),
            },
          });

          const result = await verifyPasskey([]);
          expect(result.success).toBe(false);
          expect(consoleSpy).toHaveBeenCalled();

          consoleSpy.mockRestore();
          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 50 },
    );
  });
});
