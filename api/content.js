// /api/content
//   GET → { content } saved from the admin panel, or { content: null } (site then uses content.json)
//   PUT { content } → saves a new version (admin only). Keeps the last 20 versions in Vercel Blob.
import { del, list, put } from "@vercel/blob";
import { readJson, requireAdmin } from "./_lib/session.js";

const PREFIX = "cms/content-";
const KEEP = 20;
const MAX_BYTES = 500_000;

async function versions() {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export default async function handler(req, res) {
  const blobReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  if (req.method === "GET") {
    const fresh = "fresh" in (req.query || {});
    res.setHeader("Cache-Control", fresh ? "no-store" : "public, s-maxage=15, stale-while-revalidate=300");
    if (!blobReady) return res.status(200).json({ content: null });
    try {
      const [latest] = await versions();
      if (!latest) return res.status(200).json({ content: null });
      const r = await fetch(latest.url, { cache: "no-store" });
      return res.status(200).json({ content: await r.json(), savedAt: latest.uploadedAt });
    } catch (err) {
      console.error(err);
      return res.status(200).json({ content: null });
    }
  }

  if (req.method === "PUT") {
    res.setHeader("Cache-Control", "no-store");
    if (!requireAdmin(req, res)) return;
    if (!blobReady) return res.status(500).json({ error: "Vercel Blob isn't connected yet (BLOB_READ_WRITE_TOKEN missing)." });

    const { content } = readJson(req);
    if (!content || typeof content !== "object" || Array.isArray(content) || !content.site || !content.hero) {
      return res.status(400).json({ error: "Invalid content." });
    }
    const json = JSON.stringify(content, null, 2);
    if (Buffer.byteLength(json) > MAX_BYTES) return res.status(413).json({ error: "Content is too large." });

    try {
      const saved = await put(`${PREFIX}${Date.now()}.json`, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
      // Prune old versions
      const all = await versions();
      const old = all.slice(KEEP).map((b) => b.url);
      if (old.length) await del(old);
      return res.status(200).json({ ok: true, savedAt: saved.uploadedAt || new Date().toISOString() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Couldn't save. Try again." });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed." });
}
