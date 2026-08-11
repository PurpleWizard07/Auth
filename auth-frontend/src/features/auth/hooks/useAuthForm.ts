import { useState, useCallback, ChangeEvent, FocusEvent, FormEvent } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldValues = Record<string, string | boolean>;

export type FieldErrors = Record<string, string>;

export type FieldTouched = Record<string, boolean>;

export type Validator<T extends FieldValues> = (
  values: T
) => FieldErrors;

export interface UseAuthFormOptions<T extends FieldValues> {
  /** Initial field values */
  initialValues: T;
  /** Synchronous validator; returns an object of fieldName -> error message */
  validate: Validator<T>;
  /** Called only when client-side validation passes */
  onSubmit: (values: T) => Promise<void>;
}

export interface UseAuthFormReturn<T extends FieldValues> {
  values: T;
  errors: FieldErrors;
  touched: FieldTouched;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  setFieldValue: (name: keyof T & string, value: string | boolean) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useAuthForm<T extends FieldValues>({
  initialValues,
  validate,
  onSubmit,
}: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<FieldTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Derive the current validation errors for the current values.
  // We keep a stable reference per render so we don't duplicate logic.
  const runValidation = useCallback(
    (currentValues: T): FieldErrors => validate(currentValues),
    [validate]
  );

  // ------------------------------------------------------------------
  // handleChange — update value, clear submit-level error, re-validate
  // the changed field if it has already been touched
  // ------------------------------------------------------------------
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, type, checked, value } = e.target;
      const fieldValue: string | boolean = type === 'checkbox' ? checked : value;

      setValues((prev) => {
        const next = { ...prev, [name]: fieldValue } as T;

        // Re-validate this field if already touched
        setErrors((prevErrors) => {
          if (!touched[name]) return prevErrors;
          const newErrors = validate(next);
          return { ...prevErrors, [name]: newErrors[name] ?? '' };
        });

        return next;
      });

      // Clear any server-level submit error when the user starts editing
      setSubmitError(null);
      setSubmitSuccess(false);
    },
    [touched, validate]
  );

  // ------------------------------------------------------------------
  // handleBlur — mark field as touched and validate it immediately
  // ------------------------------------------------------------------
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const { name } = e.target;

      setTouched((prev) => ({ ...prev, [name]: true }));

      setValues((prev) => {
        const newErrors = runValidation(prev);
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: newErrors[name] ?? '',
        }));
        return prev;
      });
    },
    [runValidation]
  );

  // ------------------------------------------------------------------
  // handleSubmit — validate all fields, mark all touched, then submit
  // ------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark every field as touched so all errors become visible
      const allTouched: FieldTouched = {};
      for (const key of Object.keys(values)) {
        allTouched[key] = true;
      }
      setTouched(allTouched);

      const validationErrors = runValidation(values);
      const hasErrors = Object.values(validationErrors).some((msg) => msg !== '' && msg != null);
      setErrors(validationErrors);

      if (hasErrors) return;

      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        await onSubmit(values);
        setSubmitSuccess(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setSubmitError(err.message);
        } else {
          setSubmitError('An unexpected error occurred.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, runValidation, onSubmit]
  );

  // ------------------------------------------------------------------
  // setFieldValue — programmatic field update (e.g. checkbox, selects)
  // ------------------------------------------------------------------
  const setFieldValue = useCallback(
    (name: keyof T & string, value: string | boolean) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value } as T;

        setErrors((prevErrors) => {
          if (!touched[name]) return prevErrors;
          const newErrors = validate(next);
          return { ...prevErrors, [name]: newErrors[name] ?? '' };
        });

        return next;
      });

      setSubmitError(null);
      setSubmitSuccess(false);
    },
    [touched, validate]
  );

  // ------------------------------------------------------------------
  // reset — restore everything to initial state
  // ------------------------------------------------------------------
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    submitSuccess,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    reset,
  };
}
