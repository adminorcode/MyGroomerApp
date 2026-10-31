import { appUrl as base, evidenceFile, launchBrowser, openPage, openRegistrationWelcome, startRun } from './harness.mjs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const email = `tutor-access-${Date.now()}@mygroomer.test`
let browser
let localDatabase = false

const password = 'LocalTest#2026'
const nextPassword = 'LocalTest#2027'
const session = startRun({
  command: 'node e2e/tutor-access.mjs',
  evidence: evidenceFile('003-tutor-access', 'tutor-access.log'),
})
const { check } = session

async function textOf(page) {
  return page.locator('body').innerText()
}

async function openWelcome(page) {
  await openRegistrationWelcome(page)
}

async function welcomeVisible(page, label) {
  const body = await textOf(page)
  check(`${label} boas-vindas`, body.includes('MyGroomer') && body.includes('Banho e tosa em domicílio') && body.includes('Sou tutor') && body.includes('Sou profissional'))
  const titleColor = await page.getByText('MyGroomer').evaluate((element) => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check(`${label} texto visível`, titleColor !== background && titleColor !== 'rgba(0, 0, 0, 0)')
}

async function run() {
  const database = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_dev') throw new Error('Recusando banco fora do ambiente local')
  localDatabase = true
  browser = await launchBrowser()

  const mobile = await openPage(browser, { viewport: 'mobile' })
  await openWelcome(mobile)
  await welcomeVisible(mobile, 'celular claro')
  await mobile.getByRole('button', { name: 'Sou profissional' }).click()
  await mobile.getByText('Cadastro profissional', { exact: true }).first().waitFor()
  let body = await textOf(mobile)
  check('AC-01 profissional abre G02', await mobile.getByRole('textbox', { name: 'CPF / CNPJ', exact: true }).count() === 1 && !body.includes('Forma de repasse'))
  await mobile.getByRole('button', { name: 'Voltar', exact: true }).click()
  await mobile.getByRole('button', { name: 'Sou tutor' }).click()
  await mobile.getByRole('button', { name: 'Criar conta' }).waitFor()
  await mobile.getByRole('button', { name: 'Criar conta' }).click()
  await mobile.getByText('O nome é obrigatório').waitFor()
  body = await textOf(mobile)
  check('AC-03 erro de campo e aceite', body.includes('O nome é obrigatório') && body.includes('Informe um e-mail válido') && body.includes('O telefone é obrigatório') && body.includes('A senha deve ter pelo menos 8 caracteres') && body.includes('Aceito os termos e a política de privacidade') && body.includes('Aceite os termos e a política de privacidade'))
  await mobile.context().close()

  const dark = await openPage(browser, { viewport: 'mobile', colorScheme: 'dark' })
  await openWelcome(dark)
  await welcomeVisible(dark, 'celular escuro')
  await dark.context().close()

  const page = await openPage(browser, { viewport: 'desktop' })
  await openWelcome(page)
  await welcomeVisible(page, 'desktop claro')
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('button', { name: 'Criar conta' }).waitFor()

  await page.route('**/auth/register', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.continue()
  })
  await page.getByRole('textbox', { name: 'Nome completo' }).fill('Tutor Acesso')
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Telefone' }).fill('+5511987654321')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade' }).click()
  const create = page.getByRole('button', { name: 'Criar conta' })
  const busyWait = page.getByRole('button', { name: 'Criar conta', disabled: true }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  await create.click()
  const sawBusy = await busyWait
  check('AC-02 carregamento do cadastro', sawBusy)
  const reachedLogin = await page.getByRole('button', { name: 'Entrar' }).waitFor({ timeout: 20000 }).then(() => true).catch(async () => {
    console.error(await textOf(page))
    return false
  })
  check('AC-02 cadastro com aceite chega ao login', reachedLogin)
  if (!reachedLogin) throw new Error('cadastro não chegou ao login')

  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  check('AC-04 conta nova entra', true)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByText('Sair', { exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor({ timeout: 20000 })
  await page.getByText('Esqueci minha senha', { exact: true }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.getByRole('button', { name: 'Redefinir senha' }).waitFor({ timeout: 20000 })
  await page.getByRole('textbox', { name: 'Nova senha' }).fill(nextPassword)
  await page.getByRole('button', { name: 'Redefinir senha' }).click()
  await page.getByText('Senha redefinida com sucesso').waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('E-mail ou senha inválidos').waitFor({ timeout: 20000 })
  await page.getByRole('textbox', { name: 'Senha' }).fill(nextPassword)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  check('AC-04 senha redefinida entra e a antiga é recusada', true)

}

run().catch((error) => {
  session.fail(error)
}).finally(async () => {
  if (browser) await browser.close()
  try {
    if (localDatabase) await pool.query('DELETE FROM users WHERE email=$1', [email])
  } catch (error) { session.fail(error) }
  await pool.end()
  await session.finish()
})
