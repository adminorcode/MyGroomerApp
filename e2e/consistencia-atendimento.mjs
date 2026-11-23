import { appUrl, evidenceFile, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '032-consistencia-atendimento'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/consistencia-atendimento.mjs',
  evidence: evidenceFile(plan, 'consistencia-atendimento.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

async function visible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

let browser
try {
  browser = await launchBrowser()

  const reset = await openPage(browser)
  await reset.goto(`${appUrl}/reset-password?token=demonstracao`, { waitUntil: 'domcontentloaded' })
  const resetHeading = reset.getByRole('heading', { name: 'Nova senha', exact: true })
  await resetHeading.waitFor({ timeout: 20000 })
  check('AC-01 o link reset-password abre Nova senha', await resetHeading.isVisible())
  check('AC-01 a redefinição pede a nova senha', await reset.getByRole('textbox', { name: 'Nova senha', exact: true }).isVisible())
  await shot(reset, 'redefinir-senha')

  const professional = await openPage(browser)
  await loginProfessional(professional)
  await professional.getByRole('button', { name: 'Mês', exact: true }).click()
  const confirmed = await visible(professional.getByRole('button', { name: /Confirmado/ }))
  await confirmed.click()
  await professional.getByRole('heading', { name: 'Detalhes do agendamento', exact: true }).waitFor({ timeout: 20000 })
  const depart = professional.getByRole('button', { name: 'Estou a caminho', exact: true })
  await depart.waitFor({ timeout: 15000 })
  check('AC-02 o confirmado oferece Estou a caminho', await depart.isVisible())
  await depart.click()
  await professional.getByRole('button', { name: 'Iniciar atendimento', exact: true }).waitFor({ timeout: 15000 })
  check('AC-02 depois do caminho o detalhe oferece Iniciar atendimento', await professional.getByRole('button', { name: 'Iniciar atendimento', exact: true }).isVisible())
  check('AC-02 o status passa a Em deslocamento', await (await visible(professional.getByText('Em deslocamento', { exact: true }))).isVisible())
  await shot(professional, 'em-deslocamento')

  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await tutor.getByRole('tab', { name: 'Agendamentos', exact: true }).click()
  await tutor.getByRole('button', { name: 'Em andamento', exact: true }).click()
  const visit = await visible(tutor.getByRole('button', { name: /Endereco ficticio para teste/ }))
  await visit.click()
  const message = tutor.getByRole('button', { name: 'Mensagem', exact: true })
  await message.waitFor({ timeout: 20000 })
  check('AC-03 o atendimento em andamento oferece Mensagem', await message.isVisible())
  await message.click()
  await tutor.getByRole('heading', { name: 'Conversa', exact: true }).waitFor({ timeout: 20000 })
  check('AC-03 Mensagem abre a conversa', await tutor.getByRole('heading', { name: 'Conversa', exact: true }).isVisible())
  check('AC-04 a conversa mostra a mensagem e o campo', await tutor.getByText('Perfeito, estou testando o aplicativo.', { exact: true }).isVisible()
    && await tutor.getByRole('textbox', { name: 'Mensagem', exact: true }).isVisible())
  await shot(tutor, 'conversa')

  const empty = await openPage(browser)
  await empty.route('**/api/v1/conversations/*/messages*', route => route.fulfill({ json: { data: [] } }))
  await loginTutor(empty)
  await empty.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await empty.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).click()
  const emptyTitle = empty.getByText('Nenhuma mensagem ainda', { exact: true })
  await emptyTitle.waitFor({ timeout: 20000 })
  check('AC-04 a conversa vazia usa o estado vazio', await emptyTitle.isVisible() && await empty.getByText('Diga olá!', { exact: true }).isVisible())
  await shot(empty, 'conversa-vazia')

  const failing = await openPage(browser)
  await gateRoute(failing, '**/api/v1/conversations/*/messages*', { fail: true })
  await loginTutor(failing)
  await failing.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await failing.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).click()
  const errorText = failing.getByText('Não foi possível carregar esta conversa.', { exact: true })
  await errorText.waitFor({ timeout: 20000 })
  check('AC-05 erro da conversa mostra a mensagem e Tentar novamente', await errorText.isVisible() && await failing.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())

  const loading = await openPage(browser)
  await gateRoute(loading, '**/api/v1/conversations/*/messages*', { delayMs: 2500 })
  await loginTutor(loading)
  await loading.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await loading.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).click()
  const loadingText = loading.getByText('Carregando conversa', { exact: true })
  await loadingText.waitFor({ timeout: 5000 })
  check('AC-05 carregando a conversa mostra o texto', await loadingText.isVisible())
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
