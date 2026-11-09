import { evidenceFile, fixtures, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-32-solicitacoes.mjs',
  evidence: evidenceFile(plan, 'mix-32-solicitacoes.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const base = 'http://127.0.0.1:3000/api/v1'

// Cores vêm dos tokens (CMP-14, R1, R3, R5, R6). Valores RGB medidos no navegador.
const TEAL = 'rgb(22, 125, 131)' // brand.teal: faixa e valor estimado (R3)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle: aviso de nova solicitação
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary: aba ativa e Aceitar (R1)
const OUTLINE_PINK = 'rgb(198, 38, 105)' // action.primaryOutline: Recusar (R1)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary sobre tealSubtle (R5)
const WHITE = 'rgb(255, 255, 255)'

let tutorToken, providerToken, pet, offer, location, savedRoutine
const bookingIds = []

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
const today = dayFormat.format(new Date())
const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return dayFormat.format(value)
}
// Mesmo texto que pendingTodayTitle() no app.
const pendingTitle = count => (count === 0 ? 'Nenhuma nova solicitação hoje' : count === 1 ? '1 nova solicitação hoje' : `${count} novas solicitações hoje`)

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
  tutorToken = (await request('/auth/login', 'POST', fixtures.tutor, null)).token
  providerToken = (await request('/auth/login', 'POST', fixtures.groomer, null)).token
  // Gerar horários exige rotina salva (409 sem ela). Salva uma grade ampla e restaura no cleanup.
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

// O tutor pede um horário futuro: o pedido entra em Pendentes e conta no aviso do dia.
async function createRequest() {
  for (let days = 1; days <= 10; days += 1) {
    const date = addDays(today, days)
    const slots = (await request(`/bookings/slots?provider_service_id=${offer.id}&pet_id=${pet.id}&date=${date}`)).data.slots
    if (!slots[0]) continue
    const created = await request('/bookings', 'POST', {
      pet_id: pet.id,
      provider_service_id: offer.id,
      scheduled_at: slots[0],
      customer_location: location.address,
      customer_latitude: Number(location.latitude),
      customer_longitude: Number(location.longitude),
    })
    bookingIds.push(created.data.booking.id)
    return
  }
  throw new Error('Sem horário livre nos próximos 10 dias')
}

async function cleanup() {
  if (savedRoutine) await request('/providers/weekly-availability', 'PUT', savedRoutine, providerToken).catch(() => {})
  for (const id of bookingIds) {
    await request(`/bookings/${id}/status`, 'PATCH', { booking_status: 'cancelled' }, providerToken).catch(() => {})
  }
}

// Cor de fundo efetiva: primeiro ancestral com fundo opaco (cartão, faixa ou canvas).
async function surfaceOf(locator) {
  return locator.evaluate(element => {
    let node = element
    while (node) {
      const value = getComputedStyle(node).backgroundColor
      if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') return value
      node = node.parentElement
    }
    return 'rgb(255, 255, 255)'
  })
}

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

async function styleOf(locator) {
  return locator.evaluate(element => {
    const cs = getComputedStyle(element)
    return { background: cs.backgroundColor, color: cs.color, border: cs.borderTopColor, selected: element.getAttribute('aria-selected') }
  })
}

let browser
try {
  await setup()
  await createRequest()
  const pendingCount = (await request('/providers/requests?group=pending&limit=100', 'GET', undefined, providerToken)).data.pending_today_count
  browser = await launchBrowser()

  // --- Pendentes (visão padrão da aba) ---
  const page = await openPage(browser)
  await loginProfessional(page)
  await page.getByRole('tab', { name: 'Solicitações', exact: true }).first().click()
  const title = page.getByText('Solicitações recebidas', { exact: true })
  await title.waitFor({ timeout: 15000 })

  // Faixa teal de cabeçalho (CMP-05, Q1) com título em texto inverso.
  const band = await surfaceOf(title)
  check('AC-03 faixa de cabeçalho das solicitações em teal (Q1)', band === TEAL, band)
  const titleStyle = await styleOf(title)
  check('AC-03 título sobre a faixa usa texto inverso', titleStyle.color === WHITE, titleStyle.color)

  // Abas de grupo: ativa em rosa com texto branco (R1); inativa sem preenchimento e com texto primário.
  const pendentes = await styleOf(page.getByRole('tab', { name: 'Pendentes', exact: true }))
  check('AC-02 aba de grupo ativa usa action.primary (R1)', pendentes.selected === 'true' && pendentes.background === CTA_PINK, JSON.stringify(pendentes))
  check('AC-02 texto da aba ativa é branco', (await styleOf(page.getByText('Pendentes', { exact: true }))).color === WHITE)
  const aceitas = await styleOf(page.getByRole('tab', { name: 'Aceitas', exact: true }))
  check('AC-02 aba inativa sem preenchimento rosa', aceitas.selected === 'false' && aceitas.background === 'rgba(0, 0, 0, 0)', JSON.stringify(aceitas))
  check('AC-04 texto da aba inativa usa text.primary (R5)', (await styleOf(page.getByText('Aceitas', { exact: true }))).color === TEXT_PRIMARY)

  // Aviso de nova solicitação em tealSubtle com texto primário.
  const banner = page.getByLabel(pendingTitle(pendingCount), { exact: true })
  await banner.waitFor({ timeout: 15000 })
  const bannerText = page.getByText(pendingTitle(pendingCount), { exact: true })
  check('AC-08 aviso de nova solicitação em tealSubtle', (await surfaceOf(bannerText)) === TEAL_SUBTLE)
  check('AC-04 texto do aviso usa text.primary sobre tealSubtle (R5)', (await styleOf(bannerText)).color === TEXT_PRIMARY)

  // Card de solicitação (CMP-14): valor estimado em teal; Aceitar em rosa; Recusar em contorno rosa.
  const article = page.getByRole('article', { name: /^Solicitação de / }).first()
  await article.waitFor({ timeout: 15000 })
  // Intl pt-BR põe espaço não separável (U+00A0) entre "R$" e o valor: \s cobre os dois.
  const price = article.getByText(/^R\$\s/).first()
  const priceStyle = await styleOf(price)
  check('AC-05 valor estimado da solicitação em teal (CMP-14)', priceStyle.color === TEAL, priceStyle.color)
  const priceRatio = ratio(priceStyle.color, await surfaceOf(price))
  check('AC-04 valor em teal sobre branco mantém 4,5:1 ou mais', priceRatio >= 4.5, `${priceRatio.toFixed(2)}:1`)
  const aceitar = await styleOf(article.getByRole('button', { name: /^Aceitar solicitação de / }))
  check('AC-02 Aceitar usa action.primary (R1)', aceitar.background === CTA_PINK, JSON.stringify(aceitar))
  check('AC-02 texto de Aceitar é branco', (await styleOf(article.getByText('Aceitar', { exact: true }))).color === WHITE)
  const recusar = await styleOf(article.getByRole('button', { name: /^Recusar solicitação de / }))
  check('AC-02 Recusar em contorno rosa sem preenchimento (R1)', recusar.background === 'rgba(0, 0, 0, 0)' && recusar.border === OUTLINE_PINK, JSON.stringify(recusar))
  check('AC-02 texto de Recusar em rosa-texto', (await styleOf(article.getByText('Recusar', { exact: true }))).color === OUTLINE_PINK)
  await shot(page, 'solicitacoes-pendentes')

  // --- Carregando (AC-08): indicador com nome acessível ---
  const states = await openPage(browser)
  const gate = { fail: false, delayMs: 8000 }
  await gateRoute(states, '**/api/v1/providers/requests?**', gate)
  await loginProfessional(states)
  await states.getByRole('tab', { name: 'Solicitações', exact: true }).first().click()
  await states.getByRole('progressbar', { name: 'Carregando solicitações' }).waitFor({ timeout: 15000 })
  check('AC-08 carregando mostra indicador com nome acessível', await states.getByRole('progressbar', { name: 'Carregando solicitações' }).isVisible())
  await shot(states, 'solicitacoes-carregando')
  gate.delayMs = 0
  await states.getByRole('progressbar', { name: 'Carregando solicitações' }).waitFor({ state: 'hidden', timeout: 20000 })
  await states.context().close()

  // --- Erro (AC-08): mensagem em texto e nova tentativa ---
  const failing = await openPage(browser)
  const failGate = { fail: true, delayMs: 0 }
  await gateRoute(failing, '**/api/v1/providers/requests?**', failGate)
  await loginProfessional(failing)
  await failing.getByRole('tab', { name: 'Solicitações', exact: true }).first().click()
  await failing.getByText('Não foi possível carregar as solicitações.', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 erro mostra a mensagem em texto', await failing.getByText('Não foi possível carregar as solicitações.', { exact: true }).isVisible())
  check('AC-08 erro oferece tentar novamente', await failing.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())
  await shot(failing, 'solicitacoes-erro')
  failGate.fail = false
  await failing.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await failing.getByText('Não foi possível carregar as solicitações.', { exact: true }).waitFor({ state: 'hidden', timeout: 20000 })
  check('AC-08 nova tentativa recupera a lista', await failing.getByRole('article').first().waitFor({ timeout: 15000 }).then(() => true, () => false))
  await failing.context().close()

  // --- Vazio (AC-08): aba sem pedidos, com o aviso em zero ---
  const empty = await openPage(browser)
  await empty.route('**/api/v1/providers/requests?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { timezone: 'America/Sao_Paulo', group: 'pending', page: 1, limit: 100, pending_today_count: 0, requests: [] } }),
  }))
  await loginProfessional(empty)
  await empty.getByRole('tab', { name: 'Solicitações', exact: true }).first().click()
  await empty.getByText('Nenhuma solicitação', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 vazio explica o que aparece em Pendentes', await empty.getByText('Não há solicitações aguardando a sua resposta.', { exact: true }).isVisible())
  check('AC-08 vazio mostra o aviso do dia zerado', await empty.getByLabel('Nenhuma nova solicitação hoje', { exact: true }).isVisible())
  await shot(empty, 'solicitacoes-vazio')
  await empty.context().close()
} catch (error) {
  run.fail(error)
} finally {
  await cleanup().catch(() => {})
  await run.finish(browser)
}
