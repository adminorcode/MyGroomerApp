import {
  checkContrast,
  evidenceFile,
  gateRoute,
  launchBrowser,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const session = startRun({
  command: 'node e2e/groomer-public-profile.mjs',
  evidence: evidenceFile('007-groomer-public-profile', 'groomer-public-profile.log'),
})
const { check } = session
const rules = 'Atendimento em domicílio. O tutor precisa estar presente durante o serviço.'

async function expectBooking(page, serviceName) {
  await page.getByText('Escolha um horário', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByText('Pet', { exact: true }).waitFor()
  await page.getByLabel(`Serviço: ${serviceName}`, { exact: true }).waitFor()
  await page.getByLabel('Profissional: Groomer de Teste', { exact: true }).waitFor()
}

async function openProfile(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
  const selected = page.getByRole('radio', { name: 'Banho, selecionado' })
  if (await selected.count() === 0) {
    await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
}

async function run(browser) {
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/**/profile', gate)

  await loginTutor(page)
  gate.fail = true
  await openProfile(page)
  await page.getByText('Não foi possível carregar este perfil.').waitFor({ timeout: 15000 })
  check('AC-01 erro do perfil', true)
  gate.fail = false
  gate.delayMs = 1200
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('Carregando perfil').waitFor({ timeout: 15000 })
  check('AC-01 carregando', true)
  gate.delayMs = 0
  await page.getByText('Regras de atendimento', { exact: true }).waitFor({ timeout: 15000 })

  const book = page.getByRole('button', { name: 'Agendar serviço' })
  const header = page.getByLabel('Profissional Groomer de Teste')
  await header.waitFor()
  check(
    'AC-01 perfil mostra profissional, reputação e preços-base',
    await header.getByText('Verificado', { exact: true }).count() > 0
      && await header.getByText(/Avaliação 5,0/).count() > 0
      && await page.getByRole('radio', { name: /^Banho, A partir de/ }).count() > 0
      && await page.getByRole('radio', { name: /^Tosa, A partir de/ }).count() > 0
      && await page.getByRole('radio', { name: /^Banho e tosa, A partir de/ }).count() > 0
      && await page.getByRole('radio', { name: /80,00/ }).count() > 0
      && await page.getByRole('radio', { name: /100,00/ }).count() > 0
      && await page.getByRole('radio', { name: /150,00/ }).count() > 0,
  )
  check('AC-02 regras de atendimento', await page.getByText(rules, { exact: true }).count() > 0)
  check('AC-04 sem serviço o agendamento não avança', await book.isDisabled())
  check('AC-04 orientação sem seleção', await page.getByText('Selecione um serviço para continuar.', { exact: true }).count() > 0)

  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('radio', { name: /Banho, selecionado, A partir de/ }).waitFor()
  check('AC-03 serviço selecionado libera o agendamento', await book.isEnabled())
  await book.click()
  await expectBooking(page, 'Banho')
  check('AC-03 Banho segue com o profissional para pet e horário', true)

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('radio', { name: /^Tosa, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço' }).click()
  await expectBooking(page, 'Tosa')
  check('AC-03 Tosa segue com o profissional para pet e horário', true)

  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openProfile(wide)
  await checkContrast(
    wide,
    wide.getByText('Perfil do profissional', { exact: true }).first(),
    'AC-01 desktop claro',
    check,
  )
  check('AC-04 desktop também começa sem seleção', await wide.getByRole('button', { name: 'Agendar serviço' }).isDisabled())
}

let browser
try {
  browser = await launchBrowser()
  await run(browser)
} catch (error) {
  session.fail(error)
} finally {
  await session.finish(browser)
}
