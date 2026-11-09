import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-26-retomar-dados-profissionais.mjs',
  evidence: evidenceFile(plan, 'mix-26-retomar-dados-profissionais.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (AC-02, R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (contorno secundário, R1)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (faixa de cabeçalho, R3/R4)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (bloco da ilustração)
const BORDER_STRONG = 'rgb(96, 118, 122)' // border.strong (contorno do passo pendente)
const WHITE = 'rgb(255, 255, 255)'

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

// Abre a retomada pelo cardápio de serviços: Serviços → Voltar (ServiceMenu → ProfessionalRegistration).
async function openRetomada(page) {
  await loginProfessional(page)
  const tab = page.getByRole('tab', { name: 'Serviços', exact: true }).or(page.getByRole('button', { name: 'Serviços', exact: true }))
  await tab.first().click()
  await (await visible(page.getByText('Dados do serviço', { exact: true }))).waitFor({ timeout: 20000 })
  await (await visible(button(page, 'Voltar'))).click()
  await (await visible(page.getByText('Cadastro profissional', { exact: true }))).waitFor({ timeout: 20000 })
}

let browser
try {
  browser = await launchBrowser()

  // --- Estado carregado (tela 26) ---
  const page = await openPage(browser)
  await openRetomada(page)
  await page.getByRole('checkbox').first().waitFor({ timeout: 20000 })
  const title = await visible(page.getByText('Cadastro profissional', { exact: true }))
  const band = await title.evaluate(el => {
    let node = el
    while (node) {
      if (getComputedStyle(node).backgroundColor === 'rgb(22, 125, 131)') return { found: true, top: node.getBoundingClientRect().top }
      node = node.parentElement
    }
    return { found: false, top: -1 }
  })
  check('CMP-05 faixa teal de cabeçalho com brand.teal na retomada', band.found && band.top < 160, JSON.stringify(band))
  const titleColor = (await title.evaluate(el => getComputedStyle(el).color))
  check('CMP-05 título sobre a faixa em texto inverso (branco)', titleColor === WHITE, titleColor)
  check('CMP-05 título inverso mantém contraste 4,5:1 sobre a faixa', ratio(titleColor, TEAL) >= 4.5, `${ratio(titleColor, TEAL).toFixed(2)}:1`)
  check('CMP-05 Voltar visível na faixa', await (await visible(button(page, 'Voltar'))).isVisible())

  const stepper = page.getByLabel('Passo 1 de 4: Cadastro profissional')
  const currentStep = await stepper.locator(':scope > div').nth(0).locator(':scope > div').nth(0).locator(':scope > div').nth(1).evaluate(el => getComputedStyle(el).backgroundColor)
  const pendingStep = await stepper.locator(':scope > div').nth(1).locator(':scope > div').nth(0).locator(':scope > div').nth(1).evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }))
  check('CMP-19 passo atual do stepper em action.primary', currentStep === CTA_PINK, currentStep)
  check('CMP-19 passo pendente em contorno, sem preenchimento rosa', pendingStep.bg === WHITE && pendingStep.border === BORDER_STRONG, JSON.stringify(pendingStep))

  const illustration = (await visible(page.getByTestId('artwork-professional'))).locator('xpath=..')
  const illustrationBox = await illustration.evaluate(el => ({ radius: getComputedStyle(el).borderRadius, bg: getComputedStyle(el).backgroundColor }))
  check('CMP-01 ilustração da retomada em bloco tealSubtle com raio 20', illustrationBox.bg === TEAL_SUBTLE && illustrationBox.radius === '20px', JSON.stringify(illustrationBox))

  // Ícone IdCard da linha do campo CPF / CNPJ: sobe pelo DOM até o bloco da linha (FieldRow) que contém o SVG.
  // XPath com "svg" não casa no DOM HTML, por isso não usa ancestor::div[.//svg].
  const identityStroke = await field(page, 'CPF / CNPJ').evaluate(input => {
    let node = input.parentElement
    while (node && !node.querySelector('svg')) node = node.parentElement
    const svg = node?.querySelector('svg')
    return svg ? getComputedStyle(svg).stroke : null
  })
  check('R3 ícone de identidade da retomada em teal', identityStroke === TEAL, String(identityStroke))

  const continuar = button(page, 'Continuar')
  const continuarBox = await boxOf(continuar)
  const continuarText = await styleOf(continuar, 'Continuar')
  check('AC-02 CTA Continuar usa action.primary com texto branco', continuarBox.background === CTA_PINK && continuarText.color === WHITE, `${continuarBox.background} ${continuarText.color}`)
  check('AC-07 CTA Continuar com altura 40 e raio 16', continuarBox.minHeight === '40px' && continuarBox.radius === '16px', `${continuarBox.minHeight} ${continuarBox.radius}`)

  const salvar = button(page, 'Salvar e sair')
  const salvarBox = await boxOf(salvar)
  const salvarText = await styleOf(salvar, 'Salvar e sair')
  check('R1 ação secundária Salvar e sair em contorno rosa-texto', salvarBox.border === TEXT_PINK && salvarText.color === TEXT_PINK && salvarBox.background === 'rgba(0, 0, 0, 0)', JSON.stringify(salvarBox))

  const anexar = button(page, 'Selecionar arquivos')
  const anexarBox = await boxOf(anexar)
  check('R1 Selecionar arquivos em contorno rosa, sem variante teal', anexarBox.border === TEXT_PINK && anexarBox.background === 'rgba(0, 0, 0, 0)', JSON.stringify(anexarBox))
  await shot(page, '26-retomada-dados')

  // --- Carregando: dados do profissional em busca (tela 26) ---
  const slow = await openPage(browser)
  await gateRoute(slow, '**/providers/registration', { delayMs: 3000 })
  await openRetomada(slow)
  check('AC-08 carregamento mantém título e Voltar na faixa', await (await visible(slow.getByText('Cadastro profissional', { exact: true }))).isVisible() && await (await visible(button(slow, 'Voltar'))).isVisible())
  check('AC-08 carregamento exibe indicador acessível', await (await visible(slow.getByLabel('Carregando', { exact: true }))).isVisible())
  check('AC-08 Salvar e sair desabilitado enquanto carrega', await (await visible(button(slow, 'Salvar e sair'))).isDisabled())
  await shot(slow, '26-retomada-carregando')

  // --- Erro: dados do profissional indisponíveis (tela 26) ---
  const failing = await openPage(browser)
  await gateRoute(failing, '**/providers/registration', { fail: true })
  await openRetomada(failing)
  const errorTitle = await visible(failing.getByText('Algo deu errado', { exact: true }))
  await errorTitle.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 erro da retomada aparece com texto', await errorTitle.isVisible())
  const retry = await visible(button(failing, 'Tentar novamente'))
  check('AC-08 erro mantém a ação Tentar novamente', await retry.isVisible())
  const retryBox = await boxOf(retry)
  check('R1 Tentar novamente em contorno rosa-texto', retryBox.border === TEXT_PINK && retryBox.background === 'rgba(0, 0, 0, 0)', JSON.stringify(retryBox))
  check('AC-08 Continuar desabilitado no erro', await (await visible(button(failing, 'Continuar'))).isDisabled())
  check('CMP-05 faixa teal permanece no erro', await (await visible(failing.getByText('Cadastro profissional', { exact: true }))).isVisible())
  await shot(failing, '26-retomada-erro')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
