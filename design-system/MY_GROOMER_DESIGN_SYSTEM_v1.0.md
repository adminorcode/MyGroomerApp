# My Groomer — Design System v1.0

> **Documento de referência para agentes de desenvolvimento e design**  
> **Produto:** My Groomer — marketplace de cuidados pet, inicialmente focado em agendamento de groomers  
> **Plataformas:** aplicativo móvel iOS/Android em React Native; preparado para compartilhamento futuro de tokens com web/admin  
> **Idioma da interface:** português do Brasil (`pt-BR`)  
> **Identidade:** Pink & Teal  
> **Status:** especificação inicial para implementação, sujeita a validação visual e funcional  
> **Versão:** 1.0 — 29/10/2026

---

## 0. INSTRUÇÕES PARA O AGENTE (LEIA PRIMEIRO)

Este arquivo é a **fonte de verdade para a camada visual e de experiência** do My Groomer, salvo quando uma decisão mais recente do projeto o substituir explicitamente.

**Objetivos obrigatórios:**

1. Implementar interfaces consistentes, reutilizáveis e acessíveis, sem criar um estilo novo a cada tela.
2. Preservar a identidade **Pink & Teal**, a estrutura visual dos protótipos aprovados e os fluxos funcionais do produto.
3. Separar **tokens → componentes compartilhados → padrões compostos → telas**.
4. Reutilizar o framework de navegação, formulários, iconografia, bibliotecas e arquitetura **já existentes no repositório** antes de introduzir novas dependências.
5. Desenvolver em **React Native + TypeScript**, respeitando a stack real do projeto. Não presumir Expo, React Navigation, NativeWind, React Native Paper, Zustand, Redux ou qualquer biblioteca até verificar o `package.json`.
6. Implementar telas reais com componentes nativos; **nunca usar PNGs de wireframe como tela funcional**. Os PNGs são referências de aparência, composição e hierarquia, não assets finais.
7. Consultar os arquivos de protótipos que forem fornecidos ao agente e aplicar esta especificação quando houver divergências pequenas (ex.: contraste, espaçamento e acessibilidade).
8. Não inventar decisões de negócio ainda pendentes (pagamento, confirmação automática, precificação dinâmica, validação documental). Sinalizar decisões abertas e isolar comportamentos em configuração/contratos.
9. Evitar valores mágicos de cores, tipografia, dimensões e sombras nos componentes de tela. Valores devem vir de tokens semânticos.
10. Entregar com testes básicos, estados de loading/erro/vazio, navegação correta e acessibilidade. Para novas telas, registrar divergências dos protótipos.

**Ordem de prioridade em conflitos:**

1. Segurança, acessibilidade e requisitos funcionais explicitamente aprovados.
2. Decisões de produto mais recentes, confirmadas por responsáveis do projeto.
3. Este Design System (tokens, componentes e regras de layout).
4. Protótipos PNG/PDF como referência visual.
5. Preferências nativas da plataforma e convenções do repositório.

**Escopo deste documento:** aparência, padrões de UX, contratos de componentes e orientações de implementação. **Não é** uma especificação completa da API, autorização, pagamentos, LGPD ou regras comerciais.

---

## 1. VISÃO DO PRODUTO E PRINCÍPIOS

### 1.1. Proposta de valor

O My Groomer aproxima **tutores de pets** de **groomers profissionais**, com descoberta por área de atendimento, informações transparentes, confiança e agendamento simples. O MVP prioriza **agendamento**. Outras categorias (veterinário, adestrador e hotel pet) são possíveis expansões, mas não devem determinar prematuramente a UI inicial.

### 1.2. Personas e contextos

| Perfil | Objetivo primário | Ênfase da experiência |
|---|---|---|
| **Tutor** | Encontrar profissional adequado e agendar serviços para seu pet | Acolhimento, clareza, confiança, poucos passos |
| **Groomer** | Cadastrar serviços, região, disponibilidade e administrar atendimentos | Controle operacional, precisão, leitura rápida e ações claras |
| **Administrador** (futuro) | Validar profissionais, acompanhar denúncias e operações | Rastreabilidade, revisão e segurança; ainda sem UI consolidada |

### 1.3. Personalidade de marca

- **Afetuosa e otimista**, sem infantilizar o usuário.
- **Profissional e confiável**: especialmente em dados do pet, preços e compromissos.
- **Clara e leve**: telas organizadas em blocos, sem excesso de ornamentos.
- **Humana**: nomes, fotos e microcopy compreensível.
- **Consistente**: a mesma ação utiliza o mesmo estilo e comportamento no aplicativo inteiro.

### 1.4. Heurísticas

- Uma ação primária evidente por contexto.
- Informações críticas (preço, data, horário, endereço, status) facilmente identificáveis.
- Não exigir login prematuro para navegar por profissionais, quando o produto permitir; autenticação antes de concluir operações privadas.
- Endereço de atendimento influencia a descoberta; não exigir mapa sempre que um formulário textual resolver.
- Feedback claro após cada ação relevante.
- Prevenir agendamento em horário inválido e conflitos de disponibilidade.
- Status nunca deve depender exclusivamente de cor.

---

## 2. INSPIRAÇÃO E LIMITES

O sistema **se inspira** em princípios do **Material Design 3** (papéis semânticos das cores, componentes e estados), nas **Apple Human Interface Guidelines** (ergonomia mobile e hierarquia) e nas recomendações **WCAG 2.2 AA** (contraste, comunicação e acessibilidade).

**Importante:** não se afirma conformidade integral com Material Design 3 nem com WCAG 2.2 AA só por seguir este guia. A conformidade deve ser verificada em componentes e telas implementados.

Guias externos úteis:

- Material Design 3: https://m3.material.io/
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Acessibilidade React Native: https://reactnative.dev/docs/accessibility
- Android Accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps

---

## 3. FUNDAÇÕES — CORES

### 3.1. Paleta oficial **confirmada**

| Token base | HEX | Papel |
|---|---|---|
| `brand.pink` | `#D95786` | Cor identitária principal; destaques, acentos, ilustrações, ícones |
| `brand.pinkLight` | `#F6B5CB` | Acentos suaves e backgrounds decorativos |
| `brand.teal` | `#167D83` | Confiança, informações e elementos profissionais |
| `brand.background` | `#F9F8F6` | Background geral, tom off-white acolhedor |
| `brand.ink` | `#253D42` | Texto principal e títulos |

Estas **cinco cores** são a escolha de marca aprovada. Preservá-las sem substituição estética arbitrária.

### 3.2. Cores de suporte **propostas para implementação**

> Estes valores são uma formalização técnica inicial, não cores previamente votadas. Podem ser ajustados após review visual e testes de contraste.

