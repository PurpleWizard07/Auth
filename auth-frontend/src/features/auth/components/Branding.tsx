import React from 'react';

function Branding(): JSX.Element {
  return (
    <div className="branding">
      <div className="branding__logo" aria-hidden="true">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <rect width="40" height="40" rx="10" fill="var(--color-accent-primary)" />
          <path
            d="M20 10C15.589 10 12 13.589 12 18C12 20.495 13.133 22.726 14.916 24.222L14 30L20 27.5L26 30L25.084 24.222C26.867 22.726 28 20.495 28 18C28 13.589 24.411 10 20 10Z"
            fill="var(--color-surface)"
          />
        </svg>
      </div>
      <span className="branding__wordmark">AuthStarter</span>
    </div>
  );
}

export default Branding;
