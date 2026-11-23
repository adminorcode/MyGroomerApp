import { evidenceFile, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '031-fluxo-profissional'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/profissional-fluxo.mjs',
  evidence: evidenceFile(plan, 'profissional-fluxo.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços', exact: true })
  await tab.waitFor({ timeout: 20000 })
  await tab.click()
}

async function disabled(locator) {
  return locator.evaluate(element => element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'))
}

let browser
try {
  browser = await launchBrowser()
  const professional = await openPage(browser, { viewport: 'mobile' })
  await loginProfessional(professional)
  check('AC-01 a agenda do profissional não usa o termo groomer', await professional.getByRole('heading', { name: 'Agenda do profissional', exact: true }).isVisible())
  await shot(professional, 'agenda-profissional')

  await openServices(professional)
  await professional.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await professional.getByRole('button', { name: 'Continuar', exact: true }).click()
  await professional.getByRole('heading', { name: 'Local de atendimento', exact: true }).waitFor({ timeout: 20000 })
  const continueLocation = professional.getByRole('button', { name: 'Continuar', exact: true })
  const started = Date.now()
  while (Date.now() - started < 25000) {
    if (!(await disabled(continueLocation))) break
    await professional.waitForTimeout(200)
  }
  check('AC-02 o local não oferece o atalho Disponibilidade semanal', await professional.getByRole('button', { name: 'Disponibilidade semanal', exact: true }).count() === 0)
  await continueLocation.click()
  await professional.getByRole('heading', { name: 'Disponibilidade', exact: true }).waitFor({ timeout: 20000 })
  check('AC-02 Continuar no local abre a disponibilidade', await professional.getByRole('heading', { name: 'Disponibilidade', exact: true }).isVisible())

  const review = professional.getByRole('button', { name: 'Ir para revisão', exact: true })
  await review.click()
  await professional.getByText('Escolha de 15 em 15 minutos, até 2 horas.', { exact: true }).waitFor({ timeout: 10000 })
  check('AC-03 rotina inválida permanece na disponibilidade', await professional.getByRole('heading', { name: 'Revisão', exact: true }).count() === 0)

  await professional.getByRole('button', { name: 'segunda-feira, desligado' }).click()
  await professional.getByRole('button', { name: '30 minutos', exact: true }).click()
  await review.click()
  await professional.getByRole('heading', { name: 'Revisão', exact: true }).waitFor({ timeout: 20000 })
  check('AC-03 Ir para revisão abre a revisão', await professional.getByText('Rotina salva.', { exact: true }).isVisible())
  check('AC-03 a revisão mostra o horário salvo', await professional.getByText('Segunda, 09:00 às 18:00', { exact: true }).isVisible())
  await shot(professional, 'revisao')
  await professional.getByRole('button', { name: 'Concluir', exact: true }).click()
  await professional.getByRole('heading', { name: 'Agenda do profissional', exact: true }).waitFor({ timeout: 20000 })
  check('AC-04 Concluir abre a agenda', true)
  await professional.context().close()

  const tutor = await openPage(browser, { viewport: 'mobile' })
  await loginTutor(tutor)
  await tutor.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await tutor.getByRole('button', { name: 'Meus pets', exact: true }).waitFor({ timeout: 20000 })
  check('AC-05 o perfil do tutor não oferece Quero ser groomer', await tutor.getByRole('button', { name: 'Quero ser groomer', exact: true }).count() === 0)
  await shot(tutor, 'perfil-tutor')
  await tutor.getByRole('tab', { name: 'Início', exact: true }).click()
  await tutor.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await tutor.getByRole('tab', { name: 'Profissionais', exact: true }).waitFor({ timeout: 20000 })
  check('AC-06 a busca nomeia a aba como Profissionais', await tutor.getByRole('tab', { name: 'Groomers', exact: true }).count() === 0)
  await shot(tutor, 'busca-profissionais')
  await tutor.context().close()
} finally {
  await browser?.close().catch(() => {})
  await run.finish()
}
