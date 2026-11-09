import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

// Tela 17 (BookService) do plano 027: cartão do profissional em teal (CMP-11), dia e horário em rosa (CMP-15),
// revisão em rosa (R1), estados de carregamento, erro e desabilitado com texto.
const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-17-data-horario.mjs',
  evidence: evidenceFile(plan, 'mix-17-data-horario.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const TEAL = 'rgb(22, 125, 131)' // brand.teal (CMP-11, R3)
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const WHITE = 'rgb(255, 255, 255)'
const DISABLED = 'rgb(228, 232, 232)' // state.disabledSurface

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const base = 'http://127.0.0.1:3000/api/v1'
const suffix = randomUUID()
const tutorId = randomUUID(), providerId = randomUUID(), professionalId = randomUUID(), offerId = randomUUID()
const tutorEmail = `mix17-tutor-${suffix}@mygroomer.test`
const providerEmail = `mix17-pro-${suffix}@mygroomer.test`
const professionalName = 'Profissional mistura data e horário'
const serviceName = 'Banho'
const address = 'Avenida Paulista, São Paulo'
const petName = 'Luna mistura 17'
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10) }
const openDate = addDays(today, 2)
const dayLabel = date => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

// Telas empilhadas permanecem no DOM: só conta o que não está escondido por aria-hidden.
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"]):not([aria-hidden="true"] *)'))
const slotButtons = page => page.getByRole('button', { name: /^\d{2}:\d{2}$/ })
const isSelected = async locator => (await locator.getAttribute('aria-selected')) === 'true' || (await locator.getAttribute('aria-checked')) === 'true'
// Cor do texto: o rótulo de MGButton e MGChip é um filho (dir=auto); o contêiner só tem o fundo.
const styleOf = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  const label = getComputedStyle(el.querySelector('[dir]') ?? el)
  return { background: cs.backgroundColor, color: label.color, radius: cs.borderRadius, border: cs.borderTopWidth }
})

let browser
let gateSlots = { fail: false, delayMs: 0 }
let tutorAccount

