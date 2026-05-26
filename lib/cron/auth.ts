// Cron authentication. Vercel Cron secures invocations by automatically
// sending the CRON_SECRET env value as an `Authorization: Bearer <secret>`
// header (https://vercel.com/docs/cron-jobs/manage-cron-jobs). We also accept
// the legacy `x-cron-secret` header used by the e2e suite and manual triggers.
//
// `configured` is false only when CRON_SECRET is unset (Tier-0/local boot) —
// callers decide whether to allow that (read-only sweeps) or refuse it
// (money-moving jobs).
export function checkCronAuth(req: Request): { authorized: boolean; configured: boolean } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { authorized: false, configured: false };
  const authorized =
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret;
  return { authorized, configured: true };
}
