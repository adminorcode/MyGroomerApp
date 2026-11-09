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
  command: 'node --import ./e2e/preload.mjs e2e/mix-21-avaliar.mjs',
  evidence: evidenceFile(plan, 'mix-21-avaliar.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const reviewBookingId = randomUUID()

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const TEXT_SECONDARY = 'rgb(96, 118, 122)' // text.secondary: estrela não selecionada
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle (R2)
const WHITE = 'rgb(255, 255, 255)'
const LOCATION = 'Atendimento de teste de revisão mix 21'

// Telas empilhadas permanecem no DOM: só interessa o que está visível.
const visible = locator => locator.filter({ visible: true })
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}
// Cor do texto: o rótulo de MGButton é um filho (dir=auto); o contêiner só tem o fundo e a sombra.
const boxOf = control => control.evaluate(el => {
  const cs = getComputedStyle(el)
  const label = getComputedStyle(el.querySelector('[dir]') ?? el)
  return { background: cs.backgroundColor, color: label.color, shadow: cs.boxShadow, radius: cs.borderRadius, minHeight: cs.minHeight, borderWidth: cs.borderTopWidth }
})
const paintOf = star => star.locator('path').first().evaluate(el => ({ fill: getComputedStyle(el).fill, stroke: getComputedStyle(el).stroke }))
// O alerta nativo bloqueia a página: o clique é disparado, o diálogo é aceito e só então o clique é aguardado.
async function nextDialog(page, action) {
  const dialog = page.waitForEvent('dialog', { timeout: 5000 })
  const clicked = action().catch(error => error)
  const opened = await dialog
  const message = opened.message()
  await opened.accept()
  const result = await clicked
  if (result instanceof Error) throw result
  return message
}

