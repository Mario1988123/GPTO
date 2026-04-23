// scripts/apply-migrations.mjs
// Aplica en orden alfabético todos los .sql de supabase/migrations/
// Usa DATABASE_URL del entorno (cargada desde .env.local).
//
// Uso: pnpm migrate

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

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
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "ERROR: falta DATABASE_URL en .env.local. Formato:\n" +
        "DATABASE_URL=postgresql://postgres:PASSWORD@db.xvjgtaevlhwfxafteuvi.supabase.co:5432/postgres",
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No hay migraciones en", MIGRATIONS_DIR);
    return;
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Conectado a", new URL(url).host);

  try {
    for (const f of files) {
      const full = path.join(MIGRATIONS_DIR, f);
      const sql = fs.readFileSync(full, "utf8");
      process.stdout.write(`→ ${f} ... `);
      await client.query(sql);
      console.log("OK");
    }
  } finally {
    await client.end();
  }

  console.log(`\n${files.length} migraciones aplicadas.`);
}

main().catch((err) => {
  console.error("\nERROR durante la migración:");
  console.error(err?.message ?? err);
  if (err?.detail) console.error("Detalle:", err.detail);
  if (err?.hint) console.error("Hint:", err.hint);
  if (err?.position) console.error("Posición:", err.position);
  process.exit(1);
});
