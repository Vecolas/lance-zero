/**
 * Marca LanceZero: um zero geométrico atravessado pela trajetória em "L" do
 * cavalo. Sem peça desenhada — precisa continuar legível em 16×16 px.
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
      <ellipse
        cx="16"
        cy="16"
        rx="10.5"
        ry="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M11 22.5 L11 13 L21 13"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
