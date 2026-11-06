import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'
import { assertLayoutInWindow, captureScroll } from './visual-helpers.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const plan = '022-screen-reference-alignment'
const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/visual-booking-alignment.mjs', evidence: evidenceFile(plan, 'visual-booking-alignment.log') })
const { check } = run
const reviewBookingId = randomUUID()
let browser, guarded = false
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"] *)'))
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/booking-${name}.png`))
async function fit(page, name) {
  for (const [width, height] of [[320, 844], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    check(`VIS-07 ${name} sem overflow ou recorte em ${width}`, await assertLayoutInWindow(page))
    await shot(page, `${name}-${width}`)
    if (width === 390) await captureScroll(page, `booking-${name}-390-complete`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
}

try {
  const database = new URL(process.env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') throw new Error('Recusando banco fora do e2e')
  guarded = true
  await pool.query(`INSERT INTO bookings(id, customer_id, provider_service_id, scheduled_at, booking_status, customer_location, completed_at, pet_id, service_price, duration_minutes)
    VALUES($1, '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', NOW()-INTERVAL '4 days', 'completed', 'Atendimento de teste de revisão visual', NOW()-INTERVAL '4 days', '10000000-0000-4000-8000-000000000060', 80, 40)`, [reviewBookingId])
  browser = await launchBrowser()
  const page = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, /\/api\/v1\/bookings(?:\?.*)?$/, gate)
  await loginTutor(page)
  await page.getByText('Agendamentos', { exact: true }).click()
  await activeText(page, 'Não foi possível carregar os agendamentos.').waitFor({ timeout: 20000 })
  await shot(page, 'lista-erro')
  gate.fail = false
  gate.delayMs = 1200
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByLabel('Carregando agendamentos', { exact: true }).waitFor()
  check('VIS-07 agendamentos recuperam erro com espera visível', await page.getByLabel('Carregando agendamentos', { exact: true }).isVisible())
  await page.getByText('por Groomer de Teste', { exact: true }).first().waitFor({ timeout: 15000 })
  gate.delayMs = 0
  await fit(page, 'lista')
  await page.getByText('Pagamento pendente', { exact: true }).click()
  await activeText(page, 'Nenhum agendamento com este filtro').waitFor()
  check('VIS-06 filtro vazio mantém a lista utilizável', await activeText(page, 'Nenhum agendamento com este filtro').isVisible())
  await shot(page, 'lista-vazia')
  await page.getByText('Todos', { exact: true }).click()
  const testCard = page.getByRole('button').filter({ has: page.getByText('Atendimento de teste de revisão visual', { exact: true }) })
  await testCard.click()
  await activeText(page, 'Detalhe do agendamento').waitFor()
  check('VIS-06 detalhe mantém preço e pet reais', await activeText(page, 'Josefino · Cão · Pequeno · 4 anos').count() === 1)
  await fit(page, 'detalhe')
  await page.getByRole('button', { name: 'Avaliar', exact: true }).click()
  await page.getByRole('textbox', { name: 'Sua avaliação', exact: true }).waitFor()
  check('VIS-08 avaliação compõe com ilustração existente', await page.getByTestId('artwork-puppy').locator('img').evaluate(async image => {
    if (!image.complete) await image.decode()
    return image.naturalWidth > 0
  }))
  await fit(page, 'avaliar')
  await page.getByRole('radio', { name: /5 estrelas/ }).click()
  await page.getByRole('radio', { name: /5 estrelas/, checked: true }).waitFor()
  await page.getByRole('textbox', { name: 'Sua avaliação', exact: true }).fill('Atendimento de teste para conferir a composição e a leitura da avaliação.')
  check('VIS-06 nota anuncia seleção', await page.getByRole('radio', { name: /5 estrelas/, checked: true }).count() === 1)
  await shot(page, 'avaliar-preenchido')
  // Não enviar: a cobertura de persistência permanece nos testes do domínio.
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Concluído', { exact: true }).first().click()
  const existing = page.getByRole('button').filter({ has: page.getByText('por Groomer de Teste', { exact: true }) }).filter({ hasNot: page.getByText('Atendimento de teste de revisão visual', { exact: true }) }).first()
  await existing.click()
  await page.getByRole('button', { name: 'Ver avaliação', exact: true }).click()
  await activeText(page, 'Sua avaliação').waitFor()
  await activeText(page, 'Avaliacao ficticia para demonstracao local.').waitFor()
  check('VIS-06 avaliação consulta os dados gravados', await activeText(page, '5 de 5').count() === 1)
  await fit(page, 'avaliacao')
} catch (error) { run.fail(error) }
finally {
  if (guarded) await pool.query('DELETE FROM reviews WHERE booking_id=$1', [reviewBookingId]).catch(error => run.fail(error))
  if (guarded) await pool.query('DELETE FROM bookings WHERE id=$1', [reviewBookingId]).catch(error => run.fail(error))
  await pool.end()
  await run.finish(browser)
}
