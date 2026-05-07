export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogFrontmatter {
  slug: string;
  title: string;
  description: string;
  intent_keywords: string[];
  faqs: BlogFaq[];
  published_at: string; // ISO yyyy-mm-dd
  status?: "draft" | "review" | "published";
}

export interface BlogPost extends BlogFrontmatter {
  body_md: string;
}
