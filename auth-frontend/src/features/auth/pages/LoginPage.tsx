import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../../api/auth';

interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

function validate(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email) {
    errors.email = 'Enter a valid email address.';
  } else {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(values.email)) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (!values.password || values.password.length < 1) {
    errors.password = 'Password is required.';
  }

  return errors;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [values, setValues] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      navigate('/');
    } catch (err: unknown) {
      let message = 'Invalid email or password.';
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
      ) {
        const data = (err as { response: { data: { error?: { message?: string } } } }).response.data;
        if (data?.error?.message) {
          message = data.error.message;
        }
      }
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
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
          --family-mono: 'JetBrains Mono', 'Courier New', monospace;
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

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: var(--family-base);
          background-color: var(--color-bg-app);
          color: var(--color-text-primary);
          font-size: 16px;
          line-height: 1.5;
        }

        .centered-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          background-color: var(--color-bg-app);
        }

        .branding {
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .branding__name {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-accent-primary);
          line-height: 1.25;
        }

        .auth-card {
          background-color: var(--color-surface);
          border-radius: var(--radius-card);
          box-shadow: var(--elevation-card);
          padding: var(--space-2xl);
          width: 100%;
          max-width: 448px;
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .auth-card__title {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text-primary);
          text-align: center;
        }

        .auth-card__fields {
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
          line-height: 1.5;
          color: var(--color-text-secondary);
        }

        .auth-card__input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-card__input {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-input);
          font-size: 16px;
          font-family: var(--family-base);
          line-height: 1.5;
          color: var(--color-text-primary);
          background-color: var(--color-surface);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .auth-card__input:focus {
          border-color: var(--color-accent-primary);
          box-shadow: var(--elevation-focus);
        }

        .auth-card__input.field--error {
          border-color: var(--color-error);
        }

        .auth-card__input--password {
          padding-right: 48px;
        }

        .auth-card__password-toggle {
          position: absolute;
          right: var(--space-sm);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: var(--space-xs);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .auth-card__password-toggle:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .auth-card__field-error {
          font-size: 12px;
          line-height: 1.5;
          color: var(--color-error);
          font-weight: 400;
        }

        .auth-card__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-sm);
        }

        .auth-card__checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          user-select: none;
        }

        .auth-card__checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--color-accent-primary);
          cursor: pointer;
        }

        .link {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-link);
          text-decoration: none;
          line-height: 1.5;
        }

        .link:hover {
          text-decoration: underline;
        }

        .link:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
          border-radius: var(--radius-sm);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-button);
          font-size: 16px;
          font-weight: 600;
          font-family: var(--family-base);
          line-height: 1.5;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .btn--primary {
          background-color: var(--color-accent-primary);
          color: var(--color-surface);
        }

        .btn--primary:hover:not(:disabled) {
          background-color: var(--color-accent-primary-hover);
        }

        .btn--primary:active:not(:disabled) {
          background-color: var(--color-accent-primary-active);
        }

        .btn--primary:disabled {
          background-color: var(--color-accent-disabled);
          cursor: not-allowed;
        }

        .btn--primary:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: var(--radius-full);
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-error-banner {
          border-radius: var(--radius-input);
          background-color: #fef2f2;
          border: 1px solid var(--color-error);
          padding: var(--space-sm) var(--space-md);
          font-size: 14px;
          color: var(--color-error);
          line-height: 1.5;
        }

        .auth-card__footer {
          font-size: 14px;
          color: var(--color-text-secondary);
          text-align: center;
          line-height: 1.5;
        }
      `}</style>

      <div className="centered-layout">
        <div className="branding" aria-label="auth-starter">
          <span className="branding__name">auth-starter</span>
        </div>

        <form
          className="auth-card"
          aria-labelledby="login-title"
          onSubmit={handleSubmit}
          noValidate
        >
          <h1 className="auth-card__title" id="login-title">
            Sign in
          </h1>

          {errors.form && (
            <div
              className="form-error-banner"
              role="alert"
              aria-live="polite"
            >
              {errors.form}
            </div>
          )}

          <div className="auth-card__fields">
            <div className="auth-card__field">
              <label htmlFor="login-email">Email address</label>
              <div className="auth-card__input-wrapper">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={values.email}
                  onChange={handleChange}
                  className={`auth-card__input${errors.email ? ' field--error' : ''}`}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-invalid={!!errors.email}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <span
                  id="login-email-error"
                  className="auth-card__field-error"
                  role="alert"
                >
                  {errors.email}
                </span>
              )}
            </div>

            <div className="auth-card__field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-card__input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={values.password}
                  onChange={handleChange}
                  className={`auth-card__input auth-card__input--password${errors.password ? ' field--error' : ''}`}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  aria-invalid={!!errors.password}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-card__password-toggle"
                  onClick={handleTogglePassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && (
                <span
                  id="login-password-error"
                  className="auth-card__field-error"
                  role="alert"
                >
                  {errors.password}
                </span>
              )}
            </div>

            <div className="auth-card__row">
              <label className="auth-card__checkbox-label">
                <input
                  className="auth-card__checkbox"
                  type="checkbox"
                  name="rememberMe"
                  checked={values.rememberMe}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="link">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-card__footer">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="link">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default LoginPage;
