// My Groomer Design System v1.0 — seção 4.
// Família oficial da interface: Inter. Papéis usam 400, 600 e 700.
// fonts.medium (Inter Medium 500) cobre ênfase intermediária já existente.

type TypeStyle = {
  fontSize: number
  lineHeight: number
  fontWeight: '400' | '600' | '700'
  letterSpacing?: number
  textTransform?: 'uppercase'
  tabularNums?: boolean
}

function style(fontSize: number, lineHeight: number, fontWeight: TypeStyle['fontWeight'], extra: Partial<TypeStyle> = {}): TypeStyle {
  return { fontSize, lineHeight, fontWeight, ...extra }
}

export const textStyles = {
  display: style(32, 40, '700'),
  heading1: style(26, 34, '700'),
  heading2: style(22, 29, '700'),
  heading3: style(18, 26, '600'),
  title: style(16, 24, '600'),
  body: style(16, 24, '400'),
  bodySmall: style(14, 21, '400'),
  label: style(14, 20, '600'),
  caption: style(12, 18, '400'),
  button: style(16, 22, '600'),
  numeric: style(24, 30, '700'),
  // CMP-01 — rótulo de seção em caixa-alta (tracking 0,12em), decisão Q4 do plano 027.
  eyebrow: style(12, 16, '600', { letterSpacing: 1.44, textTransform: 'uppercase' }),
  // CMP-01 — preço em destaque (40/44 Bold, tracking -0,02em, números tabulares). Desvio do DS aprovado em Q4.
  priceLarge: style(40, 44, '700', { letterSpacing: -0.8, tabularNums: true }),
  // CMP-02 — logotipo Inter Bold 700, 30/36, tracking -0,02em.
  logotype: style(30, 36, '700', { letterSpacing: -0.6 }),
} as const
