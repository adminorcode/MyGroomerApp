import { evidenceFile, gateRoute, launchBrowser, openPage, openRegistrationWelcome, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-04-cadastro-profissional.mjs',
  evidence: evidenceFile(plan, 'mix-04-cadastro-profissional.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (AC-02, R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (contorno da ação secundária, R1)
const TEAL = 'rgb(22, 125, 131)' // brand.teal / action.secondary (R3)
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const WHITE = 'rgb(255, 255, 255)'
const BORDER_STRONG = 'rgb(96, 118, 122)' // border.strong (contorno do passo pendente, CMP-19)

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

// Telas empilhadas permanecem no DOM: usa o primeiro elemento visível.
async function visible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

async function boxOf(control) {
  return control.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

async function styleOf(locator, label) {
  return (await visible(locator.getByText(label, { exact: true }))).evaluate(el => ({
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
  }))
}

async function openProfessionalForm(browser, { onTypes } = {}) {
  const page = await openPage(browser)
  if (onTypes) await gateRoute(page, '**/professional-types/public', onTypes)
  await openRegistrationWelcome(page)
  await button(page, 'Sou profissional').click()
  await (await visible(page.getByText('Cadastro profissional', { exact: true }))).waitFor({ timeout: 20000 })
  return page
}

let browser
try {
  browser = await launchBrowser()

  // --- Estado inicial (tela 04) ---
  const page = await openProfessionalForm(browser)
  await page.getByRole('checkbox').first().waitFor({ timeout: 20000 })
  const name = field(page, 'Nome completo')
  const nameBox = await boxOf(name)
  check('AC-07 campo MG com raio 12 e altura 40', nameBox.radius === '12px' && nameBox.minHeight === '40px', `${nameBox.radius} ${nameBox.minHeight}`)
  check('R5 rótulo persistente Nome completo visível', await (await visible(page.getByText('Nome completo *', { exact: true }))).isVisible())

  const stepper = page.getByLabel('Passo 1 de 4: Cadastro profissional')
  const currentStep = await stepper.locator(':scope > div').nth(0).locator(':scope > div').nth(0).locator(':scope > div').nth(1).evaluate(el => getComputedStyle(el).backgroundColor)
  const nextStep = await stepper.locator(':scope > div').nth(1).locator(':scope > div').nth(0).locator(':scope > div').nth(1).evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }))
  check('CMP-19 passo atual do stepper em action.primary', currentStep === CTA_PINK, currentStep)
  check('CMP-19 passo pendente do stepper em contorno, sem preenchimento rosa', nextStep.bg === WHITE && nextStep.border === BORDER_STRONG, JSON.stringify(nextStep))

  const teal = await page.evaluate(([tealRgb]) => Array.from(document.querySelectorAll('div')).some(el => {
    const rect = el.getBoundingClientRect()
    return getComputedStyle(el).backgroundColor === tealRgb && rect.top < 160 && rect.height > 20
  }), [TEAL])
  check('R4 formulário sem faixa teal no cabeçalho', !teal)

  const continuar = button(page, 'Continuar')
  check('AC-08 Continuar desabilitado sem tipo de atuação, com texto de orientação', await continuar.isDisabled() && await page.getByText('Selecione pelo menos um tipo de atuação para continuar.', { exact: true }).isVisible())
  const salvar = button(page, 'Salvar e sair')
  const salvarBox = await boxOf(salvar)
  const salvarText = await styleOf(salvar, 'Salvar e sair')
  check('R1 ação secundária Salvar e sair em contorno rosa-texto', salvarBox.border === TEXT_PINK && salvarText.color === TEXT_PINK && salvarBox.background === 'rgba(0, 0, 0, 0)', JSON.stringify(salvarBox))
  await shot(page, 'cadastro-profissional-inicial')

  // Ícone de identidade (IdCard) da linha do campo CPF / CNPJ, em teal (R3).
  // O SVG está no bloco da linha (FieldRow), ancestral do campo. XPath com "svg" não casa no DOM HTML: sobe-se pelo DOM.
  const identityStroke = await field(page, 'CPF / CNPJ').evaluate(input => {
    let node = input.parentElement
    while (node && !node.querySelector('svg')) node = node.parentElement
    const svg = node?.querySelector('svg')
    return svg ? getComputedStyle(svg).stroke : null
  })
  check('R3 ícone de identidade do cadastro em teal', identityStroke === TEAL, String(identityStroke))
  const anexar = button(page, 'Selecionar arquivos')
  const anexarBox = await boxOf(anexar)
  check('R1 Selecionar arquivos em contorno rosa, sem variante teal', anexarBox.border === TEXT_PINK && anexarBox.background === 'rgba(0, 0, 0, 0)', JSON.stringify(anexarBox))

  // --- Selecionar tipo de atuação: CTA rosa habilitado ---
  await page.getByRole('checkbox').first().click()
  await continuar.waitFor()
  const continuarBox = await boxOf(continuar)
  const continuarText = await styleOf(continuar, 'Continuar')
  check('AC-02 CTA Continuar usa action.primary com texto branco', continuarBox.background === CTA_PINK && continuarText.color === WHITE, `${continuarBox.background} ${continuarText.color}`)
  check('AC-07 CTA Continuar com altura 40 e raio 16', continuarBox.minHeight === '40px' && continuarBox.radius === '16px', `${continuarBox.minHeight} ${continuarBox.radius}`)
  check('AC-04 texto branco do CTA com contraste 4,5:1 ou mais', ratio(continuarText.color, continuarBox.background) >= 4.5)
  check('R1 tipo selecionado em rosa (ação) e não em teal', await page.getByRole('checkbox').first().getAttribute('aria-checked') === 'true')
  await shot(page, 'cadastro-profissional-preenchido')

  // --- Validação: campos obrigatórios vazios ---
  await continuar.click()
  await (await visible(page.getByText('Informe seu nome completo (até 150 caracteres).', { exact: true }))).waitFor({ timeout: 10000 }).catch(() => {})
  const nameError = await styleOf(page, 'Informe seu nome completo (até 150 caracteres).')
  check('AC-08 erro de campo aparece com texto e cor de erro', nameError.color === ERROR, nameError.color)
  check('AC-04 erro de campo mantém contraste 4,5:1 sobre canvas', ratio(nameError.color, CANVAS) >= 4.5, `${ratio(nameError.color, CANVAS).toFixed(2)}:1`)
  await shot(page, 'cadastro-profissional-validacao')

  // --- Erro: catálogo de tipos indisponível ---
  const failing = await openProfessionalForm(browser, { onTypes: { fail: true } })
  const typesAlert = failing.getByRole('alert').filter({ hasText: 'Não foi possível carregar os tipos de atuação.' })
  await typesAlert.first().waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 erro dos tipos aparece como alerta com texto', await typesAlert.count() > 0)
  const retry = await visible(button(failing, 'Tentar novamente'))
  check('AC-08 erro dos tipos mantém a ação Tentar novamente', await retry.isVisible())
  const retryText = await styleOf(button(failing, 'Tentar novamente'), 'Tentar novamente')
  check('R1 Tentar novamente em rosa-texto sobre canvas', retryText.color === TEXT_PINK, retryText.color)
  check('AC-08 Continuar segue desabilitado sem tipos carregados', await button(failing, 'Continuar').isDisabled())
  await shot(failing, 'cadastro-profissional-erro')

  // --- Carregando: tipos de atuação em carregamento ---
  const slow = await openProfessionalForm(browser, { onTypes: { delayMs: 3000 } })
  const loading = slow.getByLabel('Carregando tipos de atuação')
  check('AC-08 carregamento dos tipos aparece com texto', await (await visible(slow.getByText('Carregando tipos de atuação…', { exact: true }))).isVisible().catch(() => false))
  check('AC-08 carregamento dos tipos tem indicador acessível', await loading.count() > 0)
  check('AC-08 Continuar desabilitado durante o carregamento', await button(slow, 'Continuar').isDisabled())
  await shot(slow, 'cadastro-profissional-carregando')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
