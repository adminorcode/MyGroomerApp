import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiUrl, evidenceFile, fixtures, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-41-reagendar.mjs',
  evidence: evidenceFile(plan, 'mix-41-reagendar.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const providerId = '10000000-0000-4000-8000-000000000003'
// Agendamento pendente do seed sem pet (pet_id NULL): a folha só consulta horários com pet. Usa o pet do tutor
// (Josefino, porte pequeno) durante o teste e restaura o valor original no finally.
const pendingBooking = '10000000-0000-4000-8000-000000000020'
const reschedulePetId = '10000000-0000-4000-8000-000000000060'
let snapshot = null
const button = (page, name) => page.getByRole('button', { name, exact: true })

const PINK_CTA = 'rgb(198, 72, 120)' // action.primary (R1)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (CMP-05, Q1)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (data atual, CMP-15)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary (R5 sobre tealSubtle)
const ERROR = 'rgb(179, 38, 30)' // feedback.error (R6, com texto)
const WHITE = 'rgb(255, 255, 255)'

const DATE_CHIP = /^[^,]+, \d{1,2} de \S+$/ // ex.: "sáb., 7 de nov."
const SLOT = /^\d{2}:\d{2}$/
const EMPTY = 'Nenhum horário livre neste dia.'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

const computed = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  return {
    color: cs.color,
    background: cs.backgroundColor,
    fontSize: cs.fontSize,
    selected: el.getAttribute('aria-selected'),
    busy: el.getAttribute('aria-busy'),
    disabled: el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled'),
  }
})

const backgroundAbove = locator => locator.evaluate(el => {
  let node = el
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
    node = node.parentElement
  }
  return 'none'
})

// O seed não tem rotina semanal do groomer, então não há horário livre. O spec cria a rotina pela própria API
// (PUT /providers/weekly-availability), como o fluxo "Disponibilidade semanal". O preload zera o banco em cada execução.
async function captureState() {
  const pending = (await pool.query('SELECT pet_id FROM bookings WHERE id = $1', [pendingBooking])).rows[0]
  const routine = (await pool.query('SELECT travel_gap_minutes, manual_fit FROM providers WHERE id = $1', [providerId])).rows[0]
  const weekdays = (await pool.query(
    'SELECT weekday, start_minute, end_minute, break_start_minute, break_end_minute FROM provider_weekdays WHERE provider_id = $1 ORDER BY weekday',
    [providerId],
  )).rows
  snapshot = { petId: pending?.pet_id ?? null, routine, weekdays }
}

async function usePetOnPendingBooking() {
  await pool.query('UPDATE bookings SET pet_id = $2 WHERE id = $1', [pendingBooking, reschedulePetId])
}

