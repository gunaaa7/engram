export function isPublicSignupEnabled() {
  return process.env.ALLOW_PUBLIC_SIGNUP?.trim().toLowerCase() === "true";
}
