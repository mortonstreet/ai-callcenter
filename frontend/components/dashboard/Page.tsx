type PageProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-4 sm:mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </header>

      <section>
        {children}
      </section>
    </div>
  )
}
