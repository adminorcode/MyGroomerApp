import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evidenceFile,
  fixtures,
  gateRoute,
  launchBrowser,
  loginProfessional,
  openPage,
  saveScreenshot,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-33-detalhe-resposta.mjs',
  evidence: evidenceFile(plan, 'mix-33-detalhe-resposta.log'),
})
const { check, fail, finish } = run
const base = 'http://127.0.0.1:3000/api/v1'
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

// Tokens resolvidos (tokens/colors.ts) em rgb para leitura computada.
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary #C64878
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline #C62669
const TEAL = 'rgb(22, 125, 131)' // brand.teal #167D83
const ERROR = 'rgb(179, 38, 30)' // feedback.error #B3261E
const WHITE = 'rgb(255, 255, 255)'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
const bookingDay = addDays(today, 4)

let tutorToken, providerToken, offer, pet, location, savedRoutine, pool, tutorName
let bookingId = null
let browser

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createdCard(page) {
  const when = new Date(`${bookingDay}T12:00:00-03:00`)
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(when)
  const month = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'long' }).format(when)
  return page.getByRole('button', { name: new RegExp(`^Abrir ficha de ${escapeRegExp(pet.name)},`) })
    .filter({ hasText: `${day} de ${month}` })
}

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

async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_e2e') {
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
  const detail = await request(`/bookings/${bookingId}`, 'GET', undefined, providerToken)
  tutorName = detail.data.customer_name?.trim() || 'Tutor não informado'
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
  await createdCard(page).click()
  await page.getByRole('button', { name: 'Ver agendamento', exact: true }).click()
  await page.getByText('Detalhes do agendamento', { exact: true }).waitFor({ timeout: 15000 })
  // O cabeçalho aparece durante o carregamento: espera o bilhete (só existe com os dados).
  await page.getByText('Valor estimado', { exact: true }).last().waitFor({ timeout: 15000 })
}

// Telas empilhadas permanecem no DOM: a tela de detalhe é empilhada por último, então vale o último visível.
async function firstVisible(locator) {
  const count = await locator.count()
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

// Cor do traço do ícone SVG que acompanha o texto (sobe até o bloco que contém o ícone).
async function iconStrokeNear(locator) {
  return locator.evaluate(el => {
    let node = el
    for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      const svg = node.querySelector('svg')
      if (svg) {
        const target = svg.querySelector('path, line, polyline, circle, rect') || svg
        return getComputedStyle(target).stroke
      }
    }
    return ''
  })
}

// Primeiro bloco acima do texto que tem borda de 1 pt (card) e raio informado.
async function cardOf(locator) {
  return locator.evaluate(el => {
    let node = el
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      const cs = getComputedStyle(node)
      if (cs.borderTopWidth === '1px') return { radius: cs.borderRadius, border: cs.borderTopWidth }
    }
    return { radius: '', border: '' }
  })
}

async function execute() {
  try {
    await setup()
    browser = await launchBrowser()
    await scenarios()
  } catch (error) {
    fail(error)
  } finally {
    await cleanup()
    await finish(browser)
  }
}

