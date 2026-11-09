import { createRequire } from 'node:module'
import path from 'node:path'
import { evidenceFile, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-25-chat.mjs',
  evidence: evidenceFile(plan, 'mix-25-chat.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve('../API/node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Tokens resolvidos em rgb (R1, R5, R8, CMP-17, AC-11).
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (bolha do tutor e Enviar)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (bolha do profissional)
const WHITE = 'rgb(255, 255, 255)' // surface.default e onAction.primary
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const TEXT = 'rgb(37, 61, 66)' // text.primary
const PINK_SUBTLE = 'rgb(252, 229, 237)'

const stamp = Date.now()
const tutorMessage = `Mix chat tutor ${stamp}`
const professionalMessage = `Mix chat profissional ${stamp}`

// Telas empilhadas permanecem no DOM: usa o primeiro elemento visível.
async function firstVisible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

// Fundo efetivo: primeiro ancestral (ou o próprio elemento) com fundo não transparente.
const backgroundOf = locator => locator.evaluate(el => {
  for (let node = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg !== 'rgba(0, 0, 0, 0)') return bg
  }
  return 'rgba(0, 0, 0, 0)'
})
const colorOf = locator => locator.evaluate(el => getComputedStyle(el).color)
const borderWidthOf = locator => locator.evaluate(el => getComputedStyle(el).borderTopWidth)
// Raio do campo: primeiro ancestral com borda de 1 pt (repouso) ou 2 pt (foco, caixa do campo de texto).
const fieldRadiusOf = locator => locator.evaluate(el => {
  for (let node = el; node; node = node.parentElement) {
    const cs = getComputedStyle(node)
    if (['1px', '2px'].includes(cs.borderTopWidth) && cs.borderTopStyle !== 'none') return cs.borderRadius
  }
  return 'none'
})

async function openMessages(page) {
  await (await firstVisible(page.getByRole('tab', { name: 'Mensagens', exact: true }))).click()
}
async function openConversation(page, name) {
  await (await firstVisible(page.getByRole('button', { name, exact: true }))).click()
  await (await firstVisible(page.getByRole('textbox', { name: 'Mensagem', exact: true }))).waitFor({ timeout: 15000 })
}
// Bolha = pai direto do texto da mensagem (MessageBubble).
// A lista de conversas (por baixo, oculta) também mostra a prévia da mensagem: espera o elemento
// visível da conversa aberta, em vez de cair no primeiro elemento oculto.
async function bubbleFor(page, content, timeout = 15000) {
  const locator = page.getByText(content, { exact: true })
  const end = Date.now() + timeout
  let text = await firstVisible(locator)
  while (!(await text.isVisible().catch(() => false)) && Date.now() < end) {
    await page.waitForTimeout(200)
    text = await firstVisible(locator)
  }
  return { text, bubble: text.locator('xpath=..') }
}
async function sendMessage(page, content) {
  const field = await firstVisible(page.getByRole('textbox', { name: 'Mensagem', exact: true }))
  await field.fill(content)
  const send = await firstVisible(page.getByRole('button', { name: 'Enviar mensagem', exact: true }))
  await send.waitFor({ state: 'visible' })
  return send
}

let browser
try {
  browser = await launchBrowser()

  // --- Tutor envia: bolha própria rosa (R8) ---
  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await openMessages(tutor)
  await openConversation(tutor, 'Conversa com Groomer de Teste')

  const field = await firstVisible(tutor.getByRole('textbox', { name: 'Mensagem', exact: true }))
  const send = await sendMessage(tutor, tutorMessage)
  check('CMP-17 botão Enviar em rosa de ação (action.primary)', await backgroundOf(send) === CTA_PINK, await backgroundOf(send))
  check('R1 campo de mensagem com raio 12 (AC-07)', await fieldRadiusOf(field) === '12px', await fieldRadiusOf(field))
  await shot(tutor, 'chat-tutor-digitando')

  await send.click({ timeout: 20000 })
  const own = await bubbleFor(tutor, tutorMessage)
  await own.text.waitFor({ timeout: 15000 })
  check('CMP-17 bolha própria do tutor em rosa de ação (R8)', await backgroundOf(own.bubble) === CTA_PINK, await backgroundOf(own.bubble))
  check('CMP-17 texto da bolha própria em branco', await colorOf(own.text) === WHITE)
  check('AC-11 bolha própria sem borda', await borderWidthOf(own.bubble) === '0px')
  await shot(tutor, 'chat-tutor-enviado')

  const headerTitle = await firstVisible(tutor.getByRole('heading', { name: 'Conversa', exact: true }))
  check('R4 chat sem faixa teal, fundo canvas', await backgroundOf(headerTitle) === CANVAS, await backgroundOf(headerTitle))
  const counterpart = await firstVisible(tutor.getByLabel('Groomer de Teste', { exact: true }))
  check('R8 avatar do profissional no cabeçalho do chat em teal', await backgroundOf(counterpart) === TEAL, await backgroundOf(counterpart))

  // --- Profissional recebe e responde: recebida branca, própria teal (R8) ---
  const professional = await openPage(browser)
  await loginProfessional(professional)
  await openMessages(professional)
  await openConversation(professional, 'Conversa com Tutor de Teste')
  const received = await bubbleFor(professional, tutorMessage)
  await received.text.waitFor({ timeout: 15000 })
  check('AC-11 bolha recebida em branco com borda 1 pt', await backgroundOf(received.bubble) === WHITE && await borderWidthOf(received.bubble) === '1px')
  check('AC-11 bolha recebida usa texto primário', await colorOf(received.text) === TEXT)

  const proSend = await sendMessage(professional, professionalMessage)
  check('CMP-17 botão Enviar em rosa de ação no papel profissional', await backgroundOf(proSend) === CTA_PINK)
  await proSend.click({ timeout: 20000 })
  const proOwn = await bubbleFor(professional, professionalMessage)
  await proOwn.text.waitFor({ timeout: 15000 })
  check('CMP-17 bolha própria do profissional em teal (R8)', await backgroundOf(proOwn.bubble) === TEAL, await backgroundOf(proOwn.bubble))
  check('CMP-17 texto da bolha teal em branco', await colorOf(proOwn.text) === WHITE)
  const tutorAvatarInChat = await firstVisible(professional.getByLabel('Tutor de Teste', { exact: true }))
  check('R8 avatar do tutor no cabeçalho do chat em rosa sutil', await backgroundOf(tutorAvatarInChat) === PINK_SUBTLE, await backgroundOf(tutorAvatarInChat))
  await shot(professional, 'chat-profissional')

  // --- Tutor vê a resposta recebida ---
  const reply = await bubbleFor(tutor, professionalMessage)
  await reply.text.waitFor({ timeout: 15000 })
  check('AC-11 resposta recebida pelo tutor em bolha branca com borda', await backgroundOf(reply.bubble) === WHITE && await borderWidthOf(reply.bubble) === '1px')
  await shot(tutor, 'chat-tutor-recebido')

  // --- Erro, carregando e vazio (tela 25) ---
  const failing = await openPage(browser)
  await gateRoute(failing, '**/api/v1/conversations/*/messages*', { fail: true })
  await loginTutor(failing)
  await openMessages(failing)
  await openConversation(failing, 'Conversa com Groomer de Teste').catch(() => {})
  const errorText = await firstVisible(failing.getByText('Não foi possível carregar esta conversa.', { exact: true }))
  await errorText.waitFor({ timeout: 20000 }).catch(() => {})
  check('AC-08 erro da conversa mostra mensagem com texto', await errorText.isVisible())
  check('AC-08 erro da conversa mantém a ação Tentar novamente', await (await firstVisible(failing.getByRole('button', { name: 'Tentar novamente', exact: true }))).isVisible())
  await shot(failing, 'chat-erro')

  const loading = await openPage(browser)
  await gateRoute(loading, '**/api/v1/conversations/*/messages*', { delayMs: 3000 })
  await loginTutor(loading)
  await openMessages(loading)
  await openConversation(loading, 'Conversa com Groomer de Teste').catch(() => {})
  const spinner = await firstVisible(loading.getByRole('progressbar'))
  await spinner.waitFor({ timeout: 5000 }).catch(() => {})
  check('AC-08 carregamento da conversa mostra indicador', await spinner.isVisible())
  await shot(loading, 'chat-carregando')

  const empty = await openPage(browser)
  await empty.route('**/api/v1/conversations/*/messages*', route => route.fulfill({ json: { data: [] } }))
  await loginTutor(empty)
  await openMessages(empty)
  await openConversation(empty, 'Conversa com Groomer de Teste')
  const emptyText = await firstVisible(empty.getByText('Nenhuma mensagem ainda. Diga olá!', { exact: true }))
  await emptyText.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 conversa vazia orienta o primeiro envio com texto', await emptyText.isVisible())
  await shot(empty, 'chat-vazio')
} catch (error) {
  run.fail(error)
} finally {
  await pool.query('DELETE FROM messages WHERE content = ANY($1)', [[tutorMessage, professionalMessage]]).catch(error => run.fail(error))
  await pool.end().catch(() => {})
  await run.finish(browser)
}
