import { evidenceFile, fillServiceAddress, fixtures, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '029-movimento-sobrio'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/movimento-sobrio.mjs',
  evidence: evidenceFile(plan, 'movimento-sobrio.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const api = 'http://127.0.0.1:3000/api/v1'
const slotGone = 'Este horário não está mais disponível. Escolha outro horário.'

async function firstVisible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

async function apiCall(token, route, method = 'GET', payload) {
  const response = await fetch(api + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`${method} ${route} ${response.status} ${text}`)
  return body
}

let browser
try {
  const groomerToken = (await apiCall(null, '/auth/login', 'POST', fixtures.groomer)).token
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, {
    enabled: true, start: '08:00', end: '21:00', break_start: null, break_end: null,
  }]))
  await apiCall(groomerToken, '/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 15, manual_fit: false })

  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)

  const home = await firstVisible(page.getByRole('tab', { name: 'Início', exact: true }))
  check('AC-03', (await home.getAttribute('aria-selected')) === 'true', await home.getAttribute('aria-selected') ?? '')

  await page.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  const card = page.getByRole('button', { name: /^Ver perfil de / }).first()
  await card.waitFor({ timeout: 20000 })
  check('AC-09', await card.isVisible() && await card.isEnabled())
  await shot(page, 'busca-resultados-390')

  const filtros = page.getByRole('button', { name: 'Filtros', exact: true })
  await filtros.click()
  const services = page.getByRole('radiogroup', { name: 'Serviço' })
  await services.waitFor({ timeout: 5000 })
  check('AC-02', (await filtros.getAttribute('aria-expanded')) === 'true' && await services.isVisible())
  await services.getByRole('radio').first().click()
  check('AC-02', await services.getByRole('radio').first().isEnabled())
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await services.waitFor({ state: 'hidden', timeout: 5000 })
  await filtros.focus()
  await page.keyboard.press('Enter')
  await services.waitFor({ timeout: 5000 })
  check('AC-02', await services.isVisible() && (await filtros.getAttribute('aria-expanded')) === 'true')
  await shot(page, 'busca-filtros-390')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await services.waitFor({ state: 'hidden', timeout: 5000 })

  const desktop = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(desktop)
  await desktop.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await fillServiceAddress(desktop, 'Avenida Paulista, São Paulo')
  await desktop.getByRole('button', { name: 'Filtros', exact: true }).click()
  await desktop.getByRole('radiogroup', { name: 'Serviço' }).waitFor()
  await shot(desktop, 'busca-filtros-1440')
  await desktop.close()

  await gateRoute(page, '**/api/v1/providers/coverage**', { fail: true })
  await fillServiceAddress(page, 'Rua Augusta, São Paulo')
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  await retry.waitFor({ timeout: 20000 })
  check('AC-07', await page.getByText('Algo deu errado', { exact: true }).isVisible() && await retry.isEnabled())
  await shot(page, 'busca-erro-390')

  await page.unroute('**/api/v1/providers/coverage**')
  await page.route('**/api/v1/providers/coverage**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { address: 'Rua Augusta', latitude: -23.55, longitude: -46.66, providers: [] } }),
  }))
  await retry.click()
  const empty = page.getByText('Nenhum groomer encontrado', { exact: true })
  await empty.waitFor({ timeout: 15000 })
  check('AC-07', await empty.isVisible())
  await shot(page, 'busca-vazio-390')

  await page.unroute('**/api/v1/providers/coverage**')
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await card.waitFor({ timeout: 20000 })
  await card.click()
  await page.getByRole('radio', { name: /Banho/ }).first().click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor({ timeout: 20000 })

  const tutorToken = (await apiCall(null, '/auth/login', 'POST', fixtures.tutor)).token
  const pet = (await apiCall(tutorToken, '/pets')).data[0]
  if (!pet) throw new Error('Tutor sem pet')
  const petRadio = page.getByRole('radio', { name: new RegExp(pet.name) }).first()
  if (await petRadio.count()) await petRadio.click()

  const daysGroup = page.getByRole('radiogroup', { name: 'Dia do atendimento' })
  const dayRadios = daysGroup.getByRole('radio')
  let slot = null
  for (let index = 0; index < await dayRadios.count(); index += 1) {
    await dayRadios.nth(index).click()
    check('AC-03', (await dayRadios.nth(index).getAttribute('aria-selected')) === 'true')
    const candidate = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()
    try {
      await candidate.waitFor({ timeout: 8000 })
      slot = candidate
      break
    } catch {
      slot = null
    }
  }
  if (!slot) throw new Error('Nenhum horário livre nos dias visíveis')
  await slot.click()
  check('AC-03', (await slot.getAttribute('aria-selected')) === 'true')
  await shot(page, 'dia-horario-390')
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).click()
  const send = page.getByRole('button', { name: 'Solicitar agendamento', exact: true })
  await send.waitFor({ timeout: 20000 })

  let failPost = true
  await page.route('**/api/v1/bookings', async route => {
    if (failPost && route.request().method() === 'POST') {
      failPost = false
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: slotGone }),
      })
      return
    }
    await route.continue()
  })
  await send.click()
  const gone = page.getByText(slotGone, { exact: true })
  await gone.waitFor({ timeout: 15000 })
  check('AC-04', await gone.isVisible())
  await shot(page, 'horario-indisponivel-390')

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
  const another = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).nth(1)
  await another.waitFor({ timeout: 15000 })
  await another.click()
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).click()
  const sendAgain = page.getByRole('button', { name: 'Solicitar agendamento', exact: true })
  await sendAgain.waitFor()
  await sendAgain.click()
  const follow = page.getByRole('button', { name: 'Ver solicitação', exact: true })
  await follow.waitFor({ timeout: 20000 })
  check('AC-04', await follow.isEnabled() && await page.getByText('Próximo passo', { exact: true }).isVisible())
  await shot(page, 'confirmacao-390')

  await (await firstVisible(page.getByRole('tab', { name: 'Mensagens', exact: true }))).click()
  await (await firstVisible(page.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }))).click()
  await (await firstVisible(page.getByRole('textbox', { name: 'Mensagem', exact: true }))).waitFor({ timeout: 15000 })
  const mine = `Movimento ${Date.now()}`
  await (await firstVisible(page.getByRole('textbox', { name: 'Mensagem', exact: true }))).fill(mine)
  await (await firstVisible(page.getByRole('button', { name: 'Enviar mensagem', exact: true }))).click()
  const copies = page.getByText(mine, { exact: true })
  const deadline = Date.now() + 15000
  let visibleCopy = false
  while (Date.now() < deadline && !visibleCopy) {
    const count = await copies.count()
    for (let index = 0; index < count; index += 1) {
      if (await copies.nth(index).isVisible()) visibleCopy = true
    }
    if (!visibleCopy) await page.waitForTimeout(200)
  }
  check('AC-06', visibleCopy)
  await shot(page, 'chat-balao-390')

  const reduced = await openPage(browser)
  await reduced.emulateMedia({ reducedMotion: 'reduce' })
  await loginTutor(reduced)
  await reduced.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await fillServiceAddress(reduced, 'Avenida Paulista, São Paulo')
  const reducedFilters = reduced.getByRole('button', { name: 'Filtros', exact: true })
  await reducedFilters.click()
  const reducedPanel = reduced.getByRole('radiogroup', { name: 'Serviço' })
  await reducedPanel.waitFor({ timeout: 5000 })
  await reducedPanel.getByRole('radio').first().click()
  check('AC-08', await reducedPanel.isVisible() && await reducedPanel.getByRole('radio').first().isEnabled())
  await shot(reduced, 'busca-filtros-reduced-390')

  const groomer = await openPage(browser)
  await loginProfessional(groomer)
  const agendaTab = await firstVisible(groomer.getByRole('tab', { name: 'Agenda', exact: true }))
  check('AC-03', (await agendaTab.getAttribute('aria-selected')) === 'true')
  const filter = groomer.getByRole('button', { name: 'Filtrar', exact: true })
  await filter.click()
  const all = groomer.getByRole('button', { name: 'Todos', exact: true })
  await all.waitFor({ timeout: 5000 })
  check('AC-02', (await filter.getAttribute('aria-expanded')) === 'true' && await all.isVisible())
  await all.click()
  check('AC-02', (await all.getAttribute('aria-selected')) === 'true')
  await shot(groomer, 'agenda-filtro-390')
  await groomer.getByRole('button', { name: 'Bloquear horário', exact: true }).click()
  await groomer.getByRole('heading', { name: 'Bloquear horário', exact: true }).waitFor()
  await shot(groomer, 'bloqueio-390')
  await groomer.getByRole('button', { name: 'Fechar', exact: true }).click()
  await groomer.getByRole('heading', { name: 'Bloquear horário', exact: true }).waitFor({ state: 'hidden', timeout: 5000 })
  check('AC-05', await groomer.getByRole('button', { name: 'Bloquear horário', exact: true }).isVisible())

  await groomer.getByRole('tab', { name: 'Solicitações', exact: true }).click()
  const request = groomer.getByRole('button', { name: /Abrir ficha/ }).first()
  if (await request.count()) {
    await request.click()
    const reschedule = groomer.getByRole('button', { name: 'Ver agendamento', exact: true })
    if (await reschedule.count()) {
      await reschedule.click()
      const openSheet = groomer.getByRole('button', { name: 'Reagendar', exact: true })
      if (await openSheet.count()) {
        await openSheet.click()
        await groomer.getByRole('heading', { name: 'Reagendar atendimento', exact: true }).waitFor({ timeout: 10000 })
        await shot(groomer, 'reagendar-390')
        await groomer.getByRole('button', { name: 'Cancelar', exact: true }).click()
      }
    }
  }
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
