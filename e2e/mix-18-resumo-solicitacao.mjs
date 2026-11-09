import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

// Tela 18 (BookingRequest) do plano 027: bilhete em dois blocos com recorte (CMP-08, R7, AC-06),
// rótulo Pagamento em caixa-alta teal, valor estimado em priceLarge teal (CMP-01, AC-05), aviso em tealSubtle
// com texto primário e envio em rosa (R1). Estados de carregamento, erro e desabilitado com texto.
const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-18-resumo-solicitacao.mjs',
  evidence: evidenceFile(plan, 'mix-18-resumo-solicitacao.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3, R5)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const WHITE = 'rgb(255, 255, 255)' // surface.default (bloco inferior do bilhete)
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas (fundo do rótulo Pagamento, R5)
const DISABLED = 'rgb(228, 232, 232)' // state.disabledSurface

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const base = 'http://127.0.0.1:3000/api/v1'
const suffix = randomUUID()
const tutorId = randomUUID(), providerId = randomUUID(), professionalId = randomUUID(), offerId = randomUUID()
const tutorEmail = `mix18-tutor-${suffix}@mygroomer.test`
const providerEmail = `mix18-pro-${suffix}@mygroomer.test`
const professionalName = 'Profissional resumo mistura 18'
const serviceName = 'Banho'
const address = 'Avenida Paulista, São Paulo'
const petName = 'Luna mistura 18'
const detailsTitle = 'Detalhes do serviço'
const slotGone = 'Este horário não está mais disponível. Escolha outro horário.'
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10) }
const openDate = addDays(today, 2)
const dayLabel = date => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
const clock = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const endOf = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString()

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

