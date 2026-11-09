import { evidenceFile, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-39-vitrine.mjs',
  evidence: evidenceFile(plan, 'mix-39-vitrine.log'),
})
const { check } = run
// A vitrine rola dentro do MGScreen (ScrollView interno), então fullPage não captura as seções: rola até o alvo.
const shot = async (page, name, target) => {
  await target.scrollIntoViewIfNeeded()
  await saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
}
const button = (page, name) => page.getByRole('button', { name, exact: true })

const PINK_CTA = 'rgb(198, 72, 120)' // action.primary (R1)
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle
const TEAL = 'rgb(22, 125, 131)' // brand.teal
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

// Estilo computado do próprio elemento.
const computed = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  return {
    color: cs.color,
    background: cs.backgroundColor,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    family: cs.fontFamily,
    letterSpacing: cs.letterSpacing,
    textTransform: cs.textTransform,
    fontVariant: cs.fontVariantNumeric || cs.fontVariant,
    radius: cs.borderRadius,
    borderWidth: cs.borderTopWidth,
    disabled: el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled'),
    busy: el.getAttribute('aria-busy'),
  }
})

// Superfície do card: pai direto do texto (MGCard renderiza o conteúdo em filhos diretos).
const cardOf = locator => locator.locator('xpath=..')

let browser
try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)
  await button(page, 'Abrir perfil').click()
  await button(page, 'Design System').click()
  await page.getByText('Showcase de desenvolvimento', { exact: false }).waitFor({ timeout: 15000 })
  // Topo da vitrine (botão Voltar e título), antes de qualquer rolagem.
  await saveScreenshot(page, evidenceFile(plan, 'ui-review/vitrine-topo.png'))

  // Tipografia: eyebrow e priceLarge (CMP-01)
  const eyebrowStyle = await computed(page.getByText('Exemplo', { exact: true }))
  // SemiBold e Bold do RN-Web aparecem como família (Inter-SemiBold / Inter-Bold), não como fontWeight.
  check('CMP-01 eyebrow em caixa-alta 12 pt', eyebrowStyle.textTransform === 'uppercase' && eyebrowStyle.fontSize === '12px' && /Inter-SemiBold/.test(eyebrowStyle.family), JSON.stringify(eyebrowStyle))
  check('CMP-01 eyebrow usa teal somente sobre canvas com 4,5:1 ou mais', eyebrowStyle.color === TEAL && ratio(eyebrowStyle.color, CANVAS) >= 4.5, `${eyebrowStyle.color} sobre ${CANVAS}`)
  const price = await computed(page.getByText('R$ 89', { exact: true }))
  check('CMP-01 priceLarge em 40 pt Bold com números tabulares', price.fontSize === '40px' && /Inter-Bold/.test(price.family) && /tabular-nums/.test(price.fontVariant), JSON.stringify(price))
  check('R3 preço em teal sobre canvas', price.color === TEAL, price.color)

  // Cards: pink (destaque 20) e teal (CMP-04)
  const pinkCard = await computed(cardOf(page.getByText('Card destaque', { exact: true }).nth(0)))
  check('CMP-04 card rosa usa surface.pinkSubtle', pinkCard.background === PINK_SUBTLE, JSON.stringify(pinkCard))
  check('AC-07 destaque rosa com raio 20 pt', pinkCard.radius === '20px', pinkCard.radius)
  const tealCardText = page.getByText('Card destaque', { exact: true }).nth(1)
  const tealCard = await computed(cardOf(tealCardText))
  const tealText = await computed(tealCardText)
  check('CMP-04 card teal usa surface.tealSubtle', tealCard.background === TEAL_SUBTLE, JSON.stringify(tealCard))
  check('R5 texto sobre tealSubtle usa text.primary', tealText.color === TEXT_PRIMARY && ratio(tealText.color, TEAL_SUBTLE) >= 4.5, tealText.color)
  check('AC-07 card teal com raio 20 pt e sem borda', tealCard.radius === '20px' && tealCard.borderWidth === '0px', JSON.stringify(tealCard))
  const standard = await computed(cardOf(page.getByText('Card padrão', { exact: true })))
  check('AC-07 card padrão com raio 16 pt e borda 1 pt', standard.radius === '16px' && standard.borderWidth === '1px' && standard.background === WHITE, JSON.stringify(standard))
  await shot(page, 'mix-39-cards', page.getByText('Card padrão', { exact: true }))

  // Bilhete (CMP-08, R7): total em priceLarge dentro do bilhete (segunda ocorrência da vitrine)
  const ticketTotal = await computed(page.getByText('R$ 120,00', { exact: true }).nth(1))
  check('CMP-08 total do bilhete em priceLarge teal', ticketTotal.fontSize === '40px' && ticketTotal.color === TEAL, JSON.stringify(ticketTotal))
  const ticket = await page.getByText('R$ 120,00', { exact: true }).nth(1).evaluate(el => {
    let node = el
    while (node && getComputedStyle(node).borderRadius !== '20px') node = node.parentElement
    return node ? { radius: getComputedStyle(node).borderRadius, overflow: getComputedStyle(node).overflow } : null
  })
  check('CMP-08 bilhete com raio 20 pt e recorte', !!ticket && ticket.overflow === 'hidden', JSON.stringify(ticket))
  await shot(page, 'mix-39-bilhete', page.getByText('R$ 120,00', { exact: true }).nth(1))

  // Avatar teal do profissional (CMP-11)
  const avatar = await computed(page.getByLabel('Marina', { exact: true }).first())
  check('CMP-11 avatar do profissional em teal sólido', avatar.background === TEAL, JSON.stringify(avatar))

  // CTA e chip selecionado sempre em action.primary (R1, CMP-06)
  const primary = await computed(button(page, 'Primário'))
  const primaryText = await computed(button(page, 'Primário').getByText('Primário', { exact: true }))
  check('AC-02 CTA primário em action.primary com texto branco', primary.background === PINK_CTA && primaryText.color === WHITE, JSON.stringify(primary))
  const chip = await computed(button(page, 'Filtro'))
  check('CMP-06 chip selecionado em action.primary', chip.background === PINK_CTA, JSON.stringify(chip))

  // Estados: carregando, desabilitado e sucesso/badges com texto (AC-08, AC-09)
  const loading = await computed(button(page, 'Carregando'))
  check('AC-08 estado carregando sinaliza aria-busy e bloqueia', loading.busy === 'true' && loading.disabled, JSON.stringify(loading))
  // Há um MGChip também chamado "Desabilitado"; o botão MGButton é o primeiro na ordem da vitrine.
  const disabled = await computed(button(page, 'Desabilitado').first())
  check('AC-08 estado desabilitado bloqueia o botão', disabled.disabled, JSON.stringify(disabled))
  check('AC-09 badges de status com texto', await page.getByText('Pendente', { exact: true }).count() >= 1 && await page.getByText('Confirmado', { exact: true }).count() >= 1 && await page.getByText('Erro', { exact: true }).count() >= 1)
  await shot(page, 'mix-39-componentes', page.getByText('Padrões de domínio', { exact: true }))
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
