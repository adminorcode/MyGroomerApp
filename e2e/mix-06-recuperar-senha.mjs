import { APP_NAME, evidenceFile, fixtures, gateRoute, launchBrowser, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-06-recuperar-senha.mjs',
  evidence: evidenceFile(plan, 'mix-06-recuperar-senha.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
// Telas empilhadas permanecem no DOM com aria-hidden: textos só valem fora dessas áreas.
const onScreen = page => page.locator(':not([aria-hidden="true"]):not([aria-hidden="true"] *)')
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const WHITE = 'rgb(255, 255, 255)' // onAction.primary
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success
const SENT_MESSAGE = 'Enviamos o caminho para criar uma senha nova no seu e-mail.'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function boxOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

async function textOf(locator, label) {
  return locator.getByText(label, { exact: true }).evaluate(el => {
    const cs = getComputedStyle(el)
    return { color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight }
  })
}

// Cor da superfície que pinta o elemento (sobe na árvore até achar fundo não transparente).
async function paintOf(locator) {
  return locator.evaluate(el => {
    let node = el
    while (node && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(node).backgroundColor)) node = node.parentElement
    return node ? getComputedStyle(node).backgroundColor : 'nenhuma'
  })
}

// O logotipo visível é o que tem caixa renderizada na tela atual.
async function visibleBrand(page) {
  const all = page.getByText(APP_NAME, { exact: true }).and(onScreen(page))
  const count = await all.count()
  for (let index = 0; index < count; index += 1) {
    const item = all.nth(index)
    if (await item.isVisible()) {
      return item.evaluate(el => ({ size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, family: getComputedStyle(el).fontFamily }))
    }
  }
  return { size: 'não encontrado', weight: '', family: '' }
}

async function openForgot(page) {
  await openLogin(page)
  await button(page, 'Esqueci minha senha').click()
  await button(page, 'Enviar').waitFor()
}

let browser
try {
  browser = await launchBrowser()

  // --- Recuperação de senha: estado padrão e validação (tela 06) ---
  const page = await openPage(browser)
  await openForgot(page)
  const title = page.getByRole('heading', { name: 'Esqueci minha senha', exact: true })
  check('AC-01 título da recuperação usa cabeçalho de tela', await title.isVisible())
  const brand = await visibleBrand(page)
  check('CMP-02 logotipo compacto mantém heading3 (18 pt, SemiBold)', brand.size === '18px' && /Inter-SemiBold/.test(brand.family), JSON.stringify(brand))
  check('AC-04 superfície da tela é canvas', await paintOf(title) === CANVAS)

  const send = button(page, 'Enviar')
  const sendBox = await boxOf(send)
  const sendText = await textOf(send, 'Enviar')
  check('AC-02 CTA Enviar usa action.primary', sendBox.background === CTA_PINK, JSON.stringify(sendBox))
  check('AC-02 texto do CTA usa onAction.primary (branco)', sendText.color === WHITE, sendText.color)
  check('AC-04 texto branco sobre o CTA mantém contraste 4,5:1 ou mais', ratio(sendText.color, sendBox.background) >= 4.5, `${ratio(sendText.color, sendBox.background).toFixed(2)}:1`)
  check('CMP-03 CTA primário tem sombra tingida de action.primary', sendBox.shadow.includes('198, 72, 120'), sendBox.shadow)
  check('AC-07 botão mantém altura 40 e raio 16', sendBox.minHeight === '40px' && sendBox.radius === '16px', `${sendBox.minHeight} ${sendBox.radius}`)

  const email = field(page, 'E-mail')
  const emailBox = await boxOf(email)
  check('AC-07 campo tem raio 12 e borda de 2 pt', emailBox.radius === '12px' && emailBox.borderWidth === '2px', `${emailBox.radius} ${emailBox.borderWidth}`)

  const back = button(page, 'Voltar ao login')
  const backText = await textOf(back, 'Voltar ao login')
  check('R5 Voltar ao login usa rosa-texto sobre canvas', backText.color === TEXT_PINK, backText.color)
  await shot(page, 'recuperar-mobile')

  await send.click()
  const validation = onScreen(page).getByText('Informe um e-mail válido', { exact: true })
  await validation.waitFor()
  check('AC-08 validação de e-mail vazio aparece com texto', await validation.isVisible())
  check('R6 mensagem de validação usa semântica de erro', (await validation.evaluate(el => getComputedStyle(el).color)) === ERROR)
  check('AC-09 campo com erro usa borda de feedback.error', (await boxOf(email)).border === ERROR)
  await shot(page, 'recuperar-validacao')

  // --- Carregando e fluxo feliz pela API local (tela 06 -> tela 07) ---
  await gateRoute(page, '**/auth/forgot-password', { delayMs: 2500 })
  await email.fill(fixtures.tutor.email)
  await send.click()
  await page.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await button(page, 'Enviar').getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto carrega', await button(page, 'Enviar').isDisabled())
  check('AC-08 Voltar ao login bloqueado durante o envio', await button(page, 'Voltar ao login').isDisabled())
  const lockedBack = await boxOf(button(page, 'Voltar ao login'))
  check('AC-08 link desabilitado no carregamento segue sem caixa', lockedBack.background === 'rgba(0, 0, 0, 0)' && lockedBack.borderWidth === '0px', JSON.stringify(lockedBack))
  await shot(page, 'recuperar-carregando')
  await button(page, 'Redefinir senha').waitFor({ timeout: 20000 })
  check('AC-13 API local devolve o caminho e abre a redefinição', await button(page, 'Redefinir senha').isVisible())
  await page.unroute('**/auth/forgot-password')

  // --- Erro de rede recuperável (tela 06) ---
  const failing = await openPage(browser)
  await openForgot(failing)
  await gateRoute(failing, '**/auth/forgot-password', { fail: true })
  await field(failing, 'E-mail').fill(fixtures.tutor.email)
  await button(failing, 'Enviar').click()
  const alert = failing.getByRole('alert')
  await alert.first().waitFor({ timeout: 15000 }).catch(() => {})
  const alertText = (await alert.count()) ? (await alert.first().innerText()).trim() : ''
  check('AC-08 erro de rede aparece como alerta com texto', alertText.includes('Verifique sua internet'), alertText)
  check('AC-08 mensagem de erro usa linguagem para o tutor (sem "API")', !/API/.test(alertText))
  check('AC-08 o CTA volta a ficar disponível após o erro', await button(failing, 'Enviar').isEnabled())
  check('AC-08 o e-mail digitado é preservado após o erro', (await field(failing, 'E-mail').inputValue()) === fixtures.tutor.email)
  check('R6 erro usa semântica de erro', alertText.length > 0 && (await alert.first().evaluate(el => getComputedStyle(el).color)) === ERROR)
  await shot(failing, 'recuperar-erro')

  // --- Confirmação sem token (aguardando o e-mail) (tela 06) ---
  const waiting = await openPage(browser)
  await openForgot(waiting)
  await waiting.route('**/auth/forgot-password', async route => {
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    return route.fulfill({
      status: 200,
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, message: SENT_MESSAGE }),
    })
  })
  await field(waiting, 'E-mail').fill(fixtures.tutor.email)
  await button(waiting, 'Enviar').click()
  const sent = waiting.getByRole('alert')
  await sent.first().waitFor({ timeout: 15000 }).catch(() => {})
  const sentText = (await sent.count()) ? (await sent.first().innerText()).trim() : ''
  check('AC-08 sucesso sem token mostra confirmação com texto', sentText === SENT_MESSAGE, sentText)
  check('R6 confirmação usa semântica de sucesso', (await sent.first().evaluate(el => getComputedStyle(el).color)) === SUCCESS)
  check('AC-13 sem token a tela permanece em recuperação', await button(waiting, 'Redefinir senha').count() === 0)
  await shot(waiting, 'recuperar-sucesso')
  await waiting.unroute('**/auth/forgot-password')
  await button(waiting, 'Voltar ao login').click()
  await button(waiting, 'Entrar').waitFor()
  check('AC-02 Voltar ao login retorna à entrada', await field(waiting, 'E-mail').isVisible())
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
