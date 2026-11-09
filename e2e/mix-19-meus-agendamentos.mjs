import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-19-meus-agendamentos.mjs',
  evidence: evidenceFile(plan, 'mix-19-meus-agendamentos.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"] *)'))
const card = (page, location) => page.getByRole('button').filter({ has: page.getByText(location, { exact: true }) }).first()

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (contorno do filtro não selecionado)
const WHITE = 'rgb(255, 255, 255)'
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3)
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success (R6)
const SURFACE = 'rgb(255, 255, 255)' // surface.default
const LOCATION = 'Endereço de teste mix-19 meus agendamentos'
const PROVIDER = 'Groomer de Teste'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderRadius, selected: el.getAttribute('aria-selected') }
  })
}

async function strokesIn(scope) {
  return scope.locator('svg').evaluateAll(nodes => nodes.map(node => (node.getAttribute('stroke') || getComputedStyle(node).stroke || '').replace(/\s+/g, '').toLowerCase()))
}

let browser
let guarded = false
const bookingId = randomUUID()
try {
  const database = new URL(process.env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') throw new Error('Recusando banco fora do e2e')
  guarded = true
  // Agendamento confirmado do tutor de teste, com preço e local identificáveis. Removido no finally.
  await pool.query(`INSERT INTO bookings(id, customer_id, provider_service_id, scheduled_at, booking_status, customer_location, pet_id, service_price, duration_minutes)
    VALUES($1, '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', NOW()+INTERVAL '2 days', 'confirmed', $2, '10000000-0000-4000-8000-000000000060', 80, 40)`, [bookingId, LOCATION])

  browser = await launchBrowser()
  const page = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, /\/api\/v1\/bookings(?:\?.*)?$/, gate)
  await loginTutor(page)
  await page.getByText('Agendamentos', { exact: true }).click()

  // --- Erro (tela 19) ---
  await activeText(page, 'Não foi possível carregar os agendamentos.').waitFor({ timeout: 20000 })
  check('AC-08 erro da lista aparece com texto e ação de nova tentativa', await page.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())
  await shot(page, 'lista-erro')

  // --- Carregando (tela 19) ---
  gate.fail = false
  gate.delayMs = 2500
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByLabel('Carregando agendamentos', { exact: true }).waitFor({ timeout: 5000 })
  check('AC-08 carregamento da lista mostra indicador rotulado', await page.getByLabel('Carregando agendamentos', { exact: true }).isVisible())
  await shot(page, 'lista-carregando')

  // --- Lista carregada ---
  gate.delayMs = 0
  await card(page, LOCATION).waitFor({ timeout: 20000 })
  const agendamento = card(page, LOCATION)
  check('AC-07 card de agendamento usa raio 16 com borda 1 pt', await agendamento.locator(':scope > div').first().evaluate(el => {
    const cs = getComputedStyle(el)
    return cs.borderTopWidth === '1px' && cs.borderRadius === '16px'
  }))
  check('AC-09 status Confirmado com texto em semântica de sucesso', (await styleOf(agendamento.getByText('Confirmado', { exact: true }))).color === SUCCESS)
  check('AC-03 avatar do profissional em teal sólido', await agendamento.locator('[aria-label="' + PROVIDER + '"]').first().evaluate(el => getComputedStyle(el).backgroundColor) === TEAL)
  const valor = agendamento.getByText(/80,00/)
  check('AC-03 valor do atendimento em teal', await valor.count() === 1 && (await styleOf(valor)).color === TEAL)
  const strokes = await strokesIn(agendamento)
  check('AC-03 ícone de local em teal', strokes.includes('#167d83') || strokes.includes('rgb(22,125,131)'))
  check('AC-13 local do atendimento segue exibido no card', await agendamento.getByText(LOCATION, { exact: true }).count() === 1)
  await shot(page, 'lista-todos')

  // --- Filtro (R1: selecionado em action.primary, texto branco) ---
  const todos = page.getByRole('button', { name: 'Todos', exact: true })
  const todosStyle = await styleOf(todos)
  check('AC-02 filtro Todos selecionado usa action.primary (R1)', todosStyle.selected === 'true' && todosStyle.background === CTA_PINK, JSON.stringify(todosStyle))
  check('AC-04 texto branco do filtro selecionado mantém 4,5:1 ou mais', ratio(await todos.getByText('Todos', { exact: true }).evaluate(el => getComputedStyle(el).color), CTA_PINK) >= 4.5)
  const confirmado = page.getByRole('button', { name: 'Confirmado', exact: true })
  const naoSelecionado = await styleOf(confirmado)
  check('AC-02 filtro não selecionado usa contorno rosa e fundo branco', naoSelecionado.selected === 'false' && naoSelecionado.border === TEXT_PINK && naoSelecionado.background === SURFACE, JSON.stringify(naoSelecionado))

  await page.getByRole('button', { name: 'Pagamento pendente', exact: true }).click()
  // A troca de filtro refaz a consulta: a lista mostra carregamento antes do estado vazio (MGEmptyState do ListEmptyComponent).
  const emptyFilter = activeText(page, 'Nenhum agendamento com este filtro')
  await emptyFilter.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 filtro sem resultados mostra estado vazio com texto', await emptyFilter.count() === 1 && await emptyFilter.isVisible())
  check('AC-02 filtro clicado passa a ser o selecionado', (await styleOf(page.getByRole('button', { name: 'Pagamento pendente', exact: true }))).selected === 'true')
  await shot(page, 'lista-vazia')

  await confirmado.click()
  await card(page, LOCATION).waitFor({ timeout: 10000 })
  check('AC-09 filtro Confirmado mantém o agendamento confirmado na lista', await card(page, LOCATION).isVisible())
  await shot(page, 'lista-confirmado')
} catch (error) {
  run.fail(error)
} finally {
  if (guarded) await pool.query('DELETE FROM bookings WHERE id=$1', [bookingId]).catch(error => run.fail(error))
  await pool.end()
  await run.finish(browser)
}
