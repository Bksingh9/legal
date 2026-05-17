import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/talk-to-lawyer`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/triage`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/documents`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/lawyer/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/documents/legal-notice`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/documents/reply-legal-notice`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/documents/rent-agreement-11m`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/documents/consumer-complaint-ncdrc`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/documents/rti-application`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/for-lawyers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/refunds-cancellation`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/grievance`, lastModified: now, changeFrequency: "yearly", priority: 0.3 }
  ];
}
