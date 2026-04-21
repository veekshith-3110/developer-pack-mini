// Feature: oauth-passkey-auth, Property 8: WebAuthn unavailability hides all passkey UI

import { describe, test, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PasskeyRegistrationPrompt } from '../PasskeyRegistrationPrompt';
import { PasskeyVerificationModal } from '../PasskeyVerificationModal';
import { PasskeyManagement } from '../PasskeyManagement';

/**
 * Property 8: WebAuthn unavailability hides all passkey UI
 * Validates: Requirements 2.5, 6.1, 6.2
 *
 * For any render of the Auth page or account settings where
 * `window.PublicKeyCredential` is `undefined`, no passkey-related UI elements
 * (registration prompt, verification modal, management section) must be present
 * in the DOM.
 */

vi.mock('@/hooks/usePasskey', () => ({
  usePasskey: vi.fn().mockReturnValue({
    isSupported: false,
    credentials: [],
    loading: false,
    register: vi.fn(),
    verify: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}));

describe('Property 8: WebAuthn unavailability hides all passkey UI', () => {
  afterEach(() => {
    cleanup();
  });

  test('PasskeyRegistrationPrompt renders nothing when isSupported is false', () => {
    const { container } = render(<PasskeyRegistrationPrompt onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test('PasskeyVerificationModal renders nothing when isSupported is false', () => {
    const { container } = render(
      <PasskeyVerificationModal onVerified={() => {}} onSkip={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('PasskeyManagement renders nothing when isSupported is false', () => {
    const { container } = render(<PasskeyManagement />);
    expect(container.firstChild).toBeNull();
  });
});
