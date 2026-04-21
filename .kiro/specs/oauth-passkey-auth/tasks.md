# Implementation Plan: OAuth + Passkey Authentication

## Overview

Incrementally add GitHub OAuth and WebAuthn/passkey support to the existing Academic Suite auth system. Tasks build from the database layer up through services, hooks, components, and finally wiring everything into the existing `ProtectedRoute` and `Auth` page.

## Tasks

- [x] 1. Add `passkey_credentials` table to database schema
  - Add the `passkey_credentials` table definition, RLS enablement, and policy to `insforge-schema.sql`
  - _Requirements: 2.3, 4.1_

- [x] 2. Implement `passkeyService.ts`
  - [x] 2.1 Create `src/services/passkeyService.ts` with core WebAuthn functions
    - Implement `registerPasskey(userId, userEmail)` wrapping `navigator.credentials.create()` with the options defined in the design (rp.id, challenge, pubKeyCredParams, authenticatorSelection)
    - Implement `verifyPasskey(credentialIds)` wrapping `navigator.credentials.get()` with `allowCredentials` built from stored IDs
    - Implement `saveCredential(userId, credential, deviceHint)` to insert into `passkey_credentials` via `supabase.database`
    - Implement `deleteCredential(credentialId)` to delete from `passkey_credentials`
    - Implement `fetchCredentials(userId)` to select all rows for a user
    - Wrap all `navigator.credentials` calls in try/catch; re-throw `NotAllowedError` as-is, log and wrap all other errors
    - _Requirements: 2.2, 2.3, 2.6, 3.3, 4.1, 4.3, 6.3_

  - [x] 2.2 Write property test for registration options invariant (Property 1)
    - **Property 1: Registration options invariant**
    - **Validates: Requirements 2.2, 2.6**
    - Use `fc.uuid()` and `fc.emailAddress()` to generate user IDs and emails; mock `navigator.credentials.create`; assert `rp.id === window.location.hostname`, challenge is non-empty Uint8Array, and `pubKeyCredParams.length >= 1`

  - [x] 2.3 Write property test for registration storage round-trip (Property 2)
    - **Property 2: Registration storage round-trip**
    - **Validates: Requirements 2.3, 4.1**
    - Use `fc.string()` and `fc.base64String()` to generate mock credential responses; assert the object passed to `saveCredential` contains matching `credential_id`, `public_key`, and `device_hint`

  - [x] 2.4 Write property test for verification credential IDs (Property 3)
    - **Property 3: Verification uses stored credential IDs**
    - **Validates: Requirements 3.3**
    - Use `fc.array(fc.string({ minLength: 1 }))` to generate credential ID arrays; assert `allowCredentials` passed to `navigator.credentials.get` contains exactly those IDs

  - [x] 2.5 Write property test for unhandled exception catching (Property 7)
    - **Property 7: Unhandled exceptions caught**
    - **Validates: Requirements 6.3**
    - Use `fc.string()` to generate error messages; mock `navigator.credentials.create/get` to throw `new Error(message)`; assert the promise resolves (does not reject) and `console.error` was called

- [x] 3. Implement `usePasskey.ts` hook
  - [x] 3.1 Create `src/hooks/usePasskey.ts`
    - Expose `isSupported` (checks `window.PublicKeyCredential`), `credentials`, `loading`, `register()`, `verify()`, `remove()`
    - On mount, call `fetchCredentials` for the current user and populate `credentials` state
    - `register()` calls `registerPasskey` then `saveCredential`; on `NotAllowedError` returns `{ success: false }` silently; on other errors returns `{ success: false, error }`
    - `verify()` calls `verifyPasskey`; returns `VerifyPasskeyResult`
    - `remove(credentialId)` calls `deleteCredential` then removes the entry from local state
    - _Requirements: 2.1, 2.4, 2.5, 3.4, 4.3, 6.1_

  - [x] 3.2 Write property test for remove deletes from DB (Property 5)
    - **Property 5: Remove credential deletes from DB**
    - **Validates: Requirements 4.3**
    - Use `fc.uuid()` to generate credential IDs; call `remove(id)`; assert `deleteCredential` was called with that exact ID and the ID is absent from `credentials` state afterward

- [x] 4. Add `hasPasskey` flag to `useAuth`
  - Modify `src/hooks/useAuth.tsx` to query `passkey_credentials` for the current user after session load and expose `hasPasskey: boolean`
  - Re-query when the user changes (login/logout)
  - _Requirements: 3.1, 3.6_

