import { saveScreenshot } from './harness.mjs'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkContrast,
  evidenceFile,
  launchBrowser,
  loginProfessional,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const session = startRun({
  command: 'node e2e/tutor-addresses.mjs',
  evidence: evidenceFile('023-tutor-addresses', 'tutor-addresses.log'),
})
const { check, fail, finish } = session
const shotDir = evidenceFile('023-tutor-addresses', 'ui-review')
mkdirSync(shotDir, { recursive: true })
const shot = (page, name) => saveScreenshot(page, path.join(shotDir, `${name}.png`), { fullPage: true })

async function clearAddresses() {
  await pool.query(
    `DELETE FROM customer_addresses
     WHERE customer_id = (SELECT id FROM users WHERE email = 'tutor@email.com')`,
  )
}

async function openAddresses(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Endereços' }).click()
}

async function pickSuggestion(page, address) {
  const field = page.getByRole('combobox', { name: 'Endereço', exact: true })
  await field.fill('')
  const pending = page.waitForResponse(response => response.url().includes('/service-location/autocomplete'))
  await field.fill(address)
  await pending
  await page.getByRole('option').first().click()
  await page.getByTitle(/Mapa do endereço/).waitFor({ timeout: 20000 })
}

async function run() {
  const database = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') {
    throw new Error('Recusando banco fora do ambiente local')
  }
  await clearAddresses()
  const browser = await launchBrowser()
  try {
    const page = await openPage(browser, { viewport: 'mobile' })
    let listGate = 'fail'
    await page.route('**/api/v1/customer-addresses**', async route => {
      const isList = route.request().method() === 'GET' && !/customer-addresses\/[^/?]+/.test(route.request().url())
      if (!isList || listGate === 'pass') return route.continue()
      if (listGate === 'fail') return route.abort()
      await new Promise(resolve => setTimeout(resolve, 800))
      return route.continue()
    })

    await loginTutor(page)
    await openAddresses(page)
    await page.getByText('Não foi possível carregar os endereços.').waitFor()
    await shot(page, '01-erro')
    check('AC-03 erro', true)

    listGate = 'delay'
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.getByRole('progressbar', { name: 'Carregando endereços' }).waitFor()
    check('AC-03 carregando', true)
    listGate = 'pass'
    await page.getByText('Nenhum endereço salvo').waitFor({ timeout: 15000 })
    await shot(page, '02-vazio')
    check('AC-01 vazio', await page.getByRole('button', { name: 'Cadastrar endereço' }).count() > 0)
    await checkContrast(page, page.getByText('Endereços', { exact: true }).last(), 'tema claro em 390', check)

    await page.getByRole('button', { name: 'Cadastrar endereço' }).click()
    await page.getByRole('button', { name: 'Usar minha localização' }).waitFor()
    check('AC-06 botão de localização no cadastro', true)
    await page.getByRole('combobox', { name: 'Endereço', exact: true }).focus()
    check('AC-05 campo de endereço alcançável', await page.getByRole('button', { name: 'Salvar endereço' }).count() > 0)
    await page.getByRole('button', { name: 'Casa', exact: true }).click()
    const field = page.getByRole('combobox', { name: 'Endereço', exact: true })
    const pending = page.waitForResponse(response => response.url().includes('/service-location/autocomplete'))
    await field.fill('Avenida Paulista, São Paulo')
    await pending
    await page.getByRole('option').first().waitFor()
    await shot(page, '03-sugestoes')
    await page.getByRole('option').first().click()
    const addressMap = page.getByTitle(/Mapa do endereço/)
    await addressMap.waitFor({ timeout: 20000 })
    await page.frameLocator('iframe[title*="Mapa do endereço"]').locator('img.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
    await addressMap.scrollIntoViewIfNeeded()
    await shot(page, '04-mapa')
    const beforePin = await field.inputValue()
    await page.frameLocator('iframe[title*="Mapa do endereço"]').locator('#map').click({ position: { x: 280, y: 200 } })
    await page.waitForFunction((previous) => {
      const input = document.querySelector('input[placeholder="Avenida Paulista, São Paulo"]')
      return input instanceof HTMLInputElement && input.value.trim().length >= 3 && input.value !== previous
    }, beforePin, { timeout: 20000 })
    check('AC-06 toque no mapa troca o ponto', (await field.inputValue()) !== beforePin)
    await page.getByRole('button', { name: 'Salvar endereço' }).click()
    await page.getByRole('button', { name: /^Casa\./ }).waitFor({ timeout: 15000 })
    await shot(page, '05-lista')
    check('AC-02 endereço salvo com ponto', await page.getByText('Padrão', { exact: true }).count() > 0)

    await page.getByRole('button', { name: 'Cadastrar endereço' }).click()
    await page.getByRole('button', { name: 'Trabalho', exact: true }).click()
    await pickSuggestion(page, 'Rua Augusta, São Paulo')
    await page.getByRole('checkbox', { name: 'Marcar como padrão' }).click()
    await page.getByRole('button', { name: 'Salvar endereço' }).click()
    await page.getByRole('button', { name: /Trabalho\./ }).waitFor({ timeout: 15000 })
    check('AC-03 dois endereços', await page.getByRole('button', { name: /Casa\./ }).count() > 0)

    await page.getByRole('button', { name: /Trabalho\./ }).click()
    await page.getByRole('button', { name: 'Excluir e usar Casa como padrão' }).waitFor()
    check('AC-03 exclusão do padrão pede substituto', true)
    await page.getByRole('button', { name: 'Excluir e usar Casa como padrão' }).click()
    await page.getByRole('button', { name: /^Casa\./ }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: /^Casa\./ }).click()
    await page.getByRole('button', { name: 'Excluir endereço' }).click()
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await page.getByText('Nenhum endereço salvo').waitFor({ timeout: 15000 })
    check('AC-03 última exclusão esvazia a lista', true)

    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByText('Início', { exact: true }).click()
    await page.getByRole('button', { name: 'Buscar um serviço' }).click()
    await page.getByRole('button', { name: 'Usar minha localização' }).waitFor()
    await shot(page, '06-busca')
    check('AC-06 localização na busca', await page.getByLabel('Mapa sem ponto').count() > 0)

    await page.setViewportSize({ width: 1440, height: 900 })
    await shot(page, '08-busca-desktop')
    await checkContrast(page, page.getByText('Quem atende', { exact: true }), 'tema claro em 1440', check)
    await page.close()

    const geoPage = await openPage(browser, { viewport: 'mobile' })
    await geoPage.context().grantPermissions(['geolocation'])
    await geoPage.context().setGeolocation({ latitude: -23.561414, longitude: -46.655881 })
    await loginTutor(geoPage)
    await openAddresses(geoPage)
    await geoPage.getByRole('button', { name: 'Cadastrar endereço' }).click()
    const geoField = geoPage.getByRole('combobox', { name: 'Endereço', exact: true })
    await geoPage.waitForFunction(() => {
      const field = document.querySelector('input[aria-label="Endereço"], input[placeholder="Avenida Paulista, São Paulo"]')
      return field instanceof HTMLInputElement && field.value.trim().length >= 3
    }, null, { timeout: 20000 }).catch(() => {})
    const captured = await geoField.inputValue()
    const geoMap = geoPage.getByTitle(/Mapa do endereço/)
    await geoMap.waitFor({ timeout: 20000 })
    await geoPage.frameLocator('iframe[title*="Mapa do endereço"]').locator('img.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
    await geoMap.scrollIntoViewIfNeeded()
    await shot(geoPage, '07-localizacao')
    check('AC-06 localização atual marca o mapa', captured.trim().length >= 3)
    await pickSuggestion(geoPage, 'Rua Augusta, São Paulo')
    const changed = await geoField.inputValue()
    check('AC-06 o ponto pode ser alterado', changed.includes('Augusta') && changed !== captured)
    await geoPage.close()

    const groomer = await openPage(browser, { viewport: 'mobile' })
    await loginProfessional(groomer)
    await groomer.getByRole('button', { name: 'Abrir perfil' }).click()
    await groomer.getByRole('button', { name: 'Perfil público' }).click()
    await groomer.getByRole('button', { name: 'Editar área' }).click()
    await groomer.getByRole('button', { name: 'Usar minha localização' }).waitFor()
    const groomerMap = groomer.getByTitle(/Mapa do atendimento/)
    await groomerMap.waitFor({ timeout: 20000 })
    await groomer.frameLocator('iframe[title*="Mapa do atendimento"]').locator('img.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
    await groomerMap.scrollIntoViewIfNeeded()
    await shot(groomer, '09-groomer')
    check('AC-06 localização no endereço do groomer', await groomer.getByRole('combobox', { name: 'Endereço-base' }).count() > 0)
  } catch (error) {
    fail(error)
  } finally {
    await clearAddresses()
    await pool.end()
    await finish(browser)
  }
}

run()
