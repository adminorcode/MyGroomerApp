import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { evidenceFile, launchBrowser, openPage, loginProfessional, gateRoute, startRun, fixtures } from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const run = startRun({
  command: 'node e2e/incoming-requests.mjs',
  evidence: evidenceFile('016-incoming-requests', 'incoming-requests.log'),
})
const { check } = run
const base = 'http://127.0.0.1:3000/api/v1'
const shotDir = path.dirname(evidenceFile('016-incoming-requests', 'ui-review/x.png'))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
const bookingDay = addDays(today, 3)
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const partsOf = iso => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const read = type => parts.find(part => part.type === type).value
  return { year: read('year'), month: Number(read('month')), day: Number(read('day')), time: `${read('hour')}:${read('minute')}`, ymd: `${read('year')}-${read('month')}-${read('day')}` }
}
// Escrito sem Intl em pt-BR, para não repetir o formatador do app.
const dateLabel = iso => {
  const p = partsOf(iso)
  const weekday = WEEKDAYS[new Date(`${p.ymd}T12:00:00-03:00`).getUTCDay()]
  return `${weekday}, ${p.day} de ${MONTHS[p.month - 1]} de ${p.year} às ${p.time}`
}
const money = value => `R$ ${Number(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
const bannerTitle = count => (count === 0 ? 'Nenhuma nova solicitação hoje' : count === 1 ? '1 nova solicitação hoje' : `${count} novas solicitações hoje`)
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let tutorToken, providerToken, offer, pet, location, savedRoutine, pool
const bookingIds = []
const slots = {}
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

const slotsOn = async date => (await request(`/bookings/slots?provider_service_id=${offer.id}&pet_id=${pet.id}&date=${date}`)).data.slots
const requestsOf = async group => (await request(`/providers/requests?group=${group}&limit=100`, 'GET', undefined, providerToken)).data

async function capture(page, name, fullPage = false) {
  mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage })
}

async function book(name) {
  const [slot] = await slotsOn(bookingDay)
  if (!slot) throw new Error('Sem horário livre para criar a solicitação')
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
  slots[name] = { id, slot, label: dateLabel(slot) }
  return id
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
}

async function cleanup() {
  if (savedRoutine) await request('/providers/weekly-availability', 'PUT', savedRoutine, providerToken).catch(() => {})
  if (pool) {
    if (bookingIds.length) await pool.query('DELETE FROM bookings WHERE id = ANY($1::uuid[])', [bookingIds]).catch(error => run.fail(error))
    await pool.end().catch(() => {})
  }
}

const article = (page, name) => page.getByRole('article', { name: new RegExp(escape(slots[name].label)) })
const segment = (page, label) => page.getByRole('tab', { name: label, exact: true })
const openRequests = async page => {
  const nav = page.getByRole('tab', { name: 'Solicitações', exact: true }).or(page.getByRole('button', { name: 'Solicitações', exact: true }))
  await nav.first().click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 })
}
const bannerIs = (page, count) => page.getByLabel(bannerTitle(count), { exact: true }).waitFor({ timeout: 10000 }).then(() => true, () => false)
// O rótulo cabe quando fica numa linha, sem reticências, dentro da própria aba e sem ser cortado por um ancestral.
const navLabelsFit = page => Promise.all(['Agenda', 'Solicitações', 'Serviços', 'Rendimentos', 'Mensagens'].map(async label => {
  const tab = page.getByRole('tab', { name: label, exact: true })
  const box = await tab.boundingBox()
  const text = await tab.getByText(label, { exact: true }).evaluate((element, tabElementLabel) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const rect = range.getBoundingClientRect()
    const fontSize = parseFloat(getComputedStyle(element).fontSize)
    let clipped = false
    for (let node = element; node && node.getAttribute?.('aria-label') !== tabElementLabel; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.overflow !== 'visible' || style.overflowX !== 'visible') {
        const outer = node.getBoundingClientRect()
        if (rect.left < outer.left - 0.5 || rect.right > outer.right + 0.5) clipped = true
      }
    }
    return { width: rect.width, singleLine: rect.height <= fontSize * 1.6, ellipsis: getComputedStyle(element).textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth, clipped }
  }, label)
  return !text.ellipsis && !text.clipped && text.singleLine && text.width <= box.width
})).then(list => list.every(Boolean))
const settle = async (page, expected) => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (await page.getByRole('article').count() === expected) return true
    await page.waitForTimeout(150)
  }
  return false
}
const contrast = (page, locator) => locator.evaluate(element => {
  const parse = value => value.match(/[\d.]+/g).map(Number)
  const lum = ([r, g, b]) => {
    const channel = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  let node = element
  let background = [255, 255, 255]
  while (node) {
    const value = getComputedStyle(node).backgroundColor
    const rgba = parse(value)
    if (rgba.length === 3 || rgba[3] > 0.9) { background = rgba.slice(0, 3); break }
    node = node.parentElement
  }
  const foreground = parse(getComputedStyle(element).color).slice(0, 3)
  const [a, b] = [lum(foreground), lum(background)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
})

async function execute() {
  await setup()
  const before = (await requestsOf('pending')).pending_today_count
  await book('p1')
  await book('p2')
  await book('p3')
  const acceptedId = await book('accepted')
  const rejectedId = await book('rejected')
  const cancelledId = await book('cancelled')
  await request(`/bookings/${acceptedId}/status`, 'PATCH', { booking_status: 'confirmed' }, providerToken)
  await request(`/bookings/${rejectedId}/status`, 'PATCH', { booking_status: 'cancelled' }, providerToken)
  await request(`/bookings/${cancelledId}/status`, 'PATCH', { booking_status: 'cancelled' }, tutorToken)

  const api = { all: await requestsOf('all'), pending: await requestsOf('pending'), accepted: await requestsOf('accepted'), rejected: await requestsOf('rejected') }
  const startCount = api.pending.pending_today_count
  check('AC-05 contagem da API soma as pendentes criadas hoje', startCount === before + 3, `antes ${before}, depois ${startCount}`)

  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginProfessional(page)
  await openRequests(page)

  // AC-01 — cada aba só mostra os pedidos do grupo.
  await article(page, 'p1').waitFor({ timeout: 20000 })
  const initialTab = await segment(page, 'Pendentes').getAttribute('aria-selected')
  check('AC-01 Pendentes abre selecionada', initialTab === 'true', `aria-selected=${initialTab}`)
  check('AC-01 Pendentes mostra as pendentes',
    await settle(page, api.pending.requests.length)
    && await article(page, 'p1').isVisible() && await article(page, 'p2').isVisible() && await article(page, 'p3').isVisible()
    && await article(page, 'accepted').count() === 0 && await article(page, 'rejected').count() === 0 && await article(page, 'cancelled').count() === 0)
  await capture(page, '01-mobile-pendentes')
  await segment(page, 'Aceitas').click()
  await article(page, 'accepted').waitFor({ timeout: 15000 })
  check('AC-01 Aceitas só mostra aceitas',
    await settle(page, api.accepted.requests.length)
    && await article(page, 'p1').count() === 0 && await article(page, 'rejected').count() === 0 && await article(page, 'cancelled').count() === 0)
  await capture(page, '03-mobile-aceitas')
  await segment(page, 'Recusadas').click()
  await article(page, 'rejected').waitFor({ timeout: 15000 })
  check('AC-01 Recusadas só mostra recusadas',
    await settle(page, api.rejected.requests.length)
    && await article(page, 'accepted').count() === 0 && await article(page, 'p1').count() === 0 && await article(page, 'cancelled').count() === 0)
  await capture(page, '04-mobile-recusadas')
  await segment(page, 'Todas').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })
  check('AC-01 Todas reúne os três grupos e deixa o cancelamento do tutor de fora',
    await settle(page, api.all.requests.length)
    && api.all.requests.length === api.pending.requests.length + api.accepted.requests.length + api.rejected.requests.length
    && await article(page, 'p1').isVisible() && await article(page, 'accepted').isVisible() && await article(page, 'rejected').isVisible()
    && await article(page, 'cancelled').count() === 0)
  await capture(page, '02-mobile-todas')

  // AC-02 — conteúdo do card.
  await segment(page, 'Pendentes').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })
  const item = api.pending.requests.find(entry => entry.id === slots.p1.id)
  const card = article(page, 'p1')
  check('AC-02 card mostra pet, tutor, serviço, data, endereço e valor estimado',
    await card.getByText(item.pet_name, { exact: true }).isVisible()
    && await card.getByText(`Tutor: ${item.customer_name}`, { exact: true }).isVisible()
    && await card.getByText(item.service_name, { exact: true }).isVisible()
    && await card.getByText(slots.p1.label, { exact: true }).isVisible()
    && await card.getByText(item.customer_location, { exact: true }).isVisible()
    && await card.getByText('Valor estimado', { exact: true }).isVisible()
    && await card.getByText(money(item.price), { exact: true }).isVisible(),
  `${item.pet_name} / ${item.customer_name} / ${item.service_name} / ${slots.p1.label} / ${item.customer_location} / ${money(item.price)}`)
  check('AC-02 card pendente oferece Recusar e Aceitar', await card.getByRole('button', { name: /^Recusar solicitação de / }).isVisible() && await card.getByRole('button', { name: /^Aceitar solicitação de / }).isVisible())
  check('AC-02 botões nomeiam o pedido que respondem',
    await card.getByRole('button', { name: `Aceitar solicitação de ${item.pet_name}, ${slots.p1.label}`, exact: true }).isVisible()
    && await card.getByRole('button', { name: `Recusar solicitação de ${item.pet_name}, ${slots.p1.label}`, exact: true }).isVisible())
  await segment(page, 'Aceitas').click()
  await article(page, 'accepted').waitFor({ timeout: 15000 })
  check('AC-02 card aceito mostra o selo e não oferece resposta',
    await article(page, 'accepted').getByText('Aceita', { exact: true }).isVisible()
    && await article(page, 'accepted').getByRole('button', { name: /^Abrir ficha de / }).count() === 1
    && await article(page, 'accepted').getByRole('button', { name: /^Aceitar / }).count() === 0
    && await article(page, 'accepted').getByRole('button', { name: /^Recusar / }).count() === 0)
  await segment(page, 'Pendentes').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })

  // AC-05 — aviso do dia.
  check('AC-05 aviso mostra a contagem real', await bannerIs(page, startCount), bannerTitle(startCount))

  // AC-03 — aceitar.
  await article(page, 'p1').getByRole('button', { name: /^Aceitar solicitação de / }).click()
  await article(page, 'p1').waitFor({ state: 'detached', timeout: 15000 })
  check('AC-03 aceitar tira o pedido de Pendentes', await article(page, 'p1').count() === 0 && await article(page, 'p2').isVisible())
  await segment(page, 'Aceitas').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })
  check('AC-03 pedido aceito aparece em Aceitas', await article(page, 'p1').getByText('Aceita', { exact: true }).isVisible())
  const afterAccept = await slotsOn(bookingDay)
  check('AC-03 horário aceito não é oferecido a outro tutor', !afterAccept.includes(slots.p1.slot))
  check('AC-05 aviso cai depois de aceitar', await bannerIs(page, startCount - 1), bannerTitle(startCount - 1))

  // AC-04 — recusar.
  await segment(page, 'Pendentes').click()
  await article(page, 'p2').waitFor({ timeout: 15000 })
  check('AC-04 horário recusado ainda está ocupado antes da recusa', !(await slotsOn(bookingDay)).includes(slots.p2.slot))
  await article(page, 'p2').getByRole('button', { name: /^Recusar solicitação de / }).click()
  await article(page, 'p2').waitFor({ state: 'detached', timeout: 15000 })
  check('AC-04 recusar tira o pedido de Pendentes', await article(page, 'p2').count() === 0 && await article(page, 'p3').isVisible())
  await segment(page, 'Recusadas').click()
  await article(page, 'p2').waitFor({ timeout: 15000 })
  check('AC-04 pedido recusado aparece em Recusadas', await article(page, 'p2').getByText('Recusada', { exact: true }).isVisible())
  const afterReject = await slotsOn(bookingDay)
  check('AC-04 recusar libera o horário', afterReject.includes(slots.p2.slot))
  check('AC-05 aviso cai depois de recusar', await bannerIs(page, startCount - 2), bannerTitle(startCount - 2))
  const payments = await pool.query('SELECT count(*)::int AS total FROM payments WHERE booking_id = ANY($1::uuid[])', [bookingIds])
  check('AC-03 e AC-04 responder não cria cobrança', payments.rows[0].total === 0, `${payments.rows[0].total} linhas`)

  // FE-04 / FE-05 — falha e envio pendente ao responder (a P3 continua pendente).
  await segment(page, 'Pendentes').click()
  await article(page, 'p3').waitFor({ timeout: 15000 })
  const answerGate = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/bookings/*/status', answerGate)
  await article(page, 'p3').getByRole('button', { name: /^Aceitar solicitação de / }).click()
  await page.getByRole('alert').filter({ hasText: 'Não foi possível conectar à API' }).waitFor({ timeout: 15000 })
  check('FE-05 falha ao responder mostra o erro e mantém o pedido pendente',
    await article(page, 'p3').isVisible()
    && await article(page, 'p3').getByRole('button', { name: /^Aceitar solicitação de / }).isEnabled()
    && await article(page, 'p3').getByRole('button', { name: /^Recusar solicitação de / }).isEnabled())
  await capture(page, '08-mobile-falha-resposta')
  answerGate.fail = false
  answerGate.delayMs = 4000
  await article(page, 'p3').getByRole('button', { name: /^Aceitar solicitação de / }).click()
  await article(page, 'p3').getByRole('button', { name: /^Recusar solicitação de / }).and(page.locator('[aria-disabled="true"]')).waitFor({ timeout: 5000 })
  const sending = {
    recusar: await article(page, 'p3').getByRole('button', { name: /^Recusar solicitação de / }).isDisabled(),
    aceitar: await article(page, 'p3').getByRole('button', { name: /^Aceitar solicitação de / }).isDisabled(),
    ocupado: await article(page, 'p3').getByRole('progressbar').count(),
    alertas: await page.getByRole('alert').count(),
  }
  check('FE-04 durante o envio os dois botões ficam bloqueados',
    sending.recusar && sending.aceitar && sending.ocupado > 0 && sending.alertas === 0, JSON.stringify(sending))
  await capture(page, '09-mobile-enviando')
  await article(page, 'p3').waitFor({ state: 'detached', timeout: 20000 })
  check('FE-04 depois do envio o pedido sai de Pendentes', await article(page, 'p3').count() === 0)

  // FE-06 — papéis, estado e contraste.
  const group = page.getByRole('tablist').filter({ has: segment(page, 'Recusadas') })
  const picked = { listas: await group.count(), abas: await group.getByRole('tab').count(), selecionadas: await group.locator('[aria-selected="true"]').count() }
  check('FE-06 quatro abas num tablist, uma selecionada', picked.listas === 1 && picked.abas === 4 && picked.selecionadas === 1, JSON.stringify(picked))
  const tabBoxes = await Promise.all(['Todas', 'Pendentes', 'Aceitas', 'Recusadas'].map(label => segment(page, label).boundingBox()))
  check('FE-06 abas com alvo de toque de 44 pt', tabBoxes.every(box => box && box.height >= 44 && box.width >= 44), JSON.stringify(tabBoxes.map(box => box && [Math.round(box.width), Math.round(box.height)])))
  await segment(page, 'Todas').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })
  await bannerIs(page, startCount - 3)
  const ratios = {
    abaSelecionada: await contrast(page, segment(page, 'Todas').getByText('Todas', { exact: true })),
    selo: await contrast(page, article(page, 'p1').getByText('Aceita', { exact: true })),
    titulo: await contrast(page, page.getByText(bannerTitle(startCount - 3), { exact: true })),
  }
  check('FE-06 contraste do texto é pelo menos 4,5:1', Object.values(ratios).every(value => value >= 4.5), JSON.stringify(ratios))

  // FE-08 — voltar à aba atualiza lista e aviso; falha do refetch com dados em cache avisa.
  const navTab = label => page.getByRole('tab', { name: label, exact: true })
  const leaveAndReturn = async () => {
    await navTab('Agenda').click()
    await page.getByText('Agenda do groomer', { exact: true }).waitFor({ timeout: 15000 })
    await navTab('Solicitações').click()
    await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 })
  }
  await book('late')
  const lateCount = (await requestsOf('pending')).pending_today_count
  await segment(page, 'Pendentes').click()
  await article(page, 'late').waitFor({ timeout: 15000 })
  await leaveAndReturn()
  await article(page, 'late').waitFor({ timeout: 15000 })
  check('FE-08 voltar à aba mostra o pedido novo e o aviso atualizado', await article(page, 'late').isVisible() && await bannerIs(page, lateCount), bannerTitle(lateCount))
  const listGate = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/providers/requests?**', listGate)
  await leaveAndReturn()
  const stale = page.getByRole('alert').filter({ hasText: 'Não foi possível atualizar a lista' })
  await stale.waitFor({ timeout: 20000 })
  check('FE-08 falha ao atualizar avisa e mantém a lista em cache', await stale.isVisible() && await article(page, 'late').isVisible())
  await capture(page, '13-mobile-lista-desatualizada')
  listGate.fail = false
  await leaveAndReturn()
  await stale.waitFor({ state: 'hidden', timeout: 20000 })
  check('FE-08 atualização que volta a funcionar remove o aviso', await stale.count() === 0 && await article(page, 'late').isVisible())

  // FE-07 — celular estreito, texto 200% e desktop.
  check('FE-07 rótulos das cinco abas do rodapé cabem em 390 px', await navLabelsFit(page))
  await segment(page, 'Pendentes').click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor()
  await page.setViewportSize({ width: 1440, height: 900 })
  const wide = await page.getByRole('tablist').filter({ has: segment(page, 'Recusadas') }).boundingBox()
  check('FE-07 desktop mantém as abas dentro da coluna', !!wide && wide.x >= 0 && wide.x + wide.width <= 1440 && wide.width <= 720)
  await capture(page, '10-desktop-pendentes')
  await page.setViewportSize({ width: 320, height: 640 })
  await segment(page, 'Todas').click()
  await article(page, 'p1').waitFor({ timeout: 15000 })
  await capture(page, '11-narrow320')
  check('FE-07 rótulos das cinco abas do rodapé cabem em 320 px', await navLabelsFit(page))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const narrowTabs = await Promise.all(['Todas', 'Pendentes', 'Aceitas', 'Recusadas'].map(async label => ({
    outer: await segment(page, label).boundingBox(),
    inner: await segment(page, label).getByText(label, { exact: true }).boundingBox(),
  })))
  check('FE-07 em 320 px não há rolagem horizontal e as abas cabem',
    overflow <= 0 && narrowTabs.every(({ outer, inner }) => inner.x >= outer.x - 1 && inner.x + inner.width <= outer.x + outer.width + 1),
  `overflow ${overflow}`)
  // Simula o texto a 200%. Os rótulos do rodapé não crescem (maxFontSizeMultiplier=1), então ficam de fora.
  await page.evaluate(() => {
    const nav = [...document.querySelectorAll('[role="tablist"]')].find(list => list.querySelector('[aria-label="Agenda"]'))
    for (const el of document.querySelectorAll('div,span')) if (!el.children.length && !nav?.contains(el)) {
      el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 2}px`
      el.style.lineHeight = 'normal'
    }
  })
  await capture(page, '12-text200')
  const bigOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('FE-07 com texto a 200% a página não ganha rolagem horizontal', bigOverflow <= 0, `overflow ${bigOverflow}`)
  await page.context().close()

  // FE-01 / FE-02 — carregando e erro com nova tentativa.
  const states = await openPage(browser)
  const gate = { fail: false, delayMs: 8000 }
  await gateRoute(states, '**/api/v1/providers/requests?**', gate)
  await loginProfessional(states)
  await openRequests(states)
  await states.getByRole('progressbar', { name: 'Carregando solicitações' }).waitFor({ timeout: 15000 })
  check('FE-01 carregando mostra o indicador com nome acessível', await states.getByRole('progressbar', { name: 'Carregando solicitações' }).isVisible() && await states.getByRole('article').count() === 0)
  await capture(states, '05-mobile-carregando')
  gate.delayMs = 0
  await states.getByRole('article').first().waitFor({ timeout: 20000 })
  gate.fail = true
  await segment(states, 'Todas').click()
  await states.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor({ timeout: 15000 })
  check('FE-02 erro mostra a mensagem e a ação de tentar de novo', await states.getByText('Não foi possível carregar as solicitações.', { exact: true }).isVisible())
  await capture(states, '06-mobile-erro')
  gate.fail = false
  await states.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await states.getByRole('article').first().waitFor({ timeout: 20000 })
  check('FE-02 nova tentativa recupera a lista', await states.getByRole('article').count() > 0)
  await states.context().close()

  // FE-03 — vazio por aba, com o aviso em zero.
  const empty = await openPage(browser)
  await empty.route('**/api/v1/providers/requests?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { timezone: 'America/Sao_Paulo', group: 'pending', page: 1, limit: 100, pending_today_count: 0, requests: [] } }),
  }))
  await loginProfessional(empty)
  await openRequests(empty)
  await empty.getByText('Nenhuma solicitação', { exact: true }).waitFor({ timeout: 15000 })
  check('FE-03 vazio explica o que aparece em Pendentes',
    await empty.getByText('Não há solicitações aguardando a sua resposta.', { exact: true }).isVisible()
    && await empty.getByLabel('Nenhuma nova solicitação hoje', { exact: true }).isVisible())
  await capture(empty, '07-mobile-vazio')
  await segment(empty, 'Recusadas').click()
  await empty.getByText('Você ainda não recusou nenhuma solicitação.', { exact: true }).waitFor({ timeout: 15000 })
  check('FE-03 vazio de Recusadas tem texto próprio', await empty.getByText('Você ainda não recusou nenhuma solicitação.', { exact: true }).isVisible() && await empty.getByRole('article').count() === 0)
  await empty.context().close()
}

execute().catch(error => run.fail(error)).finally(async () => {
  await cleanup()
  await run.finish(browser)
})
