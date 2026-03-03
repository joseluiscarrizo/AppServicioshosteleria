export function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(cleaned);
}