async function request(route, method = 'GET', body, token) {
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

async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_e2e') {
    throw new Error('Recusando banco fora do ambiente local')
  }
  for (const [id, email, name, source] of [
    [tutorId, tutorEmail, 'Tutor mistura 17', 'tutor@email.com'],
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
    SELECT $1,$2,service_id,80,true,professional_type_id,'Banho para teste da mistura 17',80,100,120,60,90,120 FROM provider_services WHERE id='10000000-0000-4000-8000-000000000010'`, [offerId, providerId])
  const providerToken = (await request('/auth/login', 'POST', { email: providerEmail, password: 'admin' }, null)).token
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' }]))
  await request('/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 30, manual_fit: false }, providerToken)
  tutorAccount = { email: tutorEmail, password: 'admin' }
  const tutorToken = (await request('/auth/login', 'POST', tutorAccount, null)).token
  return (await request('/pets', 'POST', { name: petName, species: 'dog', breed: 'SRD', size: 'small', age_years: 3 }, tutorToken)).data
}

async function openTimeScreen(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, address)
  await page.getByRole('button', { name: new RegExp(professionalName) }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await activeText(page, 'Escolha um horário').waitFor()
}

async function pickDay(page) {
  await page.getByRole('radio', { name: dayLabel(openDate), exact: true }).click()
}

async function pickPet(page, pet) {
  const petOption = page.getByRole('radio', { name: new RegExp(`^${pet.name}`) })
  if (await petOption.count()) await petOption.click()
}

async function happy(page, pet) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)

  // Telas empilhadas (perfil do profissional, lista de serviços) continuam no DOM: só conta a tela ativa e visível.
  const onScreen = locator => locator.and(page.locator(':not([aria-hidden="true"] *)')).filter({ visible: true })

  // CMP-11: avatar do profissional em teal sólido, com texto branco (MGAvatar tone="teal" → brand.teal).
  const avatar = onScreen(page.getByLabel(professionalName, { exact: true }))
  check('CMP-11 avatar do profissional é teal sólido', await avatar.count() === 1 && await avatar.evaluate(el => getComputedStyle(el).backgroundColor) === TEAL)
  check('CMP-11 inicial do avatar em branco sobre teal', await avatar.evaluate(el => getComputedStyle(el.firstElementChild).color) === WHITE)

  // AC-07: cartão do profissional com raio 16 e borda 1 pt.
  const card = await onScreen(page.getByText(professionalName, { exact: true })).first().evaluate(el => {
    let node = el
    while (node && getComputedStyle(node).borderTopWidth !== '1px') node = node.parentElement
    return node ? { radius: getComputedStyle(node).borderRadius, border: getComputedStyle(node).borderTopWidth } : null
  })
  check('AC-07 cartão do profissional com raio 16 e borda 1', card?.radius === '16px' && card?.border === '1px', JSON.stringify(card))

  // Topo da tela (cabeçalho com título e cartão do profissional), antes de qualquer rolagem para o seletor.
  await activeText(page, 'Escolha um horário').first().scrollIntoViewIfNeeded()
  await shot(page, 'data-horario-topo')

  // AC-04: nome do serviço em teal sobre branco, com contraste de 4,5:1 ou mais.
  const service = page.getByLabel(`Serviço: ${serviceName}`, { exact: true })
  const serviceStyle = await styleOf(service)
  check('AC-04 serviço em teal sobre branco com 4,5:1 ou mais', serviceStyle.color === TEAL && ratio(serviceStyle.color, WHITE) >= 4.5, `${serviceStyle.color} ${ratio(serviceStyle.color, WHITE).toFixed(2)}:1`)

  // AC-08 desabilitado: revisar fica bloqueado com texto visível antes de escolher horário.
  const review = page.getByRole('button', { name: 'Revisar solicitação', exact: true })
  check('AC-08 revisar solicitação desabilitada antes do horário', await review.isDisabled() && (await styleOf(review)).background === DISABLED)

  await pickDay(page)
  // CMP-15: dia selecionado em rosa.
  const day = page.getByRole('radio', { name: dayLabel(openDate), exact: true })
  check('CMP-15 dia selecionado é marcado no seletor', await isSelected(day))
  check('CMP-15 dia selecionado em action.primary', (await styleOf(day)).background === CTA_PINK)

  await pickPet(page, pet)
  await slotButtons(page).first().waitFor({ timeout: 15000 })
  const slot = slotButtons(page).first()
  const slotLabel = await slot.innerText()
  await slot.click()

  // CMP-15: horário selecionado em rosa, com texto branco.
  const picked = page.getByRole('button', { name: slotLabel, exact: true })
  check('CMP-15 horário selecionado é marcado no seletor', await isSelected(picked))
  const pickedStyle = await styleOf(picked)
  check('CMP-15 horário selecionado em action.primary com texto branco', pickedStyle.background === CTA_PINK && pickedStyle.color === WHITE, JSON.stringify(pickedStyle))

  // R1 / AC-02: revisar solicitação em rosa com texto branco, habilitada após o horário.
  const reviewStyle = await styleOf(review)
  check('AC-02 revisar solicitação em action.primary com texto branco', await review.isEnabled() && reviewStyle.background === CTA_PINK && reviewStyle.color === WHITE, JSON.stringify(reviewStyle))
  await shot(page, 'horario-selecionado-390')
  await page.context().close()
}

async function loading(page, pet) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickDay(page)
  gateSlots = { fail: false, delayMs: 2500 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', gateSlots)
  await pickPet(page, pet)
  await page.getByLabel('Buscando horários', { exact: true }).waitFor({ timeout: 10000 })
  check('AC-08 carregando horários com texto visível', await page.getByText('Buscando horários…', { exact: true }).count() === 1)
  check('AC-08 revisar solicitação fica desabilitada durante o carregamento', await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).isDisabled())
  await shot(page, 'carregando-horarios-390')
  gateSlots.delayMs = 0
  await slotButtons(page).first().waitFor({ timeout: 15000 })
  check('AC-08 horários aparecem depois do carregamento', await slotButtons(page).count() > 0)
  await page.context().close()
}

async function errorState(page, pet) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickDay(page)
  gateSlots = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', gateSlots)
  await pickPet(page, pet)
  const retry = page.getByRole('button', { name: 'Atualizar horários', exact: true })
  await retry.waitFor({ timeout: 15000 })
  check('AC-08 erro de horários com texto e ação para atualizar', await activeText(page, 'Algo deu errado').count() === 1 && await retry.isEnabled())
  check('AC-08 erro de horários mantém revisar desabilitada', await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).isDisabled())
  await shot(page, 'erro-horarios-390')
  gateSlots.fail = false
  await retry.click()
  await slotButtons(page).first().waitFor({ timeout: 15000 })
  check('AC-08 atualizar horários recupera a grade', await slotButtons(page).count() > 0)
  await page.context().close()
}

async function execute() {
  const pet = await setup()
  browser = await launchBrowser()
  await happy(await openPage(browser), pet)
  await loading(await openPage(browser), pet)
  await errorState(await openPage(browser), pet)
}

try {
  await execute()
} catch (error) {
  run.fail(error)
} finally {
  try {
    await pool.query('DELETE FROM pets WHERE owner_id=$1', [tutorId])
    await pool.query('DELETE FROM provider_services WHERE provider_id=$1', [providerId])
    await pool.query('DELETE FROM providers WHERE id=$1', [providerId])
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[tutorId, professionalId]])
  } catch (error) {
    run.fail(error)
  }
  await pool.end()
  await run.finish(browser)
}
