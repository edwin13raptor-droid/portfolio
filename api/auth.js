// /api/auth
//   GET    → { isAdmin }
//   POST   { password } → logs in (sets an HttpOnly cookie)
//   DELETE → logs out
import { checkPassword, clearSession, isAdmin, readJson, setSession } from "./_lib/session.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ isAdmin: isAdmin(req) });

  if (req.method === "POST") {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: "ADMIN_PASSWORD isn't set in Vercel yet." });
    }
    const { password } = readJson(req);
    if (!checkPassword(password)) {
      await wait(800); // slow down guessing
      return res.status(401).json({ error: "Wrong password." });
    }
    setSession(req, res);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    clearSession(req, res);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}
