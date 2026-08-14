/**
 * Company knowledge for the chatbot. Answers are matched by keywords in the user's message.
 */

export const BUSINESS_HOURS = "We're available Monday–Friday, 9am–6pm PT (San Diego). Weekend inquiries are replied to on Monday.";

export const PRICING = "Custom projects start from $5,000 for a marketing site; web apps and full builds are quoted based on scope. We offer a free strategy call to discuss your project and give you a tailored quote.";

export const SERVICES_LIST = "We offer: Custom Web Development, UI/UX Design, Brand & Strategy, Ongoing Support, SEO Optimization, Accessibility, and Speed. All custom-built—no templates.";

export const BOOK_CALL_LINK = "/contact";

/** Keywords (lowercase) -> answer. First match wins. */
const QA: { keywords: string[]; answer: string }[] = [
  { keywords: ["hour", "open", "when", "available", "time", "business", "weekend", "monday", "friday"], answer: BUSINESS_HOURS },
  { keywords: ["price", "cost", "how much", "pricing", "quote", "pay", "budget", "rate"], answer: PRICING },
  { keywords: ["service", "offer", "what do you", "do you do", "website", "build", "design", "seo", "support"], answer: SERVICES_LIST },
  { keywords: ["san diego", "where", "location", "based"], answer: "We're a San Diego–based agency. We work with clients everywhere remotely and in person locally." },
  { keywords: ["how long", "timeline", "weeks", "delivery", "when will"], answer: "Most custom web projects take 4–8 weeks from strategy to launch, depending on scope. We'll give you a timeline on your strategy call." },
  { keywords: ["template", "custom", "from scratch"], answer: "We don't use templates. Every project is custom-designed and coded to match your brand and goals." },
  { keywords: ["technology", "tech", "react", "stack"], answer: "We use modern stacks like React, Next.js, Tailwind CSS, and Framer Motion for fast, scalable sites." },
  { keywords: ["support", "maintenance", "after launch"], answer: "Yes. We offer maintenance and retainer packages to keep your site updated, secure, and optimized after launch." },
  { keywords: ["contact", "talk", "speak", "call", "meeting", "book", "appointment", "schedule"], answer: "BOOK_APPOINTMENT" },
];

const FALLBACK_MESSAGE = "I don't have the full answer for that. Let me connect you with our team—book a free strategy call and we'll get you sorted. Redirecting you now...";

/**
 * Returns an answer string for the user message, or null if no match.
 * Special answer "BOOK_APPOINTMENT" means: show fallback and redirect.
 */
export function getAnswerForMessage(userMessage: string): string | null {
  const normalized = userMessage.toLowerCase().trim();
  if (!normalized) return null;

  for (const { keywords, answer } of QA) {
    if (keywords.some((k) => normalized.includes(k))) return answer;
  }
  return null;
}

export function getFallbackMessage(): string {
  return FALLBACK_MESSAGE;
}

export function shouldRedirectToBookAppointment(answer: string): boolean {
  return answer === "BOOK_APPOINTMENT";
}
