import { chromium } from 'playwright'

const base = 'http://localhost:8081'
const password = 'admin'
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`ok ${name}`)
    return
  }
  const message = `${name}${detail ? ` — ${detail}` : ''}`
  failures.push(message)
  console.error(`fail ${message}`)
}

async function textOf(page) {
  return page.locator('body').innerText()
}

async function login(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).fill('tutor@email.com')
  await page.getByRole('textbox', { name: 'Senha' }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

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

async function visibleAgainstBackground(page, text, label) {
  const target = page.getByText(text, { exact: true }).first()
  await target.waitFor()
  const color = await target.evaluate((element) => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check(label, color !== background && color !== 'rgba(0, 0, 0, 0)')
}

async function run() {
  const browser = await chromium.launch()
  let failCoverage = false
  let delayCoverage = false

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'pt-BR' })
  const page = await mobile.newPage()
  await page.route('**/api/v1/providers/coverage**', async (route) => {
    if (failCoverage) {
      await route.abort()
      return
    }
    if (delayCoverage) await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })

  await login(page)
  await openSearch(page)
  check('AC-01 busca da home abre a listagem', true)

  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Endereço do atendimento obrigatório', { exact: true }).waitFor()
  await page.getByText('Selecione um serviço ou uma modalidade', { exact: true }).waitFor()
  check('AC-02 endereço e filtro são exigidos', true)

  failCoverage = true
  await searchAddress(page, 'Avenida Paulista, São Paulo', 'Banho')
  await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
  check('AC-05 erro da busca', true)
  failCoverage = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('Groomer de Teste', { exact: true }).waitFor({ timeout: 15000 })

  delayCoverage = true
  await page.getByRole('radio', { name: 'Tosa', exact: true }).click()
  await page.getByText('Buscando groomers').waitFor({ timeout: 5000 })
  check('AC-05 carregando', true)
  delayCoverage = false
  await page.getByText('100,00').waitFor({ timeout: 15000 })
  let body = await textOf(page)
  check('AC-02 filtro de serviço muda o preço', body.includes('Tosa') && body.includes('100,00') && body.includes('Avaliação 5,0'))

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
  await page.getByText('Groomer de Teste', { exact: true }).waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-04 card mostra avaliação e preço', body.includes('Avaliação 5,0') && body.includes('80,00') && body.includes('Banho'))
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
  await page.getByText('Perfil público').waitFor({ timeout: 15000 })
  body = await textOf(page)
  check(
    'AC-04 card abre o perfil',
    body.includes('Groomer de Teste') && body.includes('Avaliação') && body.includes('Preço indicativo') && body.includes('80,00'),
  )

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Banho e Tosa' }).click()
  await page.getByRole('button', { name: 'Banho', exact: true }).click()
  await page.getByText('Informe o endereço do atendimento para ver quem atende.').waitFor()
  await page.getByRole('radio', { name: 'Banho, selecionado' }).waitFor()
  body = await textOf(page)
  check('AC-03 categoria também passa pela cobertura', !body.includes('Groomer de Teste'))

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'pt-BR' })
  const wide = await desktop.newPage()
  await login(wide)
  await openSearch(wide)
  await visibleAgainstBackground(wide, 'Quem atende', 'AC-01 desktop claro')

  const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'pt-BR' })
  const dark = await darkContext.newPage()
  await login(dark)
  await openSearch(dark)
  await visibleAgainstBackground(dark, 'Quem atende', 'AC-01 celular escuro')

  await browser.close()
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
