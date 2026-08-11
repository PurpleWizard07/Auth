import React, { useState } from 'react';
import { forgotPassword } from '../../../api/auth';

const styles = `
  :root {
    --color-accent-disabled: #c7d2fe;
    --color-accent-primary: #4f46e5;
    --color-accent-primary-active: #3730a3;
    --color-accent-primary-hover: #4338ca;
    --color-bg-app: #f1f5f9;
    --color-border: #E2E8F0;
    --color-border-strong: #CBD5E1;
    --color-error: #DC2626;
    --color-focus-ring: #818cf8;
    --color-info: #2563EB;
    --color-link: #4f46e5;
    --color-muted-surface: #f8fafc;
    --color-success: #16A34A;
    --color-surface: #FFFFFF;
    --color-text-muted: #94A3B8;
    --color-text-primary: #0F172A;
    --color-text-secondary: #475569;
    --color-warning: #D97706;

    --elevation-1: 0 1px 2px rgba(15,23,42,0.06);
    --elevation-2: 0 4px 12px rgba(15,23,42,0.08);
    --elevation-card: 0 12px 32px rgba(15,23,42,0.12);
    --elevation-focus: 0 0 0 3px rgba(129,140,248,0.45);

    --family-base: Inter, 'Segoe UI', system-ui, -apple-system, sans-serif;

    --radius-button: 8px;
    --radius-card: 16px;
    --radius-full: 9999px;
    --radius-input: 8px;
    --radius-lg: 12px;
    --radius-sm: 4px;

    --space-2xl: 48px;
    --space-lg: 24px;
    --space-md: 16px;
    --space-sm: 8px;
    --space-xl: 32px;
    --space-xs: 4px;
  }

  .forgot-password-layout {
    min-height: 100vh;
    background-color: var(--color-bg-app);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    padding: var(--space-md);
  }

  .forgot-password-layout__branding {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .forgot-password-layout__branding-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-accent-primary);
    letter-spacing: -0.5px;
  }

  .auth-card {
    background: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 420px;
  }

  .auth-card__title {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .auth-card__subtitle {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-xl) 0;
  }

  .auth-card__field {
    margin-bottom: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .auth-card__label {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .auth-card__input {
    font-family: var(--family-base);
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    padding: 10px var(--space-md);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
  }

  .auth-card__input:focus {
    border-color: var(--color-accent-primary);
    box-shadow: var(--elevation-focus);
  }

  .auth-card__input.field--error {
    border-color: var(--color-error);
  }

  .auth-card__input:disabled {
    background: var(--color-muted-surface);
    color: var(--color-text-muted);
    cursor: not-allowed;
  }

  .auth-card__field-error {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-error);
  }

  .auth-card__submit {
    font-family: var(--family-base);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: #ffffff;
    background: var(--color-accent-primary);
    border: none;
    border-radius: var(--radius-button);
    padding: 11px var(--space-lg);
    width: 100%;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  .auth-card__submit:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
  }

  .auth-card__submit:active:not(:disabled) {
    background: var(--color-accent-primary-active);
  }

  .auth-card__submit:disabled {
    background: var(--color-accent-disabled);
    cursor: not-allowed;
  }

  .auth-card__submit:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
  }

  .auth-card__spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #ffffff;
    border-radius: var(--radius-full);
    animation: auth-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes auth-spin {
    to { transform: rotate(360deg); }
  }

  .auth-card__banner {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    border-radius: var(--radius-sm);
    padding: var(--space-sm) var(--space-md);
    margin-bottom: var(--space-md);
  }

  .auth-card__banner--error {
    color: var(--color-error);
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .auth-card__banner--success {
    color: var(--color-success);
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  .auth-card__footer {
    margin-top: var(--space-lg);
    text-align: center;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }

  .auth-card__footer .link {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
  }

  .auth-card__footer .link:hover {
    text-decoration: underline;
  }
`;

interface ForgotPasswordFormState {
  email: string;
}

interface ForgotPasswordFieldErrors {
  email?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Email is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

function validate(fields: ForgotPasswordFormState): ForgotPasswordFieldErrors {
  const errors: ForgotPasswordFieldErrors = {};
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  return errors;
}

const ForgotPasswordPage: React.FC = () => {
  const [fields, setFields] = useState<ForgotPasswordFormState>({ email: '' });
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof ForgotPasswordFieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (bannerError) setBannerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessMessage(null);

    const errors = validate(fields);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email: fields.email.trim() });
      setSuccessMessage(
        'If that email address is in our system, you will receive a password reset link shortly.'
      );
      setFields({ email: '' });
    } catch {
      setBannerError(
        'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailErrorId = 'forgot-password-email-error';
  const bannerId = 'forgot-password-banner';

  return (
    <>
      <style>{styles}</style>
      <div className="forgot-password-layout">
        <div className="forgot-password-layout__branding" aria-label="auth-starter">
          <span className="forgot-password-layout__branding-name">auth-starter</span>
        </div>

        <main className="auth-card" role="main">
          <h1 className="auth-card__title">Forgot password?</h1>
          <p className="auth-card__subtitle">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <div aria-live="polite" aria-atomic="true">
            {bannerError && (
              <div
                id={bannerId}
                role="alert"
                className="auth-card__banner auth-card__banner--error"
              >
                {bannerError}
              </div>
            )}
            {successMessage && (
              <div
                id={bannerId}
                role="status"
                className="auth-card__banner auth-card__banner--success"
              >
                {successMessage}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="forgot-password-email">
                Email address
              </label>
              <input
                id="forgot-password-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className={`auth-card__input${fieldErrors.email ? ' field--error' : ''}`}
                value={fields.email}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <span id={emailErrorId} className="auth-card__field-error" role="alert">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="auth-card__submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting && (
                <span className="auth-card__spinner" aria-hidden="true" />
              )}
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-card__footer">
            Remember your password?{' '}
            <a className="link" href="/login">
              Sign in
            </a>
          </div>
        </main>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
