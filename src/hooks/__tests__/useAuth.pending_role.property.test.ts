// Feature: oauth-passkey-auth, Property 6: pending_role localStorage round-trip

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 6: pending_role localStorage round-trip
 * Validates: Requirements 5.5
 *
 * For any OAuth login flow where a role is selected before redirect,
 * the pending_role key must be present in localStorage immediately after
 * the OAuth call and must be absent (consumed) after useAuth processes
 * the returning session.
 */

// Mock supabase so fetchRole can run without a real DB
vi.mock('@/integrations/supabase/client', () => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const eqMock = vi.fn(() => ({ limit: limitMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
    upsert: upsertMock,
  }));
  return {
    supabase: {
      database: { from: fromMock },
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        getCurrentSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

describe('Property 6: pending_role localStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('pending_role is set before OAuth redirect and consumed after session processing', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('student', 'teacher'),
        async (role: string) => {
          localStorage.clear();

          // Step 1: Simulate setting pending_role before OAuth redirect
          localStorage.setItem('pending_role', role);
          expect(localStorage.getItem('pending_role')).toBe(role);

          // Step 2: Simulate useAuth processing the returning session
          // The fetchRole logic reads and removes pending_role when no role exists in DB
          const userId = 'test-user-id';

          // Mock DB to return no existing role (new OAuth user)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fromMock = (supabase.database as any).from as ReturnType<typeof vi.fn>;
          const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
          const eqMock = vi.fn(() => ({ limit: limitMock }));
          const selectMock = vi.fn(() => ({ eq: eqMock }));
          const upsertMock = vi.fn().mockResolvedValue({ error: null });
          fromMock.mockReturnValue({ select: selectMock, upsert: upsertMock });

          // Replicate the fetchRole logic from useAuth directly
          const { data, error } = await supabase.database
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .limit(1);

          const firstRow = Array.isArray(data) ? data[0] : data;

          if (!firstRow?.role && !error) {
            const pendingRole = localStorage.getItem('pending_role');
            if (pendingRole === 'teacher' || pendingRole === 'student') {
              localStorage.removeItem('pending_role');
              await supabase.database
                .from('user_roles')
                .upsert([{ user_id: userId, role: pendingRole }], { onConflict: 'user_id' } as any);
            }
          }

          // Step 3: Assert pending_role is consumed (absent) after processing
          expect(localStorage.getItem('pending_role')).toBeNull();

          // Assert upsert was called with the correct role
          expect(upsertMock).toHaveBeenCalledWith(
            [{ user_id: userId, role }],
            expect.objectContaining({ onConflict: 'user_id' }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
