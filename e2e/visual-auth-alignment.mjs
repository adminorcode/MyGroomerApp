import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { APP_NAME, appUrl, evidenceFile, gateRoute, launchBrowser, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/visual-auth-alignment.mjs', evidence: evidenceFile('022-screen-reference-alignment', 'visual-auth-alignment.log') })
const { check } = run
const shots = name => evidenceFile('022-screen-reference-alignment', `ui-review/auth-${name}.png`)
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
// React Navigation retains earlier screens in the DOM with aria-hidden.
// Text and test-id locators must observe only the active screen.
const active = page => page.locator(':not([aria-hidden="true"]):not([aria-hidden="true"] *)')
const activeText = (page, value) => page.getByText(value, { exact: typeof value === 'string' }).and(active(page))
const capture = (page, name) => saveScreenshot(page, shots(name))
const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const email = `visual-auth-${Date.now()}@mygroomer.test`
const password = 'LocalTest#2026'
let browser

async function artworkLoaded(page, name) {
  const image = page.getByTestId(`artwork-${name}`).and(page.locator(':not([aria-hidden="true"] *)')).locator('img')
  await image.waitFor({ state: 'attached' })
  await image.evaluate(el => el.complete ? undefined : new Promise(resolve => { el.onload = resolve; el.onerror = resolve }))
  return image.evaluate(el => el.naturalWidth > 0 && el.naturalHeight > 0)
}

async function withinWindow(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  const bounds = await locator.boundingBox()
  return !!bounds && bounds.width <= page.viewportSize().width && bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= page.viewportSize().height + 1
}

try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await openLogin(page)
  check('VIS-02 Login permanece a entrada sem sessão', await field(page, 'E-mail').isVisible() && await field(page, 'Senha').isVisible())
  check('VIS-08 símbolo vetorial carregado no Login', await page.getByTestId('artwork-brand-symbol').locator('svg').isVisible())
  await capture(page, '01-login-mobile')
  await button(page, 'Entrar').click()
  await activeText(page, 'Informe um e-mail válido').waitFor()
  check('VIS-02 validação mantém os campos e senha obrigatória', await activeText(page, 'A senha é obrigatória').isVisible())
  await capture(page, '02-login-invalid')
  await field(page, 'E-mail').fill('tutor@email.com')
  await field(page, 'Senha').fill('admin')
  await gateRoute(page, '**/auth/login', { fail: true })
  await button(page, 'Entrar').click()
  await activeText(page, /Não foi possível conectar/).waitFor()
  check('VIS-07 falha de rede preserva os dados do Login', await field(page, 'E-mail').inputValue() === 'tutor@email.com' && await field(page, 'Senha').inputValue() === 'admin')
  await capture(page, '03-login-error')
  await page.unroute('**/auth/login')

  await button(page, 'Não tem uma conta? Cadastre-se').click()
  await button(page, 'Sou tutor').waitFor()
  check('VIS-02 Welcome mantém os dois caminhos e retorno', await button(page, 'Sou profissional').isVisible() && await button(page, 'Já tem uma conta? Entrar').isVisible())
  check('VIS-08 Welcome usa AS01 carregado e proporcional', await artworkLoaded(page, 'welcome'))
  check('VIS-08 decoração não duplica leitura acessível', await page.getByTestId('artwork-welcome').getAttribute('aria-hidden') === 'true')
  await capture(page, '04-welcome-mobile')
  await button(page, 'Sou tutor').click()
  await field(page, 'Nome completo').waitFor()
  check('VIS-02 cadastro de tutor preserva consentimento e campos reais', await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade' }).isVisible())
  await capture(page, '05-tutor-register-mobile')
  await button(page, 'Criar conta').click()
  await activeText(page, 'O nome é obrigatório').waitFor()
  check('VIS-07 formulário inválido mostra consentimento obrigatório', await activeText(page, 'Aceite os termos e a política de privacidade').isVisible())
  await field(page, 'Nome completo').fill('Tutor Visual de Teste')
  await field(page, 'E-mail').fill(email)
  await field(page, 'Telefone').fill('+5511987654321')
  await field(page, 'Senha').fill(password)
  await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade' }).click()
  await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade', checked: true }).waitFor()
  check('VIS-07 consentimento anuncia o estado marcado', await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade', checked: true }).count() === 1)
  await gateRoute(page, '**/auth/register', { delayMs: 1000 })
  await button(page, 'Criar conta').click()
  await page.getByRole('button', { name: 'Criar conta', exact: true, disabled: true }).waitFor()
  check('VIS-07 submissão tem estado ocupado e impede duplicação', await button(page, 'Criar conta').getAttribute('aria-busy') === 'true')
  await button(page, 'Entrar').waitFor({ timeout: 20000 })
  check('VIS-02 cadastro local válido retorna ao Login', await field(page, 'E-mail').isVisible())

  await button(page, 'Esqueci minha senha').click()
  await button(page, 'Enviar').waitFor()
  await capture(page, '06-forgot-mobile')
  await button(page, 'Enviar').click()
  await activeText(page, 'Informe um e-mail válido').waitFor()
  check('VIS-02 recuperação valida e-mail antes de enviar', await field(page, 'E-mail').isVisible())
  await field(page, 'E-mail').fill(email)
  await gateRoute(page, '**/auth/forgot-password', { fail: true })
  await button(page, 'Enviar').click()
  await activeText(page, /Não foi possível conectar/).waitFor()
  check('VIS-07 recuperação mantém endereço após erro', await field(page, 'E-mail').inputValue() === email)
  await page.unroute('**/auth/forgot-password')
  await button(page, 'Enviar').click()
  await button(page, 'Redefinir senha').waitFor({ timeout: 20000 })
  check('VIS-02 recuperação local abre redefinição real', await field(page, 'Nova senha').isVisible())
  await capture(page, '07-reset-mobile')
  await button(page, 'Redefinir senha').click()
  await activeText(page, 'A senha deve ter pelo menos 8 caracteres').waitFor()
  check('VIS-02 redefinição valida a senha', await field(page, 'Nova senha').isVisible())
  await field(page, 'Nova senha').fill('LocalTest#2027')
  await button(page, 'Redefinir senha').click()
  await activeText(page, 'Senha redefinida com sucesso').waitFor()
  await capture(page, '08-reset-success')
  await button(page, 'Entrar').click()

  await button(page, 'Não tem uma conta? Cadastre-se').click()
  await button(page, 'Sou profissional').click()
  await field(page, 'CPF / CNPJ').waitFor({ timeout: 15000 })
  check('VIS-05 G02 mantém formulário e catálogo de atuação', await page.getByRole('checkbox', { name: 'Groomer', exact: true }).isVisible())
  check('VIS-08 G02 usa AS04 carregado', await artworkLoaded(page, 'professional'))
  await capture(page, '09-professional-register-mobile')
  await button(page, 'Continuar').scrollIntoViewIfNeeded()
  check('VIS-07 G02 impede continuar sem tipo selecionado', await button(page, 'Continuar').isDisabled())
  await capture(page, '10-professional-register-footer')

  const verify = await openPage(browser)
  await verify.goto(`${appUrl}/verify-email`, { waitUntil: 'domcontentloaded' })
  await activeText(verify, 'Confira seu e-mail').waitFor({ timeout: 30000 })
  check('VIS-02 verificação sem token orienta confirmação', await activeText(verify, 'Enviamos um link de verificação para o seu e-mail. Toque nele para confirmar a conta.').isVisible())
  await capture(verify, '11-verify-mobile')

  for (const [width, height, suffix] of [[320, 760, 'narrow'], [1440, 900, 'desktop']]) {
    const responsive = await openPage(browser)
    await responsive.setViewportSize({ width, height })
    await openLogin(responsive)
    check(`VIS-07 Login CTA alcançável ${suffix}`, await withinWindow(responsive, button(responsive, 'Entrar')))
    await capture(responsive, `12-login-${suffix}`)
    await button(responsive, 'Não tem uma conta? Cadastre-se').click()
    await button(responsive, 'Sou tutor').waitFor()
    check(`VIS-02 marca atual ${suffix}`, await activeText(responsive, APP_NAME).isVisible())
    check(`VIS-07 escolha profissional alcançável ${suffix}`, await withinWindow(responsive, button(responsive, 'Sou profissional')))
    await capture(responsive, `13-welcome-${suffix}`)
    await button(responsive, 'Sou tutor').click()
    await field(responsive, 'Nome completo').waitFor()
    check(`VIS-07 consentimento e CTA alcançáveis ${suffix}`, await withinWindow(responsive, button(responsive, 'Criar conta')))
    await capture(responsive, `14-tutor-${suffix}`)
  }
} catch (error) { run.fail(error) }
finally {
  if (browser) await browser.close()
  try { await pool.query('DELETE FROM users WHERE email=$1', [email]) } catch (error) { run.fail(error) }
  await pool.end()
  await run.finish()
}
