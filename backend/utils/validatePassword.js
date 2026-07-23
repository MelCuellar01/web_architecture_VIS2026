export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}