let browser, guarded = false
try {
  const database = new URL(process.env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') throw new Error('Recusando banco fora do e2e')
  guarded = true
  // Reserva concluída sem avaliação: o botão "Avaliar" só existe para ela.
  await pool.query(`INSERT INTO bookings(id, customer_id, provider_service_id, scheduled_at, booking_status, customer_location, completed_at, pet_id, service_price, duration_minutes)
    VALUES($1, '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', NOW()-INTERVAL '4 days', 'completed', $2, NOW()-INTERVAL '4 days', '10000000-0000-4000-8000-000000000060', 80, 40)`, [reviewBookingId, LOCATION])

  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)
  await page.getByText('Agendamentos', { exact: true }).click()
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await page.getByRole('button').filter({ has: page.getByText(LOCATION, { exact: true }) }).first().click()
  await visible(page.getByRole('button', { name: 'Avaliar', exact: true })).waitFor({ timeout: 15000 })
  await visible(page.getByRole('button', { name: 'Avaliar', exact: true })).click()

  // --- Enviar avaliação (tela 21), estado inicial ---
  await visible(page.getByText('Avaliar atendimento', { exact: true })).waitFor()
  const textbox = visible(page.getByRole('textbox', { name: 'Sua avaliação', exact: true }))
  await textbox.waitFor()
  const star1 = visible(page.getByRole('radio', { name: '1 estrela', exact: true }))
  const star5 = visible(page.getByRole('radio', { name: '5 estrelas', exact: true }))
  check('AC-03 nenhuma estrela selecionada no início', (await star5.getAttribute('aria-checked')) === 'false')
  check('AC-03 estrela não selecionada usa neutro (text.secondary), não rosa', (await paintOf(star1)).stroke === TEXT_SECONDARY, JSON.stringify(await paintOf(star1)))
  const illustration = visible(page.getByTestId('artwork-puppy')).locator('xpath=..')
  const illustrationBox = await illustration.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius }))
  check('AC-03 ilustração do pet em bloco pinkSubtle (R2)', illustrationBox.bg === PINK_SUBTLE, JSON.stringify(illustrationBox))
  check('AC-07 bloco da ilustração com raio 20', illustrationBox.radius === '20px', illustrationBox.radius)
  const field = await boxOf(textbox)
  check('AC-07 campo de comentário com raio 12 e altura mínima de 40 ou mais', field.radius === '12px' && parseFloat(field.minHeight) >= 40, JSON.stringify(field))
  const submit = visible(page.getByRole('button', { name: 'Enviar avaliação', exact: true }))
  const submitBox = await boxOf(submit)
  check('AC-02 CTA Enviar avaliação usa action.primary', submitBox.background === CTA_PINK, JSON.stringify(submitBox))
  check('AC-04 texto branco sobre o CTA mantém contraste 4,5:1 ou mais', submitBox.color === WHITE && ratio(submitBox.color, submitBox.background) >= 4.5, `${ratio(submitBox.color, submitBox.background).toFixed(2)}:1`)
  check('AC-07 CTA com altura 40 e raio 16', submitBox.minHeight === '40px' && submitBox.radius === '16px', `${submitBox.minHeight} ${submitBox.radius}`)
  check('CMP-03 CTA primário tem sombra tingida de action.primary', submitBox.shadow.includes('198, 72, 120'), submitBox.shadow)
  await shot(page, 'avaliar-vazio')

  // --- Validação (mensagens do domínio preservadas) ---
  const noRating = await nextDialog(page, () => submit.click())
  check('AC-08 envio sem nota avisa com texto', noRating.includes('Nota obrigatória'), noRating)
  await star5.click()
  check('AC-03 estrela 5 selecionada anuncia seleção', (await star5.getAttribute('aria-checked')) === 'true')
  await page.waitForTimeout(150)
  const selectedPaint = await paintOf(star5)
  check('AC-03 R1 estrela selecionada em action.primary (preenchimento e contorno)', selectedPaint.fill === CTA_PINK && selectedPaint.stroke === CTA_PINK, JSON.stringify(selectedPaint))
  const noComment = await nextDialog(page, () => submit.click())
  check('AC-08 envio sem comentário avisa com texto', noComment.includes('Comentário obrigatório'), noComment)
  await textbox.fill('Atendimento de teste para conferir a composição da avaliação.')
  await shot(page, 'avaliar-preenchido')

  // --- Erro de envio (estado de erro com texto no alerta) ---
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, /\/api\/v1\/reviews$/, gate)
  const failure = await nextDialog(page, () => submit.click())
  check('AC-08 erro de envio mostra mensagem com texto', failure.includes('Não foi possível enviar'), failure)
  check('AC-08 formulário preserva a nota e o comentário após erro', (await star5.getAttribute('aria-checked')) === 'true' && (await textbox.inputValue()).includes('composição'))
  check('AC-08 CTA volta a ficar disponível após erro', await submit.isEnabled())
  await shot(page, 'avaliar-erro-envio')

  // --- Carregando e envio com sucesso ---
  gate.fail = false
  gate.delayMs = 2000
  await submit.click()
  const busy = visible(page.getByRole('button', { name: 'Enviar avaliação', exact: true }))
  await page.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await busy.getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto envia', await busy.isDisabled())
  await shot(page, 'avaliar-carregando')
  gate.delayMs = 0
  await visible(page.getByRole('button', { name: 'Ver avaliação', exact: true })).waitFor({ timeout: 20000 })
  check('AC-13 envio concluído volta ao agendamento com Ver avaliação', await visible(page.getByRole('button', { name: 'Ver avaliação', exact: true })).count() === 1)
  await shot(page, 'avaliar-sucesso')
} catch (error) {
  run.fail(error)
} finally {
  if (guarded) await pool.query('DELETE FROM reviews WHERE booking_id=$1', [reviewBookingId]).catch(error => run.fail(error))
  if (guarded) await pool.query('DELETE FROM bookings WHERE id=$1', [reviewBookingId]).catch(error => run.fail(error))
  await pool.end().catch(() => {})
  await run.finish(browser)
}