| Token | HEX | Uso |
|---|---|---|
| `surface.default` | `#FFFFFF` | Cards, folhas, campos, modais |
| `surface.canvas` | `#F9F8F6` | Fundo de tela |
| `surface.pinkSubtle` | `#FCE5ED` | Chips, cartões de destaque rosa, avisos suaves |
| `surface.tealSubtle` | `#E9F3F2` | Cards de informação, área do profissional |
| `text.primary` | `#253D42` | Corpo e títulos |
| `text.secondary` | `#60767A` | Texto secundário legível; preferir ao cinza muito claro |
| `text.inverse` | `#FFFFFF` | Texto sobre fundos escuros aprovados |
| `border.default` | `#D9E0E1` | Separadores e contornos não críticos |
| `border.strong` | `#60767A` | Contornos que precisam de maior percepção |
| `action.primary` | `#B8326A` | Botão rosa com texto branco; texto rosa de tamanho comum |
| `action.primaryPressed` | `#A7285A` | Estado pressionado do botão primário |
| `action.primaryOutline` | `#B8326A` | Botão secundário com texto/contorno rosa legível |
| `action.secondary` | `#167D83` | Botões teal, texto branco, destaques operacionais |
| `action.focus` | `#167D83` | Destaque de foco e edição |
| `feedback.success` | `#176B54` | Texto/ícone de sucesso |
| `feedback.successSurface` | `#E5F5EF` | Fundo de sucesso |
| `feedback.warning` | `#A53B20` | Texto de alerta |
| `feedback.warningSurface` | `#FFF1E7` | Fundo de alerta |
| `feedback.error` | `#B3261E` | Texto de erro |
| `feedback.errorSurface` | `#FCE8E6` | Fundo de erro |
| `feedback.info` | `#167D83` | Informação |
| `overlay.scrim` | `rgba(37,61,66,0.48)` | Fundo de modais |
| `state.disabledSurface` | `#E4E8E8` | Background de controles desabilitados |
| `state.disabledText` | `#60767A` | Rótulo em controle desabilitado (visual + estado semântico) |

### 3.3. Regra crítica de contraste

**Não usar texto branco pequeno sobre `#D95786`.** A combinação tem contraste aproximado de **3,71:1**, inferior ao mínimo de **4,5:1** para texto comum da WCAG AA. Para CTAs com texto branco, usar `#B8326A` (aprox. **5,67:1** sobre branco). O rosa original continua aparecendo em ícones, marca, bordas/decorações e áreas onde o contraste exigido seja atendido.

Outras combinações aprovadas para texto comum:

| Par de cores | Contraste aprox. | Orientação |
|---|---:|---|
| `#253D42` sobre `#F9F8F6` | 10,84:1 | Títulos e corpo |
| `#60767A` sobre `#FFFFFF` | 4,81:1 | Texto secundário |
| `#167D83` sobre `#FFFFFF` | 4,89:1 | Texto teal |
| `#167D83` sobre `#F9F8F6` | 4,61:1 | Texto teal no canvas |
| `#FFFFFF` sobre `#B8326A` | 5,67:1 | Texto de CTA rosa |
| `#B8326A` sobre `#FCE5ED` | 4,75:1 | Texto rosa em chips claros |
| `#167D83` sobre `#E9F3F2` | 4,32:1 | **Evitar para texto comum**; usar `text.primary` nesse fundo |

Os índices são aproximados e precisam ser revalidados nas combinações reais, com opacidade e imagens de fundo.

**Decisões:**

- Rosa = identidade e ação principal; teal = apoio, confiança, localização e operação. **Não codificar semântica de sucesso/erro só pela paleta de marca.**
- Não usar `brand.pinkLight` para texto em superfícies claras.
- Para botões desabilitados, reduzir ênfase e adicionar `disabled` programático; cor sozinha não basta.
- Área profissional usa mais superfícies teal; não inverter o significado dos botões em telas distintas.

### 3.4. Papéis semânticos obrigatórios

Uso preferencial em código: `colors.text.primary`, `colors.action.primary`, `colors.surface.canvas`, etc. Componentes de tela não devem referenciar HEX diretamente.

**Interações:**

- Primário padrão: `action.primary` (rosa escuro + branco).
- Primário pressed: `action.primaryPressed`.
- Secundário outline: fundo transparente/branco, texto e borda `action.primaryOutline`.
- Terciário/ghost: texto `action.primaryOutline`, sem borda.
- Teal filled: `action.secondary`, texto branco.
- Foco: borda `action.focus` com espessura visível; não depender só de sombra.
- Erro: borda/ícone `feedback.error`, legenda de erro e `accessibilityState` apropriado quando suportado.

---

## 4. FUNDAÇÕES — TIPOGRAFIA

### 4.1. Família tipográfica

Os PNGs aprovados não definem uma fonte oficial e não constituem arquivos editáveis de tipografia. **Proposta inicial: Inter** (ou fonte sans-serif próxima e legível), usada **somente se a fonte estiver licenciada e integrada corretamente ao projeto**. Até isso ser confirmado, utilizar a fonte nativa do sistema (SF Pro no iOS, Roboto no Android) e testar diferenças de quebra de linha.

Evitar misturar muitas fontes. Não usar fonte ilustrativa no corpo das telas. O logo pode ter tratamento próprio quando a identidade final for definida.

### 4.2. Escala tipográfica proposta (React Native, pontos lógicos)

| Estilo | Font size | Line height | Weight | Uso |
|---|---:|---:|---|---|
| `display` | 32 | 40 | 700 | Mensagem principal de onboarding |
| `heading1` | 26 | 34 | 700 | Título de página |
| `heading2` | 22 | 29 | 700 | Seção em destaque |
| `heading3` | 18 | 26 | 600 | Título de card/seção |
| `title` | 16 | 24 | 600 | Item de lista e campo destacado |
| `body` | 16 | 24 | 400 | Texto e formulários |
| `bodySmall` | 14 | 21 | 400 | Subtítulo, detalhes auxiliares |
| `label` | 14 | 20 | 600 | Etiquetas e botões compactos |
| `caption` | 12 | 18 | 400 | Metadado não crítico |
| `button` | 16 | 22 | 600 | CTA principal |
| `numeric` | 24 | 30 | 700 | KPIs, valor total e métricas |

**Regras:**

- Preferir `body = 16` para entradas e conteúdo principal.
- `caption = 12` somente para informação realmente secundária; dados críticos nunca devem depender exclusivamente de 12 pt.
- Não usar `fontSize` fixo com `allowFontScaling={false}` para esconder problemas de layout.
- Suportar fontes maiores do sistema, com layout adaptável e rolagem; permitir no mínimo os tamanhos comuns de acessibilidade, testando até **200%** sem perda de função quando praticável.
- Usar pesos 400/600/700 de forma consistente; confirmar suporte da família escolhida.
- Usar `fontVariant: ['tabular-nums']` para KPIs, preços e horários quando suportado pela fonte/plataforma.
- Datas, números e dinheiro formatados via APIs de localização, nunca por concatenação frágil.

---

## 5. FUNDAÇÕES — ESPAÇAMENTO, GRID E DIMENSÕES

### 5.1. Escala base de 4 pontos

```ts
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;
```

### 5.2. Convenções de layout

