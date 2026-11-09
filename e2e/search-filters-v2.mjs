import { evidenceFile, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '028-explorar-groomers-servicos'
const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/search-filters-v2.mjs', evidence: evidenceFile(plan, 'search-filters-v2.log') })
const { check } = run
const shot = async (page, name) => {
  await page.getByRole('button', { name: 'Aplicar', exact: true }).evaluate(button => {
    let node = button.parentElement
    while (node && getComputedStyle(node).borderRightWidth !== '1px') node = node.parentElement
    node?.scrollIntoView({ block: 'start' })
  })
  await saveScreenshot(page, evidenceFile(plan, `ui-review/filtros-v2/${name}.png`))
  await page.getByRole('button', { name: 'Cancelar', exact: true }).scrollIntoViewIfNeeded()
  await saveScreenshot(page, evidenceFile(plan, `ui-review/filtros-v2/${name}-acoes.png`))
}
const names = ['Alfa', 'Beta', 'Gama', 'Delta']
const providers = names.map((name, index) => ({
  id: `offer-${index}`, provider_id: `provider-${index}`, service_id: 'banho', service_name: 'Banho', name,
  profile_picture: null, price: [50, 80, 110, 160][index], average_rating: [4, 4.5, 5, 0][index],
  review_count: [4, 12, 20, 0][index], distance_km: [1, 4, 8, 12][index], radius_km: 20,
  professional_types: ['Groomer'], is_verified: true, attends_at_home: true, available_today: index === 1,
  services: [
    { id: `offer-${index}`, service_id: 'banho', service_name: 'Banho', price: [50, 80, 110, 160][index] },
    ...(index === 0 ? [{ id: 'offer-alfa-tosa', service_id: 'tosa', service_name: 'Tosa', price: 140 }] : []),
  ],
}))
const cardNames = page => page.getByRole('button', { name: /^Ver perfil de / }).evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label').replace('Ver perfil de ', '')))
const expectNames = async (page, id, expected) => {
  await page.waitForFunction(expected => [...document.querySelectorAll('[role="button"]')].map(node => node.getAttribute('aria-label') || '').filter(label => label.startsWith('Ver perfil de ')).map(label => label.replace('Ver perfil de ', '')).join('|') === expected.join('|'), expected)
  check(id, JSON.stringify(await cardNames(page)) === JSON.stringify(expected), (await cardNames(page)).join(', '))
}
const open = async (page, label) => { await page.getByRole('button', { name: label, exact: true }).click() }
const radio = (page, label) => page.getByRole('radio', { name: label, exact: true })
const apply = page => page.getByRole('button', { name: 'Aplicar', exact: true }).click()
async function clearPanel(page, label) { await open(page, label); await open(page, 'Limpar'); await apply(page) }

let browser
try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await page.route('**/api/v1/customer-addresses', route => route.fulfill({ json: { data: [{ id: 'address-fixture', label: 'home', address: 'Avenida Paulista, 1000, São Paulo', latitude: -23.5614, longitude: -46.6559, is_default: true }] } }))
  await page.route('**/api/v1/providers/coverage**', route => route.fulfill({ json: { data: { providers } } }))
  await loginTutor(page)
  await open(page, 'Buscar um serviço')
  await expectNames(page, 'FV2-01 lista inicial preserva relevância da API', names)

  await open(page, 'Preço')
  await radio(page, 'até R$ 80').click()
  check('FV2-01 escolher preço não altera resultados antes de Aplicar', (await cardNames(page)).length === 4)
  await shot(page, '01-preco-390')
  await open(page, 'Cancelar')
  await open(page, 'Preço')
  check('FV2-01 Cancelar descarta preço em edição', await radio(page, 'Qualquer preço, selecionado').count() === 1)
  await radio(page, 'até R$ 80').click()
  await apply(page)
  await expectNames(page, 'FV2-02 teto de preço inclui limite e remove ofertas acima', ['Alfa', 'Beta'])
  check('FV2-06 contagem de filtros e destaque persistem após fechar', await page.getByRole('button', { name: 'Filtros, 1 aplicado', exact: true }).count() === 1 && await page.getByRole('button', { name: 'Preço', exact: true }).evaluate(node => getComputedStyle(node).backgroundColor === 'rgb(252, 229, 237)'))
  await open(page, 'Preço')
  await open(page, 'Limpar')
  check('FV2-01 Limpar ainda não altera lista aplicada', (await cardNames(page)).length === 2)
  await apply(page)
  await expectNames(page, 'FV2-01 Aplicar limpeza restaura lista', names)

  await open(page, 'Preço')
  await page.getByRole('textbox', { name: 'Preço mínimo', exact: true }).fill('120')
  await page.getByRole('textbox', { name: 'Preço máximo', exact: true }).fill('100')
  check('FV2-02 faixa invertida bloqueia Aplicar e explica erro', await page.getByRole('button', { name: 'Aplicar', exact: true }).isDisabled() && await page.getByText('O preço mínimo não pode ser maior que o máximo.', { exact: true }).count() === 1)
  await page.getByRole('textbox', { name: 'Preço mínimo', exact: true }).fill('-1')
  check('FV2-02 preço negativo é rejeitado', await page.getByRole('button', { name: 'Aplicar', exact: true }).isDisabled())
  await page.getByRole('textbox', { name: 'Preço mínimo', exact: true }).fill('R$ 80,50')
  await page.getByRole('textbox', { name: 'Preço máximo', exact: true }).fill('150,00')
  check('FV2-02 aceita moeda e centavos pt-BR', await page.getByRole('button', { name: 'Aplicar', exact: true }).isEnabled())
  await apply(page)
  await expectNames(page, 'FV2-02 considera outra oferta compatível do mesmo profissional', ['Alfa', 'Gama'])
  const alfa = page.getByRole('button', { name: 'Ver perfil de Alfa', exact: true })
  const alfaText = await alfa.evaluate(node => { let parent = node.parentElement; while (parent && getComputedStyle(parent).borderTopWidth !== '1px') parent = parent.parentElement; return parent?.innerText })
  check('FV2-02 card recalcula oferta e preço exibido', alfaText.includes('140,00') && alfaText.includes('Tosa') && !alfaText.includes('Banho'))
  await page.getByRole('tab', { name: 'Serviços', exact: true }).click()
  check('FV2-02 grupos de serviços refletem ofertas filtradas', await page.getByRole('button', { name: /Tosa, 1 groomer, a partir de R\$\s*140,00/ }).count() === 1)
  await page.getByRole('tab', { name: 'Groomers', exact: true }).click()
  await clearPanel(page, 'Preço')

  await open(page, 'Preço')
  const minimum = page.getByRole('slider', { name: 'Preço mínimo', exact: true })
  const maximum = page.getByRole('slider', { name: 'Preço máximo', exact: true })
  await minimum.focus(); await minimum.press('ArrowRight')
  check('FV2-02 slider mínimo responde ao teclado e sincroniza campo', await page.getByRole('textbox', { name: 'Preço mínimo', exact: true }).inputValue() === '5')
  await maximum.focus(); await maximum.press('ArrowLeft')
  check('FV2-02 slider máximo responde ao teclado e sincroniza campo', await page.getByRole('textbox', { name: 'Preço máximo', exact: true }).inputValue() === '295')
  const bounds = await maximum.boundingBox()
  await page.mouse.move(bounds.x + bounds.width - 28, bounds.y + bounds.height / 2); await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 10 }); await page.mouse.up()
  check('FV2-02 slider máximo responde a arrasto', Number(await page.getByRole('textbox', { name: 'Preço máximo', exact: true }).inputValue()) < 295)
  await open(page, 'Raio')
  await open(page, 'Preço')
  check('FV2-01 trocar de painel descarta edição', await radio(page, 'Qualquer preço, selecionado').count() === 1)
  await open(page, 'Preço')
  await open(page, 'Preço')
  check('FV2-01 fechar e reabrir não confirma edição', await radio(page, 'Qualquer preço, selecionado').count() === 1)
  await open(page, 'Cancelar')

  await open(page, 'Avaliação')
  await radio(page, '4,5+').click()
  await shot(page, '02-avaliacao-390')
  await apply(page)
  await expectNames(page, 'FV2-03 nota mínima combina reputações corretamente', ['Beta', 'Gama'])
  await clearPanel(page, 'Avaliação')
  await open(page, 'Avaliação')
  await page.getByRole('switch', { name: 'Somente profissionais com avaliações', exact: true }).click()
  const reviewedSwitch = page.getByRole('switch', { name: 'Somente profissionais com avaliações', exact: true })
  check('FV2-06 switch tem alvo real de 48 pt e nenhum input oculto focável', (await reviewedSwitch.boundingBox()).height >= 48 && await reviewedSwitch.locator('input').count() === 0)
  await reviewedSwitch.focus(); await reviewedSwitch.press('Space'); await reviewedSwitch.press('Space')
  check('FV2-06 switch responde ao teclado', await reviewedSwitch.getAttribute('aria-checked') === 'true')
  await apply(page)
  await expectNames(page, 'FV2-03 somente avaliados exclui profissional sem avaliações', ['Alfa', 'Beta', 'Gama'])
  await clearPanel(page, 'Avaliação')

  await open(page, 'Raio')
  await radio(page, 'Até 5 km').click()
  await shot(page, '03-raio-390')
  await apply(page)
  await expectNames(page, 'FV2-04 raio de 5 km', ['Alfa', 'Beta'])
  await open(page, 'Raio')
  const radius = page.getByRole('slider', { name: 'Raio em quilômetros', exact: true })
  await radius.focus(); await radius.press('ArrowRight')
  check('FV2-04 slider de raio atualiza resumo sem aplicar', await page.getByText('6 km', { exact: true }).count() === 1 && (await cardNames(page)).length === 2)
  await radio(page, 'Sem limite').click(); await apply(page)
  await expectNames(page, 'FV2-04 sem limite restaura resultado já coberto pela API', names)

  for (const [label, expected] of [['Menor preço', names], ['Melhor avaliação', ['Gama', 'Beta', 'Alfa', 'Delta']], ['Mais próximos', names], ['Disponíveis hoje', ['Beta', 'Alfa', 'Gama', 'Delta']], ['Relevância', names]]) {
    await open(page, 'Ordenar')
    await radio(page, label).click()
    await apply(page)
    await expectNames(page, `FV2-05 ${label} ordena sem excluir`, expected)
  }
  await open(page, 'Ordenar')
  await radio(page, 'Melhor avaliação').click()
  await open(page, 'Cancelar')
  await expectNames(page, 'FV2-05 Cancelar preserva ordem aplicada', names)

  for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await open(page, 'Ordenar')
    await page.getByText('Ordenar resultados', { exact: true }).scrollIntoViewIfNeeded()
    await shot(page, `04-ordenar-${viewport.width}`)
    check(`FV2-06 painel cabe em ${viewport.width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const applyBox = await page.getByRole('button', { name: 'Aplicar', exact: true }).boundingBox()
    check(`FV2-06 ações de 48 pt em ${viewport.width}`, applyBox.height >= 48)
    await open(page, 'Cancelar')
    if (viewport.width === 320) {
      for (const label of ['Preço', 'Avaliação', 'Raio']) {
        await open(page, label)
        await shot(page, `05-${label === 'Preço' ? 'preco' : label === 'Avaliação' ? 'avaliacao' : 'raio'}-320`)
        check(`FV2-06 ${label} sem overflow em 320`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        await open(page, 'Cancelar')
      }
    }
  }
} catch (error) { run.fail(error) }
finally { await run.finish(browser) }
