import { Router } from "express";
import db from "../db/index.js";

const router = Router();

router.get("/", (req, res) => {
  const plugins = db.prepare(`
    select key, name, author, description, version, category, license, service, dependencies, readme, repos, synced_at
    from plugins order by category, key
  `).all();
  res.json(plugins.map(parse));
});

router.get("/:author/:name", (req, res) => {
  const key = `${req.params.author}/${req.params.name}`
  const plugin = db.prepare(`
    select key, name, author, description, version, category, license, service, dependencies, readme, repos, synced_at
    from plugins
    where key = ?
  `).get(key);

  if (!plugin) return res.status(404).json({ error: `${key}: plugin not found` });
  res.json(parse(plugin));
});

function parse(p) {
  return {
    ...p,
    author:       JSON.parse(p.author       || "{}"),
    repos:        JSON.parse(p.repos        || "{}"),
    dependencies: JSON.parse(p.dependencies || "{}"),
    service:      !!p.service,
  };
}

export default router;
