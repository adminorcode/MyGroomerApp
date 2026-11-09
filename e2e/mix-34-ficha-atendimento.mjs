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
  command: 'node --import ./e2e/preload.mjs e2e/mix-34-ficha-atendimento.mjs',
  evidence: evidenceFile(plan, 'mix-34-ficha-atendimento.log'),
})
const { check, fail, finish } = run
const base = 'http://127.0.0.1:3000/api/v1'
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

// Tokens resolvidos (tokens/colors.ts) em rgb para leitura computada.
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary #C64878
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline #C62669
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle #FCE5ED
const TEAL = 'rgb(22, 125, 131)' // brand.teal #167D83
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary #253D42
const DISABLED = 'rgb(228, 232, 232)' // state.disabledSurface #E4E8E8
const WHITE = 'rgb(255, 255, 255)'
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // feedback.info = surface.tealSubtle #E9F3F2 (badge "Você")

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
const bookingDay = addDays(today, 4)
// Dia separado da solicitação pendente: o atendimento concluído não compete com o card de Solicitações.
const doneDay = addDays(today, 6)

let tutorToken, providerToken, offer, pet, location, savedRoutine, pool
let bookingId = null
let completedBookingId = null
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
  const requestBody = scheduledAt => ({
    pet_id: pet.id,
    provider_service_id: offer.id,
    scheduled_at: scheduledAt,
    customer_location: location.address,
    customer_latitude: Number(location.latitude),
    customer_longitude: Number(location.longitude),
  })
  const created = await request('/bookings', 'POST', requestBody(slots[0]))
  bookingId = created.data.booking.id

  // Atendimento concluído deste groomer para o mesmo pet (alimenta o selo "Você" do histórico).
  // Caminho da API: solicitação do tutor -> aceite (confirmed) -> in_progress -> completed pelo groomer.
  // Em LOCAL_TEST_MODE não há pagamento nem worker de repasse, então a transição não depende de Asaas.
  const doneSlots = (await request(`/bookings/slots?provider_service_id=${offer.id}&pet_id=${pet.id}&date=${doneDay}`)).data.slots
  if (!doneSlots.length) throw new Error('Sem horário livre para o atendimento concluído de teste')
  const done = await request('/bookings', 'POST', requestBody(doneSlots[0]))
  completedBookingId = done.data.booking.id
  for (const status of ['confirmed', 'in_progress', 'completed']) {
    await request(`/bookings/${completedBookingId}/status`, 'PATCH', { booking_status: status }, providerToken)
  }
}

async function cleanup() {
  if (savedRoutine) await request('/providers/weekly-availability', 'PUT', savedRoutine, providerToken).catch(() => {})
  if (pool) {
    // Atendimento concluído não aceita cancelamento pela API (COMPLETED não tem transições): remove o registro de teste.
    if (completedBookingId) await pool.query('DELETE FROM bookings WHERE id = $1', [completedBookingId]).catch(error => fail(error))
    if (bookingId) await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]).catch(error => fail(error))
    await pool.end().catch(() => {})
  }
}

const openRequests = async page => {
  const nav = page.getByRole('tab', { name: 'Solicitações', exact: true }).or(page.getByRole('button', { name: 'Solicitações', exact: true }))
  await nav.first().click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 })
}

async function openFichaFromRequests(page) {
  await openRequests(page)
  await createdCard(page).click()
  await page.getByRole('heading', { name: 'Ficha do atendimento' }).waitFor({ timeout: 15000 })
  // O cabeçalho aparece durante o carregamento: espera as seções (só existem com os dados).
  await page.getByRole('group', { name: 'Dados do pet', exact: true }).waitFor({ timeout: 15000 })
}

