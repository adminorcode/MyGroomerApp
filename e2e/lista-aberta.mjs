import { evidenceFile, fillServiceAddress, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '033-lista-aberta'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/lista-aberta.mjs',
  evidence: evidenceFile(plan, 'lista-aberta.log'),
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

  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await tutor.getByRole('tab', { name: 'Agendamentos', exact: true }).click()
  await tutor.getByRole('button', { name: 'Confirmado', exact: true }).click()
  const booking = await visible(tutor.getByRole('button', { name: /Endereco ficticio para teste/ }))
  await booking.click()
  await tutor.getByRole('heading', { name: 'Detalhe do agendamento', exact: true }).waitFor({ timeout: 20000 })
  check('AC-01 o detalhe mostra Valor estimado', await tutor.getByText('Valor estimado', { exact: true }).first().isVisible())
  check('AC-01 o detalhe não rotula o valor como Pagamento', await tutor.getByText('Pagamento', { exact: true }).count() === 0)
  await shot(tutor, 'valor-estimado')

  const professional = await openPage(browser)
  await loginProfessional(professional)
  await professional.getByRole('tab', { name: 'Serviços', exact: true }).click()
  await professional.getByRole('heading', { name: 'Serviços e preços', exact: true }).waitFor({ timeout: 20000 })
  check('AC-02 a aba Serviços do cadastro concluído oferece Salvar', await professional.getByRole('button', { name: 'Salvar', exact: true }).isVisible())
  check('AC-02 a aba Serviços não continua o assistente', await professional.getByRole('button', { name: 'Continuar', exact: true }).count() === 0)
  await shot(professional, 'servicos-edicao')
  await professional.getByRole('tab', { name: 'Agenda', exact: true }).click()
  await professional.getByRole('button', { name: 'Mês', exact: true }).click()
  const card = await visible(professional.getByRole('button', { name: /Confirmado|Em andamento|Em deslocamento/ }))
  await card.click()
  await professional.getByRole('heading', { name: 'Detalhes do agendamento', exact: true }).waitFor({ timeout: 20000 })
  check('AC-03 o detalhe do profissional usa o cabeçalho com Voltar', await professional.getByRole('button', { name: 'Voltar', exact: true }).isVisible())
  await shot(professional, 'detalhe-profissional')

  await tutor.getByRole('tab', { name: 'Início', exact: true }).click()
  await tutor.getByRole('button', { name: 'Banho e Tosa', exact: true }).waitFor({ timeout: 20000 })
  await shot(tutor, 'categoria-inicio')
  await tutor.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(tutor, 'Avenida Paulista, São Paulo')
  await tutor.getByRole('button', { name: 'Ver perfil de Groomer de Teste', exact: true }).waitFor({ timeout: 20000 })
  await shot(tutor, 'busca-preco')
  await tutor.getByRole('button', { name: 'Filtros', exact: true }).click()
  await tutor.getByRole('heading', { name: 'Filtrar resultados', exact: true }).waitFor({ timeout: 20000 })
  check('AC-04 os filtros oferecem o tipo de profissional', await tutor.getByText('Tipo de profissional', { exact: true }).isVisible())
  await tutor.getByRole('button', { name: 'Cancelar', exact: true }).last().click()
  await tutor.getByRole('button', { name: 'Ver perfil de Groomer de Teste', exact: true }).click()
  await tutor.getByRole('heading', { name: 'Avaliações', exact: true }).waitFor({ timeout: 20000 })
  check('AC-05 o perfil público mostra o comentário da avaliação', await tutor.getByText('Avaliacao ficticia para demonstracao local.', { exact: true }).isVisible())
  await shot(tutor, 'avaliacoes')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
