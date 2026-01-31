type PageProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function Page({ title, subtitle, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-4 sm:mb-6">
        <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-muted-foreground">
            {subtitle}
          </p>
        )}
      </header>

      <section>
        {children}
      </section>
    </div>
  )
}
