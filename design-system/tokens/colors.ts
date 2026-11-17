// Ação e logotipo #C83359. Link, ícone e progresso #BB003E. Texto #492F35.
// O nome `teal` na API aponta para o link, não para o dinheiro.

const action = '#C83359'
const link = '#BB003E'

export const palette = {
  brand: {
    pink: action,
    pinkLight: '#FFFAFB',
    teal: link,
    background: '#F3F4F6',
    ink: '#492F35',
  },
  surface: {
    default: '#FFFFFF',
    canvas: '#F3F4F6',
    pinkSubtle: '#FFFAFB',
    tealSubtle: '#FFFAFB',
  },
  text: {
    primary: '#492F35',
    secondary: '#60595B',
    inverse: '#FFFFFF',
    // Dinheiro. 5,2:1 no branco e 4,7:1 no fundo #F3F4F6.
    money: '#007A77',
  },
  border: {
    default: '#C3BEBF',
    strong: '#776F71',
  },
  action: {
    primary: action,
    primaryPressed: '#A32947',
    primaryText: link,
    primaryOutline: link,
    secondary: link,
    focus: '#6E1830',
  },
  onAction: {
    primary: '#FFFFFF',
  },
  feedback: {
    success: '#2A5817',
    successSurface: '#D4E1CF',
    warning: '#6E3D00',
    warningSurface: '#EBD9C9',
    error: '#8C3A22',
    errorSurface: '#F4E8E4',
    info: '#004F7C',
    infoSurface: '#CDDFEF',
  },
  state: {
    disabledSurface: '#C3BEBF',
    disabledText: '#8F888A',
  },
  overlay: { scrim: 'rgba(16,12,13,0.48)' },
} as const
