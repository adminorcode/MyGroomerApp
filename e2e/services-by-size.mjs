import { chromium } from 'playwright'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const bcrypt = require(path.join(apiRoot, 'node_modules/bcrypt'))

const appUrl = 'http://localhost:8081'
const api = 'http://127.0.0.1:3000/api/v1'
const password = 'admin'
const failures = []
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const createdTypeIds = []
let adminUserId
let groomerToken
let originalOffers = []

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`ok ${name}`)
    return
  }
  const message = `${name}${detail ? ` — ${detail}` : ''}`
  failures.push(message)
  console.error(`fail ${message}`)
}

async function request(route, method = 'GET', body, token) {
  const response = await fetch(api + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function loginApi(email) {
  const result = await request('/auth/login', 'POST', { email, password })
  if (result.status !== 200) throw new Error(`login ${email} ${result.status}`)
  return result.body.token
}

function payloadOf(offer) {
  return {
    id: offer.id,
    service_id: offer.service_id,
    custom_name: offer.custom_name,
    category_id: offer.category_id,
    professional_type_id: offer.professional_type_id,
    description: offer.description,
    is_active: offer.is_active,
    prices: offer.prices,
    durations_minutes: offer.durations_minutes,
  }
}

async function restore() {
  if (groomerToken && originalOffers.length) {
    await pool.query(
      `DELETE FROM provider_services WHERE provider_id = $1 AND custom_name = 'Hidratação teste'`,
      ['10000000-0000-4000-8000-000000000003'],
    )
    await request('/providers/menu', 'PUT', { offers: originalOffers.map(payloadOf) }, groomerToken)
  }
  if (createdTypeIds.length) {
    await pool.query('UPDATE provider_services SET professional_type_id = NULL WHERE professional_type_id = ANY($1::uuid[])', [createdTypeIds])
    await pool.query('DELETE FROM provider_professional_types WHERE professional_type_id = ANY($1::uuid[])', [createdTypeIds])
    await pool.query('DELETE FROM professional_types WHERE id = ANY($1::uuid[])', [createdTypeIds])
  }
  if (adminUserId) await pool.query('DELETE FROM users WHERE id = $1', [adminUserId])
}

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços' })
  if (await tab.count()) await tab.click()
  else await page.getByRole('button', { name: 'Serviços', exact: true }).click()
}

async function loginProfessional(page) {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sou profissional' }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await page.getByText('Já tem uma conta? Entrar').click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill('groomer@email.com')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('Agendamentos').waitFor({ timeout: 20000 })
}

async function loginTutor(page) {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill('tutor@email.com')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

async function visibleAgainstBackground(page, text, label) {
  const target = page.getByText(text, { exact: true }).first()
  await target.waitFor()
  const color = await target.evaluate(element => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)
  check(label, color !== background && color !== 'rgba(0, 0, 0, 0)', `${color} sobre ${background}`)
}

async function disabled(locator) {
  return locator.evaluate(element => element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'))
}

async function run() {
  groomerToken = await loginApi('groomer@email.com')
  const menu = await request('/providers/menu', 'GET', undefined, groomerToken)
  if (menu.status !== 200) throw new Error('cardápio inicial indisponível')
  originalOffers = menu.body.data.offers
  const banho = originalOffers.find(offer => offer.name === 'Banho')
  if (!banho) throw new Error('Banho de demonstração ausente')

  adminUserId = crypto.randomUUID()
  const adminEmail = `admin-ui-011-${adminUserId}@mygroomer.test`
  await pool.query(
    `INSERT INTO users(id, name, email, password, role, email_verified_at, address, phone_number)
     VALUES ($1, 'Admin UI 011', $2, $3, 'admin', NOW(), 'Endereco ficticio - teste local', '+5511999990002')`,
    [adminUserId, adminEmail, await bcrypt.hash(password, 10)],
  )
  const admin = await loginApi(adminEmail)
  const outsider = await request('/professional-types', 'POST', { name: 'Tipo fora 011' }, admin)
  const inactive = await request('/professional-types', 'POST', { name: 'Tipo inativo 011' }, admin)
  if (outsider.status !== 201 || inactive.status !== 201) throw new Error('não foi possível preparar os tipos')
  createdTypeIds.push(outsider.body.data.id, inactive.body.data.id)
  await pool.query(
    `INSERT INTO provider_professional_types(provider_id, professional_type_id) VALUES ($1, $2)`,
    ['10000000-0000-4000-8000-000000000003', inactive.body.data.id],
  )
  const deactivated = await request(`/professional-types/${inactive.body.data.id}`, 'PATCH', { is_active: false }, admin)
  if (deactivated.status !== 200) throw new Error('não foi possível desativar o tipo')

  const browser = await chromium.launch()
  try {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
    const page = await mobile.newPage()
    let mode = 'fail'
    await page.route('**/api/v1/providers/menu**', async route => {
      if (route.request().method() !== 'GET') return route.continue()
      if (mode === 'fail') return route.abort()
      if (mode === 'delay') await new Promise(resolve => setTimeout(resolve, 1200))
      return route.continue()
    })

    await loginProfessional(page)
    await openServices(page)
    await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
    check('erro do cardápio', true)

    mode = 'delay'
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.getByLabel('Carregando').waitFor({ timeout: 5000 })
    check('carregando', true)
    mode = 'pass'
    await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 15000 })
    await visibleAgainstBackground(page, 'Dados do serviço', 'tema claro em 390')
    await page.setViewportSize({ width: 1440, height: 900 })
    await visibleAgainstBackground(page, 'Dados do serviço', 'tema claro em 1440')
    await page.setViewportSize({ width: 390, height: 844 })

    const body = await page.locator('body').innerText()
    check('AC-06 tipo no cardápio', body.includes('Tipo: Groomer'))
    check('AC-02 preços e durações iniciais', body.includes('Pequeno') && body.includes('80,00') && body.includes('40 min') && body.includes('60 min') && body.includes('90 min'))
    const continueButton = page.getByRole('button', { name: 'Continuar' })
    check('cardápio completo habilita Continuar', !(await disabled(continueButton)))

    await page.getByRole('button', { name: 'Editar Banho', exact: true }).click()
    await page.getByRole('textbox', { name: 'Preço grande' }).fill('')
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.getByText('Complete a descrição, o preço e a duração de cada porte antes de continuar.').waitFor()
    check('AC-03 porte incompleto bloqueia Continuar', await disabled(page.getByRole('button', { name: 'Continuar' })))
    await page.getByRole('button', { name: 'Editar Banho', exact: true }).click()
    await page.getByRole('textbox', { name: 'Preço grande' }).fill('80,00')
    await page.getByRole('button', { name: 'Concluir' }).click()

    await page.getByRole('button', { name: 'Adicionar serviço' }).click()
    await page.getByText('Tipo fora 011').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {})
    const editor = await page.locator('body').innerText()
    check('AC-07 tipo de fora não aparece', !editor.includes('Tipo fora 011'))
    check('AC-07 tipo inativo não aparece', !editor.includes('Tipo inativo 011'))
    check('AC-04 escolha do tipo da conta', editor.includes('Tipo escolhido: Groomer') || editor.includes('Groomer'))
    await page.getByRole('textbox', { name: 'Nome do serviço' }).fill('Hidratação teste')
    await page.getByRole('textbox', { name: 'Descrição' }).fill('Hidratação da pelagem')
    await page.getByRole('textbox', { name: 'Preço pequeno' }).fill('70,00')
    await page.getByRole('textbox', { name: 'Preço médio' }).fill('90,00')
    await page.getByRole('textbox', { name: 'Preço grande' }).fill('120,00')
    await page.getByRole('textbox', { name: 'Duração pequeno' }).fill('30')
    await page.getByRole('textbox', { name: 'Duração médio' }).fill('45')
    await page.getByRole('textbox', { name: 'Duração grande' }).fill('60')
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.getByText('Hidratação teste', { exact: true }).first().waitFor()
    check('AC-04 serviço extra no cardápio', (await page.locator('body').innerText()).includes('Tipo: Groomer'))

    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByText('Local de atendimento', { exact: true }).waitFor({ timeout: 15000 })
    check('AC-05 Continuar abre o local', true)
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByText('Hidratação teste', { exact: true }).first().waitFor()
    const savedCard = await page.locator('body').innerText()
    check('AC-05 card mantém preço e duração salvos', savedCard.includes('70,00') && savedCard.includes('45 min') && savedCard.includes('Tipo: Groomer'))
    await page.getByRole('button', { name: 'Editar Hidratação teste', exact: true }).click()
    const description = await page.getByRole('textbox', { name: 'Descrição' }).inputValue()
    const smallPrice = await page.getByRole('textbox', { name: 'Preço pequeno' }).inputValue()
    const mediumDuration = await page.getByRole('textbox', { name: 'Duração médio' }).inputValue()
    check(
      'AC-02 descrição, preço e duração permanecem no editor',
      description === 'Hidratação da pelagem' && smallPrice === '70,00' && mediumDuration === '45',
      `${description} | ${smallPrice} | ${mediumDuration}`,
    )
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByText('Cadastro profissional', { exact: true }).waitFor()
    check('AC-05 Voltar abre o cadastro', true)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByText('Hidratação teste', { exact: true }).first().waitFor()

    await page.getByRole('button', { name: 'Desativar Banho', exact: true }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByText('Local de atendimento', { exact: true }).waitFor({ timeout: 15000 })

    const tutorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
    const tutor = await tutorContext.newPage()
    await loginTutor(tutor)
    await tutor.getByRole('button', { name: 'Buscar um serviço' }).click()
    await tutor.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
    await tutor.getByRole('radio', { name: 'Banho', exact: true }).click()
    await tutor.getByRole('button', { name: 'Buscar' }).click()
    await tutor.getByText('Nenhum groomer atende este endereço.').waitFor({ timeout: 15000 })
    check('AC-01 serviço desativado some para o tutor', !(await tutor.locator('body').innerText()).includes('Groomer de Teste'))
    await tutorContext.close()

    const emptyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
    const empty = await emptyContext.newPage()
    await empty.route('**/api/v1/providers/menu**', route => {
      if (route.request().method() !== 'GET') return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { offers: [], suggestions: [], types: [], categories: [] } }),
      })
    })
    await loginProfessional(empty)
    await openServices(empty)
    await empty.getByText('Nenhum serviço', { exact: true }).waitFor({ timeout: 15000 })
    check('vazio', await empty.getByRole('button', { name: 'Adicionar serviço' }).count() > 0)
    await emptyContext.close()
  } finally {
    await browser.close()
  }
}

run()
  .catch(error => {
    failures.push(error.message)
    console.error(`fail ${error.message}`)
  })
  .finally(async () => {
    await restore().catch(error => {
      failures.push(`restauração: ${error.message}`)
      console.error(`fail restauração: ${error.message}`)
    })
    await pool.end()
    if (failures.length) {
      console.error(`${failures.length} falha(s)`)
      process.exitCode = 1
    }
  })