| Elemento | Valor inicial |
|---|---|
| Margem lateral de tela | 16 pt; 20 pt em telas de onboarding mais espaçosas |
| Distância vertical entre seções | 24 pt |
| Gap entre cards | 12 a 16 pt |
| Padding interno de card | 16 pt; 20 pt em cards de destaque |
| Gap entre label e campo | 8 pt |
| Distância entre campos | 16 pt |
| Barra de ação inferior | 16 pt horizontal; respeitar safe area |
| Altura visual de botão principal | 52 pt; alvo de toque no mínimo 48 pt |
| Altura visual de input | mínimo 52 pt |
| Ícone padrão | 20–24 pt |
| Área tocável de `IconButton` | mínimo 48 × 48 pt |
| Avatar de lista | 56–72 pt |
| Avatar de destaque | 88–104 pt |
| Tab bar | tamanho conforme biblioteca/plataforma, com safe-area garantida |

**Layout:**

- `SafeAreaView` / safe-area compatível com a stack presente, inclusive notch e home indicator.
- Inputs e CTAs inferiores devem permanecer acessíveis com o teclado aberto; usar scroll + keyboard avoidance adequado ao iOS/Android.
- Screens menores devem **rolar**, não encolher fonte ou sobrepor controles.
- Em formulários longos, preferir rodapé sticky somente quando não encobrir conteúdo.
- Componentes com mais de 2 colunas (ex.: serviços por porte) precisam empilhar ou ganhar rolagem horizontal deliberada em telas estreitas ou fonte ampliada.
- Fotos preservam proporção com `resizeMode="cover"`, sem distorções.
- Nada deve depender de dimensões absolutas da imagem PNG.

### 5.3. Border radius

```ts
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;
```

| Uso | Token |
|---|---|
| Campo e chip | `radius.md` ou `radius.pill` (chips) |
| Botão | `radius.lg` |
| Cards padrão | `radius.lg` |
| Cards hero / info | `radius.xl` |
| Modal | `radius.xxl` |
| Avatar circular | `radius.pill` |

### 5.4. Bordas e sombras

- Bordas padrão: **1 pt** com `border.default`.
- Foco/erro: **2 pt** sem mudar layout (compensar medidas quando necessário).
- Card primário: sombra muito sutil, não substitui separação por fundo ou contorno.
- iOS: `shadowColor`, `shadowOpacity`, `shadowOffset` e `shadowRadius`; Android: `elevation` equivalente, sem depender de igualdade perfeita de pixel.
- Limitar elevação visual: `none`, `low`, `medium`, `overlay`; manter nomes semânticos.

---

## 6. ICONOGRAFIA, FOTOS E ILUSTRAÇÕES

### 6.1. Ícones

Padrão recomendado: **uma única família consistente de ícones outline**, preferencialmente Lucide se compatível com as dependências existentes. Usar equivalente já instalado antes de introduzir nova biblioteca.

- Tamanho comum: 20–24 pt.
- `strokeWidth` consistente na família.
- Ícones de ação usam tokens semânticos.
- Seletor de ícones centralizado em `MGIcon` / `Icon`, não caminhos arbitrários por tela.
- Ícones nunca substituem labels em ações importantes, exceto quando a ação é autoexplicativa e acessível.

**Mapeamento sugerido:**

| Conceito | Ícone ilustrativo |
|---|---|
| Pets | `paw-print` |
| Groomer/serviço | `scissors` |
| Banho | `droplets` |
| Raio/endereço | `map-pin` |
| Agenda | `calendar-days` |
| Disponibilidade | `clock-3` |
| Validado | `badge-check` |
| Notificações | `bell` |
| Busca | `search` |
| Configurações/filtros | `sliders-horizontal` |
| Adicionar | `plus` |
| Voltar | `arrow-left` |

### 6.2. Fotos

- Usar avatares e fotos para tornar pets e groomers reconhecíveis; armazenar com dimensões e placeholders adequados.
- Se a foto do pet estiver ausente, mostrar avatar de pata com `surface.pinkSubtle`.
- Se a foto do profissional estiver ausente, mostrar avatar genérico com iniciais ou ícone neutro.
- `Image` precisa de `accessibilityLabel` **quando a imagem transmite informação**; decorativas não devem ser anunciadas.
- Evitar fotos geradas como dados reais. As fotos dos mockups são **fictícias** e não representam usuários cadastrados.
- Tratar erro de carregamento e conteúdo remoto com fallback.

### 6.3. Mascote

O cachorro linear sorridente visto nos protótipos é um **elemento conceitual**, não um mascote final aprovado. Pode orientar a estética de onboarding, mas não deve ser recortado de screenshots nem presumido como asset definitivo. Produzir/revisar um SVG ou ilustração vetorial própria antes de uso em produção.

---

## 7. COMPONENTES — BIBLIOTECA COMPARTILHADA

Cada componente compartilhado deve expor **variantes semânticas**, estado acessível, comportamento consistente, testes e documentação de uso. Componentes de tela não devem duplicar a implementação de componentes listados aqui.

### 7.1. Componentes fundamentais

| Componente | Props / contratos principais | Estados obrigatórios |
|---|---|---|
| `MGScreen` | `children`, `scrollable`, `safeArea`, `background`, `footer` | Loading / conteúdo / erro |
| `MGText` | `variant`, `color`, `weight`, `numberOfLines` | Normal / truncado somente quando aceitável |
| `MGIcon` | `name`, `size`, `color`, `decorative` | Normal / acessível |
| `MGButton` | `label`, `variant`, `size`, `onPress`, `loading`, `disabled`, `iconLeft`, `iconRight` | Default / pressed / focus / disabled / loading |
| `MGIconButton` | `icon`, `accessibilityLabel`, `onPress` | Default / pressed / focus / disabled |
| `MGTextField` | `label`, `value`, `onChangeText`, `placeholder`, `required`, `error`, `helperText`, `keyboardType` | Empty / focused / filled / error / disabled |
| `MGTextArea` | `label`, `value`, `maxLength`, `counter`, `error` | Normal / focused / error |
| `MGSelect` | `label`, `value`, `options`, `onChange`, `error` | Closed / open / selected / error |
| `MGCheckbox` | `checked`, `onValueChange`, `label` | Off / on / disabled |
| `MGSwitch` | `value`, `onValueChange`, `label` | Off / on / disabled |
| `MGRadioGroup` | `value`, `options`, `onChange` | Selected / unselected / disabled |
| `MGChip` | `label`, `variant`, `selected`, `onPress` | Default / selected / disabled |
| `MGCard` | `variant`, `padding`, `children`, `onPress?` | Default / pressed (se interativo) |
| `MGBadge` | `label`, `tone`, `icon?` | Status semanticamente distinto |
| `MGDivider` | `spacing`, `color` | Decorativo |
| `MGAvatar` | `uri?`, `name`, `kind`, `size` | Image / fallback / loading |
| `MGListItem` | `title`, `description`, `leading`, `trailing`, `onPress` | Default / pressed / disabled |
| `MGModal` | `visible`, `title`, `body`, `actions`, `onDismiss` | Open / close / modal focus |
| `MGToast` / `MGBanner` | `tone`, `title`, `message`, `action?` | Info / success / warning / error |
| `MGEmptyState` | `illustration?`, `title`, `description`, `action?` | Empty |
| `MGErrorState` | `message`, `retry?` | Recoverable error |
| `MGSkeleton` | `variant` | Loading |