- [x] 5. Implement passkey UI components
  - [x] 5.1 Create `src/components/PasskeyVerificationModal.tsx`
    - Show a modal with a "Verify with passkey" button, a loading spinner while in progress, and retry/skip options on failure
    - Call `usePasskey().verify()` on button click; on success call `onVerified` prop; on failure show error message with retry and skip buttons
    - Disable all interactive elements while verification is in progress (Requirement 3.5)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 5.2 Create `src/components/PasskeyRegistrationPrompt.tsx`
    - Render nothing if `usePasskey().isSupported` is false
    - Show an inline card offering passkey registration with "Set up passkey" and "Maybe later" buttons
    - On "Set up passkey" click, call `usePasskey().register()`; on `NotAllowedError` (user cancelled) dismiss silently; on success show a success toast
    - _Requirements: 2.1, 2.4, 2.5, 6.1_

  - [x] 5.3 Create `src/components/PasskeyManagement.tsx`
    - Render nothing if `usePasskey().isSupported` is false
    - List each credential showing `device_hint` and formatted `created_at`
    - Provide a "Remove" button per credential that calls `usePasskey().remove(credentialId)` and shows an error toast on failure
    - Show a "Register new passkey" button that calls `usePasskey().register()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.4 Write property test for passkey list renders required fields (Property 4)
    - **Property 4: Passkey list renders required fields**
    - **Validates: Requirements 4.2**
    - Use `fc.array(fc.record({ id: fc.uuid(), credential_id: fc.string(), device_hint: fc.string({ minLength: 1 }), created_at: fc.date().map(d => d.toISOString()), user_id: fc.uuid(), public_key: fc.string() }))` to generate credential arrays; render `PasskeyManagement` with mocked hook; assert each `device_hint` and formatted date appears in the DOM

  - [x] 5.5 Write property test for WebAuthn unavailability hides UI (Property 8)
    - **Property 8: WebAuthn unavailability hides all passkey UI**
    - **Validates: Requirements 2.5, 6.1, 6.2**
    - Set `window.PublicKeyCredential = undefined` before rendering `PasskeyRegistrationPrompt`, `PasskeyVerificationModal`, and `PasskeyManagement`; assert none of them render passkey-related elements in the DOM

- [x] 6. Add GitHub OAuth button to `Auth.tsx`
  - Add a "Continue with GitHub" button in `src/pages/Auth.tsx` alongside the existing Google button
  - Implement `handleGitHubLogin`: set `localStorage.setItem("pending_role", signupRole)`, call `supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin } })`
  - On error, call `toast.error(error.message)` and remove `pending_role` from localStorage
  - Wire `PasskeyRegistrationPrompt` into the post-login state of `Auth.tsx` (shown after successful OAuth callback when user has no passkey yet)
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 6.4_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire passkey verification into `ProtectedRoute` in `App.tsx`
  - Add `passkeyVerified` boolean state (default `false`) to `ProtectedRoute`
  - After the existing role check, add: if `hasPasskey && !passkeyVerified`, render `<PasskeyVerificationModal onVerified={() => setPasskeyVerified(true)} onSkip={() => setPasskeyVerified(true)} />`
  - Otherwise render `{children}`
  - _Requirements: 3.1, 3.2, 3.6_

- [x] 9. Implement `pending_role` localStorage round-trip in `useAuth`
  - In `src/hooks/useAuth.tsx`, after a new OAuth session is detected (user exists but no role in `user_roles`), read and remove `localStorage.getItem("pending_role")`
  - If a pending role exists, upsert it into `user_roles` automatically before showing `RoleSetupModal`
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 9.1 Write property test for pending_role localStorage round-trip (Property 6)
    - **Property 6: pending_role localStorage round-trip**
    - **Validates: Requirements 5.5**
    - Use `fc.constantFrom("student", "teacher")` to generate role values; simulate setting `pending_role` before OAuth callback and processing the session in `useAuth`; assert `localStorage.getItem("pending_role")` is `null` after the hook processes the session

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `fc.assert(fc.property(...))` and must include a comment tag: `Feature: oauth-passkey-auth, Property {N}: {property_text}`
- `passkeyVerified` is session-only React state — never persisted to localStorage or the database
- Full server-side WebAuthn signature verification is out of scope; browser/OS biometric validation via `navigator.credentials.get()` success is the verification signal
