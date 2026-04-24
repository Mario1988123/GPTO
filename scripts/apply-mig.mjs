// scripts/apply-mig.mjs
// Aplica UNA migración concreta. Uso: node scripts/apply-mig.mjs <archivo.sql>
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: node scripts/apply-mig.mjs <archivo.sql>");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: falta DATABASE_URL en .env.local");
    process.exit(1);
  }
  const sql = fs.readFileSync(file, "utf8");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("OK:", file);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ERR:", err?.message ?? err);
  if (err?.detail) console.error("Detalle:", err.detail);
  if (err?.hint) console.error("Hint:", err.hint);
  process.exit(1);
});
