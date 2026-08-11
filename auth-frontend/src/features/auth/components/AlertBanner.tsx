import React from 'react';

type AlertBannerVariant = 'success' | 'error';

interface AlertBannerProps {
  variant: AlertBannerVariant;
  message: string;
}

function AlertBanner({ variant, message }: AlertBannerProps): JSX.Element {
  return (
    <div
      className={`alert-banner alert-banner--${variant}`}
      aria-live="polite"
      aria-atomic="true"
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className="alert-banner__icon" aria-hidden="true">
        {variant === 'success' ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="9" fill="var(--color-success)" />
            <path
              d="M5 9L7.5 11.5L13 6"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="9" fill="var(--color-error)" />
            <path
              d="M9 5V9"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="12.5" r="1" fill="var(--color-surface)" />
          </svg>
        )}
      </span>
      <span className="alert-banner__message">{message}</span>
    </div>
  );
}

export default AlertBanner;
