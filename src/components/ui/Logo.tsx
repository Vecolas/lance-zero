/**
 * Símbolo do LanceZero: um zero formado pelo gradiente da marca com um peão
 * escuro centralizado. Precisa continuar legível em 16×16 px, por isso o traço
 * é grosso e o peão é uma silhueta cheia, sem detalhe fino.
 */
export function Logo({ size = 28, title = 'LanceZero' }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id="lz-brand" x1="0" y1="32" x2="32" y2="0">
          <stop offset="0%" stopColor="var(--zero-deep)" />
          <stop offset="45%" stopColor="var(--zero-blue)" />
          <stop offset="100%" stopColor="var(--zero-cyan)" />
        </linearGradient>
      </defs>
      <ellipse
        cx="16"
        cy="16"
        rx="11.5"
        ry="13.5"
        fill="none"
        stroke="url(#lz-brand)"
        strokeWidth="3.5"
      />
      <path
        d="M16 7.5a3.1 3.1 0 0 1 1.9 5.55c1.5 1.1 2.3 2.9 2.3 5.1 0 1.9-.6 3.6-1.7 4.9h1.9v2.6h-8.8v-2.6h1.9c-1.1-1.3-1.7-3-1.7-4.9 0-2.2.8-4 2.3-5.1A3.1 3.1 0 0 1 16 7.5z"
        fill="var(--text)"
      />
    </svg>
  )
}
