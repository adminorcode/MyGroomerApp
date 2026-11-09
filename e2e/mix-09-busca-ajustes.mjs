import { apiUrl, evidenceFile, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

// Plano 028 (Explorar, modelo iFood): endereço em letra pequena com "Trocar", sem campo de endereço nem mapa;
// busca por nome, tipo ou serviço; abas Groomers e Serviços sobre o mesmo resultado.
const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-09-busca-ajustes.mjs',
  evidence: evidenceFile(plan, 'mix-09-busca-ajustes.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const api = `${apiUrl}/api/v1`
const SAVED = { label: 'home', address: 'Avenida Paulista, 1000, São Paulo', latitude: -23.5614, longitude: -46.6559, is_default: true }

async function apiLogin(email) {
  const response = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'admin' }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`login ${email}`)
  return body.token
}

async function apiJson(route, token, method = 'GET', payload) {
  const response = await fetch(api + route, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`${method} ${route} ${response.status} ${text}`)
  return body
}

const queryField = page => page.getByRole('textbox', { name: 'Profissional, serviço ou tipo de atendimento', exact: true })

let browser
let restoreLocation
let createdAddressId = null
let restoreDefaultId = null
let tutorToken
try {
  const groomer = await apiLogin('groomer@email.com')
  const currentLocation = await apiJson('/providers/service-location', groomer)
  restoreLocation = () => apiJson('/providers/service-location', groomer, 'PUT', {
    address: currentLocation.data.address,
    postal_code: currentLocation.data.postal_code,
    complement: currentLocation.data.complement,
    latitude: currentLocation.data.latitude,
    longitude: currentLocation.data.longitude,
    radius_km: currentLocation.data.radius_km,
    travel_fee_mode: currentLocation.data.travel_fee_mode,
    travel_fee_per_km: currentLocation.data.travel_fee_per_km,
  })
  // Coordenadas conhecidas da Paulista: não depende do geocodificador externo.
  await apiJson('/providers/service-location', groomer, 'PUT', {
    address: 'Avenida Paulista, São Paulo',
    postal_code: '01310100',
    complement: null,
    latitude: -23.5614,
    longitude: -46.6559,
    radius_km: 8,
    travel_fee_mode: 'included',
    travel_fee_per_km: null,
  })

  tutorToken = await apiLogin('tutor@email.com')
  const before = await apiJson('/customer-addresses', tutorToken)
  const previousDefault = before.data.find(item => item.is_default)
  const created = await apiJson('/customer-addresses', tutorToken, 'POST', SAVED)
  createdAddressId = created.data.id
  if (previousDefault) restoreDefaultId = previousDefault.id

  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByText('Avenida Paulista, 1000, São Paulo', { exact: false }).waitFor({ timeout: 15000 })

  // Entrada com endereço salvo: o endereço aparece em letra pequena, sem campo, sem sugestões e sem mapa.
  await page.waitForTimeout(1200)
  check('AC-A sem campo de endereço na busca', await page.getByRole('combobox', { name: 'Endereço do atendimento' }).count() === 0)
  check('AC-A entrar com endereço salvo não abre sugestões', await page.getByRole('option').count() === 0)
  check('AC-B com endereço salvo não há mapa do atendimento', await page.getByTitle(/Mapa do atendimento/).count() === 0)
  check('AC-B com endereço salvo não há placeholder de mapa', await page.getByLabel('Mapa sem ponto').count() === 0)
  check('AC-E o endereço tem o link Trocar', await page.getByRole('button', { name: 'Trocar endereço', exact: true }).count() === 1)
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 20000 })
  check('AC-G filtros começam fechados e a lista carrega', await page.getByRole('button', { name: 'Filtros', exact: true }).count() === 1 && await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)
  const searchBox = await queryField(page).boundingBox()
  const filterBox = await page.getByRole('button', { name: 'Filtros', exact: true }).boundingBox()
  check(
    'AC-H a busca fica visível e o filtro fica abaixo dela',
    Boolean(searchBox && filterBox) && filterBox.y >= searchBox.y + searchBox.height - 4,
    JSON.stringify({ searchBox, filterBox }),
  )
  await queryField(page).click()
  check('AC-H clicar na busca não abre os filtros', await page.getByText('Modalidade', { exact: true }).count() === 0)
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
  await page.getByRole('button', { name: 'Remover dos favoritos', exact: true }).waitFor({ timeout: 15000 })
  check('AC-I favorito fica marcado', await page.getByRole('button', { name: 'Remover dos favoritos', exact: true }).count() === 1)
  await page.getByRole('button', { name: 'Remover dos favoritos', exact: true }).click()
  await page.getByRole('button', { name: 'Favoritar', exact: true }).waitFor({ timeout: 15000 })
  const today = page.getByRole('switch', { name: 'Ver apenas disponíveis hoje', exact: true })
  await today.click()
  await today.click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 15000 })
  check('AC-I desligar disponíveis hoje devolve a lista', await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)
  await page.getByRole('button', { name: 'Ordenar', exact: true }).click()
  await page.getByRole('radio', { name: 'Melhor avaliação', exact: true }).click()
  check('AC-I ordenar por avaliação fica selecionado no rascunho', await page.getByRole('radio', { name: 'Melhor avaliação, selecionado', exact: true }).count() === 1)
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await shot(page, 'busca-endereco-salvo')
  // Acabamento da referência: alvos reais, faixa de filtros e cards legíveis.
  const filters = ['Filtros', 'Ordenar', 'Preço', 'Avaliação', 'Raio']
  const filterRects = await Promise.all(filters.map(name => page.getByRole('button', { name, exact: true }).boundingBox()))
  check('REF-01 filtros em uma faixa e alvos de 48 pt', filterRects.every(rect => rect && rect.height >= 48 && Math.abs(rect.y - filterRects[0].y) < 2), JSON.stringify(filterRects))
  await page.getByRole('button', { name: 'Raio', exact: true }).scrollIntoViewIfNeeded()
  check('REF-01 último filtro permanece acessível por rolagem', await page.getByRole('button', { name: 'Raio', exact: true }).isVisible())
  await page.getByRole('button', { name: 'Filtros', exact: true }).scrollIntoViewIfNeeded()
  const shortcut = page.getByRole('button', { name: 'Banho', exact: true })
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/providers/coverage') && response.url().includes('service_id=') && response.ok()),
    shortcut.click(),
  ])
  check('REF-02 atalho de serviço aplica um ID do catálogo', await page.getByRole('button', { name: 'Banho, selecionado', exact: true }).count() === 1)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await page.getByRole('button', { name: 'Todos, selecionado', exact: true }).waitFor()
  await page.getByRole('button', { name: /Ver perfil de Groomer de Teste/ }).waitFor()
  check('REF-02 Todos limpa categoria e serviço', await page.getByRole('button', { name: 'Filtros', exact: true }).count() === 1)
  const profileButton = page.getByRole('button', { name: /Ver perfil de Groomer de Teste/ })
  check('REF-03 perfil e favorito têm alvo de 48 pt', (await profileButton.boundingBox()).height >= 48 && (await page.getByRole('button', { name: 'Favoritar', exact: true }).boundingBox()).height >= 48)
  await page.setViewportSize({ width: 320, height: 844 })
  await shot(page, 'ref-320')
  check('REF-04 tela estreita sem overflow da página', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await profileButton.scrollIntoViewIfNeeded()
  await shot(page, 'ref-320-card')
  await page.setViewportSize({ width: 1440, height: 900 })
  await shot(page, 'ref-desktop')
  check('REF-04 desktop sem overflow da página', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('explorar-scroll').evaluate(node => { node.scrollTop = 0 })
  await shot(page, 'ref-390')
  await profileButton.click()
  await page.getByText('Regras de atendimento', { exact: true }).waitFor({ timeout: 15000 })
  check('REF-05 Ver perfil abre o perfil real', await page.getByLabel('Profissional Groomer de Teste', { exact: true }).count() === 1)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()

  // Trocar: os endereços salvos aparecem como opções.
  await page.getByRole('button', { name: 'Trocar endereço', exact: true }).click()
  check('AC-E Trocar mostra os endereços salvos', await page.getByRole('button', { name: /Casa · Padrão, selecionado/ }).count() === 1)
  await page.getByRole('button', { name: 'Fechar troca de endereço', exact: true }).click()

  // Busca por serviço direto (texto livre). O campo fica fora do painel.
  await queryField(page).fill('Banho')
  const card = page.getByRole('button', { name: /Groomer de Teste/ }).first()
  await card.waitFor({ timeout: 20000 })
  const labelByService = await card.evaluate(el => {
    let node = el.parentElement
    while (node && getComputedStyle(node).borderTopWidth !== '1px') node = node.parentElement
    return node?.innerText ?? ''
  })
  check('AC-C busca por serviço (Banho) retorna o groomer', /Groomer de Teste/.test(labelByService))
  check('AC-D o cartão lista os serviços do groomer', /Banho/.test(labelByService))
  check('AC-D o cartão mostra o preço a partir de', /A partir de/.test(labelByService))
  await card.scrollIntoViewIfNeeded()
  await shot(page, 'busca-resultados-servicos')

  // Busca por nome do profissional.
  await queryField(page).fill('Groomer de Teste')
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 20000 })
  check('AC-C busca por nome do profissional retorna o groomer', await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)

  // Busca por tipo profissional.
  await queryField(page).fill('Groomer')
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 20000 })
  const typeLabel = await page.getByRole('button', { name: /Groomer de Teste/ }).first().getAttribute('aria-label')
  check('AC-C busca por tipo profissional retorna o groomer', await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)
  check('AC-D o cartão mostra o tipo profissional', /Groomer/.test(typeLabel ?? ''))

  // Sem resultado.
  await queryField(page).fill('zzzz sem resultado')
  await page.getByText('Nenhum groomer encontrado', { exact: true }).waitFor({ timeout: 20000 })
  check('AC-C busca sem resultado mostra estado vazio com texto', true)
  await shot(page, 'ref-vazio')

  // Aba Serviços: o mesmo resultado, agrupado por serviço.
  await queryField(page).fill('Banho')
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 20000 })
  await page.getByRole('tab', { name: 'Serviços', exact: true }).click()
  const serviceCard = page.getByRole('button', { name: /^Banho, 1 groomer|^Banho, 2 groomers|^Banho, \d+ groomers/ }).first()
  await serviceCard.waitFor({ timeout: 15000 })
  check('AC-F aba Serviços lista o serviço com contagem de groomers', await serviceCard.count() > 0)
  check('AC-F o serviço mostra o preço a partir de', /a partir de/.test(await serviceCard.getAttribute('aria-label') ?? ''))
  await shot(page, 'busca-aba-servicos')
  await serviceCard.click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 15000 })
  check('AC-F ao tocar no serviço aparece o groomer que atende', await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)
  await shot(page, 'busca-servico-groomers')
  await page.getByRole('button', { name: 'Voltar aos serviços', exact: true }).click()
  check('AC-F voltar retorna à lista de serviços', await page.getByRole('button', { name: /^Banho, / }).first().count() > 0)

  // Página de 15: a resposta real é repetida até 16 groomers e a tela só revela o 16º ao rolar.
  await page.route('**/api/v1/providers/coverage**', async route => {
    const response = await route.fetch()
    const json = await response.json()
    const sample = json.data?.providers?.[0]
    if (!sample) {
      await route.fulfill({ response })
      return
    }
    json.data.providers = Array.from({ length: 16 }, (_, index) => ({
      ...sample,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      provider_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name: `Groomer Página ${index + 1}`,
      available_today: index === 0,
      next_available_on: null,
      attends_at_home: true,
    }))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) })
  })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByRole('button', { name: /Groomer Página 1(?!\d)/ }).waitFor({ timeout: 20000 })
  const pageCount = () => page.evaluate(() => [...document.querySelectorAll('[role="button"]')]
    .map(element => element.getAttribute('aria-label') || '')
    .filter(name => /Groomer Página /.test(name)).length)
  const firstPage = await pageCount()
  check('AC-G a lista mostra 15 groomers antes de rolar', firstPage === 15, String(firstPage))
  await page.getByTestId('explorar-scroll').evaluate(node => {
    const scroller = [node, ...node.querySelectorAll('div')].find(element => element.scrollHeight > element.clientHeight + 20) ?? node
    scroller.scrollTop = scroller.scrollHeight
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
  await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')]
    .map(element => element.getAttribute('aria-label') || '')
    .filter(name => /Groomer Página /.test(name)).length >= 16, null, { timeout: 5000 })
  check('AC-G rolar carrega o groomer seguinte', await pageCount() === 16, String(await pageCount()))
  await page.getByText('Disponível hoje', { exact: true }).scrollIntoViewIfNeeded()
  await shot(page, 'ref-disponivel-hoje')
  check('REF-06 disponibilidade vem do resultado da cobertura', await page.getByText('Disponível hoje', { exact: true }).count() === 1)
  await page.getByRole('switch', { name: 'Ver apenas disponíveis hoje', exact: true }).click()
  check('REF-06 filtro de hoje mantém somente o disponível', await pageCount() === 1)
} catch (error) {
  run.fail(error)
} finally {
  if (createdAddressId && tutorToken) {
    await apiJson(`/customer-addresses/${createdAddressId}`, tutorToken, 'DELETE').catch(error => run.fail(error))
  }
  if (restoreDefaultId && tutorToken) {
    await apiJson(`/customer-addresses/${restoreDefaultId}`, tutorToken, 'PATCH', { is_default: true }).catch(error => run.fail(error))
  }
  if (restoreLocation) await restoreLocation().catch(error => run.fail(error))
  await run.finish(browser)
}
