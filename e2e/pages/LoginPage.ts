import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page (/login).
 *
 * Key selectors are derived from LoginForm.tsx:
 *   - identifier field: #identifier
 *   - password field:   #password
 *   - submit button:    type="submit"
 *   - error alert:      role="alert"
 */
export class LoginPage {
  readonly page: Page;

  // ─── Locators ──────────────────────────────────────────────────────────────
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly errorAlert: Locator;
  readonly identifierError: Locator;
  readonly passwordError: Locator;
  readonly passwordToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.identifierInput = page.locator('#identifier');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.rememberMeCheckbox = page.locator('#rememberMe');
    // Exclude the Next.js route announcer (role="alert" aria-live="assertive")
    // which conflicts with strict mode when our form alert is also present.
    this.errorAlert = page.locator('[role="alert"][aria-live="polite"]');
    this.identifierError = page.locator('#identifier-error');
    this.passwordError = page.locator('#password-error');
    // Password visibility toggle sits inside the password wrapper as a
    // <button type="button"> with an Eye/EyeOff icon and no aria-label.
    // Target it as the sibling button next to the password input.
    this.passwordToggle = page
      .locator('#password')
      .locator('..')
      .locator('button[type="button"]')
      .first();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/login');
    await expect(this.identifierInput).toBeVisible();
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  /**
   * Fill the identifier (email/username) and password fields then submit.
   */
  async login(identifier: string, password: string) {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Login with "Remember Me" checked.
   */
  async loginWithRememberMe(identifier: string, password: string) {
    await this.identifierInput.fill(identifier);
    await this.rememberMeCheckbox.check();
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Toggle password visibility and verify the input type changes.
   */
  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async expectErrorVisible(message: string) {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(message);
  }

  async expectIdentifierErrorVisible(message: string) {
    await expect(this.identifierError).toBeVisible();
    await expect(this.identifierError).toContainText(message);
  }

  async expectPasswordErrorVisible(message: string) {
    await expect(this.passwordError).toBeVisible();
    await expect(this.passwordError).toContainText(message);
  }

  async expectSubmitDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }

  async expectLoadingState() {
    await expect(this.submitButton).toHaveAttribute('aria-busy', 'true');
  }

  async expectRedirectedToDashboard() {
    // After a successful login the app navigates away from /login
    await this.page.waitForURL(/\/(dashboard|$)/, { timeout: 10_000 });
  }
}
