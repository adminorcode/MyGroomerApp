// Tema claro gerado em design-exploration/ux-skill (marca #D95786, papel fill).
// O nome `teal` permanece na API dos componentes e agora aponta para o rosa profundo.

const pink = '#D95786'
const pinkText = '#8F2650'

export const palette = {
  brand: {
    pink,
    pinkLight: '#FFD3DF',
    teal: pinkText,
    background: '#F8F6F7',
    ink: '#221D1F',
  },
  surface: {
    default: '#FFFFFF',
    canvas: '#F8F6F7',
    pinkSubtle: '#FFD3DF',
    tealSubtle: '#F4E9EC',
  },
  text: {
    primary: '#221D1F',
    secondary: '#60595B',
    inverse: '#FFFFFF',
    // Valor em dinheiro. O teal da marca (#167D83): 4,89:1 no branco e 4,54:1 no canvas.
    // O token brand.teal ficou rosa e faz o preço parecer débito.
    money: '#167D83',
  },
  border: {
    default: '#C3BEBF',
    strong: '#776F71',
  },
  action: {
    primary: '#C84878',
    primaryPressed: '#A6265B',
    primaryText: pinkText,
    primaryOutline: pinkText,
    secondary: pinkText,
    focus: '#460020',
  },
  onAction: {
    primary: '#FFFFFF',
  },
  feedback: {
    success: '#2A5817',
    successSurface: '#D4E1CF',
    warning: '#6E3D00',
    warningSurface: '#EBD9C9',
    error: '#7B2E29',
    errorSurface: '#F0D6D3',
    info: '#004F7C',
    infoSurface: '#CDDFEF',
  },
  state: {
    disabledSurface: '#C3BEBF',
    disabledText: '#8F888A',
  },
  overlay: { scrim: 'rgba(16,12,13,0.48)' },
} as const
