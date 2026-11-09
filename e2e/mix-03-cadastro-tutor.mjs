import { evidenceFile, gateRoute, launchBrowser, openPage, openRegistrationWelcome, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-03-cadastro-tutor.mjs',
  evidence: evidenceFile(plan, 'mix-03-cadastro-tutor.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
const CONSENT = 'Aceito os termos e a política de privacidade'
const CONSENT_ERROR = 'Aceite os termos e a política de privacidade' // mensagem do validador (tutorRegisterSchema)
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (AC-02, R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle (R2, bloco de convite)
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const BORDER_STRONG = 'rgb(96, 118, 122)' // border.strong (caixa do consentimento sem marcação)
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const WHITE = 'rgb(255, 255, 255)'
const PASSWORD = 'LocalTest#2026'

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

async function openTutorForm(browser) {
  const page = await openPage(browser)
  await openRegistrationWelcome(page)
  await button(page, 'Sou tutor').click()
  await (await visible(button(page, 'Criar conta'))).waitFor({ timeout: 20000 })
  return page
}

async function fillTutor(page, email) {
  await field(page, 'Nome completo').fill('Tutor Cadastro Visual')
  await field(page, 'E-mail').fill(email)
  await field(page, 'Telefone').fill('+5511987654321')
  await field(page, 'Senha').fill(PASSWORD)
  await page.getByRole('checkbox', { name: CONSENT }).click()
}

let browser
try {
  browser = await launchBrowser()

  // --- Estado inicial (tela 03) ---
  const page = await openTutorForm(browser)
  const cta = await visible(button(page, 'Criar conta'))
  const ctaBox = await boxOf(cta)
  const ctaText = await styleOf(cta, 'Criar conta')
  check('AC-02 CTA Criar conta usa action.primary (Rosa)', ctaBox.background === CTA_PINK, JSON.stringify(ctaBox))
  check('AC-02 texto do CTA usa onAction.primary (branco)', ctaText.color === WHITE, ctaText.color)
  check('CMP-03 CTA primário tem sombra tingida de action.primary', ctaBox.shadow.includes('198, 72, 120'), ctaBox.shadow)
  check('AC-07 botão Criar conta com altura 40 e raio 16', ctaBox.minHeight === '40px' && ctaBox.radius === '16px', `${ctaBox.minHeight} ${ctaBox.radius}`)
  const intro = await visible(page.getByText('Encontre profissionais para cuidar do seu melhor amigo.', { exact: true }))
  const introBox = await intro.evaluate(el => ({ bg: getComputedStyle(el.parentElement).backgroundColor, color: getComputedStyle(el).color }))
  check('R2 bloco de convite ao tutor em pinkSubtle com texto primário', introBox.bg === PINK_SUBTLE && introBox.color === 'rgb(37, 61, 66)', JSON.stringify(introBox))
  const name = field(page, 'Nome completo')
  const nameBox = await boxOf(name)
  check('AC-07 campo com raio 12 e altura 40', nameBox.radius === '12px' && nameBox.minHeight === '40px', `${nameBox.radius} ${nameBox.minHeight}`)
  check('R5 rótulo persistente visível antes do preenchimento', await visible(page.getByText('Nome completo', { exact: true })).then(item => item.isVisible()))
  const consent = page.getByRole('checkbox', { name: CONSENT })
  const consentBox = await consent.locator(':scope > div').first().evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }))
  check('R1 caixa de consentimento sem marcação usa borda neutra', consentBox.bg === 'rgb(255, 255, 255)' && consentBox.border === BORDER_STRONG, JSON.stringify(consentBox))
  check('AC-02 consentimento começa desmarcado', (await consent.getAttribute('aria-checked')) === 'false')
  const loginLink = await visible(page.getByText('Já tem uma conta? Entrar', { exact: true }))
  const loginColor = await loginLink.evaluate(el => getComputedStyle(el).color)
  check('R5 link Já tem uma conta usa rosa-texto sobre canvas', loginColor === TEXT_PINK && ratio(TEXT_PINK, CANVAS) >= 4.5, loginColor)
  await shot(page, 'cadastro-tutor-inicial')

  // --- Validação (campos vazios) ---
  await cta.click()
  await (await visible(page.getByText('O nome é obrigatório', { exact: true }))).waitFor({ timeout: 10000 }).catch(() => {})
  const errorStyle = await styleOf(page, 'O nome é obrigatório')
  check('AC-08 erro de campo aparece com texto e cor de erro', errorStyle.color === ERROR, errorStyle.color)
  check('AC-04 erro de campo mantém contraste 4,5:1 sobre canvas', ratio(errorStyle.color, CANVAS) >= 4.5, `${ratio(errorStyle.color, CANVAS).toFixed(2)}:1`)
  // O erro do consentimento usa o texto do validador ("Aceite…"), diferente do rótulo do checkbox ("Aceito…").
  // Espera o erro ficar dentro da janela (a tela rola até a caixa ao falhar no consentimento).
  await page.waitForFunction(text => {
    const el = [...document.querySelectorAll('div, span')].find(node => node.children.length === 0 && node.textContent.trim() === text)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= window.innerHeight
  }, CONSENT_ERROR, { timeout: 8000 }).catch(() => {})
  const consentError = await page.evaluate(text => {
    const el = [...document.querySelectorAll('div, span')].find(node => node.children.length === 0 && node.textContent.trim() === text)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { color: getComputedStyle(el).color, top: Math.round(rect.top), bottom: Math.round(rect.bottom), viewport: window.innerHeight }
  }, CONSENT_ERROR)
  check('AC-08 consentimento não aceito mostra erro com texto', consentError?.color === ERROR, JSON.stringify(consentError))
  check('AC-08 erro do consentimento visível na área de leitura', Boolean(consentError) && consentError.top >= 0 && consentError.bottom <= consentError.viewport, JSON.stringify(consentError))
  await shot(page, 'cadastro-tutor-validacao')

  // --- Preenchimento, senha visível e consentimento marcado ---
  await fillTutor(page, `tutor.cadastro.${Date.now()}@email.com`)
  check('R5 rótulo persistente segue visível com valor preenchido', await (await visible(page.getByText('Nome completo', { exact: true }))).isVisible())
  check('AC-08 senha começa oculta', (await field(page, 'Senha').evaluate(el => el.type)) === 'password')
  await button(page, 'Mostrar senha').click()
  check('AC-08 botão Mostrar senha revela a senha com texto', (await field(page, 'Senha').evaluate(el => el.type)) === 'text' && await button(page, 'Ocultar senha').isVisible())
  await button(page, 'Ocultar senha').click()
  await consent.waitFor()
  check('AC-08 consentimento marcado anuncia o estado', (await consent.getAttribute('aria-checked')) === 'true')
  const checkedBox = await consent.locator(':scope > div').first().evaluate(el => getComputedStyle(el).backgroundColor)
  check('R1 caixa marcada do consentimento usa action.primary', checkedBox === CTA_PINK, checkedBox)
  await shot(page, 'cadastro-tutor-preenchido')

  // --- Erro recuperável de rede ---
  const failing = await openTutorForm(browser)
  await gateRoute(failing, '**/auth/register', { fail: true })
  await fillTutor(failing, `tutor.falha.${Date.now()}@email.com`)
  await (await visible(button(failing, 'Criar conta'))).click()
  const alert = failing.getByRole('alert')
  await alert.first().waitFor({ timeout: 15000 }).catch(() => {})
  const alertText = await alert.count() ? (await alert.first().innerText()).trim() : ''
  check('AC-08 erro de cadastro aparece como alerta com texto', alertText.length > 0, alertText)
  const alertBox = await alert.count() ? await alert.first().boundingBox() : null
  const ctaAfterError = await (await visible(button(failing, 'Criar conta'))).boundingBox()
  check('AC-08 erro de cadastro fica acima do CTA, na área de leitura', Boolean(alertBox && ctaAfterError && alertBox.y < ctaAfterError.y), JSON.stringify({ alert: alertBox, cta: ctaAfterError }))
  check('AC-08 erro de rede usa linguagem para o tutor', alertText.includes('Verifique sua internet'))
  check('AC-08 CTA volta a ficar disponível após o erro', await (await visible(button(failing, 'Criar conta'))).isEnabled())
  check('AC-08 campos preservados após o erro', await field(failing, 'Nome completo').inputValue() === 'Tutor Cadastro Visual')
  await shot(failing, 'cadastro-tutor-erro')

  // --- Carregando: CTA ocupado e bloqueado, link sem caixa cinza ---
  const slow = await openTutorForm(browser)
  await gateRoute(slow, '**/auth/register', { delayMs: 2500 })
  await fillTutor(slow, `tutor.lento.${Date.now()}@email.com`)
  await (await visible(button(slow, 'Criar conta'))).click()
  const busy = button(slow, 'Criar conta')
  await slow.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await busy.getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto carrega', await busy.isDisabled())
  check('AC-08 Mostrar senha bloqueado enquanto carrega', await button(slow, 'Mostrar senha').isDisabled())
  const lockedLink = await visible(slow.getByRole('button', { name: 'Já tem uma conta? Entrar', exact: true }))
  const lockedBox = await lockedLink.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopWidth }))
  check('AC-08 link desabilitado no carregamento segue sem caixa cinza', lockedBox.bg === 'rgba(0, 0, 0, 0)' && lockedBox.border === '0px', JSON.stringify(lockedBox))
  await shot(slow, 'cadastro-tutor-carregando')

  // --- Sucesso: cadastro válido sai para o login ---
  await (await visible(button(page, 'Criar conta'))).click()
  const reached = await (await visible(button(page, 'Entrar'))).waitFor({ timeout: 30000 }).then(() => true).catch(() => false)
  check('AC-08 cadastro válido chega à próxima etapa (login)', reached)
  await shot(page, 'cadastro-tutor-sucesso')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
