import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import {
  evidenceFile,
  fillServiceAddress,
  gateRoute,
  launchBrowser,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const run = startRun({
  command: 'node e2e/booking-request.mjs',
  evidence: evidenceFile('009-booking-request', 'booking-request.log'),
})
const { check } = run
const base = 'http://127.0.0.1:3000/api/v1'
const providerId = randomUUID(), tutorId = randomUUID(), professionalId = randomUUID(), offerId = randomUUID()
const suffix = randomUUID()
const tutorEmail = `request-ui-${suffix}@mygroomer.test`, providerEmail = `request-pro-${suffix}@mygroomer.test`
const professionalName = 'Profissional de solicitação e cuidados pet em domicílio'
const address = 'Avenida Paulista, São Paulo'
const slotGone = 'Este horário não está mais disponível. Escolha outro horário.'
const nextStep = 'O profissional precisa aceitar. Nenhuma cobrança foi feita.'
const detailsTitle = 'Detalhes do serviço'
const sendLabel = 'Solicitar agendamento'
const shotDir = path.dirname(evidenceFile('009-booking-request', 'ui-review/resumo-390.png'))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10) }
const openDate = addDays(today, 2)
const dayLabel = date => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
const summaryDate = date => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`))
const clock = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const endOf = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString()

let browser, guarded = false, tutorToken, providerToken, smallPet
const usedSlots = new Set()

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

const available = pet => request(`/bookings/slots?provider_service_id=${offerId}&pet_id=${pet.id}&date=${openDate}`)

async function takeSlot(pet) {
  const data = (await available(pet)).data
  const iso = data.slots.find(value => !usedSlots.has(value))
  if (!iso) throw new Error('Sem horário livre para o próximo cenário')
  usedSlots.add(iso)
  return { iso, price: data.price, duration: data.duration_minutes }
}

async function capture(page, name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) })
}

async function openTimeScreen(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, address)
  if (!await page.getByRole('radio', { name: 'Banho, selecionado' }).count()) {
    await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(professionalName) }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
}

async function pickSlot(page, pet, iso) {
  await page.getByRole('radio', { name: dayLabel(openDate), exact: true }).click()
  const petOption = page.getByRole('radio', { name: new RegExp(`^${pet.name}`) })
  if (await petOption.count()) await petOption.click()
  await page.getByRole('button', { name: clock(iso), exact: true }).click()
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).waitFor()
}

async function review(page) {
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).click()
}

function summaryLabels(pet, iso, price) {
  return [
    `Profissional: ${professionalName}`,
    `Pet: ${pet.name}`,
    'Serviço: Banho',
    `Data: ${summaryDate(openDate)}`,
    `Horário: ${clock(iso)}`,
    `Local: ${address}`,
    `Valor estimado: ${money(price)}`,
  ]
}

async function countLabels(page, labels) {
  const counts = await page.evaluate(needles => {
    const normalize = value => (value ?? '').replace(/\s+/g, ' ').trim()
    const wanted = needles.map(normalize)
    return wanted.map(needle => Array.from(document.querySelectorAll('[aria-label]'))
      .filter(element => normalize(element.getAttribute('aria-label')) === needle && element.checkVisibility())
      .length)
  }, labels)
  if (!counts.every(value => value === 1)) {
    const all = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).map(element => element.getAttribute('aria-label')))
    console.log('aria-labels no DOM:', JSON.stringify(all))
  }
  return counts
}

async function waitForSummary(page) {
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[aria-label]'))
    .some(element => element.getAttribute('aria-label')?.startsWith('Data: ')))
}

async function contrastOf(locator) {
  return locator.evaluate(element => {
    const parse = value => (value.match(/\d+/g) ?? []).slice(0, 3).map(Number)
    const lum = rgb => rgb.map(channel => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const ink = parse(getComputedStyle(element).color)
    const back = parse(getComputedStyle(element.parentElement).backgroundColor)
    if (ink.length < 3 || back.length < 3) return 0
    const first = lum(ink), second = lum(back)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  })
}

async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_dev') {
    throw new Error('Recusando banco fora do ambiente local')
  }
  guarded = true
  for (const [id, email, name, source] of [
    [tutorId, tutorEmail, 'Tutor da solicitação', 'tutor@email.com'],
    [professionalId, providerEmail, professionalName, 'groomer@email.com'],
  ]) {
    await pool.query(`INSERT INTO users(id,name,email,password,role,email_verified_at,phone_number,address)
      SELECT $1,$2,$3,password,role,NOW(),phone_number,address FROM users WHERE email=$4`, [id, name, email, source])
  }
  await pool.query(`INSERT INTO providers(id,user_id,is_verified,base_address,base_latitude,base_longitude,radius_km,travel_gap_minutes,manual_fit)
    SELECT $1,$2,true,base_address,base_latitude,base_longitude,radius_km,30,false FROM providers WHERE id='10000000-0000-4000-8000-000000000003'`, [providerId, professionalId])
  await pool.query(`INSERT INTO provider_professional_types(provider_id,professional_type_id)
    SELECT $1,professional_type_id FROM provider_professional_types WHERE provider_id='10000000-0000-4000-8000-000000000003'`, [providerId])
  await pool.query(`INSERT INTO provider_services(id,provider_id,service_id,price,is_active,professional_type_id,description,price_small,price_medium,price_large,duration_small_minutes,duration_medium_minutes,duration_large_minutes)
    SELECT $1,$2,service_id,80,true,professional_type_id,'Banho para teste de solicitação',80,100,120,60,90,120 FROM provider_services WHERE id='10000000-0000-4000-8000-000000000010'`, [offerId, providerId])
  tutorToken = (await request('/auth/login', 'POST', { email: tutorEmail, password: 'admin' }, null)).token
  providerToken = (await request('/auth/login', 'POST', { email: providerEmail, password: 'admin' }, null)).token
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' }]))
  await request('/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 30, manual_fit: false }, providerToken)
  smallPet = (await request('/pets', 'POST', { name: 'Luna solicitação', species: 'dog', breed: 'SRD', size: 'small', age_years: 3 })).data
  mkdirSync(shotDir, { recursive: true })
}

async function happyPath(page, slot) {
  await loginTutor(page, { email: tutorEmail, password: 'admin' })
  await openTimeScreen(page)
  await pickSlot(page, smallPet, slot.iso)
  await review(page)
  await page.getByText('Resumo do agendamento', { exact: true }).waitFor()
  await waitForSummary(page)
  const labels = summaryLabels(smallPet, slot.iso, slot.price)
  const counts = await countLabels(page, labels)
  check('AC-01 resumo mostra profissional, pet, serviço, data, horário e local', counts.slice(0, 6).every(value => value === 1), counts.join('|'))
  check('AC-02 valor estimado do porte no resumo', counts[6] === 1, counts.join('|'))
  check('AC-02 resumo não tem taxa', await page.getByLabel(/^Taxa:/).count() === 0 && await page.getByText('Taxa', { exact: true }).count() === 0)
  check('AC-04 resumo não oferece pagamento', await page.getByRole('button', { name: /Pagar|Pix|Cartão/i }).count() === 0)
  check('AC-01 resumo no formato do wireframe T08', await page.getByText(detailsTitle, { exact: true }).count() === 1
    && await page.getByText('Pagamento', { exact: true }).count() === 1
    && await page.getByText('Valor estimado', { exact: true }).count() === 1)
  await capture(page, 'resumo-390', page.getByText(detailsTitle, { exact: true }))

  await page.setViewportSize({ width: 1440, height: 900 })
  const desktop = await countLabels(page, labels)
  check('AC-01 desktop mantém os rótulos do resumo', desktop.every(value => value === 1), desktop.join('|'))
  await capture(page, 'resumo-1440', page.getByText(detailsTitle, { exact: true }))

  await page.setViewportSize({ width: 320, height: 844 })
  check('AC-01 resumo em 320 sem overflow horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await capture(page, 'resumo-320', page.getByText(detailsTitle, { exact: true }))
  await page.setViewportSize({ width: 390, height: 844 })

  const sendButton = page.getByRole('button', { name: sendLabel, exact: true })
  const sendBox = await sendButton.boundingBox()
  check('AC-01 envio com alvo de toque >=48', sendBox.width >= 48 && sendBox.height >= 48,
    `${Math.round(sendBox.width)}x${Math.round(sendBox.height)}`)

  const gate = { fail: false, delayMs: 1200 }
  await gateRoute(page, '**/api/v1/bookings', gate)
  const createdWait = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/bookings'))
  const requestWait = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/bookings'))
  await sendButton.click()
  const postedBody = (await requestWait).postDataJSON()
  await page.getByLabel('Enviando solicitação', { exact: true }).waitFor()
  check('AC-04 envio em andamento desabilita o envio', await page.getByRole('button', { name: sendLabel, exact: true }).isDisabled())
  check('AC-01 envio usa o instante ISO do slot', postedBody.scheduled_at === slot.iso, String(postedBody.scheduled_at))
  const created = await createdWait
  const body = await created.json()
  check('AC-04 primeira inserção responde 201', created.status() === 201 && body.data.created === true, `status=${created.status()}`)
  await page.getByLabel('Status: Aguardando confirmação', { exact: true }).waitFor()
  check('AC-04 confirmação aguardando confirmação e próximo passo',
    await page.getByLabel(`Próximo passo: ${nextStep}`, { exact: true }).count() === 1)
  check('AC-04 confirmação sem ação de pagamento', await page.getByRole('button', { name: /Pagar|Pix|Cartão/i }).count() === 0)
  check('AC-04 confirmação com um único resumo', await page.getByText(detailsTitle, { exact: true }).count() === 1)
  const statusRatio = await contrastOf(page.getByText('Aguardando confirmação', { exact: true }))
  check('AC-04 status legível com contraste >=4.5', statusRatio >= 4.5, `ratio=${statusRatio.toFixed(2)}`)
  const bookingId = body.data.booking.id
  const stored = await pool.query('SELECT count(*)::int AS total, min(booking_status) AS status FROM bookings WHERE id=$1', [bookingId])
  const payments = await pool.query('SELECT count(*)::int AS total FROM payments WHERE booking_id=$1', [bookingId])
  check('AC-04 solicitação gravada sem pagamento',
    stored.rows[0].total === 1 && stored.rows[0].status === 'pending_confirmation' && payments.rows[0].total === 0,
    JSON.stringify({ stored: stored.rows[0], payments: payments.rows[0] }))
  await capture(page, 'confirmacao-390', page.getByText('Solicitação enviada', { exact: true }))
  await capture(page, 'confirmacao-resumo-390', page.getByLabel(/^Valor estimado: R\$/).last())
  await page.getByRole('button', { name: 'Ver solicitação', exact: true }).click()
  await page.getByText('Detalhe do agendamento', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-04 ver solicitação abre o detalhe', await page.getByText('Detalhe do agendamento', { exact: true }).count() === 1)
  await page.context().close()
}

async function duplicate(pageA, pageB, slot) {
  for (const page of [pageA, pageB]) {
    await loginTutor(page, { email: tutorEmail, password: 'admin' })
    await openTimeScreen(page)
    await pickSlot(page, smallPet, slot.iso)
    await review(page)
    await waitForSummary(page)
  }
  const firstWait = pageA.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/bookings'))
  await pageA.getByRole('button', { name: sendLabel, exact: true }).click()
  const first = await firstWait
  await pageA.getByLabel('Status: Aguardando confirmação', { exact: true }).waitFor()
  const duplicateWait = pageB.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/bookings'))
  await pageB.getByRole('button', { name: sendLabel, exact: true }).click()
  const duplicate = await duplicateWait
  const duplicateBody = await duplicate.json()
  await pageB.getByLabel('Status: Aguardando confirmação', { exact: true }).waitFor()
  check('AC-03 segundo envio responde 200 sem criar outra', first.status() === 201 && duplicate.status() === 200 && duplicateBody.data.created === false,
    `first=${first.status()} second=${duplicate.status()} created=${duplicateBody.data.created}`)
  check('AC-03 confirmação avisa que a solicitação já foi enviada',
    await pageB.getByText('Esta solicitação já foi enviada', { exact: true }).count() === 1)
  check('AC-03 confirmação mantém um único status', await pageB.getByLabel('Status: Aguardando confirmação', { exact: true }).count() === 1)
  check('AC-03 confirmação mantém um único resumo', await pageB.getByText(detailsTitle, { exact: true }).count() === 1)
  const stored = await pool.query('SELECT count(*)::int AS total FROM bookings WHERE provider_service_id=$1 AND pet_id=$2 AND scheduled_at=$3', [offerId, smallPet.id, slot.iso])
  check('AC-03 banco mantém uma única solicitação', stored.rows[0].total === 1, `total=${stored.rows[0].total}`)
  await capture(pageB, 'repeticao-390', pageB.getByText('Solicitação enviada', { exact: true }))
  await pageA.context().close()
  await pageB.context().close()
}

async function loadingAndError(page, slot) {
  await loginTutor(page, { email: tutorEmail, password: 'admin' })
  await openTimeScreen(page)
  await pickSlot(page, smallPet, slot.iso)
  const gate = { fail: false, delayMs: 5000 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', gate)
  await review(page)
  await page.getByLabel('Carregando resumo', { exact: true }).waitFor()
  check('AC-01 carregando resumo mantém o resumo em espera',
    await page.getByRole('button', { name: sendLabel, exact: true }).isDisabled())
  await capture(page, 'carregando-390', page.getByText('Carregando resumo', { exact: true }))
  gate.delayMs = 0
  await waitForSummary(page)
  check('AC-01 resumo carrega depois da espera', await page.getByRole('button', { name: sendLabel, exact: true }).isEnabled())

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
  gate.fail = true
  await review(page)
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor()
  check('AC-01 erro oferece tentar novamente e esconde o envio',
    await page.getByRole('button', { name: sendLabel, exact: true }).count() === 0)
  await capture(page, 'erro-390', page.getByRole('button', { name: 'Tentar novamente', exact: true }))
  gate.fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await waitForSummary(page)
  check('AC-01 recuperação recarrega o resumo', true)
  await page.context().close()
}

async function unavailableSlot(page, slot) {
  await loginTutor(page, { email: tutorEmail, password: 'admin' })
  await openTimeScreen(page)
  await pickSlot(page, smallPet, slot.iso)
  const first = (await request('/providers/agenda-blocks', 'POST', { starts_at: slot.iso, ends_at: endOf(slot.iso, slot.duration) }, providerToken)).data
  await review(page)
  await page.getByText(slotGone, { exact: true }).waitFor()
  check('AC-04 horário fora da grade bloqueia o envio', await page.getByRole('button', { name: sendLabel, exact: true }).isDisabled())
  check('AC-02 horário fora da grade esconde o valor estimado', await page.getByLabel(/^Valor estimado:/).count() === 0)
  await capture(page, 'indisponivel-390', page.getByText(slotGone, { exact: true }))
  await request(`/providers/agenda-blocks/${first.id}`, 'DELETE', undefined, providerToken)

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
  await review(page)
  await waitForSummary(page)
  const second = (await request('/providers/agenda-blocks', 'POST', { starts_at: slot.iso, ends_at: endOf(slot.iso, slot.duration) }, providerToken)).data
  const refusedWait = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/bookings'))
  await page.getByRole('button', { name: sendLabel, exact: true }).click()
  const refused = await refusedWait
  await page.getByText(slotGone, { exact: true }).waitFor()
  check('AC-04 recusa 409 mostra o alerta e não confirma',
    refused.status() === 409
      && await page.getByLabel('Status: Aguardando confirmação', { exact: true }).count() === 0
      && await page.getByRole('button', { name: sendLabel, exact: true }).isDisabled(),
    `status=${refused.status()}`)
  check('AC-02 recusa 409 esconde o valor estimado do horário perdido', await page.getByLabel(/^Valor estimado:/).count() === 0)
  await capture(page, 'recusa-409-390', page.getByText(slotGone, { exact: true }))
  await page.getByRole('button', { name: 'Voltar', exact: true }).last().click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
  await page.getByRole('button', { name: clock(slot.iso), exact: true }).waitFor({ state: 'detached' })
  check('AC-04 voltar após 409 atualiza a grade de horários',
    await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).isDisabled())
  await request(`/providers/agenda-blocks/${second.id}`, 'DELETE', undefined, providerToken)
  await page.context().close()
}

async function execute() {
  await setup()
  browser = await launchBrowser()
  const slotA = await takeSlot(smallPet)
  await happyPath(await openPage(browser), slotA)
  const slotB = await takeSlot(smallPet)
  await duplicate(await openPage(browser), await openPage(browser), slotB)
  const slotC = await takeSlot(smallPet)
  await loadingAndError(await openPage(browser), slotC)
  const slotD = await takeSlot(smallPet)
  await unavailableSlot(await openPage(browser), slotD)
}

try {
  await execute()
} catch (error) {
  run.fail(error)
} finally {
  if (browser) await browser.close()
  try {
    if (guarded) {
      await pool.query('DELETE FROM bookings WHERE provider_service_id=$1', [offerId])
      await pool.query('DELETE FROM provider_agenda_blocks WHERE provider_id=$1', [providerId])
      await pool.query('DELETE FROM pets WHERE owner_id=$1', [tutorId])
      await pool.query('DELETE FROM provider_services WHERE provider_id=$1', [providerId])
      await pool.query('DELETE FROM providers WHERE id=$1', [providerId])
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[tutorId, professionalId]])
    }
  } catch (error) {
    run.fail(error)
  }
  await pool.end()
  await run.finish()
}
