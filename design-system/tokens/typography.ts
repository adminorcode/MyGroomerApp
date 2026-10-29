// My Groomer Design System v1.0 — seção 4.
// Família oficial da interface: Inter. Papéis usam 400, 600 e 700.
// fonts.medium (Inter Medium 500) cobre ênfase intermediária já existente.

type TypeStyle = {
  fontSize: number
  lineHeight: number
  fontWeight: '400' | '600' | '700'
}

function style(fontSize: number, lineHeight: number, fontWeight: TypeStyle['fontWeight']): TypeStyle {
  return { fontSize, lineHeight, fontWeight }
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
} as const
