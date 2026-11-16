// Famílias do sistema novo: Outfit nos papéis display, Nunito Sans no texto.

type TypeStyle = {
  fontSize: number
  lineHeight: number
  fontWeight: '400' | '600' | '700'
  face?: 'display' | 'text'
  letterSpacing?: number
  textTransform?: 'uppercase'
  tabularNums?: boolean
}

function style(fontSize: number, lineHeight: number, fontWeight: TypeStyle['fontWeight'], extra: Partial<TypeStyle> = {}): TypeStyle {
  return { fontSize, lineHeight, fontWeight, ...extra }
}

export const textStyles = {
  display: style(36, 40, '600', { face: 'display', letterSpacing: -0.44 }),
  heading1: style(34, 38, '600', { face: 'display', letterSpacing: -0.72 }),
  heading2: style(24, 29, '600'),
  heading3: style(20, 26, '600'),
  title: style(16, 24, '600'),
  body: style(16, 25, '400'),
  bodySmall: style(14, 22, '400'),
  label: style(14, 20, '600'),
  caption: style(12, 16, '400'),
  button: style(16, 22, '600'),
  numeric: style(28, 32, '600', { face: 'display', letterSpacing: -0.44, tabularNums: true }),
  eyebrow: style(12, 16, '600', { letterSpacing: 0.56, textTransform: 'uppercase' }),
  priceLarge: style(44, 48, '700', { face: 'display', letterSpacing: -0.72, tabularNums: true }),
  logotype: style(30, 36, '700', { face: 'display', letterSpacing: -0.6 }),
} as const
