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
  command: 'node e2e/tutor-search.mjs',
  evidence: evidenceFile('006-tutor-search', 'tutor-search.log'),
})
const { check } = session

async function openSearch(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByText('Informe o endereço e escolha um serviço ou uma modalidade.').waitFor()
}

async function searchAddress(page, address, serviceName) {
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill(address)
  if (serviceName) {
    const selected = page.getByRole('radio', { name: `${serviceName}, selecionado` })
    if (await selected.count() === 0) {
      const service = page.getByRole('radio', { name: serviceName, exact: true })
      await service.scrollIntoViewIfNeeded()
      await service.click()
    }
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
}

async function cardLabel(page) {
  const card = page.getByRole('button', { name: /Groomer de Teste/ })
  await card.waitFor({ timeout: 15000 })
  return card.evaluate((element) => element.getAttribute('aria-label') || element.textContent || '')
}

async function run(browser) {
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/coverage**', gate)

  await loginTutor(page)
  await openSearch(page)
  check('AC-01 busca da home abre a listagem', await page.getByRole('button', { name: 'Buscar' }).count() > 0)

  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Endereço do atendimento obrigatório', { exact: true }).waitFor()
  await page.getByText('Selecione um serviço ou uma modalidade', { exact: true }).waitFor()
  check('AC-02 endereço e filtro são exigidos', true)

  gate.fail = true
  await searchAddress(page, 'Avenida Paulista, São Paulo', 'Banho')
  await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
  check('AC-05 erro da busca', true)
  gate.fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor({ timeout: 15000 })

  gate.delayMs = 1200
  await page.getByRole('radio', { name: 'Tosa', exact: true }).click()
  await page.getByText('Buscando groomers').waitFor({ timeout: 5000 })
  check('AC-05 carregando', true)
  gate.delayMs = 0
  const tosaCard = await cardLabel(page)
  check('AC-02 filtro de serviço muda o preço', tosaCard.includes('Tosa') && tosaCard.includes('100,00') && tosaCard.includes('5,0'), tosaCard)

  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Jabaquara, São Paulo')
  if (await page.getByRole('radio', { name: 'Banho, selecionado' }).count() === 0) {
    await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Nenhum groomer atende este endereço.').waitFor({ timeout: 15000 })
  check('AC-03 e AC-05 groomer fora do raio fica de fora', true)

  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Rua sem mapa, 10')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Não foi possível localizar este endereço.').waitFor({ timeout: 15000 })
  check('AC-05 endereço desconhecido é erro', true)

  await searchAddress(page, 'Avenida Paulista, São Paulo', 'Banho')
  const banhoCard = await cardLabel(page)
  check('AC-04 card mostra avaliação e preço', banhoCard.includes('5,0') && banhoCard.includes('80,00') && banhoCard.includes('Banho'), banhoCard)
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
  await page.getByLabel('Profissional Groomer de Teste').waitFor({ timeout: 15000 })
  check(
    'AC-04 card abre o perfil',
    await page.getByText('Atendimento em domicílio. O tutor precisa estar presente durante o serviço.', { exact: true }).count() > 0,
  )

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Banho e Tosa' }).click()
  await page.getByRole('button', { name: 'Banho', exact: true }).click()
  await page.getByText('Informe o endereço do atendimento para ver quem atende.').waitFor()
  await page.getByRole('radio', { name: 'Banho, selecionado' }).waitFor()
  check('AC-03 categoria também passa pela cobertura', await page.getByRole('button', { name: /Groomer de Teste/ }).count() === 0)

  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openSearch(wide)
  await checkContrast(wide, wide.getByText('Quem atende', { exact: true }).first(), 'AC-01 desktop claro', check)

  const dark = await openPage(browser, { viewport: 'mobile', colorScheme: 'dark' })
  await loginTutor(dark)
  await openSearch(dark)
  await checkContrast(dark, dark.getByText('Quem atende', { exact: true }).first(), 'AC-01 celular escuro', check)
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
