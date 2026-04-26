"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/app/ajustes/usuarios";

async function assertAdmin() {
  const s = await createClient();
  const { data: u } = await s.auth.getUser();
  if (!u.user) throw new Error("No autenticado");
  const { data } = await s.from("usuarios").select("rol_empresa_id, es_superadmin, empresa_id").eq("id", u.user.id).maybeSingle<{ rol_empresa_id: string | null; es_superadmin: boolean; empresa_id: string }>();
  if (data?.es_superadmin) return data;
  if (!data?.rol_empresa_id) throw new Error("Sin rol asignado");
  const { data: rol } = await s.from("roles_empresa").select("es_admin").eq("id", data.rol_empresa_id).maybeSingle<{ es_admin: boolean }>();
  if (!rol?.es_admin) throw new Error("Solo admin puede gestionar usuarios");
  return data;
}

export async function invitarUsuario(fd: FormData) {
  const ctx = await assertAdmin();
  const s = await createClient();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const rol_empresa_id = String(fd.get("rol_empresa_id") ?? "").trim() || null;
  if (!email) throw new Error("Email obligatorio");
  if (!ctx.empresa_id) throw new Error("Sin empresa asignada");

  const { data: existente } = await s.from("usuarios").select("id").eq("email", email).maybeSingle();
  if (existente) {
    await s.from("usuarios").update({
      empresa_id: ctx.empresa_id,
      rol_empresa_id,
      nombre: nombre || null,
      activo: true,
    }).eq("id", existente.id);
  } else {
    await s.from("usuarios").insert({
      email,
      nombre: nombre || null,
      empresa_id: ctx.empresa_id,
      rol_empresa_id,
      es_superadmin: false,
      activo: true,
    });
  }

  await s.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login` },
  });

  revalidatePath(BASE);
  redirect(`${BASE}?ok=invitado`);
}

export async function actualizarUsuario(id: string, fd: FormData) {
  await assertAdmin();
  const s = await createClient();
  const update: Record<string, unknown> = {
    nombre: String(fd.get("nombre") ?? "").trim() || null,
    rol_empresa_id: String(fd.get("rol_empresa_id") ?? "").trim() || null,
    activo: fd.get("activo") !== "off",
  };
  await s.from("usuarios").update(update).eq("id", id);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=actualizado`);
}

export async function resetPasswordMiUsuario(id: string) {
  await assertAdmin();
  const s = await createClient();
  const { data: u } = await s.from("usuarios").select("email, empresa_id").eq("id", id).maybeSingle<{ email: string; empresa_id: string | null }>();
  if (!u) throw new Error("No encontrado");
  const ctx = await s.from("usuarios").select("empresa_id").eq("id", (await s.auth.getUser()).data.user?.id ?? "").maybeSingle<{ empresa_id: string | null }>();
  if (u.empresa_id !== ctx.data?.empresa_id) throw new Error("No autorizado");
  await s.auth.resetPasswordForEmail(u.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login?reset=1`,
  });
  redirect(`${BASE}?ok=magic-link`);
}

export async function eliminarUsuarioEmpresa(id: string) {
  await assertAdmin();
  const s = await createClient();
  await s.from("usuarios").update({ activo: false }).eq("id", id);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=desactivado`);
}
