// Client-side mirror of validation-rules.md
// Message strings are copied VERBATIM from validation-rules.md
// Password policy reflects capabilities.yaml: minLength=8, upper, lower, number, special=false

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export interface PasswordStrength {
  score: number; // 0-4 (number of passing rules)
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
  };
}

// ---------------------------------------------------------------------------
// Password policy constants (mirrored from config)
// ---------------------------------------------------------------------------
export const PASSWORD_MIN_LENGTH = 8;

// ---------------------------------------------------------------------------
// Individual field validators
// ---------------------------------------------------------------------------

export function validateFullName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Full name is required.' };
  }
  if (value.trim().length < 2) {
    return { valid: false, message: 'Full name must be at least 2 characters.' };
  }
  if (value.trim().length > 100) {
    return { valid: false, message: 'Full name must not exceed 100 characters.' };
  }
  return { valid: true, message: '' };
}

export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Email is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return { valid: false, message: 'Enter a valid email address.' };
  }
  return { valid: true, message: '' };
}

export function validatePassword(value: string): ValidationResult {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Password is required.' };
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!/[A-Z]/.test(value)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter.',
    };
  }
  if (!/[a-z]/.test(value)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter.',
    };
  }
  if (!/[0-9]/.test(value)) {
    return {
      valid: false,
      message: 'Password must contain at least one number.',
    };
  }
  return { valid: true, message: '' };
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): ValidationResult {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true, message: '' };
}

export function validateTerms(accepted: boolean): ValidationResult {
  if (!accepted) {
    return {
      valid: false,
      message: 'You must accept the Terms of Service to continue.',
    };
  }
  return { valid: true, message: '' };
}

export function validateResetToken(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Reset token is required.' };
  }
  return { valid: true, message: '' };
}

// ---------------------------------------------------------------------------
// Form-level validators (return a map of field -> message or '')
// ---------------------------------------------------------------------------

export interface LoginErrors {
  email: string;
  password: string;
}

export function validateLoginForm(values: {
  email: string;
  password: string;
}): LoginErrors {
  const email = validateEmail(values.email);
  const password = validatePassword(values.password);
  return {
    email: email.valid ? '' : email.message,
    password: password.valid ? '' : password.message,
  };
}

export interface RegisterErrors {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: string;
}

export function validateRegisterForm(values: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}): RegisterErrors {
  const fullName = validateFullName(values.fullName);
  const email = validateEmail(values.email);
  const password = validatePassword(values.password);
  const confirmPassword = validateConfirmPassword(
    values.password,
    values.confirmPassword,
  );
  const terms = validateTerms(values.terms);
  return {
    fullName: fullName.valid ? '' : fullName.message,
    email: email.valid ? '' : email.message,
    password: password.valid ? '' : password.message,
    confirmPassword: confirmPassword.valid ? '' : confirmPassword.message,
    terms: terms.valid ? '' : terms.message,
  };
}

export interface ForgotPasswordErrors {
  email: string;
}

export function validateForgotPasswordForm(values: {
  email: string;
}): ForgotPasswordErrors {
  const email = validateEmail(values.email);
  return {
    email: email.valid ? '' : email.message,
  };
}

export interface ResetPasswordErrors {
  password: string;
  confirmPassword: string;
}

export function validateResetPasswordForm(values: {
  password: string;
  confirmPassword: string;
}): ResetPasswordErrors {
  const password = validatePassword(values.password);
  const confirmPassword = validateConfirmPassword(
    values.password,
    values.confirmPassword,
  );
  return {
    password: password.valid ? '' : password.message,
    confirmPassword: confirmPassword.valid ? '' : confirmPassword.message,
  };
}

// ---------------------------------------------------------------------------
// Password strength checker (four active rules; special character NOT required)
// ---------------------------------------------------------------------------

export function checkPasswordStrength(value: string): PasswordStrength {
  const rules = {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
  };
  const score = Object.values(rules).filter(Boolean).length;
  return { score, rules };
}

// ---------------------------------------------------------------------------
// Utility — check whether a form-errors object is clean (all fields '')
// ---------------------------------------------------------------------------

export function hasNoErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).every((msg) => msg === '');
}
