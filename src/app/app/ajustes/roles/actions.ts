"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/app/ajustes/roles";

async function assertAdmin() {
  const s = await createClient();
  const { data: u } = await s.auth.getUser();
  if (!u.user) throw new Error("No autenticado");
  const { data } = await s.from("usuarios").select("rol_empresa_id, es_superadmin, empresa_id").eq("id", u.user.id).maybeSingle<{ rol_empresa_id: string | null; es_superadmin: boolean; empresa_id: string | null }>();
  if (data?.es_superadmin) return data;
  if (!data?.rol_empresa_id) throw new Error("Sin rol asignado");
  const { data: rol } = await s.from("roles_empresa").select("es_admin").eq("id", data.rol_empresa_id).maybeSingle<{ es_admin: boolean }>();
  if (!rol?.es_admin) throw new Error("Solo admin puede gestionar roles");
  return data;
}

export async function crearRol(fd: FormData) {
  await assertAdmin();
  const s = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio");
  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const permisos = (fd.getAll("permisos") as string[]).map((x) => String(x));
  const { error } = await s.from("roles_empresa").insert({
    slug,
    nombre,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    permisos,
    color: String(fd.get("color") ?? "#3b82f6"),
    es_admin: false,
  });
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=creado`);
}

export async function actualizarRol(id: string, fd: FormData) {
  await assertAdmin();
  const s = await createClient();
  const permisos = (fd.getAll("permisos") as string[]).map((x) => String(x));
  const { error } = await s.from("roles_empresa").update({
    nombre: String(fd.get("nombre") ?? "").trim(),
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    permisos,
    color: String(fd.get("color") ?? "#3b82f6"),
    activo: fd.get("activo") !== "off",
  }).eq("id", id);
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=actualizado`);
}

export async function eliminarRol(id: string) {
  await assertAdmin();
  const s = await createClient();
  // Comprobar que no tiene usuarios y que no es admin
  const { data: rol } = await s.from("roles_empresa").select("es_admin").eq("id", id).maybeSingle<{ es_admin: boolean }>();
  if (rol?.es_admin) redirect(`${BASE}?error=${encodeURIComponent("No se puede eliminar el rol admin")}`);
  await s.from("roles_empresa").delete().eq("id", id);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
