import { Router } from "express";
import { createHash } from "crypto";
import rateLimit from "express-rate-limit";
import db from "../db/index.js";
import bus from "../events/bus.js";

const router = Router({ mergeParams: true });

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many requests, try again later" },
});

function hashIp(ip) {
  return createHash("sha256").update(ip + (process.env.IP_SALT || "")).digest("hex");
}

function verifyAdmin(req, res) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: "não autorizado" });
    return false;
  }
  return true;
}

function pluginKey(req) {
  if (req.params.author && req.params.name)
    return `${req.params.author}/${req.params.name}`;
  return req.query.plugin ?? null;
}

router.get("/", (req, res) => {
  const key = pluginKey(req);
  if (!key) return res.status(400).json({ error: "plugin key required" });
  const comments = db.prepare(`
    SELECT id, author, body, created_at
    FROM comments WHERE plugin = ?
    ORDER BY created_at ASC
  `).all(key);
  res.json(comments);
});

router.post("/", writeLimiter, (req, res) => {
  const key = pluginKey(req);
  if (!key) return res.status(400).json({ error: "plugin key required" });
  const { author, body, _hp } = req.body;

  if (_hp) return res.status(400).json({ error: "invalid" });
  if (!author?.trim() || !body?.trim()) return res.status(400).json({ error: "author and body are required" });
  if (author.trim().length > 64)   return res.status(400).json({ error: "author too long" });
  if (body.trim().length > 2000)   return res.status(400).json({ error: "body too long" });

  const plugin = db.prepare("SELECT key FROM plugins WHERE key = ?").get(key);
  if (!plugin) return res.status(404).json({ error: "plugin not found" });

  const ip_hash = hashIp(req.ip);
  const { lastInsertRowid } = db.prepare(
    "INSERT INTO comments (plugin, author, body, ip_hash) VALUES (?, ?, ?, ?)"
  ).run(key, author.trim(), body.trim(), ip_hash);

  const comment = db.prepare("SELECT id, author, body, created_at FROM comments WHERE id = ?")
    .get(lastInsertRowid);

  bus.emit("comment:new", { plugin: key, comment });
  res.status(201).json(comment);
});

router.delete("/:id", (req, res) => {
  if (!verifyAdmin(req, res)) return;
  const info = db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "comment not found" });
  res.json({ deleted: true });
});

export default router;
