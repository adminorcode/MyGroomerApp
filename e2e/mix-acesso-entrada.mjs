import { APP_NAME, evidenceFile, gateRoute, launchBrowser, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-acesso-entrada.mjs',
  evidence: evidenceFile(plan, 'mix-acesso-entrada.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (CMP-03, AC-02)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const WHITE = 'rgb(255, 255, 255)'

// Telas empilhadas permanecem no DOM: o logotipo visível é o que tem caixa renderizada.
async function visibleBrand(page) {
  const all = page.getByText(APP_NAME, { exact: true })
  const count = await all.count()
  for (let index = 0; index < count; index += 1) {
    const item = all.nth(index)
    if (await item.isVisible()) {
      return item.evaluate(el => ({ size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, letterSpacing: getComputedStyle(el).letterSpacing, family: getComputedStyle(el).fontFamily }))
    }
  }
  return { size: 'não encontrado', family: '' }
}

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}
async function styleOf(locator, label) {
  return locator.getByText(label, { exact: true }).evaluate(el => ({
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
  }))
}
async function boxOf(control) {
  return control.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

let browser
try {
  browser = await launchBrowser()

  // --- Login (tela 01) ---
  const page = await openPage(browser)
  await openLogin(page)
  const enter = button(page, 'Entrar')
  const enterBox = await boxOf(enter)
  const enterText = await styleOf(enter, 'Entrar')
  check('AC-02 CTA Entrar usa action.primary', enterBox.background === CTA_PINK, JSON.stringify(enterBox))
  check('AC-02 texto do CTA usa onAction.primary (branco)', enterText.color === WHITE, enterText.color)
  check('AC-04 texto branco sobre o CTA mantém contraste 4,5:1 ou mais', ratio(enterText.color, enterBox.background) >= 4.5, `${ratio(enterText.color, enterBox.background).toFixed(2)}:1`)
  check('CMP-03 CTA primário tem sombra tingida de action.primary', enterBox.shadow.includes('198, 72, 120'), enterBox.shadow)
  check('AC-07 botão mantém altura 40 e raio 16', enterBox.minHeight === '40px' && enterBox.radius === '16px', `${enterBox.minHeight} ${enterBox.radius}`)
  const loginBrand = await visibleBrand(page)
  check('AC-01 logotipo compacto segue heading3 (18 pt, SemiBold) sem Abres', loginBrand.size === '18px' && /Inter-SemiBold/.test(loginBrand.family), JSON.stringify(loginBrand))
  const cadastro = await styleOf(page, 'Não tem uma conta? Cadastre-se')
  check('R5 link de cadastro usa rosa-texto sobre canvas', cadastro.color === TEXT_PINK, cadastro.color)
  await shot(page, 'acesso-login')

  // Erro de rede recuperável (tela 01)
  const failing = await openPage(browser)
  await gateRoute(failing, '**/auth/login', { fail: true })
  await openLogin(failing)
  await failing.getByRole('textbox', { name: 'E-mail' }).fill('tutor@email.com')
  await failing.getByRole('textbox', { name: 'Senha' }).fill('admin')
  await button(failing, 'Entrar').click()
  const alert = failing.getByRole('alert')
  await alert.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 erro de login aparece como alerta com texto', await alert.count() > 0 && (await alert.first().innerText()).trim().length > 0)
  // F-02 (UI-REVIEW): linguagem sem termos técnicos para o tutor.
  check('AC-08 mensagem de erro de rede usa linguagem para o tutor (sem "API")', await alert.first().innerText().then(text => text.includes('Verifique sua internet') && !/API/.test(text)).catch(() => false))
  check('AC-08 o CTA volta a ficar disponível após o erro', await button(failing, 'Entrar').isEnabled())
  await shot(failing, 'acesso-login-erro')

  // Carregando (tela 01): botão ocupado e bloqueado durante a resposta
  const slow = await openPage(browser)
  await gateRoute(slow, '**/auth/login', { delayMs: 2500 })
  await openLogin(slow)
  await slow.getByRole('textbox', { name: 'E-mail' }).fill('tutor@email.com')
  await slow.getByRole('textbox', { name: 'Senha' }).fill('admin')
  await button(slow, 'Entrar').click()
  const busy = slow.getByRole('button', { name: 'Entrar', exact: true })
  await slow.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await busy.getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto carrega', await busy.isDisabled())
  const lockedLink = slow.getByRole('button', { name: 'Não tem uma conta? Cadastre-se', exact: true })
  const lockedBox = await lockedLink.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopWidth }))
  check('AC-08 link desabilitado no carregamento segue sem caixa cinza', lockedBox.bg === 'rgba(0, 0, 0, 0)' && lockedBox.border === '0px', JSON.stringify(lockedBox))
  await shot(slow, 'acesso-login-carregando')

  // --- Boas-vindas (tela 02) ---
  await openLogin(page)
  await button(page, 'Não tem uma conta? Cadastre-se').click()
  const tutor = button(page, 'Sou tutor')
  await tutor.waitFor()
  const tutorBox = await boxOf(tutor)
  check('AC-02 Sou tutor é o CTA rosa action.primary', tutorBox.background === CTA_PINK, JSON.stringify(tutorBox))
  const profissional = button(page, 'Sou profissional')
  const profBox = await boxOf(profissional)
  const profText = await styleOf(profissional, 'Sou profissional')
  check('Q2 Sou profissional é contorno rosa, sem preenchimento', profBox.background === 'rgba(0, 0, 0, 0)' && profBox.border === TEXT_PINK, JSON.stringify(profBox))
  check('Q2 texto do contorno usa rosa-texto legível', profText.color === TEXT_PINK && ratio(profText.color, 'rgb(249, 248, 246)') >= 4.5, profText.color)
  const welcomeBrand = await visibleBrand(page)
  check('CMP-02 logotipo de boas-vindas em Inter Bold 30 pt', welcomeBrand.size === '30px' && /Inter-Bold/.test(welcomeBrand.family) && welcomeBrand.letterSpacing === '-0.6px', JSON.stringify(welcomeBrand))
  check('CMP-02 logotipo sem fonte Abres', !/Abres/i.test(welcomeBrand.family), welcomeBrand.family)
  // Bloco da ilustração: pai direto do artwork (View com pinkSubtle e raio do DS).
  const illustration = page.getByTestId('artwork-welcome').locator('xpath=..')
  const illustrationBox = await illustration.evaluate(el => ({ radius: getComputedStyle(el).borderRadius, bg: getComputedStyle(el).backgroundColor }))
  check('AC-07 ilustração em bloco pinkSubtle com raio 20', illustrationBox.radius === '20px' && illustrationBox.bg === 'rgb(252, 229, 237)', JSON.stringify(illustrationBox))
  check('AC-01 nenhuma referência visível a Abres na boas-vindas', !(await page.getByText(/Abres/).count()))
  await shot(page, 'acesso-boas-vindas')

  // Pressed do CTA rosa mantém o rosa escuro com texto branco
  await tutor.hover()
  await page.mouse.down()
  await page.waitForTimeout(120)
  const pressedBox = await boxOf(tutor)
  check('AC-02 pressed usa action.primaryPressed', pressedBox.background === 'rgb(185, 64, 108)', pressedBox.background)
  await page.mouse.up()
  await page.mouse.move(1, 1)
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
