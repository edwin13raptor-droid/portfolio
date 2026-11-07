// Vercel serverless function: POST /api/send
// Sends contact messages and project briefs to you via Resend (https://resend.com).
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   – your Resend API key (starts with "re_")
//   TO_EMAIL         – where submissions go, e.g. edwin13.raptor@gmail.com
//   FROM_EMAIL       – sender. Until you verify a domain in Resend use: "Portfolio <onboarding@resend.dev>"
//                      After verifying, e.g.: "Edwin <hello@yourdomain.com>"

const LABELS = {
  contact: {
    name: "Name",
    email: "Email",
    message: "Message",
  },
  intake: {
    name: "Name",
    email: "Email",
    phone: "Phone / WhatsApp",
    location: "Location",
    contact_method: "Preferred contact",
    business_name: "Business name",
    business_description: "What the business does",
    audience: "Target customers",
    unique: "What makes them different",
    project_type: "Project type",
    current_website: "Current website",
    goals: "Goals",
    has_domain: "Has a domain?",
    domain_name: "Domain",
    domain_registrar: "Domain registrar",
    domain_access: "Has registrar login?",
    domain_ideas: "Domain ideas",
    domain_email: "Email on domain",
    pages: "Pages",
    features: "Features",
    logo: "Logo",
    texts: "Website text",
    photos: "Photos",
    style: "Style",
    brand_colors: "Brand colours",
    inspiration: "Websites they like",
    competitors: "Competitors",
    budget: "Budget",
    timeline: "Timeline",
    deadline: "Deadline",
    maintenance: "Help after launch",
    notes: "Extra notes",
    referral: "Found me via",
  },
};

const SECTIONS = [
  ["Client", ["name", "email", "phone", "location", "contact_method"]],
  ["Business", ["business_name", "business_description", "audience", "unique"]],
  ["Project", ["project_type", "current_website", "goals"]],
  ["Domain & hosting", ["has_domain", "domain_name", "domain_registrar", "domain_access", "domain_ideas", "domain_email"]],
  ["Pages & features", ["pages", "features"]],
  ["Content & style", ["logo", "texts", "photos", "style", "brand_colors", "inspiration", "competitors"]],
  ["Budget & timeline", ["budget", "timeline", "deadline", "maintenance"]],
  ["Other", ["notes", "referral"]],
];

const MAX_LEN = 5000;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const clean = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).slice(0, 200)).filter(Boolean).slice(0, 30);
  if (v == null) return "";
  return String(v).trim().slice(0, MAX_LEN);
};

const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : v === "");
const show = (v) => (Array.isArray(v) ? v.join(", ") : v);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "client";

function buildIntakeEmail(d) {
  const rows = SECTIONS.map(([title, keys]) => {
    const filled = keys.filter((k) => !isEmpty(d[k] ?? ""));
    if (!filled.length) return "";
    const trs = filled
      .map(
        (k) => `<tr>
          <td style="padding:8px 12px;color:#666;vertical-align:top;width:190px;border-bottom:1px solid #eee">${LABELS.intake[k]}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(show(d[k]))}</td>
        </tr>`
      )
      .join("");
    return `<h3 style="margin:28px 0 8px;font-size:16px">${title}</h3><table style="border-collapse:collapse;width:100%;font-size:14px">${trs}</table>`;
  }).join("");

  // Markdown brief you can paste straight into a new Claude session to start the client's site.
  const md = [
    `# Client brief: ${d.business_name}`,
    `Folder suggestion: clients/${slug(d.business_name)}`,
    "",
    ...SECTIONS.flatMap(([title, keys]) => {
      const lines = keys.filter((k) => !isEmpty(d[k] ?? "")).map((k) => `- **${LABELS.intake[k]}:** ${show(d[k])}`);
      return lines.length ? [`## ${title}`, ...lines, ""] : [];
    }),
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111">
    <h2 style="margin:0 0 4px">🚀 New project brief</h2>
    <p style="margin:0;color:#666">${escapeHtml(d.business_name)} — ${escapeHtml(d.project_type || "")} — budget ${escapeHtml(d.budget || "?")}</p>
    ${rows}
    <h3 style="margin:32px 0 8px;font-size:16px">Copy-paste brief (for Claude)</h3>
    <pre style="background:#f5f5f7;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px">${escapeHtml(md)}</pre>
  </div>`;

  return {
    subject: `New project brief: ${d.business_name} (${d.budget || "budget ?"})`,
    html,
    text: md,
  };
}

function buildContactEmail(d) {
  return {
    subject: `New message from ${d.name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
      <h2>✉️ New contact message</h2>
      <p><strong>Name:</strong> ${escapeHtml(d.name)}<br/><strong>Email:</strong> ${escapeHtml(d.email)}</p>
      <p style="white-space:pre-wrap;background:#f5f5f7;padding:16px;border-radius:8px">${escapeHtml(d.message)}</p>
    </div>`,
    text: `Name: ${d.name}\nEmail: ${d.email}\n\n${d.message}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { RESEND_API_KEY, TO_EMAIL, FROM_EMAIL = "Portfolio <onboarding@resend.dev>" } = process.env;
  if (!RESEND_API_KEY || !TO_EMAIL) {
    return res.status(500).json({ error: "Email isn't configured yet." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  // Honeypot – bots fill this hidden field. Pretend success.
  if (body.company_website) return res.status(200).json({ ok: true });

  const type = body.type === "intake" ? "intake" : "contact";
  const data = {};
  for (const key of Object.keys(LABELS[type])) data[key] = clean(body[key]);

  // Validate required fields
  const required = type === "intake"
    ? ["name", "email", "business_name", "business_description", "project_type", "has_domain", "budget"]
    : ["name", "email", "message"];
  const missing = required.filter((k) => isEmpty(data[k]));
  if (missing.length) return res.status(400).json({ error: "Please fill in all required fields." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const email = type === "intake" ? buildIntakeEmail(data) : buildContactEmail(data);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL.split(",").map((s) => s.trim()),
        reply_to: data.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return res.status(502).json({ error: "Couldn't send right now." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't send right now." });
  }
}
