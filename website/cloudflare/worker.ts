const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

interface Env {
  ASSETS: Fetcher;
  TURNSTILE_SECRET?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  HUBSPOT_MEETING_URL?: string;
}

const LEGACY_REDIRECTS: Record<string, string> = {
  "/market": "/platform",
  "/develop": "/partners",
  "/verification": "/platform",
  "/bankability": "/financeability",
  "/method": "/platform",
  "/invest": "/financeability",
  "/power-flexibility": "/data-centers",
};

const PUBLIC_ROUTES = new Set(["/", "/data-centers", "/partners", "/platform", "/financeability", "/pilot", "/case-studies", "/insights", "/about", "/faq", "/assessment", "/contact", "/privacy", "/terms", "/accessibility"]);

type Assessment = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  location: string;
  projectStage: string;
  plannedMw: string;
  securedMw: string;
  energization: string;
  powerArrival: string;
  utilityStatus: string;
  gapHours: string;
  reliability: string;
  flexibleLoad: string;
  resources: string;
  constraint: string;
  turnstileToken: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
}

function normalizeAssessment(body: Record<string, unknown>): Assessment {
  return {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 80),
    email: clean(body.email, 160).toLowerCase(),
    company: clean(body.company, 160),
    title: clean(body.title, 120),
    location: clean(body.location, 180),
    projectStage: clean(body.projectStage, 80),
    plannedMw: clean(body.plannedMw, 30),
    securedMw: clean(body.securedMw, 30),
    energization: clean(body.energization, 20),
    powerArrival: clean(body.powerArrival, 20),
    utilityStatus: clean(body.utilityStatus, 120),
    gapHours: clean(body.gapHours, 30),
    reliability: clean(body.reliability, 120),
    flexibleLoad: clean(body.flexibleLoad, 1500),
    resources: clean(body.resources, 1500),
    constraint: clean(body.constraint, 1500),
    turnstileToken: clean(body.turnstileToken, 2048),
  };
}

async function verifyTurnstile(token: string, request: Request, env: Env) {
  if (!env.TURNSTILE_SECRET) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || undefined,
      idempotency_key: crypto.randomUUID(),
    }),
  });
  if (!response.ok) throw new Error(`Turnstile verification unavailable: ${response.status}`);
  const result = await response.json<{ success?: boolean; action?: string; hostname?: string }>();
  return result.success === true && result.action === "site_assessment" &&
    ["www.ecoxchange.net", "ecoxchange.net"].includes(result.hostname || "");
}

function assessmentSummary(assessment: Assessment) {
  return [
    "EcoXchange Power-Gap Assessment",
    `Site location: ${assessment.location}`,
    `Project stage: ${assessment.projectStage}`,
    `Required firm load at first ramp: ${assessment.plannedMw || "Not provided"} MW`,
    `Firm utility MW available by ramp: ${assessment.securedMw || "Not provided"}`,
    `First ramp / occupancy: ${assessment.energization || "Not provided"}`,
    `Next firm power delivery: ${assessment.powerArrival || "Not provided"}`,
    `Utility / service status: ${assessment.utilityStatus || "Not provided"}`,
    `Bridge requirement hours/day: ${assessment.gapHours || "Not provided"}`,
    `Reliability requirement: ${assessment.reliability || "Not provided"}`,
    `Flexible / shiftable load: ${assessment.flexibleLoad || "Not provided"}`,
    `Onsite resources: ${assessment.resources || "Not provided"}`,
    `Primary constraint: ${assessment.constraint}`,
  ].join("\n");
}

