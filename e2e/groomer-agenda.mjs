import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { evidenceFile, launchBrowser, openPage, loginProfessional, gateRoute, startRun, fixtures } from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const run = startRun({
  command: 'node e2e/groomer-agenda.mjs',
  evidence: evidenceFile('015-groomer-agenda', 'groomer-agenda.log'),
})
const { check } = run
const base = 'http://127.0.0.1:3000/api/v1'
const shotDir = path.dirname(evidenceFile('015-groomer-agenda', 'ui-review/today-mobile.png'))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
const otherDay = addDays(today, 1)
const clock = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const partsOf = iso => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const read = type => parts.find(part => part.type === type).value
  return { date: `${read('year')}-${read('month')}-${read('day')}`, time: `${read('hour')}:${read('minute')}` }
}
const cover = time => {
  const [hour, minute] = time.split(':').map(Number)
  const start = hour * 60 + minute - ((hour * 60 + minute) % 15)
  const format = mins => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  return { start: format(start), end: format(start + 30) }
}

let tutorToken, providerToken, offer, pet, location, savedRoutine
const bookingIds = []
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

async function slotsOn(date) {
  return (await request(`/bookings/slots?provider_service_id=${offer.id}&pet_id=${pet.id}&date=${date}`)).data.slots
}

async function capture(page, name) {
  mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: true })
}

async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_dev') {
    throw new Error('Recusando banco fora do ambiente local')
  }
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
}

async function book(slot, status) {
  const created = await request('/bookings', 'POST', {
    pet_id: pet.id,
    provider_service_id: offer.id,
    scheduled_at: slot,
    customer_location: location.address,
    customer_latitude: Number(location.latitude),
    customer_longitude: Number(location.longitude),
  })
  const id = created.data.booking.id
  bookingIds.push(id)
  if (status === 'pending_confirmation') return id
  await request(`/bookings/${id}/status`, 'PATCH', { booking_status: 'confirmed' }, providerToken)
  if (status === 'en_route') await request(`/bookings/${id}/status`, 'PATCH', { booking_status: 'en_route' }, providerToken)
  return id
}

async function cleanup() {
  for (const id of bookingIds) {
    await request(`/bookings/${id}/status`, 'PATCH', { booking_status: 'cancelled' }, providerToken).catch(() => {})
  }
  if (savedRoutine) {
    await request('/providers/weekly-availability', 'PUT', savedRoutine, providerToken).catch(() => {})
  }
}