// Telas empilhadas permanecem no DOM: a ficha é empilhada por último, então vale o último visível.
async function lastVisible(locator) {
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

// Primeiro fundo não transparente acima do texto (sobe até o card que o contém).
async function backgroundAbove(locator) {
  return locator.evaluate(el => {
    let node = el
    for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor
      if (background !== 'rgba(0, 0, 0, 0)') return background
    }
    return ''
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
  await gateRoute(loadingPage, `**/api/v1/providers/requests/${bookingId}/profile`, { delayMs: 2500 })
  await openRequests(loadingPage)
  await createdCard(loadingPage).click()
  check('FE-01 carregando mostra o indicador da ficha', await loadingPage.getByRole('progressbar', { name: 'Carregando ficha' }).isVisible().catch(() => false))
  await shot(loadingPage, 'mix-34-ficha-carregando')
  await loadingPage.close()

  // FE-02 erro com texto e recuperação
  const errorPage = await openPage(browser)
  await loginProfessional(errorPage)
  const errorGate = { fail: true, delayMs: 0 }
  await gateRoute(errorPage, `**/api/v1/providers/requests/${bookingId}/profile`, errorGate)
  await openRequests(errorPage)
  await createdCard(errorPage).click()
  check('FE-02 erro mostra a mensagem com texto', await errorPage.getByText('Não foi possível carregar a ficha.').waitFor({ timeout: 20000 }).then(() => true, () => false))
  await shot(errorPage, 'mix-34-ficha-erro')
  errorGate.fail = false
  await errorPage.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  check('FE-02 tentar novamente recupera a ficha', await errorPage.getByRole('group', { name: 'Dados do pet' }).waitFor({ timeout: 15000 }).then(() => true, () => false))
  await errorPage.close()

  const page = await openPage(browser)
  await loginProfessional(page)
  await openFichaFromRequests(page)

  // Pré-condição do R6: o atendimento concluído deste groomer existe na API e entra no histórico da ficha.
  const doneStatus = (await request(`/bookings/${completedBookingId}`, 'GET', undefined, providerToken)).data.booking_status
  const apiProfile = (await request(`/providers/requests/${bookingId}/profile`, 'GET', undefined, providerToken)).data
  check('R6 atendimento concluído deste groomer entra no histórico da ficha (API)', doneStatus === 'completed'
    && apiProfile.history.some(item => item.booking_id === completedBookingId && item.own === true), `status ${doneStatus}`)

  // Topo da ficha (cabeçalho do pet), antes de qualquer rolagem.
  await page.getByRole('heading', { name: 'Ficha do atendimento' }).scrollIntoViewIfNeeded()
  await shot(page, 'ficha-topo')

  // Estrutura e campos (preservados)
  check('AC-13 seções da ficha preservadas', await page.getByRole('group', { name: 'Dados do pet' }).isVisible()
    && await page.getByRole('group', { name: 'Dados do tutor' }).isVisible()
    && await page.getByRole('group', { name: 'Anamnese' }).isVisible()
    && await page.getByRole('group', { name: 'Suas notas' }).isVisible()
    && await page.getByRole('group', { name: 'Histórico' }).isVisible())
  const anamnesis = page.getByRole('group', { name: 'Anamnese' })
  const labels = ['Alergias', 'Medicamentos em uso', 'Condições de saúde', 'Vacinação em dia', 'Comportamento', 'Cuidados especiais']
  const labelsFound = await Promise.all(labels.map(label => anamnesis.getByText(label, { exact: true }).count()))
  check('AC-13 campos da anamnese sem alteração', labelsFound.every(count => count === 1), labelsFound.join(' / '))

  // Anamnese: rola até a seção (entre Dados do tutor e Suas notas) e captura.
  await anamnesis.scrollIntoViewIfNeeded()
  await shot(page, 'ficha-anamnese')

  // Histórico: fica abaixo da dobra; rola até o grupo e captura.
  await page.getByRole('group', { name: 'Histórico' }).scrollIntoViewIfNeeded()
  await shot(page, 'ficha-historico')

  // R6 / AC-13: badge "Você" identifica o próprio atendimento concluído (criado e concluído no setup pela API).
  // Salvar nota não cria entrada de histórico.
  const historyGroup = page.getByRole('group', { name: 'Histórico' })
  const ownBadge = await lastVisible(historyGroup.getByText('Você', { exact: true }))
  check('R6 badge Você no histórico do próprio atendimento', Boolean(ownBadge), ownBadge
    ? 'Você'
    : 'ausente no histórico da ficha')
  if (ownBadge) {
    await ownBadge.scrollIntoViewIfNeeded()
    await shot(page, 'ficha-historico-voce')
    const badgeStyle = await styleOf(ownBadge)
    const badgeBackground = await backgroundAbove(ownBadge)
    const badgeRatio = ratio(badgeStyle.color, badgeBackground)
    check('R6 badge Você: texto text.primary sobre feedback.info (tealSubtle), contraste >= 4.5:1',
      badgeStyle.color === TEXT_PRIMARY && badgeBackground === TEAL_SUBTLE && badgeRatio >= 4.5,
      `${badgeStyle.color} sobre ${badgeBackground} (${badgeRatio.toFixed(2)}:1)`)
  }

  // Cabeçalho do pet em bloco rosa suave com texto primário (R2, R5)
  const hero = await lastVisible(page.getByText(/^Tutor:/))
  const heroBackground = hero ? await backgroundAbove(hero) : ''
  check('CMP-04 cabeçalho do pet em rosa suave (pinkSubtle)', heroBackground === PINK_SUBTLE, heroBackground)
  const heroText = hero ? await styleOf(hero) : null
  check('R5 texto do cabeçalho rosa usa text.primary', heroText?.color === TEXT_PRIMARY, heroText?.color)
  const badge = await lastVisible(page.getByText('Pendente', { exact: true }))
  check('R6 status com texto no cabeçalho', Boolean(badge), 'Pendente')

  // Seções de tutor e endereço com ícone teal; telefone segue o tutor em rosa (R2, R3)
  const tutorGroup = page.getByRole('group', { name: 'Dados do tutor' })
  const sectionIcon = await tutorGroup.evaluate(el => {
    const svg = el.querySelector('svg')
    if (!svg) return ''
    const target = svg.querySelector('path, line, polyline, circle, rect') || svg
    return getComputedStyle(target).stroke
  })
  check('R3 ícone da seção do tutor em teal', sectionIcon === TEAL, sectionIcon)
  const addressIcon = await iconStrokeNear(tutorGroup.getByText('Endereço', { exact: true }))
  check('R3 ícone de endereço em teal', addressIcon === TEAL, addressIcon)
  const phoneIcon = await iconStrokeNear(tutorGroup.getByText('Telefone', { exact: true }))
  check('R2 ícone do telefone do tutor em rosa', phoneIcon === CTA_PINK, phoneIcon)

  // Anamnese em card branco (sem cor de marca no fundo)
  const anamnesisBackground = await anamnesis.evaluate(el => getComputedStyle(el.firstElementChild).backgroundColor)
  check('AC-03 anamnese em card branco', anamnesisBackground === WHITE, anamnesisBackground)

  // Ação e notas: CTA rosa, desabilitado com texto (R1, AC-08)
  const note = page.getByRole('textbox', { name: 'Nota' })
  const save = page.getByRole('button', { name: 'Salvar nota', exact: true })
  await note.fill('')
  check('AC-08 nota vazia mostra o erro com texto e desabilita Salvar nota', await page.getByText('Informe a nota.', { exact: true }).isVisible() && await save.isDisabled())
  const disabledStyle = await styleOf(save)
  check('AC-08 Salvar nota desabilitado usa superfície desabilitada', disabledStyle.background === DISABLED, disabledStyle.background)
  await note.fill('Teste visual')
  const enabledStyle = await styleOf(save)
  const enabledLabel = await styleOf(save.getByText('Salvar nota', { exact: true }))
  check('AC-02 Salvar nota habilitado é CTA action.primary com texto branco', enabledStyle.background === CTA_PINK && enabledLabel.color === WHITE, JSON.stringify(enabledStyle))
  check('AC-07 botão Salvar nota com altura 40 e raio 16', enabledStyle.minHeight === '40px' && enabledStyle.radius === '16px', `${enabledStyle.minHeight} ${enabledStyle.radius}`)
  await note.fill('')

  const viewBooking = await styleOf(page.getByRole('button', { name: 'Ver agendamento', exact: true }))
  check('AC-02 Ver agendamento é ação secundária em contorno rosa', viewBooking.background === 'rgba(0, 0, 0, 0)' && viewBooking.border === TEXT_PINK, JSON.stringify(viewBooking))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('AC-12 sem rolagem horizontal em 390 pt', overflow <= 1, `overflow ${overflow}`)
  await shot(page, 'mix-34-ficha-atendimento')
  await page.close()
}

await execute()
