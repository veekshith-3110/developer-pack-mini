// Feature: oauth-passkey-auth, Property 4: Passkey list renders required fields

import { describe, test, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { PasskeyManagement } from '../PasskeyManagement';

/**
 * Property 4: Passkey list renders required fields
 * Validates: Requirements 4.2
 *
 * For any list of passkey credentials returned from the database, the rendered
 * PasskeyManagement component must display the device_hint and formatted
 * created_at for each credential.
 */

vi.mock('@/hooks/usePasskey', () => ({
  usePasskey: vi.fn(),
}));

describe('Property 4: Passkey list renders required fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders device_hint and formatted created_at for every credential in the list', async () => {
    const { usePasskey } = await import('@/hooks/usePasskey');

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            credential_id: fc.string(),
            device_hint: fc.string({ minLength: 1 }),
            created_at: fc.date({ min: new Date(0), max: new Date('2100-01-01') }).map((d) => d.toISOString()),
            user_id: fc.uuid(),
            public_key: fc.string(),
          }),
        ),
        async (credentials) => {
          (usePasskey as ReturnType<typeof vi.fn>).mockReturnValue({
            isSupported: true,
            loading: false,
            credentials,
            register: vi.fn(),
            verify: vi.fn(),
            remove: vi.fn(),
          });

          render(<PasskeyManagement />);

          if (credentials.length > 0) {
            const hintElements = screen.getAllByTestId('credential-device-hint');
            const dateElements = screen.getAllByTestId('credential-created-at');

            const hintTexts = hintElements.map((el) => el.textContent);
            const dateTexts = dateElements.map((el) => el.textContent);

            // Each credential's device_hint and formatted date must appear in the DOM
            for (const cred of credentials) {
              const expectedDate = new Date(cred.created_at).toLocaleDateString();

              if (!hintTexts.includes(cred.device_hint)) {
                throw new Error(
                  `Expected device_hint "${cred.device_hint}" to appear in DOM but it was not found`,
                );
              }
              if (!dateTexts.includes(expectedDate)) {
                throw new Error(
                  `Expected formatted date "${expectedDate}" to appear in DOM but it was not found`,
                );
              }
            }
          }

          cleanup();
        },
      ),
      { numRuns: 50 },
    );
  });
});
