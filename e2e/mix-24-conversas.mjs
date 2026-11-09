import { evidenceFile, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-24-conversas.mjs',
  evidence: evidenceFile(plan, 'mix-24-conversas.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

// Tokens resolvidos em rgb (R1, R3, R5, R8, Q1).
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle
const PINK_TEXT = 'rgb(198, 38, 105)' // action.primaryText
const TEAL = 'rgb(22, 125, 131)' // brand.teal
const WHITE = 'rgb(255, 255, 255)' // text.inverse

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

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function openMessages(page) {
  await (await firstVisible(page.getByRole('tab', { name: 'Mensagens', exact: true }))).click()
}
const heading = page => firstVisible(page.getByRole('heading', { name: 'Mensagens', exact: true }))

// Ajusta a resposta real de conversas (fixture local). Só altera o que o seed não cobre.
async function rewriteConversations(page, transform) {
  await page.route('**/api/v1/conversations', async route => {
    const response = await route.fetch()
    const body = await response.json()
    const list = Array.isArray(body) ? body : body.data
    const next = transform(Array.isArray(list) ? list : [])
    await route.fulfill({ response, json: Array.isArray(body) ? next : { ...body, data: next } })
  })
}

let browser
try {
  browser = await launchBrowser()

  // --- Tutor: conversas com profissionais (R8 interlocutor teal) ---
  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await openMessages(tutor)
  await tutor.getByText('Converse com os profissionais', { exact: true }).waitFor({ timeout: 15000 })

  const tutorHeading = await heading(tutor)
  check('Q1 cabeçalho Mensagens sobre faixa teal (CMP-05)', await backgroundOf(tutorHeading) === TEAL, await backgroundOf(tutorHeading))
  check('R5 título do cabeçalho em branco sobre teal', await colorOf(tutorHeading) === WHITE)
  check('AC-04 título branco sobre teal com contraste 4,5:1 ou mais', ratio(WHITE, TEAL) >= 4.5, `${ratio(WHITE, TEAL).toFixed(2)}:1`)

  const proRow = await firstVisible(tutor.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }))
  const proAvatar = await firstVisible(proRow.getByLabel('Groomer de Teste', { exact: true }))
  check('R8 avatar do profissional interlocutor em teal sólido', await backgroundOf(proAvatar) === TEAL, await backgroundOf(proAvatar))
  check('AC-04 inicial do avatar teal em branco com contraste 4,5:1 ou mais', await colorOf(proAvatar.getByText('G', { exact: true })) === WHITE && ratio(WHITE, TEAL) >= 4.5)
  await shot(tutor, 'conversas-tutor')

  // --- Contador de não lidas (fixture: o seed não tem não lidas) ---
  const unread = await openPage(browser)
  await rewriteConversations(unread, list => list.map(item => (item.provider_name === 'Groomer de Teste' ? { ...item, unread_count: 3 } : item)))
  await loginTutor(unread)
  await openMessages(unread)
  const unreadRow = await firstVisible(unread.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }))
  const badge = await firstVisible(unreadRow.getByText('3', { exact: true }))
  check('R1 contador de não lidas em rosa de ação (action.primary)', await backgroundOf(badge) === CTA_PINK, await backgroundOf(badge))
  check('AC-04 contador usa texto branco sobre rosa de ação com contraste 4,5:1 ou mais', await colorOf(badge) === WHITE && ratio(WHITE, CTA_PINK) >= 4.5)

  // --- Profissional: conversas com tutores (R8 interlocutor rosa) ---
  const professional = await openPage(browser)
  await loginProfessional(professional)
  await openMessages(professional)
  await professional.getByText('Converse com os tutores', { exact: true }).waitFor({ timeout: 15000 })

  const proHeading = await heading(professional)
  check('Q1 cabeçalho Mensagens sobre faixa teal no papel profissional', await backgroundOf(proHeading) === TEAL)

  const tutorRow = await firstVisible(professional.getByRole('button', { name: 'Conversa com Tutor de Teste', exact: true }))
  const tutorAvatar = await firstVisible(tutorRow.getByLabel('Tutor de Teste', { exact: true }))
  check('R8 avatar do tutor interlocutor em rosa sutil (pinkSubtle)', await backgroundOf(tutorAvatar) === PINK_SUBTLE, await backgroundOf(tutorAvatar))
  check('R5 inicial do avatar do tutor em rosa-texto sobre pinkSubtle', await colorOf(tutorAvatar.getByText('T', { exact: true })) === PINK_TEXT)
  await shot(professional, 'conversas-profissional')

  // --- Carregando (tela 24) ---
  const loading = await openPage(browser)
  await gateRoute(loading, '**/api/v1/conversations', { delayMs: 3000 })
  await loginTutor(loading)
  await openMessages(loading)
  const spinner = await firstVisible(loading.getByLabel('Carregando conversas', { exact: true }))
  await spinner.waitFor({ timeout: 5000 }).catch(() => {})
  check('AC-08 carregamento das conversas mostra indicador rotulado', await spinner.isVisible())
  check('Q1 faixa teal permanece durante o carregamento', await backgroundOf(await heading(loading)) === TEAL)
  await shot(loading, 'conversas-carregando')

  // --- Erro (tela 24) ---
  const failing = await openPage(browser)
  await gateRoute(failing, '**/api/v1/conversations', { fail: true })
  await loginTutor(failing)
  await openMessages(failing)
  const errorText = failing.getByText('Não foi possível carregar as conversas.', { exact: true })
  await errorText.first().waitFor({ timeout: 20000 }).catch(() => {})
  check('AC-08 erro das conversas mostra mensagem com texto', await (await firstVisible(errorText)).isVisible())
  check('AC-08 erro mantém a ação Tentar novamente', await (await firstVisible(failing.getByRole('button', { name: 'Tentar novamente', exact: true }))).isVisible())
  check('Q1 faixa teal permanece no erro', await backgroundOf(await heading(failing)) === TEAL)
  await shot(failing, 'conversas-erro')

  // --- Vazio (tela 24) ---
  const empty = await openPage(browser)
  await rewriteConversations(empty, () => [])
  await loginTutor(empty)
  await openMessages(empty)
  const emptyText = await firstVisible(empty.getByText('Nenhuma conversa ainda. Comece pelo agendamento.', { exact: true }))
  await emptyText.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 estado vazio das conversas orienta o próximo passo com texto', await emptyText.isVisible())
  check('Q1 faixa teal permanece no estado vazio', await backgroundOf(await heading(empty)) === TEAL)
  await shot(empty, 'conversas-vazio')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
