"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/superadmin";

async function assertSuperadmin() {
  const s = await createClient();
  const { data } = await s.from("usuarios").select("es_superadmin").eq("id", (await s.auth.getUser()).data.user?.id ?? "").maybeSingle<{ es_superadmin: boolean }>();
  if (!data?.es_superadmin) throw new Error("Solo superadmin");
}

// ================== EMPRESAS ==================
export async function crearEmpresa(fd: FormData) {
  await assertSuperadmin();
  const s = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const plan = String(fd.get("plan") ?? "autonomo");
  if (!nombre) throw new Error("Nombre obligatorio");
  const { data, error } = await s.from("empresas").insert({
    nombre,
    plan,
    estado: "activa",
    fecha_alta: new Date().toISOString().slice(0, 10),
  }).select("id").single();
  if (error) redirect(`${BASE}/empresas?error=${encodeURIComponent(error.message)}`);

  // Crear rol admin para la nueva empresa
  const { data: permisos } = await s.from("permisos_catalogo").select("slug");
  await s.from("roles_empresa").insert({
    empresa_id: data!.id,
    slug: "admin",
    nombre: "Administrador",
    descripcion: "Control total sobre la empresa.",
    permisos: (permisos ?? []).map((p) => p.slug),
    color: "#0f172a",
    es_admin: true,
  });

  revalidatePath(`${BASE}/empresas`);
  redirect(`${BASE}/empresas/${data!.id}?ok=creada`);
}

export async function cambiarEstadoEmpresa(id: string, estado: "activa" | "suspendida" | "cancelada") {
  await assertSuperadmin();
  const s = await createClient();
  const update: Record<string, unknown> = { estado };
  if (estado === "cancelada") update.fecha_baja = new Date().toISOString().slice(0, 10);
  if (estado === "activa") update.fecha_baja = null;
  const { error } = await s.from("empresas").update(update).eq("id", id);
  if (error) redirect(`${BASE}/empresas/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/empresas`);
  revalidatePath(`${BASE}/empresas/${id}`);
  redirect(`${BASE}/empresas/${id}?ok=${estado}`);
}

export async function cambiarPlanEmpresa(id: string, plan: "autonomo" | "taller" | "empresa") {
  await assertSuperadmin();
  const s = await createClient();
  const { error } = await s.from("empresas").update({ plan }).eq("id", id);
  if (error) redirect(`${BASE}/empresas/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/empresas/${id}`);
  redirect(`${BASE}/empresas/${id}?ok=plan`);
}

// ================== USUARIOS (admin de empresa) ==================
export async function invitarAdminEmpresa(empresaId: string, fd: FormData) {
  await assertSuperadmin();
  const s = await createClient();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!email) throw new Error("Email obligatorio");

  // Buscar rol admin de esta empresa
  const { data: rol } = await s.from("roles_empresa").select("id").eq("empresa_id", empresaId).eq("es_admin", true).maybeSingle();

  // Crear usuario auth via Supabase Admin API (magic-link).
  // En Supabase, la invitación con `signInWithOtp` envía email para que el usuario
  // ponga su contraseña la primera vez.
  const { data: existente } = await s.from("usuarios").select("id").eq("email", email).maybeSingle();
  if (existente) {
    await s.from("usuarios").update({
      empresa_id: empresaId,
      rol_empresa_id: rol?.id ?? null,
      nombre: nombre || null,
      activo: true,
    }).eq("id", existente.id);
  } else {
    await s.from("usuarios").insert({
      email,
      nombre: nombre || null,
      empresa_id: empresaId,
      rol_empresa_id: rol?.id ?? null,
      es_superadmin: false,
      activo: true,
    });
  }

  // Disparar magic-link de Supabase para que el usuario establezca contraseña
  await s.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login` },
  });

  revalidatePath(`${BASE}/empresas/${empresaId}`);
  redirect(`${BASE}/empresas/${empresaId}?ok=admin-invitado`);
}

export async function resetPasswordUsuario(usuarioId: string, redirigirA: string) {
  await assertSuperadmin();
  const s = await createClient();
  const { data: u } = await s.from("usuarios").select("email").eq("id", usuarioId).maybeSingle<{ email: string }>();
  if (!u) throw new Error("Usuario no encontrado");
  await s.auth.resetPasswordForEmail(u.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login?reset=1`,
  });
  redirect(`${redirigirA}?ok=magic-link-enviado`);
}
