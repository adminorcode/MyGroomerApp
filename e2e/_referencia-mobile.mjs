import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { appUrl, fillServiceAddress, fixtures, openLogin } from './harness.mjs'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Plans/029-movimento-sobrio/evidencias/referencia-mobile')
mkdirSync(outDir, { recursive: true })

const shots = []

async function shot(page, fileName, label) {
  const file = path.join(outDir, fileName)
  await page.screenshot({ path: file })
  shots.push({ file: fileName, label })
  console.log('shot', label)
}

async function login(page, account, ready) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(account.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await ready.waitFor({ timeout: 25000 })
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
  locale: 'pt-BR',
})
const page = await context.newPage()

await openLogin(page)
await shot(page, '01-entrar.png', 'Entrar')
await login(page, fixtures.tutor, page.getByRole('button', { name: 'Abrir perfil', exact: true }))
await page.getByRole('button', { name: 'Buscar um serviço' }).waitFor({ timeout: 20000 })
await shot(page, '02-inicio.png', 'Início')

let openedSearch = false
try {
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  openedSearch = true
} catch (error) {
  console.log('busca sem endereço salvo:', error.message)
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByText('Quem atende', { exact: true }).first().waitFor({ timeout: 20000 })
  openedSearch = true
}
if (openedSearch) {
  await page.getByText('Buscando profissionais', { exact: true }).waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})
  await page.getByRole('button', { name: /^Ver perfil de / }).first()
    .or(page.getByText('Nenhum profissional encontrado', { exact: true }))
    .waitFor({ timeout: 20000 })
  await shot(page, '03-quem-atende.png', 'Quem atende')
}

const profileButton = page.getByRole('button', { name: /^Ver perfil de / }).first()
if (await profileButton.isVisible().catch(() => false)) {
  await profileButton.click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).waitFor({ timeout: 20000 })
  await shot(page, '04-perfil-profissional.png', 'Perfil do profissional')
  await page.goBack().catch(() => {})
}

await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
await page.getByRole('tab', { name: 'Agendamentos', exact: true }).click()
await page.getByText(/agendamento/i).first().waitFor({ timeout: 20000 })
await shot(page, '05-agendamentos.png', 'Agendamentos')

await page.getByRole('tab', { name: 'Mensagens', exact: true }).click()
await page.getByText('Mensagens', { exact: true }).first().waitFor({ timeout: 20000 })
await shot(page, '06-mensagens.png', 'Mensagens')

await page.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
await page.getByText('Gerencie sua conta', { exact: true }).waitFor({ timeout: 20000 })
await shot(page, '07-conta.png', 'Conta')

const groomerContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
  locale: 'pt-BR',
})
const groomer = await groomerContext.newPage()
await login(groomer, fixtures.groomer, groomer.getByText('Agenda do profissional', { exact: true }))
await shot(groomer, '08-agenda.png', 'Agenda')
await groomer.getByRole('tab', { name: 'Solicitações', exact: true }).click()
await groomer.getByRole('tab', { name: 'Pendentes', exact: true }).waitFor({ timeout: 20000 })
await groomer.getByText(/Nenhuma solicitação|Aceitar|Não foi possível carregar as solicitações|Carregando solicitações/).first().waitFor({ timeout: 20000 }).catch(() => {})
await groomer.getByText('Carregando solicitações').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})
console.log('solicitacoes:', (await groomer.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500))
await shot(groomer, '09-solicitacoes.png', 'Solicitações')

await browser.close()

const columns = shots.length > 6 ? 3 : 2
const html = `<!doctype html>
<meta charset="utf-8">
<title>Tio de Pet — referência mobile</title>
<style>
  body { margin: 0; background: #F3EFEA; color: #253D42; font-family: Inter, "Segoe UI", sans-serif; }
  main { padding: 40px 36px 48px; }
  h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
  p { margin: 8px 0 28px; color: #5E7276; font-size: 15px; }
  .grid { display: grid; grid-template-columns: repeat(${columns}, 280px); gap: 22px 20px; }
  figure { margin: 0; }
  img { width: 280px; height: auto; display: block; border-radius: 28px; border: 1px solid #E3DBD4; box-shadow: 0 12px 28px rgba(37, 61, 66, 0.12); background: #fff; }
  figcaption { margin-top: 10px; text-align: center; font-size: 14px; font-weight: 600; }
</style>
<main>
  <h1>Tio de Pet</h1>
  <p>Referência mobile das telas atuais, em 390 × 844.</p>
  <div class="grid">
    ${shots.map(item => `<figure><img src="${item.file}" alt="${item.label}"><figcaption>${item.label}</figcaption></figure>`).join('\n')}
  </div>
</main>`
const board = path.join(outDir, 'board.html')
writeFileSync(board, html)

const composer = await chromium.launch()
const boardContext = await composer.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
const boardPage = await boardContext.newPage()
await boardPage.goto(pathToFileURL(board).href, { waitUntil: 'networkidle' })
await boardPage.locator('main').screenshot({ path: path.join(outDir, 'coletanea-mobile.png') })
await composer.close()
console.log('board', shots.map(item => item.label).join(', '))
