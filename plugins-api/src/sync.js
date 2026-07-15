import fetch from "node-fetch";
import db from "./db/index.js";

const registry = await fetch(`https://manybot.org/manyplug/mpindex.json`).then(r => r.json());

async function fetchRegistryFile(registry, slug, type, parser = r => r.text()) {
	const url = registry.plugins?.[slug]?.[type];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
	
  if (!url) return null;

  try {
	  const res = await fetch(url, { signal: controller.signal });

	  if (!res.ok) {
	  	throw new Error(`[${slug}]: ${type} não encontrado (${res.status})`);
	  }

	  return parser(res);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchReadme(slug) {
	return fetchRegistryFile(registry, slug, 'readme');
}

async function fetchManifest(slug) {
	return fetchRegistryFile(registry, slug, 'manifest', r => r.json());
}

export async function syncRegistry() {
  const entries = Object.entries(registry.plugins);
  const readmes = await Promise.allSettled(
    entries.map(([slug]) => fetchReadme(slug))
  ); 
  const manifests = await Promise.allSettled(
    entries.map(([slug]) => fetchManifest(slug))
  );

  const upsert = db.prepare(`
    INSERT INTO plugins (key, name, author, description, version, category, license, service, dependencies, readme, repos, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      key          = excluded.key,
      name         = excluded.name,
      author       = excluded.author,
      description  = excluded.description,
      version      = excluded.version,
      category     = excluded.category,
      license      = excluded.license,
      service      = excluded.service,
      dependencies = excluded.dependencies,
      readme       = excluded.readme,
      repos        = excluded.repos,
      synced_at    = excluded.synced_at
  `);

  for (let i = 0; i < entries.length; i++) {
    const manifestResult = manifests[i];
    const readmeResult = readmes[i];
  
    if (manifestResult.status !== "fulfilled") {
      console.error(
        `[sync] Failed to fetch manifest for ${entries[i][0]}:`,
        manifestResult.reason
      );
      continue;
    }
  
    const p = manifestResult.value;
    const readme =
      readmeResult.status === "fulfilled" ? readmeResult.value : null;
  
    upsert.run(
      p.key,
      p.name,
      JSON.stringify(p.author ?? {}),
      p.description ?? null,
      p.version ?? null,
      p.category ?? null,
      p.license ?? null,
      p.service ? 1 : 0,
      JSON.stringify(p.dependencies ?? {}),
      readme,
      JSON.stringify(entries[i][1].repos ?? {}),
      new Date().toISOString()
    );
  }

  console.log(`[sync] ${entries.length} plugins synced`);
}

if (process.argv[1].endsWith("sync.js")) {
  await syncRegistry();
  process.exit(0);
}
