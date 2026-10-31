import { evidenceFile, launchBrowser, openPage, openLogin, openRegistrationWelcome, startRun } from './harness.mjs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const email = `pet-${Date.now()}@mygroomer.test`
let browser
let localDatabase = false

const password = 'LocalTest#2026'
const petName = `Nina ${Date.now()}`
const session = startRun({
  command: 'node e2e/pet-registration.mjs',
  evidence: evidenceFile('004-pet-registration', 'pet-registration.log'),
})
const { check } = session

async function textOf(page) {
  return page.locator('body').innerText()
}

async function registerAndLogin(page, email) {
  await openRegistrationWelcome(page)
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('button', { name: 'Criar conta' }).waitFor()
  await page.getByRole('textbox', { name: 'Nome completo' }).fill('Tutor Pet')
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Telefone' }).fill('+5511987654321')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('checkbox', { name: 'Aceito os termos e a política de privacidade' }).click()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByRole('button', { name: 'Entrar' }).waitFor({ timeout: 20000 })
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

async function login(page, email) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

async function openPets(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Meus pets' }).click()
  await page.getByText('Cadastre os pets para reutilizar nos agendamentos').waitFor()
}

async function petNameVisible(page, label) {
  await openPets(page)
  await page.getByText(petName, { exact: true }).waitFor({ timeout: 15000 })
  const name = page.getByText(petName, { exact: true })
  const nameColor = await name.evaluate((element) => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check(`${label} nome do pet visível`, nameColor !== background && nameColor !== 'rgba(0, 0, 0, 0)')
}

async function run() {
  const database = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_dev') throw new Error('Recusando banco fora do ambiente local')
  localDatabase = true
  browser = await launchBrowser()
  let blockPetList = true

  const page = await openPage(browser, { viewport: 'mobile' })
  await page.route('**/api/v1/pets', async (route) => {
    const method = route.request().method()
    if (method === 'GET' && blockPetList) {
      await route.abort()
      return
    }
    if (method === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await registerAndLogin(page, email)
  await openPets(page)
  await page.getByText('Não foi possível carregar os pets.').waitFor({ timeout: 15000 })
  check('AC-01 erro ao carregar a lista', true)
  blockPetList = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('Você ainda não cadastrou um pet.').waitFor({ timeout: 15000 })
  check('AC-04 lista vazia', true)

  await page.getByRole('button', { name: 'Cadastrar pet', exact: true }).click()
  await page.getByText('A foto é opcional. O pet pode ser salvo sem ela.').waitFor()
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await page.getByText('Informe o nome do pet').waitFor()
  let body = await textOf(page)
  check(
    'AC-03 campos obrigatórios',
    body.includes('Informe o nome do pet') &&
      body.includes('Informe a espécie') &&
      body.includes('Informe a raça') &&
      body.includes('Informe o porte') &&
      body.includes('Informe a idade em anos') &&
      body.includes('A foto é opcional. O pet pode ser salvo sem ela.'),
  )

  await page.getByRole('textbox', { name: 'Nome' }).fill(petName)
  await page.getByRole('radio', { name: 'Cão' }).click()
  await page.getByRole('textbox', { name: 'Raça' }).fill('SRD')
  await page.getByRole('radio', { name: 'Médio' }).click()
  await page.getByRole('textbox', { name: 'Idade (anos)' }).fill('-1')
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await page.getByText('A idade não pode ser negativa').waitFor()
  check('AC-03 idade negativa', true)

  await page.getByRole('textbox', { name: 'Idade (anos)' }).fill('41')
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await page.getByText('Informe uma idade de até 40 anos').waitFor()
  check('AC-03 idade acima do limite', true)

  await page.getByRole('textbox', { name: 'Idade (anos)' }).fill('4')
  await page.getByRole('textbox', { name: 'Observações' }).fill('Medo de secador')
  const save = page.getByRole('button', { name: 'Salvar e continuar' })
  const busyWait = page.getByRole('button', { name: 'Salvar e continuar', disabled: true }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  await save.click()
  const sawBusy = await busyWait
  check('AC-01 carregamento ao salvar', sawBusy)
  await page.getByText(petName, { exact: true }).waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-01 e AC-02 pet salvo sem foto', body.includes(petName) && body.includes('Cão') && body.includes('Médio') && body.includes('Sem foto') && !body.includes('Salvar e continuar'))

  await page.getByRole('button', { name: `Editar ${petName}` }).click()
  await page.getByRole('textbox', { name: 'Observações' }).waitFor()
  const notes = await page.getByRole('textbox', { name: 'Observações' }).inputValue()
  check('AC-01 observações gravadas', notes === 'Medo de secador')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByText('Cadastre os pets para reutilizar nos agendamentos').waitFor()

  await page.getByText('Início', { exact: true }).click()
  await page.getByText('Banho e Tosa', { exact: true }).click()
  await page.getByText('Banho', { exact: true }).click()
  await page.getByText('Informe o endereço do atendimento para ver quem atende.').waitFor()
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço' }).click()
  await page.getByText('Data e horário').waitFor({ timeout: 15000 })
  await page.getByRole('radio', { name: new RegExp(petName) }).click()
  body = await textOf(page)
  check(
    'AC-04 pet salvo selecionado sem novo cadastro',
    body.includes('Selecionado') && body.includes(petName) && body.includes('Agendar serviço') && !body.includes('Salvar e continuar'),
  )
  await page.context().close()

  const wide = await openPage(browser, { viewport: 'desktop' })
  await login(wide, email)
  await petNameVisible(wide, 'desktop claro')
  await wide.context().close()

  const dark = await openPage(browser, { viewport: 'mobile', colorScheme: 'dark' })
  await login(dark, email)
  await petNameVisible(dark, 'celular escuro')
  await dark.context().close()

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
