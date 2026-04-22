import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Check = {
  label: string;
  ok: boolean;
  detail?: string;
};

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_URL definida",
    ok: Boolean(url),
    detail: url ? "OK" : "Falta variable",
  });
  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY definida",
    ok: Boolean(anon),
    detail: anon ? "OK" : "Falta variable",
  });
  checks.push({
    label: "SUPABASE_SERVICE_ROLE_KEY definida",
    ok: Boolean(service),
    detail: service ? "OK" : "Falta variable",
  });

  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
        cache: "no-store",
      });
      const body = res.ok ? ((await res.json()) as { name?: string; version?: string }) : null;
      checks.push({
        label: "Auth health (GoTrue)",
        ok: res.ok,
        detail: body
          ? `HTTP ${res.status} — ${body.name ?? "ok"} ${body.version ?? ""}`.trim()
          : `HTTP ${res.status} — revisa URL/key`,
      });
    } catch (e) {
      checks.push({
        label: "Auth health (GoTrue)",
        ok: false,
        detail: e instanceof Error ? e.message : "Error desconocido",
      });
    }

    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.getSession();
      checks.push({
        label: "Cliente SSR (auth.getSession)",
        ok: !error,
        detail: error ? error.message : "Respuesta correcta (sin sesión activa)",
      });
    } catch (e) {
      checks.push({
        label: "Cliente SSR (auth.getSession)",
        ok: false,
        detail: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  } else {
    checks.push({
      label: "Conexión a Supabase",
      ok: false,
      detail: "Saltada: faltan variables de entorno",
    });
  }

  return checks;
}

export default async function HealthPage() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.ok);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              allOk ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Health check
          </h1>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Estado de la conexión con Supabase.
        </p>

        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.label}
                </p>
                {c.detail ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.detail}
                  </p>
                ) : null}
              </div>
              <span
                className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.ok
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {c.ok ? "OK" : "KO"}
              </span>
            </li>
          ))}
        </ul>

        <p className="pt-2 text-xs text-zinc-400 dark:text-zinc-600">
          Esta página existe para validar configuración. Se eliminará o
          protegerá en Sub 0.4 (auth).
        </p>
      </div>
    </main>
  );
}
