const seo = {
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    { name: "title", type: "string", validation: (Rule: any) => Rule.max(60) },
    { name: "description", type: "text", rows: 3, validation: (Rule: any) => Rule.max(160) },
    { name: "canonicalUrl", type: "url" },
    { name: "socialImage", type: "image", options: { hotspot: true } },
    { name: "noIndex", type: "boolean", initialValue: false },
  ],
};

const callToAction = {
  name: "callToAction",
  title: "Call to action",
  type: "object",
  fields: [
    { name: "label", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "href", type: "string", validation: (Rule: any) => Rule.required() },
  ],
};

const pageSection = {
  name: "pageSection",
  title: "Page section",
  type: "object",
  fields: [
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "body", type: "array", of: [{ type: "block" }] },
    { name: "media", type: "image", options: { hotspot: true } },
    { name: "cta", type: "callToAction" },
    { name: "tone", type: "string", options: { list: ["dark", "bone", "signal"] }, initialValue: "dark" },
  ],
};

const insight = {
  name: "insight", title: "Insight", type: "document",
  fields: [
    { name: "title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", type: "slug", options: { source: "title", maxLength: 96 }, validation: (Rule: any) => Rule.required() },
    { name: "summary", type: "text", rows: 3, validation: (Rule: any) => Rule.required().max(220) },
    { name: "publishedAt", type: "datetime", validation: (Rule: any) => Rule.required() },
    { name: "heroImage", type: "image", options: { hotspot: true } },
    { name: "body", type: "array", of: [{ type: "block" }, { type: "image", options: { hotspot: true } }] },
    { name: "seo", type: "seo" },
  ],
  orderings: [{ title: "Newest", name: "publishedAtDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
};

const caseStudy = {
  name: "caseStudy", title: "Case study", type: "document",
  fields: [
    { name: "title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", type: "slug", options: { source: "title" }, validation: (Rule: any) => Rule.required() },
    { name: "status", type: "string", options: { list: ["planning", "pilot", "operating", "published"] } },
    { name: "location", type: "string" },
    { name: "challenge", type: "text", rows: 4 },
    { name: "approach", type: "array", of: [{ type: "block" }] },
    { name: "outcome", type: "array", of: [{ type: "block" }] },
    { name: "verifiedMetrics", type: "array", of: [{ type: "proofPoint" }] },
    { name: "heroImage", type: "image", options: { hotspot: true } },
    { name: "permissionsConfirmed", type: "boolean", description: "Confirm client approval before publishing." },
    { name: "seo", type: "seo" },
  ],
};

const teamMember = {
  name: "teamMember", title: "Team member", type: "document",
  fields: [
    { name: "name", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "role", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "bio", type: "array", of: [{ type: "block" }] },
    { name: "portrait", type: "image", options: { hotspot: true } },
    { name: "linkedinUrl", type: "url" },
    { name: "order", type: "number" },
  ],
};

const faq = {
  name: "faq", title: "FAQ", type: "document",
  fields: [
    { name: "question", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "answer", type: "array", of: [{ type: "block" }], validation: (Rule: any) => Rule.required() },
    { name: "category", type: "string" },
    { name: "order", type: "number" },
  ],
};

const proofPoint = {
  name: "proofPoint", title: "Proof point", type: "object",
  fields: [
    { name: "label", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "value", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "source", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "verifiedAt", type: "date" },
  ],
};

const siteSettings = {
  name: "siteSettings", title: "Site settings", type: "document",
  fields: [
    { name: "companyName", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "companyDescription", type: "text", rows: 4 },
    { name: "contactEmail", type: "string" },
    { name: "assessmentMeetingUrl", type: "url" },
    { name: "defaultSeo", type: "seo" },
    { name: "footerDisclosure", type: "text", rows: 4 },
  ],
};

const page = {
  name: "page", title: "Page", type: "document",
  fields: [
    { name: "title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", type: "slug", options: { source: "title" }, validation: (Rule: any) => Rule.required() },
    { name: "sections", type: "array", of: [{ type: "pageSection" }] },
    { name: "seo", type: "seo" },
  ],
};

export const schemaTypes = [seo, callToAction, pageSection, proofPoint, insight, caseStudy, teamMember, faq, siteSettings, page];