async function restoreState() {
  if (!snapshot) return
  await pool.query('UPDATE bookings SET pet_id = $2 WHERE id = $1', [pendingBooking, snapshot.petId])
  await pool.query(
    'UPDATE providers SET travel_gap_minutes = $2, manual_fit = $3 WHERE id = $1',
    [providerId, snapshot.routine.travel_gap_minutes, snapshot.routine.manual_fit],
  )
  await pool.query('DELETE FROM provider_weekdays WHERE provider_id = $1', [providerId])
  for (const day of snapshot.weekdays) {
    await pool.query(
      `INSERT INTO provider_weekdays (provider_id, weekday, start_minute, end_minute, break_start_minute, break_end_minute)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [providerId, day.weekday, day.start_minute, day.end_minute, day.break_start_minute, day.break_end_minute],
    )
  }
}

async function ensureGroomerRoutine() {
  const login = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fixtures.groomer),
  })
  if (!login.ok) throw new Error(`Login do groomer falhou (${login.status})`)
  const { token } = await login.json()
  const day = { enabled: true, start: '09:00', end: '18:00', break_start: null, break_end: null }
  const days = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day }
  const response = await fetch(`${apiUrl}/api/v1/providers/weekly-availability`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ days, travel_gap_minutes: 30, manual_fit: false }),
  })
  if (!response.ok) throw new Error(`Rotina do groomer não foi salva (${response.status})`)
}

// Texto do rótulo da data (o MGText dentro do botão): a cor do texto fica no filho, não no botão.
const dateLabel = locator => locator.getByText(DATE_CHIP).first()

// Abre a folha de reagendamento a partir de uma solicitação pendente (mesmo caminho do visual-provider-alignment).
async function openReschedule(page) {
  await loginProfessional(page)
  await page.getByRole('tab', { name: 'Solicitações', exact: true }).or(page.getByRole('button', { name: 'Solicitações', exact: true })).first().click()
  await page.getByRole('tab', { name: 'Pendentes', exact: true }).waitFor({ timeout: 20000 })
  const request = page.getByRole('button', { name: /^Abrir ficha de / }).first()
  await request.waitFor({ timeout: 20000 })
  await request.click()
  await page.getByRole('group', { name: 'Dados do pet', exact: true }).waitFor({ timeout: 20000 })
  await button(page, 'Ver agendamento').click()
  await page.getByText('Serviço solicitado', { exact: true }).waitFor({ timeout: 20000 })
  await button(page, 'Reagendar').click()
  await button(page, 'Confirmar novo horário').waitFor({ timeout: 20000 })
}

async function settleSheet(locator) {
  let previous = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const box = await locator.boundingBox()
    if (box && previous && Math.abs(box.y - previous.y) < 0.5) return
    previous = box
    await new Promise(resolve => setTimeout(resolve, 150))
  }
}

// Percorre as datas até achar um horário livre e devolve o primeiro horário.
async function pickSlot(page) {
  const dates = page.getByRole('button', { name: DATE_CHIP })
  const slots = page.getByRole('button', { name: SLOT })
  const count = await dates.count()
  for (let index = 0; index < count; index += 1) {
    await dates.nth(index).click()
    await slots.first().or(page.getByText(EMPTY, { exact: true })).first().waitFor({ timeout: 20000 })
    if (await slots.count() > 0) return slots.first()
  }
  throw new Error('Sem horário livre nas datas da folha de reagendamento')
}

let browser
try {
  await captureState()
  await usePetOnPendingBooking()
  await ensureGroomerRoutine()
  browser = await launchBrowser()

  // --- Normal: cabeçalho, datas, horário e CTA ---
  const page = await openPage(browser)
  await openReschedule(page)

  const title = page.getByRole('heading', { name: 'Reagendar atendimento', exact: true })
  const band = await backgroundAbove(title)
  check('CMP-05 cabeçalho da folha em teal', band === TEAL, band)
  const titleStyle = await computed(title)
  check('AC-04 título inverso sobre teal atende 4,5:1', titleStyle.color === WHITE && ratio(titleStyle.color, band) >= 4.5, `${titleStyle.color} sobre ${band}`)

  const dates = page.getByRole('button', { name: DATE_CHIP })
  check('AC-08 lista com 14 datas', await dates.count() === 14, String(await dates.count()))
  const today = await computed(dates.nth(0))
  const todayText = await computed(dateLabel(dates.nth(0)))
  check('AC-02 data selecionada por padrão em action.primary com texto branco', today.background === PINK_CTA && today.selected === 'true' && todayText.color === WHITE, JSON.stringify({ ...today, text: todayText.color }))

  // Data atual fora da seleção: tealSubtle com texto text.primary (CMP-15)
  await dates.nth(1).click()
  const todayIdle = await computed(dates.nth(0))
  const todayIdleText = await computed(dateLabel(dates.nth(0)))
  check('CMP-15 data atual sem seleção em tealSubtle com text.primary', todayIdle.background === TEAL_SUBTLE && todayIdleText.color === TEXT_PRIMARY && todayIdle.selected === 'false', JSON.stringify({ ...todayIdle, text: todayIdleText.color }))
  await shot(page, 'mix-41-data-atual')

  // Horário válido selecionado em rosa (R1, CMP-15)
  const slot = await pickSlot(page)
  await slot.click()
  const picked = await computed(slot)
  const pickedText = await computed(slot.getByText(SLOT).first())
  check('CMP-15 horário válido selecionado em action.primary', picked.background === PINK_CTA && pickedText.color === WHITE && picked.selected === 'true', JSON.stringify({ ...picked, text: pickedText.color }))
  const confirm = button(page, 'Confirmar novo horário')
  const cta = await computed(confirm)
  check('AC-02 CTA Confirmar novo horário em action.primary', cta.background === PINK_CTA && !cta.disabled, JSON.stringify(cta))
  await shot(page, 'mix-41-horario-valido')

  // Cancelar fecha a folha sem reagendar
  await button(page, 'Cancelar').click()
  await confirm.waitFor({ state: 'hidden', timeout: 15000 })
  check('AC-13 cancelar fecha sem reagendar', await confirm.count() === 0)

  // --- Erro ao carregar horários, com recuperação ---
  const gate = { fail: true, delayMs: 0 }
  const failing = await openPage(browser)
  await gateRoute(failing, '**/api/v1/bookings/slots?**', gate)
  await openReschedule(failing)
  await failing.getByText('Não foi possível carregar os horários.', { exact: true }).waitFor({ timeout: 40000 })
  check('AC-08 erro de horários com texto e alerta', await failing.getByRole('alert').filter({ hasText: 'Não foi possível carregar os horários.' }).count() === 1)
  const errorText = await computed(failing.getByText('Não foi possível carregar os horários.', { exact: true }))
  check('R6 erro com semântica de feedback', errorText.color === ERROR, errorText.color)
  await shot(failing, 'mix-41-erro')
  gate.fail = false
  gate.delayMs = 1200
  await button(failing, 'Tentar novamente').click()
  await failing.getByRole('progressbar', { name: 'Carregando horários disponíveis', exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 recuperação mostra carregando com texto', await failing.getByText('Carregando horários disponíveis', { exact: true }).isVisible())
  await shot(failing, 'mix-41-carregando')
  await failing.getByRole('progressbar', { name: 'Carregando horários disponíveis', exact: true }).waitFor({ state: 'hidden', timeout: 20000 })
  check('AC-08 recuperação recebe horários ou estado vazio', await failing.getByRole('button', { name: SLOT }).count() > 0 || await failing.getByText(EMPTY, { exact: true }).count() === 1)
  gate.delayMs = 0

  // --- Vazio: nenhum horário livre no dia ---
  const empty = await openPage(browser)
  await empty.route('**/api/v1/bookings/slots?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { slots: [] } }),
  }))
  await openReschedule(empty)
  await empty.getByText(EMPTY, { exact: true }).waitFor({ timeout: 20000 })
  check('AC-08 vazio orienta com texto', await empty.getByText(EMPTY, { exact: true }).isVisible())
  check('AC-08 confirmar desabilitado sem horário escolhido', (await computed(button(empty, 'Confirmar novo horário'))).disabled)
  // A folha desliza ao abrir: espera a posição parar para a captura não mostrar a animação.
  await settleSheet(empty.getByRole('heading', { name: 'Reagendar atendimento', exact: true }))
  await shot(empty, 'mix-41-vazio')

  // --- Envio atrasado e recusado: nenhum reagendamento é gravado ---
  const submitting = await openPage(browser)
  await submitting.route('**/api/v1/bookings/*/schedule', async route => {
    if (route.request().method() !== 'PATCH') return route.continue()
    await new Promise(resolve => setTimeout(resolve, 1500))
    return route.abort()
  })
  await openReschedule(submitting)
  const submitSlot = await pickSlot(submitting)
  await submitSlot.click()
  await button(submitting, 'Confirmar novo horário').click()
  await submitting.waitForTimeout(400)
  const busy = await computed(button(submitting, 'Confirmar novo horário'))
  check('AC-08 envio sinaliza carregamento com aria-busy', busy.busy === 'true' && busy.disabled, JSON.stringify(busy))
  await shot(submitting, 'mix-41-enviando')
  await submitting.getByRole('alert').first().waitFor({ timeout: 20000 }).catch(() => {})
  check('AC-08 falha ao enviar mostra alerta com texto', await submitting.getByRole('alert').filter({ hasText: /\S/ }).count() >= 1)
  check('AC-13 folha permanece aberta após falha de envio', await button(submitting, 'Confirmar novo horário').isVisible())
  await shot(submitting, 'mix-41-envio-falhou')
} catch (error) {
  run.fail(error)
} finally {
  await restoreState().catch(error => run.fail(error))
  await pool.end().catch(() => {})
  await run.finish(browser)
}