// Telas empilhadas permanecem no DOM: só conta o que não está escondido por aria-hidden.
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"]):not([aria-hidden="true"] *)'))
// Cor do texto: o rótulo de MGButton é um filho (dir=auto); o contêiner só tem o fundo.
const styleOf = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  const label = getComputedStyle(el.querySelector('[dir]') ?? el)
  return { background: cs.backgroundColor, color: label.color }
})
// Sobe até o primeiro ancestral com fundo próprio (cartões de MGCard).
const surfaceOf = locator => locator.evaluate(el => {
  let node = el
  while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement
  return node ? getComputedStyle(node).backgroundColor : ''
})
let browser
let gateSlots = { fail: false, delayMs: 0 }
let tutorAccount, tutorToken, providerToken, pet

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
    [tutorId, tutorEmail, 'Tutor mistura 18', 'tutor@email.com'],
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
    SELECT $1,$2,service_id,80,true,professional_type_id,'Banho para teste do resumo 18',80,100,120,60,90,120 FROM provider_services WHERE id='10000000-0000-4000-8000-000000000010'`, [offerId, providerId])
  providerToken = (await request('/auth/login', 'POST', { email: providerEmail, password: 'admin' }, null)).token
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' }]))
  await request('/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 30, manual_fit: false }, providerToken)
  tutorAccount = { email: tutorEmail, password: 'admin' }
  tutorToken = (await request('/auth/login', 'POST', tutorAccount, null)).token
  pet = (await request('/pets', 'POST', { name: petName, species: 'dog', breed: 'SRD', size: 'small', age_years: 3 }, tutorToken)).data
}

// Primeiro horário livre da grade para o pet e a data, lido da mesma API que a tela usa.
async function firstSlot() {
  const data = (await request(`/bookings/slots?provider_service_id=${offerId}&pet_id=${pet.id}&date=${openDate}`, 'GET', undefined, tutorToken)).data
  if (!data.slots.length) throw new Error('Sem horário livre para o resumo')
  return { iso: data.slots[0], duration: data.duration_minutes, price: data.price }
}

async function openTimeScreen(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, address)
  await page.getByRole('button', { name: new RegExp(professionalName) }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await activeText(page, 'Escolha um horário').waitFor()
}

async function pickSlot(page, iso) {
  await page.getByRole('radio', { name: dayLabel(openDate), exact: true }).click()
  const petOption = page.getByRole('radio', { name: new RegExp(`^${petName}`) })
  if (await petOption.count()) await petOption.click()
  await page.getByRole('button', { name: clock(iso), exact: true }).click()
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).waitFor()
}

async function review(page) {
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).click()
}

async function waitForSummary(page) {
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[aria-label]'))
    .some(element => element.getAttribute('aria-label')?.startsWith('Data: ')))
}

async function happy(page, slot) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickSlot(page, slot.iso)
  await review(page)
  await activeText(page, 'Resumo do agendamento').waitFor()
  await waitForSummary(page)

  // AC-06 / R7 / CMP-08: bilhete com dois blocos ligados pelo recorte tracejado.
  const ticket = await page.evaluate(() => {
    const dashed = Array.from(document.querySelectorAll('*'))
      .find(el => getComputedStyle(el).borderTopStyle === 'dashed' && el.getBoundingClientRect().width > 0)
    if (!dashed) return null
    const root = dashed.parentElement.parentElement
    const [top, , bottom] = root.children
    const rootStyle = getComputedStyle(root)
    return {
      topHasDetails: top?.innerText.includes('Detalhes do serviço') ?? false,
      bottomSurface: bottom ? getComputedStyle(bottom).backgroundColor : '',
      valueInsideBottom: bottom ? Array.from(bottom.querySelectorAll('*')).some(el => el.textContent === 'Valor estimado') : false,
      blocks: root.children.length,
      radius: rootStyle.borderRadius,
      border: rootStyle.borderTopWidth,
    }
  })
  check('AC-06 bilhete tem dois blocos com recorte entre eles', ticket?.topHasDetails === true && ticket.blocks === 3, JSON.stringify(ticket))
  // R5 / CMP-08: bloco inferior em surface.default (branco), com o total "Valor estimado" dentro dele.
  check('AC-06 bloco de baixo do bilhete em surface.default com Valor estimado', ticket?.bottomSurface === WHITE && ticket.valueInsideBottom === true, JSON.stringify(ticket))
  check('AC-07 bilhete (destaque) com raio 20 e borda 1 pt', ticket?.radius === '20px' && ticket?.border === '1px', JSON.stringify(ticket))

  // CMP-01: rótulo Pagamento em caixa-alta teal 12 pt, acima do bilhete, sobre o canvas (R5).
  const payment = activeText(page, 'Pagamento')
  const paymentStyle = await payment.evaluate(el => {
    const cs = getComputedStyle(el)
    return { transform: cs.textTransform, color: cs.color, size: cs.fontSize, surface: (() => { let node = el; while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement; return node ? getComputedStyle(node).backgroundColor : '' })() }
  })
  check('CMP-01 rótulo Pagamento em caixa-alta teal 12 pt', paymentStyle.transform === 'uppercase' && paymentStyle.color === TEAL && paymentStyle.size === '12px', JSON.stringify(paymentStyle))
  check('R5 rótulo teal só sobre branco ou canvas', [WHITE, CANVAS].includes(paymentStyle.surface), paymentStyle.surface)

  // AC-05 / CMP-01 / AC-04: valor estimado com rótulo visível e priceLarge teal, dentro do bilhete sobre branco.
  check('AC-05 rótulo Valor estimado visível', await activeText(page, 'Valor estimado').count() === 1)
  const value = activeText(page, 'Valor estimado').locator('xpath=following-sibling::*[1]')
  const valueStyle = await value.evaluate(el => {
    const cs = getComputedStyle(el)
    return { size: cs.fontSize, family: cs.fontFamily, color: cs.color, text: el.textContent }
  })
  check('AC-05 valor estimado em priceLarge 40 pt Inter Bold teal', valueStyle.size === '40px' && /Inter-Bold/.test(valueStyle.family) && valueStyle.color === TEAL, JSON.stringify(valueStyle))
  check('AC-04 valor teal sobre branco com 4,5:1 ou mais', ratio(valueStyle.color, WHITE) >= 4.5, `${ratio(valueStyle.color, WHITE).toFixed(2)}:1`)

  // Aviso em tealSubtle com texto text.primary.
  const noteText = page.getByText(/^O agendamento dependerá/)
  const noteColor = await noteText.evaluate(el => getComputedStyle(el).color)
  check('AC-09 aviso em tealSubtle com texto text.primary', await surfaceOf(noteText) === TEAL_SUBTLE && noteColor === TEXT_PRIMARY, `${await surfaceOf(noteText)} ${noteColor}`)

  // R1 / AC-02: envio em rosa com texto branco.
  const send = page.getByRole('button', { name: 'Solicitar agendamento', exact: true })
  const sendStyle = await styleOf(send)
  check('AC-02 solicitar agendamento em action.primary com texto branco', await send.isEnabled() && sendStyle.background === CTA_PINK && sendStyle.color === WHITE, JSON.stringify(sendStyle))
  await shot(page, 'resumo-bilhete-390')
  await page.context().close()
}

async function loading(page, slot) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickSlot(page, slot.iso)
  gateSlots = { fail: false, delayMs: 3000 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', gateSlots)
  await review(page)
  await page.getByLabel('Carregando resumo', { exact: true }).waitFor({ timeout: 10000 })
  check('AC-08 carregando resumo com texto visível', await activeText(page, 'Carregando resumo').count() === 1)
  check('AC-08 envio fica desabilitado durante o carregamento', await page.getByRole('button', { name: 'Solicitar agendamento', exact: true }).isDisabled())
  await shot(page, 'carregando-resumo-390')
  gateSlots.delayMs = 0
  await waitForSummary(page)
  check('AC-08 resumo aparece depois do carregamento', await page.getByRole('button', { name: 'Solicitar agendamento', exact: true }).isEnabled())
  await page.context().close()
}

async function errorState(page, slot) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickSlot(page, slot.iso)
  gateSlots = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', gateSlots)
  await review(page)
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  await retry.waitFor({ timeout: 15000 })
  check('AC-08 erro do resumo com texto e ação para tentar de novo', await activeText(page, 'Algo deu errado').count() === 1 && await retry.isEnabled())
  check('AC-08 erro do resumo esconde o envio', await page.getByRole('button', { name: 'Solicitar agendamento', exact: true }).count() === 0)
  await shot(page, 'erro-resumo-390')
  gateSlots.fail = false
  await retry.click()
  await waitForSummary(page)
  check('AC-08 tentar novamente recarrega o resumo', await page.getByRole('button', { name: 'Solicitar agendamento', exact: true }).isEnabled())
  await page.context().close()
}

async function unavailable(page, slot) {
  await loginTutor(page, tutorAccount)
  await openTimeScreen(page)
  await pickSlot(page, slot.iso)
  const block = (await request('/providers/agenda-blocks', 'POST', { starts_at: slot.iso, ends_at: endOf(slot.iso, slot.duration) }, providerToken)).data
  await review(page)
  await activeText(page, slotGone).waitFor({ timeout: 15000 })
  const send = page.getByRole('button', { name: 'Solicitar agendamento', exact: true })
  check('AC-08 horário indisponível com texto e envio desabilitado', await send.isDisabled() && (await styleOf(send)).background === DISABLED)
  check('AC-08 indisponível mostra a mensagem uma única vez', await activeText(page, slotGone).count() === 1 && await activeText(page, 'Volte e escolha outro horário disponível.').count() === 0)
  check('AC-05 horário indisponível esconde o valor estimado', await activeText(page, 'Valor estimado').count() === 0)
  await shot(page, 'indisponivel-resumo-390')
  await request(`/providers/agenda-blocks/${block.id}`, 'DELETE', undefined, providerToken)
  await page.context().close()
}

async function execute() {
  await setup()
  browser = await launchBrowser()
  const slot = await firstSlot()
  await happy(await openPage(browser), slot)
  await loading(await openPage(browser), slot)
  await errorState(await openPage(browser), slot)
  await unavailable(await openPage(browser), slot)
}

try {
  await execute()
} catch (error) {
  run.fail(error)
} finally {
  try {
    await pool.query('DELETE FROM bookings WHERE provider_service_id=$1', [offerId])
    await pool.query('DELETE FROM provider_agenda_blocks WHERE provider_id=$1', [providerId])
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