**Naming:** se a arquitetura atual preferir `Button`, `TextField`, `Card` sem prefixo, manter padrão local; a tabela acima define contratos, não obriga rename de código existente.

### 7.2. Botões

| Variante | Aparência | Uso |
|---|---|---|
| `primary` | `action.primary` / texto branco | Continuar, solicitar, confirmar, aceitar |
| `secondary` | Outline `action.primaryOutline` | Voltar, reagendar, ação alternativa |
| `tertiary` | Ghost, texto `action.primaryOutline` | Editar, ver mais, navegar |
| `teal` | `action.secondary` / branco | Contato, suporte, ação operacional secundária |
| `destructive` | Tratamento semântico de erro; confirmação quando necessário | Recusar, excluir, cancelar |

Regras de implementação:

- Em um card ou tela, priorizar **um único CTA primário por decisão principal**.
- Se `loading=true`, impedir presses repetidos e mostrar indicador sem perder label acessível.
- Botão com ícone: ícone decorativo, label textual suficiente.
- Botão destrutivo não deve herdar cor rosa apenas por ser ação destacada.
- Textos de ação sempre como verbo claro: `Salvar`, `Continuar`, `Confirmar agendamento`.
- Não disparar ação real sem retorno/erro apropriado.

### 7.3. Inputs e formulários

- **Label persistente**, não confiar só em placeholder.
- Texto de ajuda abaixo do campo, quando necessário.
- Mensagem de erro específica: `Informe um CEP válido`, não apenas `Campo inválido`.
- Campos obrigatórios identificados textual ou semanticamente; asterisco não é substituto de explicação.
- Máscaras de CPF/CNPJ/telefone/CEP conforme contexto, mas validar **valor normalizado** no domínio/backend.
- Não preencher dados de documentos fictícios em produção.
- `autoCapitalize`, `keyboardType`, `textContentType` e `autoComplete` apropriados por plataforma.
- Suportar estados de carregamento em selects remotos e CEP autocomplete.
- Ao enviar formulário inválido, destacar erros e focar/rolar até o primeiro campo inválido.
- Persistir rascunho de cadastro profissional se o recurso existir na camada de dados.

### 7.4. Cards

**Card padrão:** branco, radius 16, padding 16, borda leve ou sombra sutil.

**Card de destaque:** superfície `pinkSubtle` ou `tealSubtle`, radius 20, texto `text.primary`.

**Card interativo:** feedback de toque, área touch completa e affordance (ícone `chevron-right`, pressed state) quando há navegação.

**Card informativo:** `MGInfoBanner`, sem confundir com botão.

### 7.5. Status e badges

| Estado | Texto exibido | Cor semântica | Observação |
|---|---|---|---|
| `pending` | Pendente | `action.primaryOutline` + superfície rosa suave | Necessita ação/aguarda confirmação |
| `confirmed` | Confirmado | `feedback.success` + superfície de sucesso | Pedido aceito |
| `enRoute` | Em deslocamento | `feedback.info` + superfície teal suave (texto contrastante) | Status operacional, se suportado pelo backend |
| `inProgress` | Em atendimento | `feedback.info` | Atendimento iniciado |
| `completed` | Concluído | `feedback.success` | Atendimento finalizado |
| `cancelled` | Cancelado | `text.secondary` | Indicar autor e motivo se disponível |
| `rejected` | Recusado | `feedback.error` | Motivo/regras conforme produto |
| `underReview` | Em análise | `feedback.warning` | Validação de groomer |
| `verified` | Verificado | `feedback.success` | Somente após aprovação real |

**Atenção:** os nomes acima são **contratos visuais sugeridos**. O domínio/backend pode definir o enum canônico; mapear via adapter e não duplicar regras na UI. Não exibir `Verificado` somente porque o profissional completou cadastro.

---

## 8. PADRÕES COMPOSTOS (FEATURE COMPONENTS)

Componentes específicos, construídos sobre o núcleo compartilhado:

| Componente | Conteúdo / responsabilidades |
|---|---|
| `ProfileRoleSelector` | Escolha Tutor vs Groomer; ambos visualmente compreensíveis |
| `OnboardingStepper` | Passos, rótulos, atual/concluídos; stepper decorativo com status acessível |
| `ProfessionalVerificationUpload` | Arquivos, limite, progresso, remoção, erros |
| `AddressSelector` | CEP/endereço, complemento, definição do ponto central |
| `ServiceAreaSelector` | Raio numérico + mapa opcional + legenda textual |
| `TravelFeeSelector` | Inclusa / sob consulta / por km; detalhes conforme escolha |
| `ServiceEditorCard` | Serviço ativo, preço por porte, tempo estimado |
| `WeeklyAvailabilityEditor` | Dias, intervalos, exceções, bloqueios |
| `PetCard` | Avatar, nome, espécie, porte e atalho de edição |
| `GroomerSearchCard` | Avatar, nome, reputação, serviços, preço inicial, cobertura |
| `GroomerProfileHeader` | Nome, verificação, avaliação, especialidades |
| `TimeSlotPicker` | Datas e horários realmente disponíveis; estado selecionado/indisponível |
| `BookingSummary` | Pet, groomer, serviço, data, endereço, preço e taxas |
| `BookingStatusBadge` | Mapeia status do domínio aos badges semânticos |
| `AgendaAppointmentCard` | Hora, pet, tutor, endereço, serviço, status, navegação |
| `RequestCard` | Pedido, valor, data, Aceitar/Recusar conforme permissões |
| `AppointmentActionSheet` | Ações permitidas no estado atual do agendamento |
| `BlockingTimeDialog` | Data/início/fim/motivo opcional e validação de conflito |
| `ProfileGallery` | Fotos aprovadas e ação de adicionar/editar |

**Regra:** se um padrão aparecer em duas ou mais telas, avaliar extrair componente composto. Não extrair prematuramente layouts muito específicos sem contrato de reutilização.

---

## 9. NAVEGAÇÃO E ARQUITETURA DE TELAS

### 9.1. Navegação de alto nível

```text
Root
├── Public / Auth
│   ├── A01 Boas-vindas e escolha de perfil
│   ├── Login (a definir)
│   └── A03 Cadastro de usuário
├── Tutor
│   ├── Tabs: Início / Buscar / Pets / Agenda / Perfil
│   ├── T01 Home
│   ├── T02 Busca de groomers
│   ├── T03 Perfil do groomer
│   ├── T05 Cadastro/edição do pet
│   ├── T07 Seleção de horário
│   └── T08 Resumo do agendamento
└── Groomer
    ├── Onboarding
    │   ├── G02 Cadastro profissional
    │   ├── G04 Configuração de serviços
    │   ├── G03 Raio de atendimento
    │   ├── G05 Disponibilidade
    │   └── Revisão e submissão (tela a especificar)
    └── Tabs: Início / Agenda / Solicitações / Perfil
        ├── G07 Agenda do groomer
        ├── G08 Detalhes do agendamento
        ├── G09 Solicitações recebidas
        └── G10 Perfil público
```

