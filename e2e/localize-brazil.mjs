import { chromium } from 'playwright'

const base = 'http://localhost:8081'
const tutor = { email: 'tutor@mygroomer.test', password: 'LocalTest#2026' }
const groomer = { email: 'groomer@mygroomer.test', password: 'LocalTest#2026' }
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

function moneyOk(value) {
  return /R\$\s*[\d.]*,\d{2}/.test(value) && !/\bGHS\b/.test(value)
}

function dateOk(value) {
  return /(dom|seg|ter|qua|qui|sex|sáb)\.?/i.test(value)
    && /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?/i.test(value)
}

async function openLogin(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 90000 })
  await page.getByText('Sou tutor', { exact: true }).click()
  await page.getByText('Entrar', { exact: true }).waitFor({ timeout: 20000 })
}

async function signIn(page, account) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(account.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(account.password)
  await page.getByText('Entrar', { exact: true }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

async function run() {
  const browser = await chromium.launch()
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'pt-BR' })
  const page = await desktop.newPage()

  await openLogin(page)
  let body = await textOf(page)
  check('AC-01 login em português', body.includes('E-mail') && body.includes('Senha') && body.includes('Não tem uma conta?'))
  check('AC-02 login sem GHS', !/\bGHS\b/.test(body))

  await page.getByText('Entrar', { exact: true }).click()
  await page.getByText('A senha é obrigatória').waitFor({ timeout: 10000 })
  body = await textOf(page)
  check('AC-01 validação do login', body.includes('Informe um e-mail válido') && body.includes('A senha é obrigatória'))

  await page.getByRole('textbox', { name: 'E-mail' }).fill('tutor@mygroomer.test')
  await page.getByRole('textbox', { name: 'Senha' }).fill('senha-errada')
  await page.getByText('Entrar', { exact: true }).click()
  await page.getByText('E-mail ou senha inválidos').waitFor({ timeout: 15000 })
  check('AC-01 erro de API no login', true)

  await page.getByText('Não tem uma conta? Cadastre-se').click()
  await page.getByRole('button', { name: 'Criar conta' }).waitFor()
  const phone = page.getByRole('textbox', { name: 'Telefone' })
  const placeholder = await phone.getAttribute('placeholder')
  body = await textOf(page)
  check('AC-01 cadastro em português', body.includes('Nome completo') && body.includes('Telefone') && body.includes('Aceito os termos e a política de privacidade') && body.includes('Criar conta'))
  check('AC-03 telefone nasce em +55', Boolean(placeholder?.includes('+55')))
  check('AC-03 telefone não abre em Gana', !/Ghana|\+233|\bGH\b/.test(body) && !/Ghana|\+233/.test(placeholder ?? ''))

  await signIn(page, tutor)
  await page.getByText('Categorias').waitFor()
  body = await textOf(page)
  check('AC-01 abas em português', body.includes('Início') && body.includes('Agendamentos') && body.includes('Mensagens'))
  check('AC-05 cards fixos em inglês e GHS ausentes', !/Premium Car Wash|Deep Home Cleaning|Office Cleaning|From GHS/.test(body))
  check('AC-05 home restante em português', body.includes('Buscar um serviço...') && body.includes('Categorias') && body.includes('Banho e Tosa'))
  check('AC-02 home sem GHS', !/\bGHS\b/.test(body))

  await page.route('**/api/v1/bookings**', route => route.abort())
  await page.getByText('Agendamentos', { exact: true }).click()
  await page.getByText('Não foi possível carregar os agendamentos.').waitFor({ timeout: 15000 })
  check('AC-06 erro de agendamentos em português', true)
  await page.unroute('**/api/v1/bookings**')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Categorias').waitFor({ timeout: 20000 })

  let delayed = false
  await page.route('**/api/v1/bookings**', async route => {
    delayed = true
    await new Promise(resolve => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.getByText('Agendamentos', { exact: true }).click()
  await page.getByText('Meus agendamentos').waitFor({ timeout: 10000 })
  const cardsDuringLoad = await page.getByText('por Groomer de Teste').count()
  check('AC-06 carregamento segura a lista', cardsDuringLoad === 0 && delayed)
  await page.getByText('por Groomer de Teste').first().waitFor({ timeout: 20000 })
  await page.unroute('**/api/v1/bookings**')

  body = await textOf(page)
  check('AC-02 preço em real', moneyOk(body), body.match(/R\$[^\n]{0,20}|GHS[^\n]{0,20}/)?.[0] ?? 'sem preço')
  check('AC-04 data do card em pt-BR', dateOk(body), body.split('\n').find(line => /2026|2025/.test(line)) ?? 'sem data')
  check('AC-01 lista de agendamentos', body.includes('Aguardando confirmação') || body.includes('Confirmado') || body.includes('Concluído'))

  await page.getByText('Pagamento pendente', { exact: true }).click()
  await page.getByText('Nenhum agendamento com este filtro').waitFor({ timeout: 15000 })
  check('AC-06 vazio em português', true)

  await page.getByText('Todos', { exact: true }).click()
  await page.getByText('por Groomer de Teste').first().waitFor({ timeout: 15000 })
  await page.getByText('por Groomer de Teste').first().click()
  await page.getByText('Detalhe do agendamento').waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-04 data do detalhe em pt-BR', dateOk(body))
  check('AC-02 preço do detalhe em real', moneyOk(body))
  check('AC-01 detalhe em português', body.includes('Agendado') && body.includes('Local') && body.includes('Preço'))

  page.once('dialog', async dialog => {
    check('AC-01 confirmação de saída', dialog.message().includes('Tem certeza de que quer sair?'))
    await dialog.accept()
  })
  await page.getByLabel('Abrir perfil').click()
  await page.getByText('Sair', { exact: true }).click()
  await page.getByText('Sou tutor', { exact: true }).waitFor({ timeout: 15000 })

  await signIn(page, groomer)
  await page.getByText('Rendimentos', { exact: true }).click()
  await page.getByText('Total recebido').waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-01 rendimentos em português', body.includes('Histórico de repasses') || body.includes('Nenhum repasse ainda'))
  check('AC-02 rendimentos em real', moneyOk(body))
  check('AC-04 data de rendimento em pt-BR', dateOk(body) || body.includes('Nenhum repasse ainda'))

  await page.getByText('Painel', { exact: true }).click()
  await page.getByText('Agendamentos').first().waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-01 painel do groomer', body.includes('Acompanhe os atendimentos dos tutores'))
  check('AC-02 card do groomer em real', moneyOk(body))

  await desktop.close()

  const mobileDark = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'pt-BR' })
  const mobile = await mobileDark.newPage()
  await openLogin(mobile)
  body = await textOf(mobile)
  check('AC-01 login no celular escuro', body.includes('Entrar') && body.includes('E-mail'))
  await signIn(mobile, tutor)
  await mobile.getByText('Categorias').waitFor()
  body = await textOf(mobile)
  check('AC-05 home no celular escuro sem GHS', !/\bGHS\b|Premium Car Wash/.test(body) && body.includes('Categorias'))
  const homeColor = await mobile.getByText('Categorias').evaluate(node => getComputedStyle(node).color)
  check('AC-06 texto da home escura permanece visível', homeColor !== 'rgba(0, 0, 0, 0)' && homeColor !== 'transparent', homeColor)
  await mobileDark.close()
  await browser.close()

  if (failures.length) {
    console.error(JSON.stringify({ passed: false, failures }, null, 2))
    process.exit(1)
  }
  console.log(JSON.stringify({ passed: true, failures: [] }))
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