async function scenarios() {

  // FE-01 carregando
  const loadingPage = await openPage(browser)
  await loginProfessional(loadingPage)
  await gateRoute(loadingPage, `**/api/v1/bookings/${bookingId}`, { delayMs: 2500 })
  await openRequests(loadingPage)
  await createdCard(loadingPage).click()
  await loadingPage.getByRole('button', { name: 'Ver agendamento', exact: true }).click()
  check('FE-01 carregando mostra o indicador do detalhe', await loadingPage.getByLabel('Carregando detalhes do agendamento').isVisible().catch(() => false))
  await shot(loadingPage, 'mix-33-detalhe-carregando')
  await loadingPage.close()

  // FE-02 erro com texto e recuperação
  const errorPage = await openPage(browser)
  await loginProfessional(errorPage)
  const errorGate = { fail: true, delayMs: 0 }
  await gateRoute(errorPage, `**/api/v1/bookings/${bookingId}`, errorGate)
  await openRequests(errorPage)
  await createdCard(errorPage).click()
  await errorPage.getByRole('button', { name: 'Ver agendamento', exact: true }).click()
  check('FE-02 erro mostra a mensagem com texto', await errorPage.getByText('Não foi possível carregar este agendamento.').waitFor({ timeout: 20000 }).then(() => true, () => false))
  await shot(errorPage, 'mix-33-detalhe-erro')
  errorGate.fail = false
  await errorPage.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  check('FE-02 tentar novamente recupera o detalhe', await errorPage.getByRole('button', { name: 'Aceitar agendamento', exact: true }).waitFor({ timeout: 15000 }).then(() => true, () => false))
  await errorPage.close()

  const page = await openPage(browser)
  await loginProfessional(page)
  await openDetailFromRequests(page)

  // Estrutura e textos existentes (preservados)
  check('AC-13 seção Dados do pet', await page.getByText('Dados do pet', { exact: true }).last().isVisible())
  check('AC-13 seção Dados do tutor', await page.getByText('Dados do tutor', { exact: true }).last().isVisible())
  check('AC-13 seção Serviço solicitado', await page.getByText('Serviço solicitado', { exact: true }).isVisible())
  // Há três "Valor estimado" no DOM (dois cartões da lista atrás + o bilhete do topo): vale o visível do topo.
  check('AC-13 valor estimado mostrado no bilhete', Boolean(await firstVisible(page.getByText('Valor estimado', { exact: true }))))
  check('CMP-08 bilhete com recorte tracejado entre os blocos', await page.evaluate(() => [...document.querySelectorAll('div')].some(el => getComputedStyle(el).borderTopStyle === 'dashed' && el.getBoundingClientRect().height > 0)))
  const priceText = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].filter(node => node.children.length === 0
      && /^R\$/.test(node.textContent || '')
      && node.getClientRects().length > 0
      && getComputedStyle(node).fontSize === '40px').pop()
    if (!el) return null
    const cs = getComputedStyle(el)
    return { color: cs.color, size: cs.fontSize, family: cs.fontFamily, letterSpacing: cs.letterSpacing }
  })
  check('AC-05 valor estimado em priceLarge (40 pt, Inter Bold) teal', Boolean(priceText) && priceText.color === TEAL && /Bold/.test(priceText.family) && ratio(priceText.color, WHITE) >= 4.5, JSON.stringify(priceText))
  const card = await cardOf(page.getByText('Dados do pet', { exact: true }).last())
  check('AC-07 card de seção com raio 16 e borda 1 pt', card.radius === '16px' && card.border === '1px', JSON.stringify(card))

  // Avatar do tutor em rosa (R2) e ícones de endereço e horário em teal (R3)
  const tutorAvatar = await firstVisible(page.getByLabel(tutorName, { exact: true }))
  const avatarBackground = tutorAvatar ? await tutorAvatar.evaluate(el => getComputedStyle(el).backgroundColor) : ''
  check('R2 avatar do tutor em rosa (pinkSubtle)', avatarBackground === 'rgb(252, 229, 237)', avatarBackground)
  const addressText = await firstVisible(page.getByText(location.address, { exact: true }))
  check('R3 ícone de endereço em teal', Boolean(addressText) && await iconStrokeNear(addressText) === TEAL, addressText ? await iconStrokeNear(addressText) : 'sem texto')
  // Data e hora do pedido: 'dia de mês, HH:MM' (sem repetição entre parênteses desde a revisão de 07/11/2026).
  const scheduleText = await firstVisible(page.getByText(/\d{1,2} de [^,]+, \d{2}:\d{2}$/))
  check('R3 ícone de horário em teal', Boolean(scheduleText) && await iconStrokeNear(scheduleText) === TEAL, scheduleText ? await iconStrokeNear(scheduleText) : 'sem texto')

  // Ações conforme o status pendente (regra preservada)
  const accept = page.getByRole('button', { name: 'Aceitar agendamento', exact: true })
  const acceptStyle = await styleOf(accept)
  const acceptLabel = await styleOf(accept.getByText('Aceitar agendamento', { exact: true }))
  check('AC-02 Aceitar agendamento é CTA action.primary com texto branco', acceptStyle.background === CTA_PINK && acceptLabel.color === WHITE, JSON.stringify(acceptStyle))
  check('AC-07 botão Aceitar com altura 40 e raio 16', acceptStyle.minHeight === '40px' && acceptStyle.radius === '16px', `${acceptStyle.minHeight} ${acceptStyle.radius}`)
  const reschedule = await styleOf(page.getByRole('button', { name: 'Reagendar', exact: true }))
  check('AC-02 Reagendar é ação secundária em contorno rosa', reschedule.background === 'rgba(0, 0, 0, 0)' && reschedule.border === TEXT_PINK, JSON.stringify(reschedule))
  const talk = await styleOf(page.getByRole('button', { name: 'Falar com tutor', exact: true }))
  check('AC-02 Falar com tutor é ação secundária em contorno rosa (R1)', talk.background === 'rgba(0, 0, 0, 0)' && talk.border === TEXT_PINK, JSON.stringify(talk))
  const refuse = await styleOf(page.getByText('Recusar agendamento', { exact: true }))
  check('R6 Recusar usa semântica de erro com texto', refuse.color === ERROR, refuse.color)
  check('AC-13 status pendente oferece aceitar, reagendar, falar e recusar', await page.getByRole('button', { name: 'Reagendar', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Recusar agendamento' }).isVisible()
    && await page.getByRole('button', { name: 'Iniciar atendimento', exact: true }).count() === 0)
  check('AC-09 status com texto no cabeçalho do pet', await page.getByText('Aguardando confirmação', { exact: true }).isVisible())
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('AC-12 sem rolagem horizontal em 390 pt', overflow <= 1, `overflow ${overflow}`)
  await shot(page, 'mix-33-detalhe-pendente')
  // Bilhete de valor (CMP-08, AC-06): fica abaixo da primeira tela. Rola até o "Valor estimado" visível do bilhete.
  const valorEstimado = await firstVisible(page.getByText('Valor estimado', { exact: true }))
  if (!valorEstimado) throw new Error('Bilhete sem "Valor estimado" visível')
  await valorEstimado.scrollIntoViewIfNeeded()
  await shot(page, 'detalhe-bilhete')

  // Aceitar continua mudando o status (regra preservada)
  const statusPatch = page.waitForResponse(
    response => response.url().includes(`/bookings/${bookingId}/status`) && response.request().method() === 'PATCH',
    { timeout: 20000 },
  )
  await accept.scrollIntoViewIfNeeded()
  await accept.click()
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
  check('AC-13 aceitar confirma o agendamento', confirmed)
}

await execute()