**Ordem de onboarding acima é uma proposta funcional**, escolhida para coincidir com o stepper visual da maior parte dos protótipos: `Cadastro → Serviços → Local → Disponibilidade → Revisão`. Os **IDs G02/G03/G04/G05 não são posições cronológicas**. Deve ser validada com o produto antes de automatizar a navegação. Não forçar fluxo errado só por ordem alfanumérica dos IDs.

**Inconsistência identificada nos PNGs:** alguns steppers mostram rótulos `Revisão e envio` no passo que também contém `Disponibilidade`. A implementação deve corrigir esse conflito (5 etapas explícitas ou 4 agrupadas, após decisão do produto), e não reproduzi-lo literalmente.

### 9.2. Padrões por tipo de tela

- **Tabs**: áreas principais; selecionado claramente identificado com ícone + rótulo.
- **Stack**: detalhes, edição, onboarding e checkout; usar botão voltar contextual.
- **Modal**: confirmação de ações críticas e escolhas curtas.
- **Bottom sheet**: filtros, opções de serviço e ação contextual, se já suportado pela stack.
- **Wizard**: onboarding groomer com stepper consistente, possibilidade de salvar e sair.
- **Checkout**: pet → serviço/groomer → data/horário → resumo. Se serviço ou pet for escolhido previamente, preservar estado sem repetição.

### 9.3. Parâmetros e estado de fluxo

- Navegação tipada. IDs canônicos (`petId`, `groomerId`, `serviceId`, `bookingId`), não objetos enormes sem contrato.
- Preservar seleção de serviço/pet/horário durante navegação entre etapas.
- Horários e valores obtidos da camada de domínio/API (ou de mocks centralizados em desenvolvimento), nunca hardcoded na tela.
- Ao voltar de um fluxo, restaurar filtros quando fizer sentido.
- Não expor dados pessoais de tutores antes de confirmação/autorização, sem regra explícita do produto.
- Para rotas protegidas, centralizar checagem de autenticação/autorização; não duplicá-la por tela.

---

## 10. ESPECIFICAÇÃO VISUAL POR TELA — TUTOR

Estas telas já têm protótipos aprovados no primeiro lote. O documento orienta sua implementação; **não redefine os requisitos de negócio**.

| ID | Tela | Hierarquia/elementos-chave | CTA primário |
|---|---|---|---|
| `A01` | Boas-vindas e perfil | Logo, proposta de valor, CTA tutor/groomer, imagem ilustrativa | Sou tutor / Sou groomer |
| `A03` | Cadastro | Dados básicos, consentimento, estado erro, acesso a login | Criar conta |
| `T01` | Home do tutor | Saudação, busca, serviços populares, groomers em destaque | Buscar / explorar |
| `T02` | Busca de groomers | Endereço, busca textual, filtros, cards de resultados | Abrir perfil |
| `T03` | Perfil do groomer | Foto, verificação, descrição, serviços, preço base, reputação | Agendar serviço |
| `T05` | Cadastro do pet | Foto, nome, espécie, raça, porte, idade, observações | Salvar e continuar |
| `T07` | Seleção de horário | Serviço/pet selecionado, dia, slots, estado indisponível | Continuar |
| `T08` | Resumo | Dados do serviço, groomer, pet, endereço, preço/taxas, condições | Solicitar agendamento |

### Regras transversais — tutor

- O endereço usado na busca pode ser diferente do endereço-base do tutor; não presumir localização precisa.
- O mapa não é requisito para a busca inicial; **o cálculo de cobertura geográfica é**.
- O preço final deve mostrar o que entra no cálculo (serviço, porte, deslocamento quando aplicável) e distinguir **estimativa** de **valor confirmado**.
- Slot disponível só pode ser apresentado como realmente disponível após consulta à fonte de disponibilidade. No protótipo são horários fictícios.
- Confirmar estados da solicitação: `solicitado`, `aguardando groomer`, `confirmado`, etc., segundo backend.
- Não declarar reserva confirmada se o pedido apenas foi enviado para aprovação.
- Após sucesso, mostrar número/identificador do pedido se disponível e próximo passo claro.

---

## 11. ESPECIFICAÇÃO VISUAL POR TELA — GROOMER

Estas telas já têm protótipos Pink & Teal. A operação privilegia **leitura rápida e dados visíveis**.

| ID | Tela | Hierarquia/elementos-chave | CTA primário |
|---|---|---|---|
| `G02` | Cadastro profissional | Dados, experiência, certificações, upload, validação humana | Continuar |
| `G03` | Raio de atendimento | Endereço-base, mapa/área, raio, cobrança de deslocamento | Continuar |
| `G04` | Configuração de serviços | Ativar serviço, preço por porte, duração por porte, adicionar serviço | Continuar |
| `G05` | Disponibilidade | Dias, turnos, intervalos, buffer de deslocamento, encaixe manual | Continuar/revisão |
| `G07` | Agenda | Hoje/semana/mês, KPIs, lista temporal, status, bloqueio | Bloquear horário / abrir atendimento |
| `G08` | Detalhes do agendamento | Pet, tutor, serviço, endereço, duração, valor, status | Ação permitida no status atual |
| `G09` | Solicitações recebidas | Filtros, solicitações pendentes, preço, Aceitar/Recusar | Aceitar solicitação |
| `G10` | Perfil público | Cabeçalho, verificação, bio, raio, serviços, horários, galeria | Visualizar como tutor / editar |

### Regras transversais — groomer

- Upload de evidências **não significa verificação imediata**. Exibir status `Em análise`, `Aprovado` ou `Rejeitado` apenas com retorno do processo real.
- Raio de atendimento é medido a partir de uma origem validada; cálculo exato (distância em linha reta vs trajeto) deve ser definido na camada de negócio e informado com clareza. Não inferir tempo de viagem a partir de km sem serviço de rotas.
- Quando houver taxa de deslocamento, indicar regra ao tutor antes de confirmar pedido.
- Disponibilidade inclui dias, intervalos e exceções; buffers/deslocamento devem ser considerados para evitar sobreposição.
- Bloquear horário é ação que afeta agenda e disponibilidade de busca imediatamente, conforme sincronização definida.
- `G07` precisa funcionar com listas longas, filtragem, telas vazias e conexão lenta.
- `G08` só mostra ações permitidas pelo status e papel do usuário.
- `G09` precisa lidar com concorrência: pedido pode ter sido cancelado/aceito em outra sessão.
- `G10` exibe selo de verificado **somente com validação real**; exemplos de avaliações e números dos PNGs são fictícios.

---

## 12. MAPAS, ENDEREÇOS E COBERTURA

1. No cadastro do groomer, permitir selecionar **endereço-base** e **raio máximo** em km.
2. Apresentar raio com **controle numérico acessível** (chips + slider ou campo), sempre com valor textual explícito. O mapa é um auxílio visual.
3. No fluxo do tutor, usar um **endereço de atendimento selecionado** para calcular elegibilidade dos profissionais.
4. A API/geosserviço define a consulta espacial; a UI não deve simular distância real sem dados.
5. Tratar endereço incompleto, CEP não encontrado, geocodificação falha, ausência de permissão e perda de rede.
6. Não solicitar permissão de localização sem contexto. Manter entrada manual como alternativa.
7. Nunca expor endereço-base residencial exato do groomer no perfil público sem política de privacidade específica.
8. Para faixa por km, mostrar valor por km e exemplos de cálculo apenas depois de regra aprovada.

