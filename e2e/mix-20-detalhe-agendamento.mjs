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
  command: 'node --import ./e2e/preload.mjs e2e/mix-20-detalhe-agendamento.mjs',
  evidence: evidenceFile(plan, 'mix-20-detalhe-agendamento.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"] *)'))

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success (R6)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3)
const WHITE = 'rgb(255, 255, 255)' // surface.default (bloco inferior do bilhete)
const LOCATION = 'Endereço de teste mix-20 detalhe do agendamento'
const PROVIDER = 'Groomer de Teste'
const PET_LINE = 'Josefino · Cão · Pequeno · 4 anos'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor, minHeight: cs.minHeight, radius: cs.borderRadius, borderWidth: cs.borderTopWidth }
  })
}

// Sobe do texto até o bloco de cartão (borda 1 pt e raio 16 pt), que é o MGCard.
async function cardStyleFrom(locator) {
  return locator.evaluate(node => {
    let el = node
    while (el && !(getComputedStyle(el).borderTopWidth === '1px' && getComputedStyle(el).borderRadius === '16px')) el = el.parentElement
    return el ? { borderWidth: getComputedStyle(el).borderTopWidth, radius: getComputedStyle(el).borderRadius } : null
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
  // Agendamento confirmado do tutor de teste, com pet e preço reais. Removido no finally.
  await pool.query(`INSERT INTO bookings(id, customer_id, provider_service_id, scheduled_at, booking_status, customer_location, pet_id, service_price, duration_minutes)
    VALUES($1, '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', NOW()+INTERVAL '2 days', 'confirmed', $2, '10000000-0000-4000-8000-000000000060', 80, 40)`, [bookingId, LOCATION])

  browser = await launchBrowser()
  const page = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, /\/api\/v1\/bookings\/[^/?]+(?:\?.*)?$/, gate)
  await loginTutor(page)
  await page.getByText('Agendamentos', { exact: true }).click()
  await page.getByRole('button').filter({ has: page.getByText(LOCATION, { exact: true }) }).first().click()

  // --- Erro (tela 20) ---
  await activeText(page, 'Não foi possível carregar este agendamento.').waitFor({ timeout: 20000 })
  check('AC-08 erro do detalhe aparece com texto e ação de nova tentativa', await page.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())
  await shot(page, 'detalhe-erro')

  // --- Carregando (tela 20) ---
  gate.fail = false
  gate.delayMs = 2500
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByLabel('Carregando agendamento', { exact: true }).waitFor({ timeout: 5000 })
  check('AC-08 carregamento do detalhe mostra indicador rotulado', await page.getByLabel('Carregando agendamento', { exact: true }).isVisible())
  await shot(page, 'detalhe-carregando')

  // --- Detalhe carregado ---
  gate.delayMs = 0
  await activeText(page, 'Detalhe do agendamento').waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Mensagem', exact: true }).waitFor({ timeout: 15000 })

  const status = await styleOf(activeText(page, 'Confirmado').first())
  check('AC-09 status Confirmado com texto em semântica de sucesso (R6)', status.color === SUCCESS, status.color)

  const header = await cardStyleFrom(activeText(page, `por ${PROVIDER}`).first())
  check('AC-07 cabeçalho do agendamento em cartão de raio 16 com borda 1 pt', header?.borderWidth === '1px' && header?.radius === '16px', JSON.stringify(header))
  const avatar = page.locator('[aria-label="' + PROVIDER + '"]').and(page.locator(':not([aria-hidden="true"] *)')).first()
  check('AC-03 avatar do profissional em teal sólido', await avatar.evaluate(el => getComputedStyle(el).backgroundColor) === TEAL)

  const details = await cardStyleFrom(activeText(page, 'Referência'))
  check('AC-07 detalhes em cartão de raio 16 com borda 1 pt', details?.borderWidth === '1px' && details?.radius === '16px', JSON.stringify(details))

  // CMP-08 / R7 / AC-06: bloco de valor em bilhete, com recorte tracejado entre os dois blocos.
  check('AC-06 bloco de valor do detalhe aparece como bilhete com título Pagamento', await activeText(page, 'Pagamento').isVisible())
  const ticket = await page.locator('div').evaluateAll(nodes => {
    const dashed = nodes.find(node => getComputedStyle(node).borderTopStyle === 'dashed' && node.offsetWidth > 0)
    if (!dashed) return null
    const ticketNode = dashed.parentElement?.parentElement
    if (!ticketNode) return null
    const cs = getComputedStyle(ticketNode)
    return { radius: cs.borderRadius, border: cs.borderTopWidth, overflow: cs.overflow }
  })
  check('AC-06 recorte tracejado entre os dois blocos do bilhete', ticket !== null, JSON.stringify(ticket))
  check('AC-07 bilhete com raio 20 e borda 1 pt', ticket?.radius === '20px' && ticket?.border === '1px', JSON.stringify(ticket))

  const valorTexto = page.getByText(/80,00/).and(page.locator(':not([aria-hidden="true"] *)'))
  check('AC-13 valor do atendimento segue R$ 80,00 no bilhete', await valorTexto.count() === 1)
  const valorStyle = await styleOf(valorTexto)
  check('AC-03 valor do atendimento em teal (R3)', valorStyle.color === TEAL, valorStyle.color)
  // R5: o valor teal fica no bloco inferior do bilhete (surface.default). Mede-se o fundo real do valor, não uma cor fixa.
  const valorSurface = await valorTexto.evaluate(el => {
    let node = el
    while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement
    return node ? getComputedStyle(node).backgroundColor : ''
  })
  check('AC-04 valor teal sobre surface.default (bloco do bilhete) com 4,5:1 ou mais (R5)', valorSurface === WHITE && ratio(valorStyle.color, valorSurface) >= 4.5, `${valorSurface} ${ratio(valorStyle.color, valorSurface).toFixed(2)}:1`)

  // Ícones (R2, R3): pet em rosa; profissional e local em teal.
  const strokes = await strokesIn(page.locator('body'))
  check('AC-03 ícone de pet em rosa (R2)', strokes.includes('#d95786') || strokes.includes('rgb(217,87,134)'))
  check('AC-03 ícone de local em teal (R3)', strokes.includes('#167d83') || strokes.includes('rgb(22,125,131)'))
  check('AC-13 linha do pet segue exibida com dados reais', await activeText(page, PET_LINE).count() === 1)

  // Botão de ação mantém altura 40 e raio 16 (AC-07)
  const mensagem = page.getByRole('button', { name: 'Mensagem', exact: true })
  const mensagemStyle = await styleOf(mensagem)
  check('AC-07 botão mantém altura 40 e raio 16', mensagemStyle.minHeight === '40px' && mensagemStyle.radius === '16px', JSON.stringify(mensagemStyle))
  await shot(page, 'detalhe-agendamento')

  // Linha de ações fica no fim da tela (abaixo da dobra): rola todos os contêineres roláveis até o fim.
  await mensagem.evaluate(el => {
    let node = el.parentElement
    while (node) {
      const { overflowY } = getComputedStyle(node)
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) node.scrollTop = node.scrollHeight
      node = node.parentElement
    }
  })
  await mensagem.scrollIntoViewIfNeeded()
  await shot(page, 'detalhe-acoes')
} catch (error) {
  run.fail(error)
} finally {
  if (guarded) await pool.query('DELETE FROM bookings WHERE id=$1', [bookingId]).catch(error => run.fail(error))
  await pool.end()
  await run.finish(browser)
}
