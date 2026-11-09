import { appUrl, evidenceFile, gateRoute, launchBrowser, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-05-verificacao-email.mjs',
  evidence: evidenceFile(plan, 'mix-05-verificacao-email.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (ícone de e-mail, R2)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle (bloco do ícone de estado)
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success (R6, estado de sucesso com texto)
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const SECONDARY = 'rgb(96, 118, 122)' // text.secondary
const NETWORK_ERROR = 'Não foi possível conectar. Verifique sua internet e tente novamente.'

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

async function styleOf(locator, label) {
  return (await visible(locator.getByText(label, { exact: true }))).evaluate(el => ({
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
  }))
}

async function iconBlockOf(page) {
  const block = await visible(page.getByTestId('verify-email-status'))
  return block.evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    radius: getComputedStyle(el).borderRadius,
    stroke: el.querySelector('svg') ? getComputedStyle(el.querySelector('svg')).stroke : 'sem ícone',
    spinner: el.querySelector('[aria-label="Verificando e-mail"]') ? 'sim' : 'não',
  }))
}

async function openVerify(page, query = '') {
  await page.goto(`${appUrl}/verify-email${query}`, { waitUntil: 'domcontentloaded' })
}

let browser
try {
  browser = await launchBrowser()

  // --- Aguardando confirmação (sem token): estado de sucesso de envio, tela 05 ---
  const page = await openPage(browser)
  await openVerify(page)
  await (await visible(page.getByText('Confira seu e-mail', { exact: true }))).waitFor({ timeout: 90000 })
  const heading = await styleOf(page, 'Confira seu e-mail')
  check('AC-02 título de confirmação em texto primário', heading.color === 'rgb(37, 61, 66)', heading.color)
  const waiting = await iconBlockOf(page)
  check('R2 ícone de estado em bloco pinkSubtle', waiting.background === PINK_SUBTLE && waiting.radius === '20px', JSON.stringify(waiting))
  check('R2 ícone de e-mail em action.primary', waiting.stroke === CTA_PINK, waiting.stroke)
  const body = await styleOf(page, 'Enviamos um link de verificação para o seu e-mail. Toque nele para confirmar a conta.')
  check('AC-04 texto de apoio secundário sobre canvas mantém 4,5:1', body.color === SECONDARY && ratio(body.color, CANVAS) >= 4.5, body.color)
  check('R4 sem faixa teal no cabeçalho da verificação', await page.evaluate(() => !Array.from(document.querySelectorAll('div')).some(el => getComputedStyle(el).backgroundColor === 'rgb(22, 125, 131)' && el.getBoundingClientRect().top < 160 && el.getBoundingClientRect().height > 20)))
  await shot(page, 'verificacao-aguardando')

  // --- Carregando: verificação do token em andamento ---
  const slow = await openPage(browser)
  await gateRoute(slow, '**/auth/verify-email', { delayMs: 3000 })
  await openVerify(slow, '?token=token-em-verificacao')
  await (await visible(slow.getByText('Verificando seu e-mail...', { exact: true }))).waitFor({ timeout: 90000 })
  const pending = await iconBlockOf(slow)
  check('AC-08 carregamento mostra indicador acessível e texto', pending.spinner === 'sim' && await slow.getByText('Verificando seu e-mail...', { exact: true }).isVisible())
  check('R2 bloco do indicador de carregamento em pinkSubtle', pending.background === PINK_SUBTLE, pending.background)
  await shot(slow, 'verificacao-carregando')

  // --- Erro de rede recuperável com ação de retorno ---
  const failing = await openPage(browser)
  await gateRoute(failing, '**/auth/verify-email', { fail: true })
  await openVerify(failing, '?token=token-sem-rede')
  await (await visible(failing.getByText('Algo deu errado', { exact: true }))).waitFor({ timeout: 20000 })
  const errorTitle = await styleOf(failing, 'Algo deu errado')
  check('AC-08 erro aparece com título e cor de erro', errorTitle.color === ERROR, errorTitle.color)
  check('AC-08 erro mantém a mensagem em texto', await (await visible(failing.getByText(NETWORK_ERROR, { exact: true }))).isVisible())
  const backLink = await visible(button(failing, 'Voltar ao login'))
  check('AC-08 erro mantém a ação Voltar ao login', await backLink.isVisible())
  const backText = await styleOf(button(failing, 'Voltar ao login'), 'Voltar ao login')
  check('R1 ação secundária do erro em rosa-texto', backText.color === TEXT_PINK, backText.color)
  await shot(failing, 'verificacao-erro')
  await backLink.click()
  check('AC-08 Voltar ao login leva para o login', await (await visible(button(failing, 'Entrar'))).waitFor({ timeout: 20000 }).then(() => true).catch(() => false))

  // --- Erro real da API: token inválido ---
  const invalid = await openPage(browser)
  await openVerify(invalid, '?token=token-invalido-e2e')
  const invalidReached = await (await visible(invalid.getByText('Algo deu errado', { exact: true }))).waitFor({ timeout: 30000 }).then(() => true).catch(() => false)
  check('AC-08 token recusado pela API mostra o estado de erro', invalidReached && await invalid.getByText('Voltar ao login', { exact: true }).isVisible())
  await shot(invalid, 'verificacao-token-recusado')

  // --- Sucesso (resposta simulada da API): confirmação e retorno ao login ---
  const success = await openPage(browser)
  await success.route('**/auth/verify-email', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'E-mail verificado' }) }))
  await openVerify(success, '?token=token-simulado')
  await (await visible(success.getByText('E-mail verificado!', { exact: true }))).waitFor({ timeout: 20000 })
  const successTitle = await styleOf(success, 'E-mail verificado!')
  check('R6 título de sucesso com texto primário', successTitle.color === 'rgb(37, 61, 66)', successTitle.color)
  const done = await iconBlockOf(success)
  check('R6 ícone de sucesso em feedback.success', done.stroke === SUCCESS, done.stroke)
  check('R6 texto de sucesso acompanha o ícone', await success.getByText('Sua conta está pronta. Você já pode entrar.', { exact: true }).isVisible())
  await shot(success, 'verificacao-sucesso')
  check('AC-08 sucesso retorna ao login', await (await visible(button(success, 'Entrar'))).waitFor({ timeout: 15000 }).then(() => true).catch(() => false))
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
