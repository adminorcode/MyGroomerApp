// My Groomer Design System v1.0 — seção 3.
// brand.pink não é fundo de CTA com texto branco pequeno.

export const palette = {
  brand: {
    pink: '#D95786',
    pinkLight: '#F6B5CB',
    teal: '#167D83',
    background: '#F9F8F6',
    ink: '#253D42',
  },
  surface: {
    default: '#FFFFFF',
    canvas: '#F9F8F6',
    pinkSubtle: '#FCE5ED',
    tealSubtle: '#E9F3F2',
  },
  text: {
    primary: '#253D42',
    secondary: '#60767A',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#D9E0E1',
    strong: '#60767A',
  },
  action: {
    primary: '#B8326A',
    primaryPressed: '#A7285A',
    primaryOutline: '#B8326A',
    secondary: '#167D83',
    focus: '#167D83',
  },
  feedback: {
    success: '#176B54',
    successSurface: '#E5F5EF',
    warning: '#A53B20',
    warningSurface: '#FFF1E7',
    error: '#B3261E',
    errorSurface: '#FCE8E6',
    info: '#167D83',
  },
  state: {
    disabledSurface: '#E4E8E8',
    disabledText: '#60767A',
  },
  overlay: { scrim: 'rgba(37,61,66,0.48)' },
} as const
