import React, { useContext, useState } from 'react';
import { AuthContext } from '../features/auth/context/AuthContext';
import { logout } from '../api/auth';

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

  .profile-page {
    min-height: 100vh;
    background-color: var(--color-bg-app);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    padding: var(--space-lg);
  }

  .profile-page__branding {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .profile-page__branding-title {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
    margin: 0;
  }

  .profile-page__branding-subtitle {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: var(--space-xs) 0 0 0;
  }

  .auth-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 480px;
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
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-xl) 0;
  }

  .profile-page__field {
    margin-bottom: var(--space-md);
  }

  .profile-page__label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .profile-page__value {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-primary);
    background-color: var(--color-muted-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
    width: 100%;
    box-sizing: border-box;
  }

  .profile-page__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--space-xl) 0;
  }

  .profile-page__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
  }

  .profile-page__badge--active {
    background-color: #dcfce7;
    color: var(--color-success);
  }

  .profile-page__badge--inactive {
    background-color: #fee2e2;
    color: var(--color-error);
  }

  .profile-page__badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
    flex-shrink: 0;
  }

  .profile-page__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-xl);
  }

  .profile-page__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-button);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    border: none;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }

  .profile-page__btn:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
  }

  .profile-page__btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .profile-page__btn--danger {
    background-color: #fef2f2;
    color: var(--color-error);
    border: 1px solid #fecaca;
  }

  .profile-page__btn--danger:hover:not(:disabled) {
    background-color: #fee2e2;
  }

  .profile-page__btn--danger:active:not(:disabled) {
    background-color: #fecaca;
  }

  .profile-page__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: profile-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes profile-spin {
    to { transform: rotate(360deg); }
  }

  .profile-page__error-banner {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
    color: var(--color-error);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    margin-bottom: var(--space-md);
  }
`;

function ProfilePage(): React.ReactElement {
  const { user, isLoading: authLoading, logout: contextLogout } = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      contextLogout();
    } catch {
      setLogoutError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <>
        <style>{styles}</style>
        <div className='profile-page' aria-busy='true'>
          <div className='auth-card'>
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
              Loading profile…
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className='profile-page'>
        <div className='profile-page__branding' aria-label='Application branding'>
          <p className='profile-page__branding-title'>auth-starter</p>
          <p className='profile-page__branding-subtitle'>Your account at a glance</p>
        </div>

        <main className='auth-card' aria-label='Profile'>
          <h1 className='auth-card__title'>Profile</h1>
          <p className='auth-card__subtitle'>Manage your account information.</p>

          <div
            aria-live='polite'
            aria-atomic='true'
          >
            {logoutError && (
              <div className='profile-page__error-banner' role='alert'>
                {logoutError}
              </div>
            )}
          </div>

          <div className='profile-page__field'>
            <span className='profile-page__label' id='label-full-name'>
              Full name
            </span>
            <div
              className='profile-page__value'
              aria-labelledby='label-full-name'
            >
              {user?.fullName ?? '—'}
            </div>
          </div>

          <div className='profile-page__field'>
            <span className='profile-page__label' id='label-email'>
              Email address
            </span>
            <div
              className='profile-page__value'
              aria-labelledby='label-email'
            >
              {user?.email ?? '—'}
            </div>
          </div>

          <div className='profile-page__field'>
            <span className='profile-page__label' id='label-status'>
              Account status
            </span>
            <div aria-labelledby='label-status'>
              {user?.isActive ? (
                <span className='profile-page__badge profile-page__badge--active'>
                  <span className='profile-page__badge-dot' aria-hidden='true' />
                  Active
                </span>
              ) : (
                <span className='profile-page__badge profile-page__badge--inactive'>
                  <span className='profile-page__badge-dot' aria-hidden='true' />
                  Inactive
                </span>
              )}
            </div>
          </div>

          <div className='profile-page__field'>
            <span className='profile-page__label' id='label-member-since'>
              Member since
            </span>
            <div
              className='profile-page__value'
              aria-labelledby='label-member-since'
            >
              {formatDate(user?.createdAt)}
            </div>
          </div>

          <hr className='profile-page__divider' aria-hidden='true' />

          <div className='profile-page__actions'>
            <button
              type='button'
              className='profile-page__btn profile-page__btn--danger'
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
            >
              {isLoggingOut && (
                <span className='profile-page__spinner' aria-hidden='true' />
              )}
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

export default ProfilePage;
