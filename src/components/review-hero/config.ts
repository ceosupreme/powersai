import { CONTACT_EMAIL } from "@/lib/siteContact";

/** No authoritative public business phone has been confirmed. Keep null until the owner confirms it. */
export const PHONE: { display: string; tel: string } | null = null;
export const EMAIL = CONTACT_EMAIL;

/** Exact owner-approved service labels, in order. */
export const SERVICE_OBJECTS = [
  { label: "Web Design", shape: "slab" },
  { label: "Marketing", shape: "prism" },
  { label: "Sales", shape: "tall" },
  { label: "CRM", shape: "disc" },
  { label: "Automation", shape: "wide" },
] as const;

export const SERVICE_LINKS = [
  { to: "/services/websites", label: "Websites" },
  { to: "/services/brand", label: "Brand & creative" },
  { to: "/services/marketing", label: "Marketing & growth" },
  { to: "/services/ai-systems", label: "AI & business systems" },
  { to: "/publishing", label: "Publishing & launch" },
  { to: "/startups", label: "Startups & founders" },
];

export const PACKAGES = [
  { name: "Custom Website + Backend", price: "$2,500 build + required monthly Smart Services & Care", note: "Monthly Smart Services & Care amount to be confirmed.", line: "Websites that work while you sleep.", body: "A custom website with a real owner admin behind it: inquiries saved and answered, follow-up, and a backend you can see and manage." },
  { name: "Custom Business Operating System", price: "Starts at $10,000 + scoped monthly operation and support", body: "The tools behind your business, mapped and connected around how you actually work." },
  { name: "Local Growth", price: "$297/month", body: "A repeatable starting option: local marketing configured for your business from a reusable HighLevel configuration." },
];
