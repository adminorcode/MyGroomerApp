import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import {
  evidenceFile,
  launchBrowser,
  openPage,
  loginProfessional,
  gateRoute,
  startRun,
  fixtures,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const run = startRun({
  command: 'node e2e/booking-detail-groomer.mjs',
  evidence: evidenceFile('017-booking-detail-groomer', 'booking-detail-groomer.log'),
})
const { check, fail, finish } = run
const base = 'http://127.0.0.1:3000/api/v1'
const shotDir = path.dirname(evidenceFile('017-booking-detail-groomer', 'ui-review/detail-mobile.png'))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
const bookingDay = addDays(today, 4)

let tutorToken, providerToken, offer, pet, location, savedRoutine, pool
let bookingId = null
let browser

async function request(route, method = 'GET', body, token = tutorToken) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const raw = await response.text()
  const result = raw ? JSON.parse(raw) : {}
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(result)}`)
  return result
}

async function capture(page, name, fullPage = true) {
  mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage })
}

async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_dev') {
    throw new Error('Recusando banco fora do ambiente local')
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
  tutorToken = (await request('/auth/login', 'POST', fixtures.tutor, null)).token
  providerToken = (await request('/auth/login', 'POST', fixtures.groomer, null)).token
  savedRoutine = (await request('/providers/weekly-availability', 'GET', undefined, providerToken)).data
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, {
    enabled: true, start: '08:00', end: '21:00', break_start: null, break_end: null,
  }]))
  await request('/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 15, manual_fit: false }, providerToken)
  pet = (await request('/pets')).data[0]
  offer = (await request('/providers?limit=20', 'GET', undefined, providerToken)).data.find(item => item.is_active && item.service_name === 'Banho')
  location = (await request('/providers/service-location', 'GET', undefined, providerToken)).data
  if (!pet || !offer) throw new Error('A conta de demonstração não tem pet ou oferta de banho')
  const slots = (await request(`/bookings/slots?provider_service_id=${offer.id}&pet_id=${pet.id}&date=${bookingDay}`)).data.slots
  if (!slots.length) throw new Error('Sem horário livre para a solicitação de teste')
  const created = await request('/bookings', 'POST', {
    pet_id: pet.id,
    provider_service_id: offer.id,
    scheduled_at: slots[0],
    customer_location: location.address,
    customer_latitude: Number(location.latitude),
    customer_longitude: Number(location.longitude),
  })
  bookingId = created.data.booking.id
}

async function cleanup() {
  if (savedRoutine) await request('/providers/weekly-availability', 'PUT', savedRoutine, providerToken).catch(() => {})
  if (pool) {
    if (bookingId) await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]).catch(error => fail(error))
    await pool.end().catch(() => {})
  }
}

const openRequests = async page => {
  const nav = page.getByRole('tab', { name: 'Solicitações', exact: true }).or(page.getByRole('button', { name: 'Solicitações', exact: true }))
  await nav.first().click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 })
}

async function openDetailFromRequests(page) {
  await openRequests(page)
  const card = page.getByRole('article').first()
  await card.click()
  await page.getByText('Detalhes do agendamento', { exact: true }).waitFor({ timeout: 15000 })
}

async function execute() {
  await setup()
  browser = await launchBrowser()

  // FE-01 carregando
  const loadingPage = await openPage(browser)
  await loginProfessional(loadingPage)
  await gateRoute(loadingPage, `**/api/v1/bookings/${bookingId}`, { delayMs: 2500 })
  await openRequests(loadingPage)
  await loadingPage.getByRole('article').first().click()
  check('FE-01 carregando', await loadingPage.getByLabel('Carregando detalhes do agendamento').isVisible().catch(() => false))
  await capture(loadingPage, '02-mobile-carregando')
  await loadingPage.close()

  // FE-02 erro
  const errorPage = await openPage(browser)
  await loginProfessional(errorPage)
  await gateRoute(errorPage, `**/api/v1/bookings/${bookingId}`, { fail: true })
  await openRequests(errorPage)
  await errorPage.getByRole('article').first().click()
  check('FE-02 erro', await errorPage.getByText('Não foi possível carregar este agendamento.').waitFor({ timeout: 20000 }).then(() => true, () => false))
  await capture(errorPage, '03-mobile-erro')
  await errorPage.close()

  const page = await openPage(browser)
  await loginProfessional(page)
  await openDetailFromRequests(page)

  check('AC-01 título da tela', await page.getByText('Detalhes do agendamento', { exact: true }).isVisible())
  check('AC-01 seção Dados do pet', await page.getByText('Dados do pet', { exact: true }).isVisible())
  check('AC-01 seção Dados do tutor', await page.getByText('Dados do tutor', { exact: true }).isVisible())
  check('AC-01 seção Serviço solicitado', await page.getByText('Serviço solicitado', { exact: true }).isVisible())
  check(
    'AC-01 telefone do tutor',
    await page.getByText('+55 (11) 99999-9999').isVisible().catch(() => page.getByText('Telefone não informado').isVisible()),
  )

  await capture(page, '01-mobile-detalhe-pendente')

  check('AC-02 aceitar visível', await page.getByRole('button', { name: 'Aceitar agendamento' }).isVisible())
  check('AC-03 reagendar visível', await page.getByRole('button', { name: 'Reagendar' }).isVisible())
  check('AC-04 falar com tutor visível', await page.getByRole('button', { name: 'Falar com tutor' }).isVisible())
  check('AC-02 recusar visível', await page.getByRole('button', { name: 'Recusar agendamento' }).isVisible())

  await page.getByRole('button', { name: 'Reagendar' }).click()
  check('AC-03 sheet de reagendamento', await page.getByText('Reagendar atendimento', { exact: true }).isVisible())
  await page.getByRole('button', { name: 'Cancelar' }).click()

  const acceptBtn = page.getByRole('button', { name: 'Aceitar agendamento' })
  await acceptBtn.scrollIntoViewIfNeeded()
  const statusPatch = page.waitForResponse(
    response => response.url().includes(`/bookings/${bookingId}/status`) && response.request().method() === 'PATCH',
    { timeout: 20000 },
  )
  await acceptBtn.click()
  await statusPatch.catch(() => {})
  let confirmed = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const detail = await request(`/bookings/${bookingId}`, 'GET', undefined, providerToken)
    if (detail.data.booking_status === 'confirmed') {
      confirmed = true
      break
    }
    await page.waitForTimeout(500)
  }
  check('AC-02 aceitar confirma', confirmed)
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {})

  await page.getByRole('tab', { name: 'Aceitas', exact: true }).click()
  await page.getByRole('article').first().click()
  await page.getByText('Detalhes do agendamento', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'Falar com tutor' }).click()
  await page.getByRole('textbox', { name: 'Mensagem' }).waitFor({ timeout: 20000 })
  check('AC-04 abre a conversa do atendimento', await page.getByRole('textbox', { name: 'Mensagem' }).isVisible())

  await finish(browser)
}

execute().catch(error => {
  fail(error)
  finish(browser)
}).finally(() => cleanup())