**Proposta UX:** Teal para área de cobertura (círculo e contorno), rosa para marcador de localização selecionada. Mapas reais devem usar provider/licença aprovados e controles acessíveis.

---

## 13. AGENDAMENTO — DATAS, PREÇOS E ESTADOS

### 13.1. Regra visual de agendamento

Fluxo de apresentação:

1. Selecionar profissional e serviço.
2. Selecionar pet elegível ou cadastrá-lo.
3. Selecionar data/slot realmente disponível.
4. Revisar serviço, porte, endereço, valor e taxas.
5. Enviar solicitação/confirmar segundo política do negócio.
6. Exibir estado final **real** e orientar próximos passos.

### 13.2. Data e hora

- `pt-BR` e fuso de atendimento explicitamente considerados. Datas internas em representação não ambígua.
- Mostruários: `29 de outubro de 2026`, `14:30`, `sex., 30/10` conforme componente.
- Nunca misturar datas de demonstração da geração de imagens (por exemplo, abril de 2024/2026) com conteúdo real.
- Slots passados ou bloqueados devem estar indisponíveis visual e programaticamente.
- Loading e atualização de disponibilidade não devem preservar um slot obsoleto como se estivesse garantido.

### 13.3. Preços

- Formato: `R$ 120,00` (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, conforme suporte da runtime).
- Valores em centavos ou tipo monetário seguro na camada de dados; nunca calcular preço em float de UI.
- `Preço estimado` vs `Preço final` com labels diferentes.
- Detalhar adicionais (deslocamento, serviços extras, taxas da plataforma) quando aplicáveis.
- Não exibir checkout/pagamento digital como confirmado antes da definição do produto.

### 13.4. Padrões de confirmação

- Confirmações destrutivas (recusa, cancelamento, exclusão de pet, alterações com impacto) usam modal com consequência explícita.
- Solicitar agendamento com prevenção de duplo clique, indicação de envio e manejo de erro.
- Mensagem de sucesso precisa refletir a operação de fato: `Solicitação enviada` não equivale a `Agendamento confirmado`.
- Erros de conflito de agenda mostram opção de escolher novo horário.

---

## 14. MICROCOPY, FORMATAÇÃO E TOM

- Idioma padrão: **pt-BR**, com termos simples e objetivos.
- Preferir `profissional` quando for comunicação ampla e `groomer` em áreas onde o termo já está contextualizado.
- Evitar marketing excessivo em formulários técnicos.
- Não usar frases culpabilizantes ou humor em erros críticos.
- Mensagens curtas, com próximo passo claro.
- Evitar emojis como única informação funcional; são opcionais e decorativos.

| Situação | Microcopy recomendado |
|---|---|
| Sem resultados | `Não encontramos groomers nessa região. Tente outro endereço ou ajuste os filtros.` |
| Cadastro profissional em análise | `Recebemos seus documentos. Seu perfil está em análise.` |
| Falha de rede | `Não foi possível carregar os dados. Tente novamente.` |
| Slot indisponível | `Esse horário acabou de ficar indisponível. Escolha outro horário.` |
| Bloqueio de agenda | `Horário bloqueado. Ele não estará disponível para novos agendamentos.` |
| Sucesso de solicitação | `Solicitação enviada! Você receberá uma atualização quando o profissional responder.` |
| Validação de campo | `Informe um telefone válido com DDD.` |
| Sem pets | `Você ainda não cadastrou um pet.` |

**Não prometer notificações push ou prazos de aprovação que ainda não existam tecnicamente.** Adaptar as mensagens ao comportamento implementado.

---

## 15. ACESSIBILIDADE — CRITÉRIOS OBRIGATÓRIOS

Referência principal: WCAG 2.2 nível AA, adaptada às particularidades do mobile nativo.

### 15.1. Visual

- Texto comum: contraste **≥ 4,5:1**.
- Texto grande: **≥ 3:1** quando atender definição WCAG.
- Elementos visuais essenciais de UI (ícone/contorno/estado): buscar **≥ 3:1** contra áreas adjacentes.
- Não usar apenas cor para comunicar disponibilidade, alerta, sucesso ou erro.
- Conteúdo deve ser legível com tamanho de fonte aumentado; não truncar valor/preço/CTA essencial.
- Ícones e labels com alinhamento e tamanho tocável adequados.

### 15.2. Interação

- Alvo mínimo recomendado **48 × 48 dp/pt** (padrão conservador multiplataforma).
- Labels e hints acessíveis em icon buttons, inputs, toggles, tabs e sliders.
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState` aplicados onde fizerem sentido.
- Foco de teclado/leitor de tela previsível em modal, stepper e erro de formulário.
- Garantir suporte a VoiceOver e TalkBack.
- Funções de slider/mapa devem ter alternativas por toque simples (chips, botões +/- ou campo numérico).
- Não forçar gesto arrastar como única interação essencial.
- Manter foco visível e CTA acessível quando teclado aparecer.

### 15.3. Conteúdo dinâmico

- Anunciar erros e confirmações importantes a leitores de tela usando APIs adequadas da plataforma.
- Loading precisa ter representação semântica (não só spinner silencioso).
- Estados vazios e indisponíveis com texto explicativo.
- Para formulário enviado com erro: mover o foco para o resumo ou primeiro erro, sem surpreender o usuário.
- Respeitar preferências do sistema por menor movimento e maior contraste quando suportadas.

### 15.4. Verificação

- Testar com fontes ampliadas, idiomas longos, teclado, modo avião, VoiceOver e TalkBack.
- Rodar varredura de contraste após implementação real; o token isolado não garante toda combinação.
- Não declarar AA automaticamente sem teste.

---

## 16. MOTION E FEEDBACK

**Motion sutil e funcional**, sem excessos.

| Interação | Duração inicial proposta |
|---|---:|
| Pressed/ripple | Nativo, imediato |
| Expansão de card | 150–220 ms |
| Troca de filtro/segmento | 120–200 ms |
| Modal/bottom sheet | Padrão nativo da biblioteca |
| Feedback de sucesso | 200–300 ms, sem bloquear navegação |

- Respeitar redução de movimento.
- Não usar animação como único feedback.
- Evitar loaders animados por longos períodos; usar skeleton e estados persistentes.
- Haptics são opcionais, nunca obrigatórios, e devem seguir preferências do dispositivo.

---

## 17. RECOMENDAÇÕES DE ARQUITETURA REACT NATIVE

### 17.1. Diretriz de integração

O frontend do My Groomer parte de um **repositório React Native existente** (referência de origem do projeto: **Boame**). Este documento não afirma qual é sua arquitetura atual. Antes de implementar:

1. Inspecionar `package.json`, versão RN e gerenciamento de dependências.
2. Inspecionar navegação atual, estrutura de pastas, gerenciamento de formulários, estado global, temas, assets e i18n.
3. Identificar componentes já disponíveis que podem ser estilizados com os tokens.
4. Criar uma camada de tema/adapters e **evitar reescrita desnecessária de navegação e infraestrutura**.
5. Se houver um kit visual instalado, preferir sobrescrever seu tema e wrappers ao invés de manter duas bibliotecas de componentes concorrentes.
6. Não assumir que os screenshots são códigos ou componentes editáveis.

### 17.2. Estrutura sugerida (adapte ao repositório)

```text
src/
  design-system/
    tokens/
      colors.ts
      typography.ts
      spacing.ts
      radius.ts
      elevation.ts
      index.ts
    theme/
      light.ts
      ThemeProvider.tsx
      useTheme.ts
    components/
      MGText/
      MGButton/
      MGIconButton/
      MGTextField/
      MGCard/
      MGBadge/
      MGChip/
      MGAvatar/
      MGModal/
      MGEmptyState/
    patterns/
      GroomerCard/
      ServiceEditorCard/
      AgendaAppointmentCard/
      TimeSlotPicker/
      BookingSummary/
  features/
    auth/
    tutor/
    groomer/
    bookings/
  navigation/
  services/
  domain/
  localization/
  assets/
