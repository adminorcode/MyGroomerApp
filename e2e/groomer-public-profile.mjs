import { chromium } from 'playwright'

const base = 'http://localhost:8081'
const password = 'admin'
const rules = 'Atendimento em domicílio. O tutor precisa estar presente durante o serviço.'
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

async function login(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill('tutor@email.com')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

async function expectBooking(page, serviceName) {
  await page.getByText('Data e horário').waitFor({ timeout: 15000 })
  await page.getByText('Pet', { exact: true }).waitFor()
  await page.getByLabel(`Serviço: ${serviceName}`, { exact: true }).waitFor()
  await page.getByLabel('Groomer: Groomer de Teste', { exact: true }).waitFor()
}

async function openProfile(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
  const selected = page.getByRole('radio', { name: 'Banho, selecionado' })
  if (await selected.count() === 0) {
    await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
}

async function run() {
  const browser = await chromium.launch()
  let failProfile = false
  let delayProfile = false
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
  const page = await mobile.newPage()
  await page.route('**/api/v1/providers/**/profile', async (route) => {
    if (failProfile) {
      await route.abort()
      return
    }
    if (delayProfile) await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })

  await login(page)
  failProfile = true
  await openProfile(page)
  await page.getByText('Não foi possível carregar este perfil.').waitFor({ timeout: 15000 })
  check('AC-01 erro do perfil', true)
  failProfile = false
  delayProfile = true
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('Carregando perfil').waitFor({ timeout: 15000 })
  check('AC-01 carregando', true)
  delayProfile = false
  await page.getByText('Regras de atendimento').waitFor({ timeout: 15000 })

  let body = await textOf(page)
  const book = page.getByRole('button', { name: 'Agendar serviço' })
  check(
    'AC-01 perfil mostra profissional, reputação e preços-base',
    body.includes('Groomer de Teste')
      && body.includes('Verificado')
      && body.includes('Avaliação 5,0')
      && body.includes('1 avaliação')
      && body.includes('Banho')
      && body.includes('Tosa')
      && body.includes('Banho e tosa')
      && body.includes('A partir de')
      && body.includes('80,00')
      && body.includes('100,00')
      && body.includes('150,00'),
  )
  check('AC-02 regras de atendimento', body.includes('Regras de atendimento') && body.includes(rules))
  check('AC-04 sem serviço o agendamento não avança', await book.isDisabled())
  check('AC-04 orientação sem seleção', body.includes('Selecione um serviço para continuar.'))

  await page.getByRole('radio', { name: /^Banho,/ }).click()
  await page.getByRole('radio', { name: /Banho, selecionado/ }).waitFor()
  check('AC-03 serviço selecionado libera o agendamento', await book.isEnabled())
  await book.click()
  await expectBooking(page, 'Banho')
  check('AC-03 Banho segue com o profissional para pet e horário', true)

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('radio', { name: /^Tosa,/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço' }).click()
  await expectBooking(page, 'Tosa')
  check('AC-03 Tosa segue com o profissional para pet e horário', true)

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'pt-BR' })
  const wide = await desktop.newPage()
  await login(wide)
  await openProfile(wide)
  await wide.getByText('Regras de atendimento').waitFor({ timeout: 15000 })
  const heading = wide.getByText('Perfil do profissional', { exact: true }).first()
  await heading.waitFor()
  const color = await heading.evaluate((element) => getComputedStyle(element).color)
  const background = await wide.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check('AC-01 desktop claro', color !== background && color !== 'rgba(0, 0, 0, 0)')
  check('AC-04 desktop também começa sem seleção', await wide.getByRole('button', { name: 'Agendar serviço' }).isDisabled())

  await browser.close()
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
