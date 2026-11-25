import { evidenceFile, fillServiceAddress, launchBrowser, openCoverageFilters, openPage, openLogin, openRegistrationWelcome, startRun } from './harness.mjs'
import { attachPetPhoto, fillPetWeight } from './pet-form.mjs'
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
  command: 'node --import ./e2e/preload.mjs e2e/pet-registration.mjs',
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
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
}

async function login(page, email) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
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
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') throw new Error('Recusando banco fora do ambiente local')
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
  await page.getByText('A foto é obrigatória. Selecione um JPG ou PNG.').waitFor()
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
      body.includes('Informe o peso em kg') &&
      body.includes('Informe a foto do pet'),
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
  await fillPetWeight(page, 'abc')
  check('AC-peso mascara recusa texto', await page.getByRole('textbox', { name: 'Peso (kg)', exact: true }).inputValue() === '')
  await fillPetWeight(page, '0')
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await page.getByText('O peso precisa ser maior que zero').waitFor()
  check('AC-peso zero recusado', true)
  await fillPetWeight(page, '8.5')
  const weight = page.getByRole('textbox', { name: 'Peso (kg)', exact: true })
  check('AC-peso mascara decimal', await weight.inputValue() === '8,5')
  await fillPetWeight(page, '12,5')
  await weight.evaluate((el) => { el.focus(); el.setSelectionRange(3, 3); el.dispatchEvent(new Event('select', { bubbles: true })) })
  await weight.press('Backspace')
  await page.waitForFunction(() => document.querySelector('input[aria-label="Peso (kg)"]')?.value === '1,5')
  check('AC-peso Backspace na vírgula apaga o dígito', await weight.inputValue() === '1,5')
  check('AC-peso cursor permanece no dígito', await weight.evaluate(el => el.selectionStart) === 1)
  await fillPetWeight(page, '12,5')
  await weight.evaluate((el) => { el.focus(); el.setSelectionRange(2, 2); el.dispatchEvent(new Event('select', { bubbles: true })) })
  await weight.press('Delete')
  await page.waitForFunction(() => document.querySelector('input[aria-label="Peso (kg)"]')?.value === '12')
  check('AC-peso Delete na vírgula apaga o dígito seguinte', await weight.inputValue() === '12')
  await fillPetWeight(page, '0,5')
  await weight.evaluate((el) => { el.focus(); el.setSelectionRange(1, 1); el.dispatchEvent(new Event('select', { bubbles: true })) })
  await weight.press('Backspace')
  await page.waitForFunction(() => document.querySelector('input[aria-label="Peso (kg)"]')?.value === '')
  check('AC-peso Backspace no zero antes da vírgula limpa o campo', await weight.inputValue() === '')
  await fillPetWeight(page, '8')
  await weight.evaluate((el) => { el.focus(); el.setSelectionRange(0, 0); el.dispatchEvent(new Event('select', { bubbles: true })) })
  await weight.press('0')
  await page.waitForFunction(() => document.querySelector('input[aria-label="Peso (kg)"]')?.value === '8')
  check('AC-peso zero à esquerda permanece no início', await weight.inputValue() === '8' && await weight.evaluate(el => el.selectionStart) === 0)
  await fillPetWeight(page, '8,5')
  await attachPetPhoto(page)
  await page.getByRole('textbox', { name: 'Observações' }).fill('Medo de secador')
  const save = page.getByRole('button', { name: 'Salvar e continuar' })
  const busyWait = page.getByRole('button', { name: 'Salvar e continuar', disabled: true }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  await save.click()
  const sawBusy = await busyWait
  check('AC-01 carregamento ao salvar', sawBusy)
  await page.getByText(petName, { exact: true }).waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-01 e AC-02 pet salvo com peso e foto', body.includes(petName) && body.includes('Cão') && body.includes('Médio') && body.includes('8,5 kg') && body.includes('Com foto') && !body.includes('Salvar e continuar'))

  await page.getByRole('button', { name: `Editar ${petName}` }).click()
  await page.getByRole('textbox', { name: 'Observações' }).waitFor()
  const notes = await page.getByRole('textbox', { name: 'Observações' }).inputValue()
  check('AC-01 observações gravadas', notes === 'Medo de secador')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByText('Cadastre os pets para reutilizar nos agendamentos').waitFor()

  await page.getByText('Início', { exact: true }).click()
  await page.getByText('Banho e Tosa', { exact: true }).click()
  await openCoverageFilters(page)
  await page.getByRole('radiogroup', { name: 'Serviço' }).getByRole('radio', { name: 'Banho', exact: true }).click()
  await page.getByText('Escolha um endereço para ver quem atende.').first().waitFor()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço' }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByRole('radio', { name: new RegExp(petName) }).click()
  body = await textOf(page)
  check(
    'AC-04 pet salvo selecionado sem novo cadastro',
    await page.getByLabel(`Pet: ${petName}`, { exact: true }).count() === 1 && await page.getByRole('button', { name: 'Trocar pet', exact: true }).count() === 1 && !body.includes('Salvar e continuar'),
  )
  await page.route('**/api/v1/pets', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const json = await response.json()
    if (Array.isArray(json.data)) for (const pet of json.data) pet.weight_kg = null
    await route.fulfill({ response, json })
  })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Agendar serviço' }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByRole('radio', { name: new RegExp(petName) }).click()
  await page.getByRole('textbox', { name: 'Peso (kg)', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText('Complete o pet', { exact: true }).waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-peso pet desatualizado pede o peso em vez de agenda vazia', body.includes('Informe o peso para usar este pet.') && !body.includes('Nenhum horário disponível'))
  await page.unroute('**/api/v1/pets')
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
