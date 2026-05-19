// Content Security Policy — drafted to cover every external surface
// we genuinely use:
//   - 'self' for our own assets
//   - Razorpay checkout.js
//   - Cloudflare Turnstile (optional)
//   - Supabase REST + Realtime websocket
//   - Jitsi meet (consultation iframe)
//   - Inline scripts are allowed because Next.js's React hydration
//     injects them; 'unsafe-eval' is needed by qrcode lib + some
//     Next-internal code paths.
const cspParts = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://challenges.cloudflare.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://challenges.cloudflare.com https://meet.jit.si https://*.sentry.io https://app.posthog.com https://*.posthog.com",
  "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://meet.jit.si https://*.jit.si https://challenges.cloudflare.com",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
];
const CSP = cspParts.join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), payment=(self), geolocation=()'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] }
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
