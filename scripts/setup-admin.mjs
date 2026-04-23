// scripts/setup-admin.mjs
// Crea el primer usuario admin de GPTO y enlaza con la empresa del seed.
// Idempotente: si ya existe, actualiza la fila en `usuarios`.
//
// Variables necesarias en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_EMAIL (ej: mario.ortigueira@me.com)
//   ADMIN_PASSWORD
//   ADMIN_NOMBRE (opcional, default "Mario")
//   ADMIN_EMPRESA_ID (default: seed de Carpintería MAZOR)
//
// Uso: pnpm setup-admin

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE ?? "Mario";
  const empresaId =
    process.env.ADMIN_EMPRESA_ID ?? "00000000-0000-0000-0000-000000000001";

  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!service) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!email) missing.push("ADMIN_EMAIL");
  if (!password) missing.push("ADMIN_PASSWORD");
  if (missing.length) {
    console.error("Faltan variables en .env.local:", missing.join(", "));
    process.exit(1);
  }

  const supabase = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) ¿Existe el usuario en auth.users?
  let userId;
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    userId = existing.id;
    console.log(`→ auth.users: ya existía (${userId}). Actualizando password.`);
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updErr) throw updErr;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (createErr) throw createErr;
    userId = created.user.id;
    console.log(`→ auth.users: creado ${userId}`);
  }

  // 2) Upsert en public.usuarios
  const { error: upsertErr } = await supabase
    .from("usuarios")
    .upsert(
      {
        id: userId,
        empresa_id: empresaId,
        rol: "admin",
        nombre,
        activo: true,
      },
      { onConflict: "id" },
    );
  if (upsertErr) throw upsertErr;
  console.log("→ public.usuarios: fila admin asegurada.");

  console.log("\n✅ Admin listo:");
  console.log(`   email:      ${email}`);
  console.log(`   password:   (el que pasaste en ADMIN_PASSWORD)`);
  console.log(`   empresa_id: ${empresaId}`);
  console.log(`   rol:        admin`);
}

main().catch((err) => {
  console.error("\nERROR:", err?.message ?? err);
  if (err?.details) console.error("Details:", err.details);
  process.exit(1);
});