async function execute() {
  await setup()
  const todaySlots = await slotsOn(today)
  const laterSlots = await slotsOn(otherDay)
  if (todaySlots.length < 4 || laterSlots.length < 1) throw new Error(`Slots insuficientes: hoje ${todaySlots.length}, outro dia ${laterSlots.length}`)
  const [confirmedSlot, travelingSlot, pendingSlot, freeSlot] = todaySlots
  const outsideSlot = laterSlots[0]
  await book(confirmedSlot, 'confirmed')
  await book(travelingSlot, 'en_route')
  await book(pendingSlot, 'pending_confirmation')
  await book(outsideSlot, 'confirmed')
  const confirmedTime = clock(confirmedSlot)
  const travelingTime = clock(travelingSlot)
  const pendingTime = clock(pendingSlot)
  const outsideTime = clock(outsideSlot)
  const card = time => new RegExp(`${time}.*${pet.name}`)

  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginProfessional(page)
  await page.getByRole('button', { name: card(confirmedTime) }).waitFor({ timeout: 20000 })
  check('AC-01', await page.getByRole('button', { name: card(confirmedTime) }).isVisible() && await page.getByRole('button', { name: card(outsideTime) }).count() === 0)
  const from = `${today}T00:00:00-03:00`
  const to = `${addDays(today, 1)}T00:00:00-03:00`
  const agenda = (await request(`/providers/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, 'GET', undefined, providerToken)).data
  const pendingCount = agenda.appointments.filter(item => item.booking_status === 'pending_confirmation').length
  const visitCount = agenda.appointments.length - pendingCount
  const upcoming = agenda.appointments.find(item => new Date(item.scheduled_at).getTime() > Date.now())
  check('AC-02',
    await page.getByLabel(visitCount === 1 ? '1 atendimento' : `${visitCount} atendimentos`).isVisible()
    && await page.getByLabel(pendingCount === 1 ? '1 solicitação pendente' : `${pendingCount} solicitações pendentes`).isVisible()
    && await page.getByLabel(upcoming ? `Próximo às ${clock(upcoming.scheduled_at)}, ${upcoming.service_name ?? 'serviço'}` : 'Não há próximo horário').isVisible())
  check('AC-03',
    await page.getByRole('button', { name: card(confirmedTime) }).isVisible()
    && await page.getByRole('button', { name: new RegExp(`${travelingTime}.*Em deslocamento`) }).isVisible()
    && await page.getByRole('button', { name: new RegExp(`${pendingTime}.*Pendente`) }).isVisible()
    && await page.getByText(`Tutor: ${fixtures.tutor.email === 'tutor@email.com' ? 'Tutor' : ''}`).count() >= 0
    && await page.getByText('Avenida Paulista, São Paulo').first().isVisible())
  const tutorName = agenda.appointments.find(item => item.id === bookingIds[0])?.customer_name
  check('AC-03 tutor serviço e endereço', tutorName ? await page.getByText(`Tutor: ${tutorName}`).first().isVisible() && await page.getByText('Banho', { exact: true }).first().isVisible() : false)
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click()
  await page.getByRole('button', { name: 'Pendente', exact: true }).click()
  check('AC-04', await page.getByRole('button', { name: card(pendingTime) }).isVisible() && await page.getByRole('button', { name: card(confirmedTime) }).count() === 0)
  await page.getByRole('button', { name: 'Confirmado', exact: true }).click()
  check('AC-04 confirmado', await page.getByRole('button', { name: card(confirmedTime) }).isVisible() && await page.getByRole('button', { name: card(pendingTime) }).count() === 0)
  await page.getByRole('button', { name: 'Em deslocamento', exact: true }).click()
  check('AC-04 em deslocamento', await page.getByRole('button', { name: new RegExp(`${travelingTime}.*Em deslocamento`) }).isVisible() && await page.getByRole('button', { name: card(confirmedTime) }).count() === 0)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  check('AC-04 todos', await page.getByRole('button', { name: card(confirmedTime) }).isVisible() && await page.getByRole('button', { name: card(pendingTime) }).isVisible())
  await capture(page, 'today-mobile')
  await page.getByRole('button', { name: 'Semana', exact: true }).click()
  await page.getByRole('button', { name: card(confirmedTime) }).waitFor()
  check('AC-01 semana', await page.getByRole('button', { name: card(confirmedTime) }).isVisible())
  await capture(page, 'week-mobile')
  await page.getByRole('button', { name: 'Mês', exact: true }).click()
  await page.getByRole('button', { name: card(confirmedTime) }).waitFor()
  check('AC-01 mês', await page.getByRole('button', { name: card(confirmedTime) }).isVisible())
  await page.getByRole('button', { name: 'Hoje', exact: true }).click()
  await page.getByRole('button', { name: card(confirmedTime) }).waitFor()
  await page.getByRole('button', { name: card(confirmedTime) }).click()
  await page.getByText('Detalhe do agendamento', { exact: true }).waitFor()
  check('AC-05 detalhe', await page.getByRole('button', { name: 'Voltar', exact: true }).isVisible())
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Agenda do groomer', { exact: true }).waitFor()
  const free = partsOf(freeSlot)
  const range = cover(free.time)
  await page.getByRole('button', { name: 'Bloquear horário', exact: true }).click()
  const confirm = page.getByRole('button', { name: 'Confirmar bloqueio', exact: true })
  check('AC-06 bloqueio inválido', await confirm.isDisabled())
  await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('08:00')
  await page.getByText('O fim precisa ser depois do início.', { exact: true }).waitFor()
  check('AC-06 fim anterior desabilita', await confirm.isDisabled())
  await capture(page, 'block-invalid')
  await page.getByRole('textbox', { name: 'Data', exact: true }).fill(free.date)
  await page.getByRole('textbox', { name: 'Início', exact: true }).fill(range.start)
  await page.getByRole('textbox', { name: 'Fim', exact: true }).fill(range.end)
  check('AC-06 intervalo válido habilita', await confirm.isEnabled())
  const posted = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('/agenda-blocks'))
  await confirm.click()
  check('AC-05 bloqueio gravado', (await posted).ok())
  await page.getByText('Horário bloqueado', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'Fechar', exact: true }).waitFor({ state: 'hidden' })
  const offered = await slotsOn(free.date)
  check('AC-05 slot bloqueado sai da oferta', !offered.some(iso => clock(iso) === clock(freeSlot)))
  await capture(page, 'block-created')
  const unlock = page.getByRole('button', { name: `Desbloquear ${range.start}`, exact: true })
  await unlock.click()
  await unlock.waitFor({ state: 'hidden', timeout: 15000 })
  const restored = await slotsOn(free.date)
  check('AC-05 desbloquear devolve o slot', restored.some(iso => clock(iso) === clock(freeSlot)))
  check('AC-07',
    await page.getByRole('button', { name: 'Hoje', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Semana', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Mês', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Filtrar', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Bloquear horário', exact: true }).isVisible())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Bloquear horário', exact: true }).waitFor()
  const wide = await page.getByRole('button', { name: 'Bloquear horário', exact: true }).boundingBox()
  check('AC-07 desktop', !!wide && wide.y + wide.height <= 900 && wide.x >= 0 && wide.x + wide.width <= 1440)
  await capture(page, 'today-desktop')
  await page.context().close()

  const states = await openPage(browser)
  const gate = { fail: false, delayMs: 8000 }
  await gateRoute(states, '**/api/v1/providers/agenda?**', gate)
  await loginProfessional(states)
  await states.getByRole('progressbar', { name: 'Carregando agenda' }).waitFor({ timeout: 15000 })
  check('AC-06 carregando', true)
  await capture(states, 'loading')
  gate.delayMs = 0
  await states.getByRole('button', { name: card(confirmedTime) }).waitFor({ timeout: 20000 })
  gate.fail = true
  await states.getByRole('button', { name: 'Semana', exact: true }).click()
  await states.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor({ timeout: 15000 })
  check('AC-06 erro', await states.getByText('Não foi possível carregar a agenda.', { exact: true }).isVisible())
  await capture(states, 'error')
  gate.fail = false
  await states.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await states.getByRole('button', { name: card(confirmedTime) }).waitFor({ timeout: 20000 })
  check('AC-06 nova tentativa', true)
  await states.context().close()

  const empty = await openPage(browser)
  await empty.route('**/api/v1/providers/agenda?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { timezone: 'America/Sao_Paulo', appointments: [], blocks: [], manual_appointments: [] } }),
  }))
  await loginProfessional(empty)
  await empty.getByText('Não há atendimentos no período.', { exact: true }).waitFor()
  check('AC-06 vazio', await empty.getByRole('button', { name: 'Bloquear horário', exact: true }).isEnabled())
  await capture(empty, 'empty')
  await empty.context().close()
}

execute().catch(error => run.fail(error)).finally(async () => {
  await cleanup()
  await run.finish(browser)
})
