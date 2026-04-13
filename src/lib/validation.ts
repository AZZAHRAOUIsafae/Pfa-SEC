const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function parseAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(amount: number, currency = 'MAD'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
