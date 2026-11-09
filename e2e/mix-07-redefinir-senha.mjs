import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { APP_NAME, apiUrl, evidenceFile, gateRoute, launchBrowser, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-07-redefinir-senha.mjs',
  evidence: evidenceFile(plan, 'mix-07-redefinir-senha.log'),
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
const NEW_PASSWORD = 'LocalTest#2027'
const SHORT_PASSWORD_MESSAGE = 'A senha deve ter pelo menos 8 caracteres'

// Usuário descartável: a conta fixture não tem sua senha trocada pelo teste.
const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const email = `mix-07-${Date.now()}@mygroomer.test`
const OLD_PASSWORD = 'LocalTest#2026'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function boxOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderRadius, minHeight: cs.minHeight, type: el.type }
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

async function createThrowawayTutor() {
  const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Tutor Redefinicao Teste',
      email,
      password: OLD_PASSWORD,
      role: 'customer',
      phone_number: '+5511987654321',
      accepted_terms: true,
    }),
  })
  if (!response.ok) throw new Error(`Cadastro descartável recusado pela API local (${response.status})`)
}

let browser
try {
  await createThrowawayTutor()
  browser = await launchBrowser()

  // --- Entrada real pela recuperação (caminho feliz pela API local) ---
  const page = await openPage(browser)
  await openLogin(page)
  await button(page, 'Esqueci minha senha').click()
  await field(page, 'E-mail').fill(email)
  await button(page, 'Enviar').click()
  await button(page, 'Redefinir senha').waitFor({ timeout: 20000 })

  // --- Estado padrão da redefinição (tela 07) ---
  const title = page.getByRole('heading', { name: 'Nova senha', exact: true })
  check('AC-01 título da redefinição usa cabeçalho de tela', await title.isVisible())
  const brand = await visibleBrand(page)
  check('CMP-02 logotipo compacto mantém heading3 (18 pt, SemiBold)', brand.size === '18px' && /Inter-SemiBold/.test(brand.family), JSON.stringify(brand))
  check('AC-04 superfície da tela é canvas', await paintOf(title) === CANVAS)

  const reset = button(page, 'Redefinir senha')
  const resetBox = await boxOf(reset)
  const resetText = await textOf(reset, 'Redefinir senha')
  check('AC-02 CTA Redefinir senha usa action.primary', resetBox.background === CTA_PINK, JSON.stringify(resetBox))
  check('AC-02 texto do CTA usa onAction.primary (branco)', resetText.color === WHITE, resetText.color)
  check('AC-04 texto branco sobre o CTA mantém contraste 4,5:1 ou mais', ratio(resetText.color, resetBox.background) >= 4.5, `${ratio(resetText.color, resetBox.background).toFixed(2)}:1`)
  check('CMP-03 CTA primário tem sombra tingida de action.primary', resetBox.shadow.includes('198, 72, 120'), resetBox.shadow)
  check('AC-07 botão mantém altura 40 e raio 16', resetBox.minHeight === '40px' && resetBox.radius === '16px', `${resetBox.minHeight} ${resetBox.radius}`)

  const password = field(page, 'Nova senha')
  const passwordBox = await boxOf(password)
  check('AC-07 campo de senha tem raio 12 e borda de 2 pt', passwordBox.radius === '12px' && passwordBox.borderWidth === '2px', `${passwordBox.radius} ${passwordBox.borderWidth}`)
  check('AC-13 senha começa oculta (type password)', passwordBox.type === 'password', passwordBox.type)

  const toggle = button(page, 'Mostrar senha')
  const toggleText = await textOf(toggle, 'Mostrar senha')
  check('R5 Mostrar senha usa rosa-texto sobre canvas', toggleText.color === TEXT_PINK, toggleText.color)
  await shot(page, 'redefinir-mobile')

  // --- Validação da senha (tela 07) ---
  await reset.click()
  const validation = onScreen(page).getByText(SHORT_PASSWORD_MESSAGE, { exact: true })
  await validation.waitFor()
  check('AC-08 senha vazia mostra validação com texto', await validation.isVisible())
  check('R6 mensagem de validação usa semântica de erro', (await validation.evaluate(el => getComputedStyle(el).color)) === ERROR)
  check('AC-09 campo com erro usa borda de feedback.error', (await boxOf(password)).border === ERROR)
  await shot(page, 'redefinir-validacao')

  // --- Mostrar e ocultar a senha (tela 07) ---
  await password.fill(NEW_PASSWORD)
  await toggle.click()
  check('AC-13 Mostrar senha revela o texto digitado', (await boxOf(password)).type === 'text' && (await button(page, 'Ocultar senha').count()) === 1)
  await button(page, 'Ocultar senha').click()
  check('AC-13 Ocultar senha volta ao campo oculto', (await boxOf(password)).type === 'password')

  // --- Erro de rede recuperável (tela 07) ---
  await gateRoute(page, '**/auth/password-reset', { fail: true })
  await reset.click()
  const alert = page.getByRole('alert')
  await alert.first().waitFor({ timeout: 15000 }).catch(() => {})
  const alertText = (await alert.count()) ? (await alert.first().innerText()).trim() : ''
  check('AC-08 erro de rede aparece como alerta com texto', alertText.includes('Verifique sua internet'), alertText)
  check('AC-08 mensagem de erro usa linguagem para o tutor (sem "API")', !/API/.test(alertText))
  check('AC-08 o CTA volta a ficar disponível após o erro', await button(page, 'Redefinir senha').isEnabled())
  check('AC-08 a nova senha digitada é preservada após o erro', (await field(page, 'Nova senha').inputValue()) === NEW_PASSWORD)
  check('R6 erro usa semântica de erro', alertText.length > 0 && (await alert.first().evaluate(el => getComputedStyle(el).color)) === ERROR)
  await shot(page, 'redefinir-erro')
  await page.unroute('**/auth/password-reset')

  // --- Carregando e sucesso (tela 07) ---
  await gateRoute(page, '**/auth/password-reset', { delayMs: 2500 })
  await reset.click()
  await page.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await button(page, 'Redefinir senha').getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto carrega', await button(page, 'Redefinir senha').isDisabled())
  await shot(page, 'redefinir-carregando')

  const done = page.getByRole('alert').filter({ hasText: 'Senha redefinida com sucesso' })
  await done.waitFor({ timeout: 20000 })
  check('AC-08 sucesso mostra confirmação com texto', await done.isVisible())
  check('R6 confirmação usa semântica de sucesso', (await done.evaluate(el => getComputedStyle(el).color)) === SUCCESS)
  const enter = button(page, 'Entrar')
  const enterBox = await boxOf(enter)
  check('AC-02 CTA Entrar após sucesso usa action.primary', enterBox.background === CTA_PINK, JSON.stringify(enterBox))
  await shot(page, 'redefinir-sucesso')
  await page.unroute('**/auth/password-reset')

  // --- Nova senha permite entrar (tela 07 -> Login) ---
  await enter.click()
  await button(page, 'Entrar').waitFor()
  check('AC-13 Entrar leva de volta à entrada', await field(page, 'E-mail').isVisible())
  await field(page, 'E-mail').fill(email)
  await field(page, 'Senha').fill(NEW_PASSWORD)
  await button(page, 'Entrar').click()
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).first().waitFor({ timeout: 20000 })
  check('AC-13 a nova senha permite entrar na conta', await page.getByRole('button', { name: 'Abrir perfil', exact: true }).first().isVisible())
} catch (error) {
  run.fail(error)
} finally {
  try {
    await pool.query('DELETE FROM users WHERE email=$1', [email])
  } catch (error) {
    run.fail(error)
  }
  await pool.end()
  await run.finish(browser)
}
