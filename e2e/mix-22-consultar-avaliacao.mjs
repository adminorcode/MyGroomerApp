import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-22-consultar-avaliacao.mjs',
  evidence: evidenceFile(plan, 'mix-22-consultar-avaliacao.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary: estrelas selecionadas (R1)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle: destaque da nota
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary sobre tealSubtle (R5)
const WHITE = 'rgb(255, 255, 255)'
const REVIEW_COMMENT = 'Avaliacao ficticia para demonstracao local.' // avaliação do seed (booking 23)
const PROVIDER_NAME = 'Groomer de Teste' // provider_name do seed; a rota ReviewDetail recebe providerName (R3)
const TEAL = 'rgb(22, 125, 131)' // brand.teal: avatar do profissional (R3)

// Telas empilhadas permanecem no DOM: só interessa o que está visível.
const visible = locator => locator.filter({ visible: true })
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}
const starPaints = stars => stars.locator('path').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).fill))

// Avaliação do seed fica na reserva concluída com review_id; o caminho passa por Agendamentos > Concluído.
async function openReviewDetail(page) {
  await page.getByText('Agendamentos', { exact: true }).click()
  await page.getByText('Concluído', { exact: true }).first().click()
  await page.getByRole('button').filter({ has: page.getByText('por Groomer de Teste', { exact: true }) }).first().click()
  const seeing = visible(page.getByRole('button', { name: 'Ver avaliação', exact: true }))
  await seeing.waitFor({ timeout: 15000 })
  await seeing.click()
}

let browser
try {
  browser = await launchBrowser()

  // --- Erro e recuperação (tela 22) ---
  const page = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, /\/api\/v1\/reviews\/[^/?]+$/, gate)
  await loginTutor(page)
  await openReviewDetail(page)
  const errorMessage = visible(page.getByText('Não foi possível carregar esta avaliação.', { exact: true }))
  await errorMessage.waitFor({ timeout: 40000 })
  check('AC-08 erro ao carregar a avaliação mostra mensagem com texto', await errorMessage.count() === 1)
  check('AC-08 erro oferece tentar novamente', await visible(page.getByRole('button', { name: 'Tentar novamente', exact: true })).count() === 1)
  await shot(page, 'consultar-erro')

  gate.fail = false
  await visible(page.getByRole('button', { name: 'Tentar novamente', exact: true })).click()
  const comment = visible(page.getByText(REVIEW_COMMENT, { exact: true }))
  await comment.waitFor({ timeout: 20000 })

  // --- Conteúdo da avaliação (tela 22) ---
  const stars = visible(page.getByRole('img', { name: '5 de 5 estrelas', exact: true }))
  await stars.waitFor()
  const paints = await starPaints(stars)
  check('AC-03 R1 estrelas da avaliação em action.primary', paints.length === 5 && paints.every(fill => fill === CTA_PINK), JSON.stringify(paints))
  const score = visible(page.getByText('5 de 5', { exact: true }))
  const scoreBox = await score.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
  check('AC-04 destaque da nota usa text.primary sobre tealSubtle (R5)', scoreBox.bg === TEAL_SUBTLE && scoreBox.color === TEXT_PRIMARY && ratio(scoreBox.color, scoreBox.bg) >= 4.5, JSON.stringify(scoreBox))
  const card = await comment.evaluate(el => {
    const parent = el.parentElement
    const cs = getComputedStyle(parent)
    return { bg: cs.backgroundColor, border: cs.borderTopWidth, radius: cs.borderRadius }
  })
  check('AC-07 cartão da avaliação com raio 16 e borda 1', card.radius === '16px' && card.border === '1px' && card.bg === WHITE, JSON.stringify(card))
  check('AC-08 comentário e data aparecem com texto', await visible(page.getByText(/^Avaliado em /)).count() === 1)
  const avatar = visible(page.getByLabel(PROVIDER_NAME, { exact: true }))
  const avatarBackground = await avatar.count() === 1 ? await avatar.first().evaluate(el => getComputedStyle(el).backgroundColor) : 'ausente'
  check('AC-03 R3 avatar do profissional em teal quando a rota recebe providerName', avatarBackground === TEAL, avatarBackground)
  await shot(page, 'consultar-avaliacao')

  // --- Carregando (tela 22): cache novo, sem dados prévios ---
  const loadingPage = await openPage(browser)
  const slow = { fail: false, delayMs: 2500 }
  await gateRoute(loadingPage, /\/api\/v1\/reviews\/[^/?]+$/, slow)
  await loginTutor(loadingPage)
  await openReviewDetail(loadingPage)
  const loadingText = visible(loadingPage.getByText('Carregando sua avaliação...', { exact: true }))
  await loadingText.waitFor({ timeout: 10000 })
  check('AC-08 carregamento mostra texto e indicador', await loadingText.count() === 1 && await visible(loadingPage.getByLabel('Carregando avaliação', { exact: true })).count() === 1)
  await shot(loadingPage, 'consultar-carregando')
  await visible(loadingPage.getByText(REVIEW_COMMENT, { exact: true })).waitFor({ timeout: 20000 })
  await loadingPage.close()
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
