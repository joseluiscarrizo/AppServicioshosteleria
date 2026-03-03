export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const tokenRegex = /^[A-Za-z0-9]{32,}$/;
  return tokenRegex.test(trimmed);
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim();
  const digitCount = (cleaned.match(/\d/g) || []).length;
  if (digitCount < 7) return false;
  const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
  return phoneRegex.test(cleaned);
}