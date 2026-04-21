# Requirements Document

## Introduction

This feature enhances the Academic Suite authentication system by adding GitHub OAuth login alongside the existing Google OAuth, and introducing WebAuthn/passkey authentication (fingerprint, Face ID, Windows Hello) as a device-level verification step after OAuth sign-in. The goal is to give users a faster, more secure login experience using their device's biometric or PIN capabilities.

The app uses InsForge as the backend (BaaS), React + Vite on the frontend, and already has Google OAuth and email/password auth in place. This feature extends that foundation.

## Glossary

- **Auth_System**: The InsForge-backed authentication layer in the app, accessed via `supabase.auth`
- **OAuth_Provider**: An external identity provider (Google or GitHub) used for federated login
- **Passkey**: A WebAuthn credential stored on the user's device, verified via biometrics (fingerprint, Face ID) or device PIN
- **WebAuthn**: The W3C Web Authentication API enabling passwordless, device-bound authentication
- **Credential_Manager**: The browser's built-in WebAuthn credential management interface (`navigator.credentials`)
- **User**: An authenticated person using the Academic Suite app (student or teacher)
- **Role**: A user's designation in the system — either "student" or "teacher"
- **RoleSetupModal**: The existing UI overlay that prompts OAuth users without a role to pick one

## Requirements

### Requirement 1: GitHub OAuth Login

**User Story:** As a user, I want to sign in with my GitHub account, so that I can access the app without creating a separate password.

#### Acceptance Criteria

1. THE Auth_Page SHALL display a "Continue with GitHub" button alongside the existing Google button.
2. WHEN a user clicks "Continue with GitHub", THE Auth_System SHALL initiate an OAuth flow with GitHub as the provider using `supabase.auth.signInWithOAuth`.
3. WHEN the GitHub OAuth flow completes successfully, THE Auth_System SHALL redirect the user back to the app origin.
4. WHEN a GitHub user has no role assigned, THE RoleSetupModal SHALL be displayed to prompt role selection.
5. WHEN a GitHub user already has a role assigned, THE Auth_System SHALL redirect the user to the dashboard.
6. IF the GitHub OAuth flow fails, THEN THE Auth_Page SHALL display a descriptive error message via toast notification.

---

### Requirement 2: Passkey Registration

**User Story:** As a user, I want to register my device's biometric (fingerprint or Face ID) as a passkey, so that I can verify my identity quickly on future logins.

#### Acceptance Criteria

1. WHEN a user is authenticated via OAuth or email, THE Auth_System SHALL offer an option to register a passkey for their account.
2. WHEN a user initiates passkey registration, THE Credential_Manager SHALL invoke `navigator.credentials.create()` with a valid `PublicKeyCredentialCreationOptions` object.
3. WHEN the device biometric or PIN prompt is completed successfully, THE Auth_System SHALL store the credential ID and public key associated with the user's account in the database.
4. IF the user cancels the biometric prompt, THEN THE Auth_System SHALL dismiss the registration flow without error and allow the user to proceed normally.
5. IF `navigator.credentials` is not available in the browser, THEN THE Auth_System SHALL hide the passkey registration option and not present it to the user.
6. THE Passkey_Registration SHALL use the app origin as the `rpId` (Relying Party ID) in the WebAuthn options.

---

### Requirement 3: Passkey Verification After OAuth Login

**User Story:** As a user who has registered a passkey, I want to be prompted for my device biometric after signing in with Google or GitHub, so that my account has an additional layer of security.

#### Acceptance Criteria

1. WHEN a user with a registered passkey completes an OAuth login, THE Auth_System SHALL prompt the user for passkey verification before granting access to the dashboard.
2. WHEN the user completes the biometric or PIN prompt successfully, THE Auth_System SHALL allow navigation to the dashboard.
3. WHEN the passkey verification is triggered, THE Credential_Manager SHALL invoke `navigator.credentials.get()` with the stored credential ID for that user.
4. IF the passkey verification fails or times out, THEN THE Auth_System SHALL display an error message and allow the user to retry or skip verification.
5. WHILE passkey verification is in progress, THE Auth_Page SHALL display a loading indicator and disable other interactive elements.
6. WHERE a user has not registered a passkey, THE Auth_System SHALL skip the passkey verification step entirely and proceed directly to the dashboard.

---

### Requirement 4: Passkey Management

**User Story:** As a user, I want to view and remove my registered passkeys, so that I can manage which devices have access to my account.

#### Acceptance Criteria

1. THE Auth_System SHALL store passkey credential metadata (credential ID, device name hint, registration timestamp) per user in the database.
2. WHEN a user accesses their account settings, THE Auth_System SHALL display a list of registered passkeys with their device name hint and registration date.
3. WHEN a user removes a passkey, THE Auth_System SHALL delete the corresponding credential record from the database.
4. IF a user removes all passkeys, THEN THE Auth_System SHALL disable the passkey verification step for that user on future logins.

---

### Requirement 5: Role Assignment for OAuth Users

**User Story:** As a new OAuth user (Google or GitHub), I want to be asked to choose my role (student or teacher) after my first login, so that the app knows how to configure my experience.

#### Acceptance Criteria

1. WHEN a new OAuth user (Google or GitHub) completes login for the first time and has no role in the `user_roles` table, THE RoleSetupModal SHALL be displayed.
2. WHEN the user selects a role in the RoleSetupModal, THE Auth_System SHALL upsert the role into the `user_roles` table using `onConflict: "user_id"`.
3. IF the role upsert fails, THEN THE Auth_System SHALL display an error toast and allow the user to retry.
4. WHEN the role is saved successfully, THE Auth_System SHALL reload the session and navigate the user to the dashboard.
5. THE pending role selected before OAuth redirect SHALL be persisted in `localStorage` under the key `"pending_role"` and consumed after the OAuth callback completes.

---

### Requirement 6: Browser Compatibility and Graceful Degradation

**User Story:** As a user on a browser or device that does not support WebAuthn, I want the app to still work normally, so that I am not blocked from logging in.

#### Acceptance Criteria

1. WHEN the app loads, THE Auth_System SHALL check for `window.PublicKeyCredential` availability before rendering any passkey-related UI.
2. WHERE WebAuthn is not supported, THE Auth_System SHALL render the auth page without passkey options and proceed with OAuth or email/password only.
3. IF a passkey operation throws an unhandled exception, THEN THE Auth_System SHALL catch the error, log it to the console, and fall back to standard login without crashing.
4. THE Auth_Page SHALL remain fully functional for email/password and OAuth login regardless of WebAuthn support.
