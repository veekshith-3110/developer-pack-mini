// Feature: oauth-passkey-auth, Property 5: Remove credential deletes from DB

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasskey } from '../usePasskey';

/**
 * Property 5: Remove credential deletes from DB
 * Validates: Requirements 4.3
 *
 * For any passkey credential belonging to a user, calling remove(credentialId)
 * must result in a database delete operation targeting that exact credential_id,
 * and the credential must no longer appear in the credentials list.
 */

vi.mock('@/services/passkeyService', () => ({
  fetchCredentials: vi.fn(),
  deleteCredential: vi.fn(),
  registerPasskey: vi.fn(),
  saveCredential: vi.fn(),
  verifyPasskey: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Property 5: Remove credential deletes from DB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('remove(credentialId) calls deleteCredential with exact ID and removes it from credentials state', async () => {
    const { fetchCredentials, deleteCredential } = await import('@/services/passkeyService');
    const { useAuth } = await import('@/hooks/useAuth');

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (credentialId: string) => {
          vi.clearAllMocks();

          // Set up useAuth to return a fake user
          (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
          });

          // Set up fetchCredentials to return a list containing the generated credential
          (fetchCredentials as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
              id: 'row-uuid',
              user_id: 'user-1',
              credential_id: credentialId,
              public_key: 'pk',
              device_hint: 'test',
              created_at: new Date().toISOString(),
            },
          ]);

          // Set up deleteCredential to resolve successfully
          (deleteCredential as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

          const { result } = renderHook(() => usePasskey());

          // Wait for initial load (credentials to be populated)
          await waitFor(() => {
            expect(result.current.credentials).toHaveLength(1);
          });

          // Call remove with the credential ID
          await act(async () => {
            await result.current.remove(credentialId);
          });

          // Assert deleteCredential was called with that exact credential ID
          expect(deleteCredential).toHaveBeenCalledWith(credentialId);

          // Assert the credential ID is absent from credentials state afterward
          const remaining = result.current.credentials.filter(
            (c) => c.credential_id === credentialId,
          );
          expect(remaining).toHaveLength(0);
        },
      ),
      { numRuns: 50 },
    );
  });
});
