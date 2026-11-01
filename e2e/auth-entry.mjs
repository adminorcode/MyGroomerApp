import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { APP_NAME, appUrl, evidenceFile, gateRoute, launchBrowser, loginProfessional, openLogin, openPage, startRun } from './harness.mjs'

const run = startRun({ command: 'node e2e/auth-entry.mjs', evidence: evidenceFile('010-groomer-registration/auth-entry', 'auth-entry.log') })
const { check } = run
const shots = path.dirname(evidenceFile('010-groomer-registration/auth-entry', 'ui-review/placeholder'))
mkdirSync(shots, { recursive: true })
let browser
const input = (page, name) => page.getByRole('textbox', { name, exact: true })
const button = (page, name) => page.getByRole('button', { name, exact: true })
const capture = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true })
async function contrast(locator) {
  return locator.evaluate(el => {
    const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
    const lum = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
    let parent = el
    while (parent && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(parent).backgroundColor)) parent = parent.parentElement
    if (!parent) throw new Error('Fundo de contraste não resolvido')
    const values = [lum(rgb(getComputedStyle(el).color)), lum(rgb(getComputedStyle(parent).backgroundColor))].sort((a, b) => b - a)
    return (values[0] + .05) / (values[1] + .05)
  })
}

try {
  for (const url of [appUrl, 'http://localhost:3000/health']) if (!(await fetch(url)).ok) throw new Error(`Indisponível: ${url}`)
  browser = await launchBrowser()
  const page = await openPage(browser)
  await openLogin(page)
  check('AE-01 login é a primeira tela sem sessão', await input(page, 'E-mail').isVisible() && await input(page, 'Senha').isVisible() && await button(page, 'Sou tutor').count() === 0)
  const loginContrast = await contrast(button(page, 'Entrar').getByText('Entrar', { exact: true }))
  check(`AE-06 contraste Entrar ${loginContrast.toFixed(2)}:1`, loginContrast >= 4.5)
  await capture(page, '01-login-mobile')
  await button(page, 'Entrar').click()
  await page.getByText('Informe um e-mail válido', { exact: true }).waitFor()
  check('AE-05 login vazio mostra validação', await page.getByText('A senha é obrigatória', { exact: true }).isVisible())
  for (let i = 0; i < 3; i++) {
    await button(page, 'Não tem uma conta? Cadastre-se').click()
    await button(page, 'Sou tutor').waitFor()
    const signup = await button(page, 'Sou profissional').boundingBox()
    const back = await button(page, 'Já tem uma conta? Entrar').boundingBox()
    check(`AE-04 retorno fica abaixo dos perfis ${i + 1}`, back.y >= signup.y + signup.height)
    if (!i) {
      const linkContrast = await contrast(button(page, 'Já tem uma conta? Entrar').getByText('Já tem uma conta? Entrar', { exact: true }))
      check(`AE-06 contraste retorno ${linkContrast.toFixed(2)}:1`, linkContrast >= 4.5)
      await capture(page, '02-welcome-mobile')
    }
    await button(page, 'Já tem uma conta? Entrar').click()
    await button(page, 'Entrar').waitFor()
    check(`AE-04 retorna ao login sem telas duplicadas ${i + 1}`, await input(page, 'E-mail').count() === 1)
  }
  await button(page, 'Não tem uma conta? Cadastre-se').click()
  await button(page, 'Sou tutor').click()
  await button(page, 'Criar conta').waitFor()
  check('AE-02 tutor abre cadastro diretamente', await input(page, 'Nome completo').isVisible())
  await page.getByText('Já tem uma conta? Entrar', { exact: true }).filter({ visible: true }).click()
  await button(page, 'Não tem uma conta? Cadastre-se').click()
  await button(page, 'Sou profissional').click()
  await input(page, 'CPF / CNPJ').waitFor()
  check('AE-03 profissional abre G02', await input(page, 'CPF / CNPJ').isEditable())
  await button(page, 'Voltar').click()
  await button(page, 'Já tem uma conta? Entrar').click()
  await input(page, 'E-mail').fill('tutor@email.com')
  await input(page, 'Senha').fill('admin')
  await page.route('**/auth/login', route => route.abort())
  await button(page, 'Entrar').click()
  await page.getByText(/Não foi possível conectar/).waitFor()
  check('AE-05 erro preserva campos', await input(page, 'E-mail').inputValue() === 'tutor@email.com' && await input(page, 'Senha').inputValue() === 'admin')
  await capture(page, '03-login-error')
  await page.unroute('**/auth/login')
  await gateRoute(page, '**/auth/login', { delayMs: 1200 })
  await button(page, 'Entrar').click()
  await page.getByRole('button', { name: 'Entrar', exact: true, disabled: true }).waitFor()
  check('AE-05 espera bloqueia cadastro e submissão duplicada', await button(page, 'Não tem uma conta? Cadastre-se').isDisabled())
  await capture(page, '04-login-pending')
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  check('AE-05 tutor entra com conta existente', await button(page, 'Abrir perfil').isVisible())
  await page.reload()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  check('AE-01 sessão existente mantém acesso ao app', await button(page, 'Abrir perfil').isVisible())
  await button(page, 'Abrir perfil').click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByText('Sair', { exact: true }).filter({ visible: true }).click()
  await button(page, 'Entrar').waitFor()
  check('AE-01 logout retorna ao login', await input(page, 'E-mail').isVisible() && await button(page, 'Sou tutor').count() === 0)
  await button(page, 'Esqueci minha senha').click()
  await button(page, 'Enviar').waitFor()
  check('AE-05 recuperação de senha acessível', await input(page, 'E-mail').isVisible())

  const professional = await openPage(browser)
  await loginProfessional(professional)
  check('AE-05 profissional entra diretamente no login comum', await professional.getByText('Agendamentos', { exact: true }).isVisible())

  const desktop = await openPage(browser, { viewport: 'desktop' })
  await openLogin(desktop)
  await capture(desktop, '05-login-desktop')
  await button(desktop, 'Não tem uma conta? Cadastre-se').click()
  await button(desktop, 'Sou tutor').waitFor()
  await capture(desktop, '06-welcome-desktop')
  await desktop.setViewportSize({ width: 320, height: 760 })
  await desktop.getByText(APP_NAME, { exact: true }).waitFor()
  const logo = await desktop.getByText(APP_NAME, { exact: true }).boundingBox()
  check('AE-06 logotipo fica em uma linha em320', logo.height <= 41)
  await capture(desktop, '07-welcome-narrow')
  await desktop.evaluate(() => {
    for (const el of document.querySelectorAll('div,span,input')) if (!el.children.length || el.tagName === 'INPUT') {
      el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 2}px`
      el.style.lineHeight = 'normal'
    }
  })
  await button(desktop, 'Já tem uma conta? Entrar').scrollIntoViewIfNeeded()
  await capture(desktop, '08-welcome-text200')
  for (const label of ['Sou tutor', 'Sou profissional', 'Já tem uma conta? Entrar']) {
    const outer = await button(desktop, label).boundingBox()
    const inner = await button(desktop, label).getByText(label, { exact: true }).boundingBox()
    check(`AE-06 ${label} cabe com texto200`, inner.x >= outer.x && inner.x + inner.width <= outer.x + outer.width + 1 && outer.height >= 48)
  }
  await button(desktop, 'Já tem uma conta? Entrar').click()
  await button(desktop, 'Entrar').waitFor()
  await capture(desktop, '09-login-narrow')
  check('AE-06 cadastro acessível em320', await button(desktop, 'Não tem uma conta? Cadastre-se').isVisible())
  await desktop.reload()
  await button(desktop, 'Entrar').waitFor()
  await desktop.evaluate(() => {
    for (const el of document.querySelectorAll('div,span,input')) if (!el.children.length || el.tagName === 'INPUT') {
      el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 2}px`
      el.style.lineHeight = 'normal'
    }
  })
  await button(desktop, 'Não tem uma conta? Cadastre-se').scrollIntoViewIfNeeded()
  await capture(desktop, '10-login-text200')
  const signupBounds = await button(desktop, 'Não tem uma conta? Cadastre-se').boundingBox()
  const signupText = await button(desktop, 'Não tem uma conta? Cadastre-se').getByText('Não tem uma conta? Cadastre-se', { exact: true }).boundingBox()
  check('AE-06 cadastro no login cabe com texto200', signupText.x >= signupBounds.x && signupText.x + signupText.width <= signupBounds.x + signupBounds.width + 1)
  check('AE-06 cadastro ampliado permanece inteiro na janela', signupBounds.y >= 0 && signupBounds.y + signupBounds.height <= 761 && signupText.y + signupText.height <= signupBounds.y + signupBounds.height + 1)
} catch (error) { run.fail(error) } finally { await run.finish(browser) }
