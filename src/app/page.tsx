export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 text-center dark:from-zinc-950 dark:to-black">
      <div className="max-w-xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          En construcción
        </div>

        <h1 className="text-6xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          GPTO
        </h1>

        <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Gestor integral para carpintería de armarios empotrados a medida.
          <br />
          Del configurador 3D a la producción, sin hojas de cálculo.
        </p>

        <p className="pt-4 text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
          Próximamente
        </p>
      </div>
    </main>
  );
}
