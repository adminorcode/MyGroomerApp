import { appUrl as base, evidenceFile, launchBrowser, openPage, startRun } from './harness.mjs'

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
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
}

async function welcomeVisible(page, label) {
  const body = await textOf(page)
  check(`${label} boas-vindas`, body.includes('MyGroomer') && body.includes('Banho e tosa em domicílio') && body.includes('Sou tutor') && body.includes('Sou profissional'))
  const titleColor = await page.getByText('MyGroomer').evaluate((element) => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check(`${label} texto visível`, titleColor !== background && titleColor !== 'rgba(0, 0, 0, 0)')
}

async function run() {
  const browser = await launchBrowser()
  const email = `tutor-access-${Date.now()}@mygroomer.test`

  const mobile = await openPage(browser, { viewport: 'mobile' })
  await openWelcome(mobile)
  await welcomeVisible(mobile, 'celular claro')
  await mobile.getByRole('button', { name: 'Sou profissional' }).click()
  await mobile.getByText('Cadastro profissional').waitFor()
  let body = await textOf(mobile)
  check('AC-01 profissional abre o fluxo do groomer', body.includes('Forma de repasse') && !body.includes('Aceito os termos e a política de privacidade'))
  await mobile.getByText('Voltar', { exact: true }).click()
  await mobile.getByRole('button', { name: 'Sou tutor' }).click()
  await mobile.getByText('Acesse sua conta').waitFor()
  await mobile.getByText('Não tem uma conta? Cadastre-se').click()
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
  await page.getByText('Acesse sua conta').waitFor()
  await page.getByText('Não tem uma conta? Cadastre-se').click()
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
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 20000 })

  await page.getByRole('button', { name: 'Sou tutor' }).click()
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

  await session.finish(browser)
}

run().catch(async (error) => {
  session.fail(error)
  await session.finish()
})
