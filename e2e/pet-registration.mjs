import { chromium } from 'playwright'

const base = 'http://localhost:8081'
const password = 'LocalTest#2026'
const petName = `Nina ${Date.now()}`
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`ok ${name}`)
    return
  }
  const message = `${name}${detail ? ` — ${detail}` : ''}`
  failures.push(message)
  console.error(`fail ${message}`)
}

async function textOf(page) {
  return page.locator('body').innerText()
}

async function registerAndLogin(page, email) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByText('Não tem uma conta? Cadastre-se').click()
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
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: 'Sou tutor' }).click()
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
  const browser = await chromium.launch()
  const email = `pet-${Date.now()}@mygroomer.test`
  let blockPetList = true

  const mobileLight = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
  const page = await mobileLight.newPage()
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
  const busyWait = page.locator('[aria-busy="true"]').first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false)
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
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
  await page.getByText('Groomer de Teste', { exact: true }).click()
  await page.getByText('Agendar serviço', { exact: true }).waitFor()
  await page.getByRole('radio', { name: new RegExp(petName) }).click()
  body = await textOf(page)
  check(
    'AC-04 pet salvo selecionado sem novo cadastro',
    body.includes('Selecionado') && body.includes(petName) && body.includes('Agendar serviço') && !body.includes('Salvar e continuar'),
  )
  await mobileLight.close()

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'pt-BR' })
  const wide = await desktop.newPage()
  await login(wide, email)
  await petNameVisible(wide, 'desktop claro')
  await desktop.close()

  const mobileDark = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'pt-BR' })
  const dark = await mobileDark.newPage()
  await login(dark, email)
  await petNameVisible(dark, 'celular escuro')
  await mobileDark.close()

  await browser.close()
  if (failures.length) {
    console.error(`failed ${failures.length}`)
    process.exitCode = 1
  } else {
    console.log('passed')
  }
}

run().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  process.exit(process.exitCode || 0)
})
