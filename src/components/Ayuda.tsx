export default function Ayuda() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="font-display text-2xl text-[var(--foreground)]">Centro de ayuda</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Videos, guías y otros recursos para usar el sistema.
          </p>
        </header>

        <section className="border-t border-[var(--border)] py-6">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Videos de ayuda</h2>
            <span className="text-xs text-[var(--muted-foreground)]">Tutoriales y demostraciones</span>
          </div>
          <div className="min-h-52 flex flex-col items-center justify-center text-center px-6 py-10 border border-dashed border-[var(--border)] rounded-md">
            <div className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)] mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M4.25 3.5A1.75 1.75 0 0 0 2.5 5.25v9.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75v-9.5a1.75 1.75 0 0 0-1.75-1.75H4.25ZM8 7.22c0-.57.62-.93 1.12-.65l4.6 2.56a.75.75 0 0 1 0 1.31l-4.6 2.56A.75.75 0 0 1 8 12.35V7.22Z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">Aún no hay videos publicados</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm">
              Cuando se agreguen tutoriales, estarán disponibles en este espacio.
            </p>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-2">Otros recursos</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Aquí también se podrán consultar guías y material de apoyo del sistema.
          </p>
        </section>
      </div>
    </div>
  );
}