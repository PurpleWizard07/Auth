import React from 'react';

interface Rule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

const RULES: Rule[] = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    key: 'number',
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
  },
];

interface PasswordStrengthMeterProps {
  password: string;
}

function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps): JSX.Element {
  const results = RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="password-strength" aria-live="polite" aria-label="Password strength">
      <div className="password-strength__bar-group" aria-hidden="true">
        {RULES.map((rule, index) => (
          <div
            key={rule.key}
            className={`password-strength__bar${
              index < passedCount ? ' password-strength__bar--filled' : ''
            }`}
          />
        ))}
      </div>
      <ul className="password-strength__checklist" role="list">
        {results.map((rule) => (
          <li
            key={rule.key}
            className={`password-strength__rule${
              rule.passed ? ' password-strength__rule--passed' : ''
            }`}
          >
            <span
              className="password-strength__rule-icon"
              aria-hidden="true"
            >
              {rule.passed ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="7" cy="7" r="7" fill="var(--color-success)" />
                  <path
                    d="M4 7L6 9L10 5"
                    stroke="var(--color-surface)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="7" cy="7" r="7" fill="var(--color-border)" />
                </svg>
              )}
            </span>
            <span className="password-strength__rule-label">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;
