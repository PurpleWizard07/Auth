import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../../api/auth';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score;
}

function validateForm(values: RegisterForm): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName || values.fullName.trim().length < 1) {
    errors.fullName = 'Full name is required.';
  } else if (values.fullName.length > 120) {
    errors.fullName = 'Full name is required.';
  }

  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password || values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(values.password)) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!values.confirmPassword || values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'You must accept the Terms to continue.';
  }

  return errors;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = [
  'transparent',
  'var(--color-error)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-success)',
];

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const uid = useId();

  const [values, setValues] = useState<RegisterForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const passwordStrength = getPasswordStrength(values.password);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms: values.acceptTerms,
      });
      setSuccessMessage('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      if (
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('already')
      ) {
        setErrors({ email: 'That email is already registered.' });
      } else {
        setErrors({ general: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const fullNameId = `${uid}-fullName`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const confirmPasswordId = `${uid}-confirmPassword`;
  const acceptTermsId = `${uid}-acceptTerms`;

  return (
    <>
      <style>{`
        :root {
          --color-accent-primary: #4f46e5;
          --color-accent-primary-hover: #4338ca;
          --color-accent-primary-active: #3730a3;
          --color-accent-disabled: #c7d2fe;
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
          --elevation-card: 0 12px 32px rgba(15,23,42,0.12);
          --elevation-focus: 0 0 0 3px rgba(129,140,248,0.45);
          --radius-card: 16px;
          --radius-input: 8px;
          --radius-button: 8px;
          --space-xs: 4px;
          --space-sm: 8px;
          --space-md: 16px;
          --space-lg: 24px;
          --space-xl: 32px;
          --space-2xl: 48px;
          --family-base: Inter, 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .register-page {
          min-height: 100vh;
          background: var(--color-bg-app);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          font-family: var(--family-base);
          color: var(--color-text-primary);
        }

        .register-page__branding {
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .register-page__branding-logo {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-accent-primary);
          letter-spacing: -0.5px;
        }

        .register-page__branding-tagline {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-top: var(--space-xs);
        }

        .auth-card {
          background: var(--color-surface);
          border-radius: var(--radius-card);
          box-shadow: var(--elevation-card);
          padding: var(--space-xl);
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
          font-weight: 500;
          color: var(--color-text-secondary);
          margin: 0 0 var(--space-xl) 0;
        }

        .auth-card__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .auth-card__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .auth-card__field label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .auth-card__input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-card__input {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          font-size: 16px;
          font-family: var(--family-base);
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border-strong);
          border-radius: var(--radius-input);
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }

        .auth-card__input:focus {
          border-color: var(--color-accent-primary);
          box-shadow: var(--elevation-focus);
        }

        .auth-card__input--error {
          border-color: var(--color-error);
        }

        .auth-card__input--error:focus {
          box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
        }

        .auth-card__input--with-toggle {
          padding-right: 44px;
        }

        .auth-card__toggle-btn {
          position: absolute;
          right: var(--space-sm);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: var(--space-xs);
          display: flex;
          align-items: center;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          font-family: var(--family-base);
          transition: color 0.15s;
        }

        .auth-card__toggle-btn:hover {
          color: var(--color-text-secondary);
        }

        .auth-card__toggle-btn:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .field__error {
          font-size: 12px;
          font-weight: 400;
          color: var(--color-error);
          margin: 0;
          line-height: 1.5;
        }

        .field--error .auth-card__input {
          border-color: var(--color-error);
        }

        .password-strength {
          margin-top: var(--space-xs);
        }

        .password-strength__bars {
          display: flex;
          gap: var(--space-xs);
          margin-bottom: var(--space-xs);
        }

        .password-strength__bar {
          flex: 1;
          height: 4px;
          border-radius: var(--space-xs);
          background: var(--color-border);
          transition: background 0.2s;
        }

        .password-strength__label {
          font-size: 12px;
          font-weight: 400;
          color: var(--color-text-secondary);
        }

        .auth-card__checkbox-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .auth-card__checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }

        .auth-card__checkbox {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          accent-color: var(--color-accent-primary);
          cursor: pointer;
        }

        .auth-card__checkbox-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          line-height: 1.5;
        }

        .auth-card__checkbox-label a {
          color: var(--color-link);
          text-decoration: underline;
        }

        .auth-card__submit {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          font-size: 16px;
          font-weight: 600;
          font-family: var(--family-base);
          color: var(--color-surface);
          background: var(--color-accent-primary);
          border: none;
          border-radius: var(--radius-button);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          transition: background 0.15s;
          margin-top: var(--space-sm);
          min-height: 44px;
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
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-card__banner {
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-input);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: var(--space-md);
        }

        .auth-card__banner--error {
          background: #fef2f2;
          color: var(--color-error);
          border: 1px solid #fecaca;
        }

        .auth-card__banner--success {
          background: #f0fdf4;
          color: var(--color-success);
          border: 1px solid #bbf7d0;
        }

        .auth-card__footer {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin: var(--space-lg) 0 0 0;
        }

        .link {
          color: var(--color-link);
          text-decoration: none;
          font-weight: 600;
        }

        .link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="register-page">
        <div className="register-page__branding">
          <div className="register-page__branding-logo">auth-starter</div>
          <div className="register-page__branding-tagline">Create your account</div>
        </div>

        <div className="auth-card">
          <h1 className="auth-card__title">Register</h1>
          <p className="auth-card__subtitle">Fill in the details below to get started.</p>

          <div aria-live="polite">
            {errors.general && (
              <div className="auth-card__banner auth-card__banner--error" role="alert">
                {errors.general}
              </div>
            )}
            {successMessage && (
              <div className="auth-card__banner auth-card__banner--success" role="status">
                {successMessage}
              </div>
            )}
          </div>

          <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className={`auth-card__field${errors.fullName ? ' field--error' : ''}`}>
              <label htmlFor={fullNameId}>Full name</label>
              <div className="auth-card__input-wrapper">
                <input
                  id={fullNameId}
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={values.fullName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-describedby={errors.fullName ? `${fullNameId}-err` : undefined}
                  aria-invalid={!!errors.fullName}
                  className={`auth-card__input${errors.fullName ? ' auth-card__input--error' : ''}`}
                  maxLength={120}
                />
              </div>
              {errors.fullName && (
                <p className="field__error" id={`${fullNameId}-err`}>
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className={`auth-card__field${errors.email ? ' field--error' : ''}`}>
              <label htmlFor={emailId}>Email address</label>
              <div className="auth-card__input-wrapper">
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-describedby={errors.email ? `${emailId}-err` : undefined}
                  aria-invalid={!!errors.email}
                  className={`auth-card__input${errors.email ? ' auth-card__input--error' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="field__error" id={`${emailId}-err`}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className={`auth-card__field${errors.password ? ' field--error' : ''}`}>
              <label htmlFor={passwordId}>Password</label>
              <div className="auth-card__input-wrapper">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-describedby={
                    [
                      errors.password ? `${passwordId}-err` : '',
                      `${passwordId}-strength`,
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  aria-invalid={!!errors.password}
                  className={`auth-card__input auth-card__input--with-toggle${errors.password ? ' auth-card__input--error' : ''}`}
                />
                <button
                  type="button"
                  className="auth-card__toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={0}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {values.password.length > 0 && (
                <div className="password-strength" id={`${passwordId}-strength`}>
                  <div className="password-strength__bars" aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="password-strength__bar"
                        style={{
                          background:
                            passwordStrength >= level
                              ? strengthColors[passwordStrength]
                              : 'var(--color-border)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="password-strength__label">
                    {passwordStrength > 0 ? strengthLabels[passwordStrength] : ''}
                  </span>
                </div>
              )}
              {errors.password && (
                <p className="field__error" id={`${passwordId}-err`}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`auth-card__field${errors.confirmPassword ? ' field--error' : ''}`}>
              <label htmlFor={confirmPasswordId}>Confirm password</label>
              <div className="auth-card__input-wrapper">
                <input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-describedby={
                    errors.confirmPassword ? `${confirmPasswordId}-err` : undefined
                  }
                  aria-invalid={!!errors.confirmPassword}
                  className={`auth-card__input auth-card__input--with-toggle${errors.confirmPassword ? ' auth-card__input--error' : ''}`}
                />
                <button
                  type="button"
                  className="auth-card__toggle-btn"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={0}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="field__error" id={`${confirmPasswordId}-err`}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Accept Terms */}
            <div className="auth-card__checkbox-field">
              <div className="auth-card__checkbox-row">
                <input
                  id={acceptTermsId}
                  name="acceptTerms"
                  type="checkbox"
                  checked={values.acceptTerms}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-describedby={
                    errors.acceptTerms ? `${acceptTermsId}-err` : undefined
                  }
                  aria-invalid={!!errors.acceptTerms}
                  className="auth-card__checkbox"
                />
                <label htmlFor={acceptTermsId} className="auth-card__checkbox-label">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="field__error" id={`${acceptTermsId}-err`}>
                  {errors.acceptTerms}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-card__submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting && <span className="spinner" aria-hidden="true" />}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account?{' '}
            <Link className="link" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
