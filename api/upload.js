// POST /api/upload?filename=photo.jpg  (raw image bytes as the body, admin only)
// → { url } of the image stored in Vercel Blob.
import { put } from "@vercel/blob";
import { requireAdmin } from "./_lib/session.js";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB bodies; the admin panel resizes images first
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

export const config = { api: { bodyParser: false } };

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!requireAdmin(req, res)) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Vercel Blob isn't connected yet (BLOB_READ_WRITE_TOKEN missing)." });
  }

  const type = String(req.headers["content-type"] || "").split(";")[0].trim();
  const ext = TYPES[type];
  if (!ext) return res.status(415).json({ error: "Please upload a JPG, PNG, WebP, GIF or AVIF image." });

  const base = String(req.query?.filename || "image")
    .replace(/\.[^.]*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";

  try {
    const body = await readBody(req);
    if (!body.length) return res.status(400).json({ error: "Empty file." });
    const blob = await put(`uploads/${base}.${ext}`, body, {
      access: "public",
      contentType: type,
      addRandomSuffix: true,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    if (err.status === 413) return res.status(413).json({ error: "Image is too large (max 4 MB)." });
    console.error(err);
    return res.status(500).json({ error: "Upload failed." });
  }
}
