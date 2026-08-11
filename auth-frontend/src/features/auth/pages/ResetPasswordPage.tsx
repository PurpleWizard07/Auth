import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../../../api/auth';

const CSS = `
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
    --elevation-card: 0 12px 32px rgba(15,23,42,0.12);
    --elevation-focus: 0 0 0 3px rgba(129,140,248,0.45);
    --family-base: Inter, 'Segoe UI', system-ui, -apple-system, sans-serif;
    --radius-button: 8px;
    --radius-card: 16px;
    --radius-input: 8px;
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
  }

  .reset-password-layout {
    min-height: 100vh;
    background: var(--color-bg-app);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    padding: var(--space-lg);
  }

  .reset-password-layout__branding {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .reset-password-layout__logo {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-accent-primary);
    line-height: 1.2;
    letter-spacing: -0.5px;
  }

  .reset-password-layout__tagline {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .auth-card {
    background: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 440px;
  }

  .auth-card__title {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.2;
    margin: 0 0 var(--space-sm) 0;
  }

  .auth-card__subtitle {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-xl) 0;
    line-height: 1.5;
  }

  .auth-card__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
  }

  .auth-card__label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  .auth-card__input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .auth-card__input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    padding-right: 44px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    font-size: 16px;
    font-family: var(--family-base);
    color: var(--color-text-primary);
    background: var(--color-surface);
    box-sizing: border-box;
    line-height: 1.5;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }

  .auth-card__input:focus {
    border-color: var(--color-accent-primary);
    box-shadow: var(--elevation-focus);
  }

  .auth-card__input.field--error {
    border-color: var(--color-error);
  }

  .auth-card__input.field--error:focus {
    box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
  }

  .auth-card__toggle {
    position: absolute;
    right: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: var(--space-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    line-height: 1;
    font-size: 14px;
  }

  .auth-card__toggle:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }

  .auth-card__field-error {
    font-size: 12px;
    color: var(--color-error);
    line-height: 1.5;
    margin: 0;
  }

  .password-strength {
    margin-top: var(--space-xs);
  }

  .password-strength__bar {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
  }

  .password-strength__segment {
    flex: 1;
    height: 4px;
    border-radius: var(--radius-full, 9999px);
    background: var(--color-border);
    transition: background 0.2s;
  }

  .password-strength__segment--weak {
    background: var(--color-error);
  }

  .password-strength__segment--fair {
    background: var(--color-warning);
  }

  .password-strength__segment--good {
    background: var(--color-info);
  }

  .password-strength__segment--strong {
    background: var(--color-success);
  }

  .password-strength__label {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .auth-card__submit {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-accent-primary);
    color: #fff;
    border: none;
    border-radius: var(--radius-button);
    font-size: 16px;
    font-weight: 600;
    font-family: var(--family-base);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
    transition: background 0.15s;
    line-height: 1.5;
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

  .auth-card__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .auth-card__banner {
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
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
    margin-top: var(--space-lg);
    text-align: center;
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .auth-card__link {
    color: var(--color-link);
    font-weight: 500;
    text-decoration: none;
  }

  .auth-card__link:hover {
    text-decoration: underline;
  }
`;

interface FormState {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

function getPasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  return score;
}

function getStrengthLabel(score: number): string {
  if (score === 0) return '';
  if (score === 1) return 'Weak';
  if (score === 2) return 'Fair';
  if (score === 3) return 'Good';
  return 'Strong';
}

function getSegmentClass(segmentIndex: number, score: number): string {
  if (score === 0 || segmentIndex >= score) return 'password-strength__segment';
  if (score === 1) return 'password-strength__segment password-strength__segment--weak';
  if (score === 2) return 'password-strength__segment password-strength__segment--fair';
  if (score === 3) return 'password-strength__segment password-strength__segment--good';
  return 'password-strength__segment password-strength__segment--strong';
}

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/[A-Z]/.test(values.password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(values.password)) {
    errors.password = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(values.password)) {
    errors.password = 'Password must contain at least one number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [values, setValues] = useState<FormState>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const updatedValues = { ...values, [name]: value };
      const updatedErrors = validateForm(updatedValues);
      setErrors(prev => ({ ...prev, [name]: updatedErrors[name as keyof FormErrors] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const updatedErrors = validateForm(values);
    setErrors(prev => ({ ...prev, [name]: updatedErrors[name as keyof FormErrors] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const allTouched = { password: true, confirmPassword: true };
    setTouched(allTouched);
    const validationErrors = validateForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!token) {
      setBannerError('Reset token is missing or invalid. Please request a new password reset link.');
      return;
    }

    setIsSubmitting(true);
    setBannerError('');

    try {
      await resetPassword({ token, password: values.password, confirmPassword: values.confirmPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
      ) {
        const data = (err as { response: { data: { error?: { message?: string } } } }).response.data;
        setBannerError(data?.error?.message ?? 'An unexpected error occurred. Please try again.');
      } else {
        setBannerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordScore = getPasswordScore(values.password);
  const strengthLabel = getStrengthLabel(passwordScore);

  return (
    <div className="reset-password-layout">
      <div className="reset-password-layout__branding" aria-label="AuthStarter">
        <div className="reset-password-layout__logo">AuthStarter</div>
        <div className="reset-password-layout__tagline">Secure authentication, ready to go</div>
      </div>

      <main className="auth-card" role="main">
        <h1 className="auth-card__title">Set new password</h1>
        <p className="auth-card__subtitle">
          Choose a strong password for your account. You will be redirected to login after resetting.
        </p>

        <div aria-live="polite" aria-atomic="true">
          {bannerError && (
            <div className="auth-card__banner auth-card__banner--error" role="alert">
              {bannerError}
            </div>
          )}
          {success && (
            <div className="auth-card__banner auth-card__banner--success" role="status">
              Your password has been reset successfully. Redirecting to login…
            </div>
          )}
        </div>

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="password">
                New Password
              </label>
              <div className="auth-card__input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`auth-card__input${errors.password && touched.password ? ' field--error' : ''}`}
                  aria-describedby={errors.password && touched.password ? 'password-error' : 'password-strength-label'}
                  aria-invalid={!!(errors.password && touched.password)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-card__toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={0}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {values.password.length > 0 && (
                <div className="password-strength">
                  <div className="password-strength__bar" aria-hidden="true">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={getSegmentClass(i, passwordScore)} />
                    ))}
                  </div>
                  <span
                    id="password-strength-label"
                    className="password-strength__label"
                    aria-live="polite"
                  >
                    {strengthLabel ? `Password strength: ${strengthLabel}` : ''}
                  </span>
                </div>
              )}
              {errors.password && touched.password && (
                <p id="password-error" className="auth-card__field-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="auth-card__input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`auth-card__input${errors.confirmPassword && touched.confirmPassword ? ' field--error' : ''}`}
                  aria-describedby={errors.confirmPassword && touched.confirmPassword ? 'confirmPassword-error' : undefined}
                  aria-invalid={!!(errors.confirmPassword && touched.confirmPassword)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-card__toggle"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirm(prev => !prev)}
                  tabIndex={0}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <p id="confirmPassword-error" className="auth-card__field-error" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-card__submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting && <span className="auth-card__spinner" aria-hidden="true" />}
              {isSubmitting ? 'Resetting password…' : 'Reset password'}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/login" className="auth-card__link">
            Back to login
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