```

### 17.3. Tokens TypeScript de partida

> Exemplo **copiável**, a adaptar ao projeto e aos nomes da API de componentes. O tema inicial é **light**. Não representa a única implementação possível.

```ts
// src/design-system/tokens/colors.ts
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
} as const;

// src/design-system/tokens/spacing.ts
export const spacing = {
  none: 0, xxs: 2, xs: 4, sm: 8, md: 12, base: 16,
  lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 48,
} as const;

// src/design-system/tokens/radius.ts
export const radius = {
  none: 0, xs: 6, sm: 10, md: 12, lg: 16,
  xl: 20, xxl: 24, pill: 999,
} as const;

// src/design-system/tokens/typography.ts
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  heading1: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  heading2: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  heading3: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  title: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  button: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  numeric: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
} as const;

// src/design-system/tokens/index.ts
export { palette } from './colors';
export { spacing } from './spacing';
export { radius } from './radius';
export { typography } from './typography';
```

**TypeScript:** `fontWeight` inferido como `string` pode não satisfazer `TextStyle`. Use `as const`, tipos `TextStyle` ou helper tipado conforme a stack. A criação de `ThemeProvider` é opcional se o projeto já possuir provider equivalente.

### 17.4. Exemplo de componente com tokens e acessibilidade

```tsx
import React from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native';
import { palette, radius, spacing, typography } from '../tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function MGPrimaryButton({ label, onPress, disabled = false, loading = false }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.text.inverse} /> : null}
      <Text style={[styles.label, blocked && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    columnGap: spacing.sm,
    backgroundColor: palette.action.primary,
  },
  pressed: { backgroundColor: palette.action.primaryPressed },
  disabled: { backgroundColor: palette.state.disabledSurface },
  label: {
    fontSize: typography.button.fontSize,
    lineHeight: typography.button.lineHeight,
    fontWeight: '600',
    color: palette.text.inverse,
  },
  disabledLabel: { color: palette.state.disabledText },
});
```

**Nota de implementação:** esse snippet ilustra os tokens e **não é o componente final completo**: revisar o contraste final do estado desabilitado, a semântica e os usos de botões com ícones; revisar o suporte efetivo de propriedades de acessibilidade na versão RN em uso; adicionar estados `focus`/`hover` onde relevantes e testes. O agente deve implementar `MGButton` completo, não copiar o exemplo sem revisão.

### 17.5. Performance e manutenção

- `FlatList`/listas virtualizadas para agenda, groomers, notificações e solicitações grandes.
- Caching e cancelamento de requests conforme stack atual; garantir que telas desmontadas não atualizem estado indevidamente.
- `memo` e memoização somente quando houver ganho real; não padronizar micro-otimizações sem medição.
- Imagens com placeholders, dimensões coerentes e cache adequado.
- Não misturar formatação de domínio com apresentação.
- Testar iOS e Android, inclusive teclado, back nativo e permissões.
- Suportar atualizações de tema por tokens sem editar dezenas de screens.

---

## 18. RESPONSIVIDADE E TEMA

### 18.1. Tamanhos de tela

A referência visual foi pensada para celular retrato, mas a implementação precisa funcionar em aparelhos estreitos e com fontes aumentadas. Adotar layout fluido, limite mínimo de largura lógica coerente com as plataformas suportadas e rolagem vertical.

- Portrait é a referência, não um lock automático de orientação.
- Tablets: ampliar margens e limitar largura de conteúdo em formulários; evitar cards absurdamente largos.
- Teclado e safe-area não podem cobrir `Salvar`/`Continuar`.
- Se houver layout web futuro, reutilizar tokens e conceitos sem transportar estilos RN diretamente como CSS.

### 18.2. Dark mode

**Fora do escopo normativo de v1.0.** O projeto tem apenas tema claro validado. Estruturar as cores semanticamente para permitir `dark` futuramente, mas não inventar uma paleta escura oficial agora.

---

## 19. PADRÕES DE TESTES E QUALIDADE

### 19.1. Mínimo por componente

- Teste de renderização da variante padrão.
- Pressed/disabled/loading e callback de toque.
- Label/role acessível para controles relevantes.
- Teste de ausência de ação quando disabled/loading.
- Snapshot visual (quando o projeto já possuir infraestrutura) para variantes e estados.
- Verificação de não existência de cores hardcoded em telas novas, quando possível via lint/review.

### 19.2. Mínimo por tela

- Comparação visual com PNG em viewport de referência **e** viewport menor.
- Scroll integral e safe-area.
- Validação/erros em formulários.
- Loading, empty, error, success.
- Tab/stack navigation sem loops ou perdas de contexto.
- Teste de leitor de tela nos fluxos principais.
- Datas e valores em `pt-BR`.
- Fotos ausentes, nome longo, raça longa, preço grande, endereço longo, pedidos sem avaliação.

### 19.3. Checklist de definição de pronto (DoD)

Um ticket de tela só está pronto quando:

- [ ] Usa exclusivamente tokens semânticos do design system para cores, espaçamento, raio e tipografia.
- [ ] Reutiliza componentes compartilhados onde aplicável.
- [ ] Mantém composição e hierarquia dos protótipos, com ajustes de contraste/acessibilidade.
- [ ] Funciona sem sobreposição em telas menores e teclado aberto.
- [ ] Tem estados `loading`, `empty`, `error`, `disabled` e `success` quando aplicáveis.
- [ ] Controles apresentam labels e feedback acessíveis.
- [ ] Dados do domínio vêm de contratos/mocks centralizados, não de valores espalhados na tela.
- [ ] Navegação e fluxo de voltar testados.
- [ ] Strings em português correto e formatadas para `pt-BR`.
- [ ] Preço, horário e status têm fonte da verdade definida.
- [ ] Tela testada ao menos em iOS e Android (ou limitações explicitadas no ticket).
- [ ] Divergências relevantes documentadas para revisão de produto/design.

---

## 20. ESTRATÉGIA DE IMPLEMENTAÇÃO — BACKLOG INICIAL

**Fase 0 — Auditoria do repositório**

- Confirmar stack e bibliotecas existentes.
- Mapear páginas/produtos já implementados e componentes reutilizáveis.
- Inventariar assets e fontes de licença compatível.

**Fase 1 — Fundação do tema**

- Criar tokens TypeScript, provider/adapters e tipografia.
- Criar `MGScreen`, `MGText`, `MGButton`, `MGIconButton`, `MGCard`, `MGTextField`, `MGBadge`, `MGChip`.
- Preparar ambiente/screen de showcase para inspeção dos componentes e seus estados.
- Adicionar testes de contraste para pares essenciais.

**Fase 2 — Componentes de domínio**

- `PetCard`, `GroomerSearchCard`, `ServiceEditorCard`, `WeeklyAvailabilityEditor`, `TimeSlotPicker`, `BookingSummary`, `AgendaAppointmentCard`, `RequestCard`.

**Fase 3 — Fluxos**

- Integrar telas do Tutor (A01/A03/T01/T02/T03/T05/T07/T08).
- Integrar telas do Groomer (G02/G04/G03/G05/G07/G08/G09/G10).
- Ajustar ordem do onboarding após decisão de produto.

**Fase 4 — Hardening**

- Estados sem conteúdo/erro/rede, teclado, acessibilidade, concorrência de agendamento, testes visuais.
- Integração real com endpoints e feature flags necessárias.
- Documentar regras funcionais pendentes em tickets separados.

**Princípio de backlog:** tarefa funcional por fluxo/componente e critérios de aceite observáveis; não criar um único ticket genérico “fazer design system inteiro” sem subdivisão.

---

## 21. DECISÕES EM ABERTO (NÃO INFERIR COMO REQUISITOS APROVADOS)

| Item | Pergunta pendente | Recomendação inicial |
|---|---|---|
| Fontes | Inter, fonte do sistema ou outra? | Sistema primeiro; Inter após aprovação |
| Stepper profissional | 4 ou 5 passos? Em que ordem? | Cadastro → Serviços → Local → Disponibilidade → Revisão |
| Confirmação de reserva | Groomer aprova sempre? | Modelo de solicitação pendente até decisão contrária |
| Pagamento | Antecipado, pós-serviço, dentro ou fora da plataforma? | Não inserir checkout real sem especificação |
| Cobertura | Distância geodésica ou trajeto por ruas? | API define claramente; UI mostra regra adotada |
| Taxa deslocamento | Inclusa, por km, por faixas, sob consulta? | Suportar UX parametrizada, não precificar sem regra |
| Verificação profissional | Evidências mínimas, SLA, motivo de recusa? | Status claros e validação humana planejada |
| Avaliações | Critérios e visibilidade de avaliação de tutores? | Não publicar dado interno sem decisão |
| Dados pessoais | O que o tutor/groomer vê antes da confirmação? | Minimização por padrão |
| Fotos | Regras de upload e moderação? | Validar com backend e compliance |
| Comunicação | Chat interno, telefone ou WhatsApp? | Ícone/CTA contextual sem prometer integração |
| Modo offline | Quais funções devem continuar funcionando? | Leitura de estados existentes conforme cache |
| Mascote | Arte vetorial própria ou substituição? | Aprovar asset final separado |
| Dark mode | Fazer na v1? | Não; tokens preparados para futura expansão |
| Valores de exemplo | Nomes, rating, datas e valores dos PNGs | **Mocks**, nunca dados reais/constantes de produção |

---

## 22. REGRAS DE NÃO REGRESSÃO / ANTIPADRÕES

**Não fazer:**

- Criar outra paleta rosa/vinho ou substituir teal por verde genérico.
- Copiar o rosa vivo `#D95786` diretamente como fundo de CTA com texto branco pequeno.
- Usar screenshots PNG como telas do app.
- Duplicar botões/campos/cards com CSS-in-JS diferente por screen.
- Exibir “Profissional verificado” sem aprovação real.
- Exibir horário como livre sem consulta à agenda, quando a tela estiver conectada à API.
- Calcular preço definitivo no frontend sem contrato de domínio.
- Mostrar `Confirmado` quando apenas houve envio de solicitação.
- Esconder informações importantes em tooltip ou ícone sem texto.
- Usar apenas cor para diferenciar estado.
- Truncar data, preço, título ou CTA crítico por estética.
- Adicionar dependência nova sem verificar solução já existente no projeto.
- Inventar dados de pagamento, certificações ou avaliações como se fossem reais.
- Publicar endereço residencial-base do profissional por padrão.
- Reproduzir inconsistências ocasionais dos PNGs (dados/datas, progress stepper) em produção.