function hubspotHeaders(env: Env) {
  return { ...JSON_HEADERS, authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}` };
}

async function upsertHubSpotContact(assessment: Assessment, env: Env): Promise<string> {
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
    method: "POST",
    headers: hubspotHeaders(env),
    body: JSON.stringify({
      inputs: [{
        id: assessment.email,
        idProperty: "email",
        properties: {
          email: assessment.email,
          firstname: assessment.firstName,
          lastname: assessment.lastName,
          company: assessment.company,
          jobtitle: assessment.title,
          message: assessmentSummary(assessment),
        },
      }],
    }),
  });
  if (!response.ok) throw new Error(`HubSpot contact upsert failed: ${response.status}`);
  const result = await response.json<{ results?: Array<{ id?: string }>; numErrors?: number }>();
  const id = result.results?.[0]?.id;
  if (!id || result.numErrors) throw new Error("HubSpot contact upsert did not complete");
  return id;
}

async function findOrCreateHubSpotCompany(name: string, env: Env): Promise<string> {
  const search = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
    method: "POST",
    headers: hubspotHeaders(env),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "name", operator: "EQ", value: name }] }],
      properties: ["name"],
      limit: 3,
    }),
  });
  if (!search.ok) throw new Error(`HubSpot company search failed: ${search.status}`);
  const matches = await search.json<{ results?: Array<{ id: string; properties?: { name?: string } }> }>();
  const exact = (matches.results || []).filter(item => item.properties?.name?.toLowerCase() === name.toLowerCase());
  if (exact.length > 1) throw new Error("HubSpot company match is ambiguous");
  if (exact.length === 1) return exact[0].id;

  const response = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
    method: "POST",
    headers: hubspotHeaders(env),
    body: JSON.stringify({ properties: { name } }),
  });
  if (!response.ok) throw new Error(`HubSpot company create failed: ${response.status}`);
  const company = await response.json<{ id?: string }>();
  if (!company.id) throw new Error("HubSpot company create did not complete");
  return company.id;
}

async function associateContactCompany(contactId: string, companyId: string, env: Env) {
  const response = await fetch(`https://api.hubapi.com/crm/v4/objects/contacts/${encodeURIComponent(contactId)}/associations/default/companies/${encodeURIComponent(companyId)}`, {
    method: "PUT",
    headers: hubspotHeaders(env),
  });
  if (!response.ok) throw new Error(`HubSpot association failed: ${response.status}`);
}

async function handleAssessment(request: Request, env: Env) {
  if (Number(request.headers.get("content-length") || 0) > 20_000) return json({ error: "Payload too large" }, 413);
  let raw: Record<string, unknown>;
  try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const assessment = normalizeAssessment(raw);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assessment.email);
  if (!assessment.firstName || !assessment.lastName || !validEmail || !assessment.company || !assessment.location || !assessment.projectStage || !assessment.constraint) {
    return json({ error: "Missing or invalid required fields" }, 400);
  }
  if (!env.TURNSTILE_SECRET || !env.HUBSPOT_ACCESS_TOKEN) return json({ error: "Online assessment is not configured" }, 503);
  if (!(await verifyTurnstile(assessment.turnstileToken, request, env))) return json({ error: "Human verification failed" }, 403);
  const contactId = await upsertHubSpotContact(assessment, env);
  const companyId = await findOrCreateHubSpotCompany(assessment.company, env);
  await associateContactCompany(contactId, companyId, env);
  console.log(JSON.stringify({ event: "assessment_completed", timestamp: new Date().toISOString() }));
  return json({ ok: true, meetingUrl: env.HUBSPOT_MEETING_URL || "/contact" });
}

async function handleEvent(request: Request) {
  let raw: Record<string, unknown>;
  try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const name = clean(raw.name, 80);
  const allowed = new Set(["assessment_cta", "assessment_started", "assessment_completed", "scheduling_click", "partner_inquiry", "insight_engagement"]);
  if (!allowed.has(name)) return json({ error: "Unknown event" }, 400);
  console.log(JSON.stringify({ event: name, path: clean(raw.path, 200), timestamp: new Date().toISOString() }));
  return json({ ok: true }, 202);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const redirect = LEGACY_REDIRECTS[url.pathname.replace(/\/$/, "")];
    if (redirect) return Response.redirect(new URL(redirect, url), 301);

    if (request.method === "POST" && url.pathname === "/api/assessment") {
      try { return await handleAssessment(request, env); }
      catch (error) { console.error(error); return json({ error: "Submission could not be completed" }, 502); }
    }
    if (request.method === "POST" && url.pathname === "/api/event") return handleEvent(request);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    const isDocumentRoute = request.method === "GET" && !url.pathname.includes(".");
    const isUnknownRoute = isDocumentRoute && !PUBLIC_ROUTES.has(url.pathname.replace(/\/$/, "") || "/");
    const response = isUnknownRoute
      ? await env.ASSETS.fetch(new Request(new URL("/index.html", url), request))
      : await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'");
    return new Response(response.body, { status: isUnknownRoute ? 404 : response.status, statusText: isUnknownRoute ? "Not Found" : response.statusText, headers });
  },
} satisfies ExportedHandler<Env>;

