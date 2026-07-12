/** Returns true if the value is a non-empty string */
export function isNotEmpty(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Basic email format check (sync, no network) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Returns true if the string is a valid parseable date */
export function isValidDate(value: string | undefined | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/** Returns true if `later` is strictly after `earlier` */
export function isAfterDate(later: string, earlier: string): boolean {
  return new Date(later).getTime() > new Date(earlier).getTime();
}

/** Returns true if end is strictly after start (ISO strings) */
export function isValidDateRange(start: string, end: string): boolean {
  if (!isValidDate(start) || !isValidDate(end)) return false;
  return isAfterDate(end, start);
}

/** Returns true if the password meets minimum requirements */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/** Returns a validation error message or null */
export function validateField(
  label: string,
  value: string | undefined | null,
  rules: { required?: boolean; email?: boolean; minLength?: number }
): string | null {
  if (rules.required && !isNotEmpty(value ?? "")) {
    return `${label} is required`;
  }
  if (rules.email && value && !isValidEmail(value)) {
    return "Enter a valid email address";
  }
  if (rules.minLength && value && value.length < rules.minLength) {
    return `${label} must be at least ${rules.minLength} characters`;
  }
  return null;
}