---

## 23. REFERÊNCIAS VISUAIS E RASTREABILIDADE

Material do projeto disponível em pacotes anteriores:

**Tutor:** `My_Groomer_Wireframes_PNG_v02.zip` e `My_Groomer_Wireframes_Fluxo_Tutor_PNG_v02.pdf`.

**Groomer:** `My_Groomer_Groomer_Wireframes_PNG_v01.zip` e `My_Groomer_Wireframes_Fluxo_Groomer_PNG_v01.pdf`.

Os PNGs do Groomer são identificados por:

```text
G02_Cadastro_profissional.png
G03_Raio_de_atendimento.png
G04_Configuracao_de_servicos.png
G05_Disponibilidade.png
G07_Agenda_do_groomer.png
G08_Detalhes_do_agendamento.png
G09_Solicitacoes_recebidas.png
G10_Perfil_publico.png
```

**Atenção:** esses arquivos só estarão disponíveis ao agente se forem compartilhados ou estiverem presentes no workspace. **Este `.md` funciona sozinho** para orientar o desenvolvimento, mas o refinamento visual ficará mais fiel quando os PNGs também forem fornecidos.

---

## 24. CHECKLIST FINAL PARA O AGENTE

Antes de iniciar cada ticket, responder internamente:

1. **Existe componente compartilhado apropriado?** Usar ou estender antes de criar outro.
2. **As cores são semânticas e acessíveis?** Validar combos críticos.
3. **Os dados são mock ou reais?** Não misturar.
4. **Qual é o estado vazio/erro/loading?** Projetar antes de encerrar a tela.
5. **Como o usuário volta ou cancela?** Preservar contexto.
6. **Essa ação altera um agendamento ou dado sensível?** Confirmar estado, autorização e feedback.
7. **A interface funciona no celular pequeno, fonte grande e com teclado aberto?** Testar.
8. **As decisões de negócio são confirmadas?** Se não, isolar e registrar a pendência.
9. **O PNG e os tokens divergem?** Priorizar acessibilidade e documentar o ajuste.
10. **Há critérios de aceite testáveis?** Registrar antes de fechar o ticket.

### Definição de sucesso

O usuário deve reconhecer qualquer tela como pertencente ao **mesmo produto**, seja no fluxo do Tutor ou do Groomer. A implementação deve **parecer My Groomer**, operar de forma previsível e estar preparada para evolução sem fragmentação visual.

---

**Fim — My Groomer Design System v1.0.**
