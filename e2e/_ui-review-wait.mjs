import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { launchBrowser, loginProfessional, openPage } from './harness.mjs'

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Plans/012-service-radius/evidencias/ui-review')
mkdirSync(out, { recursive: true })

const browser = await launchBrowser()
try {
  const page = await openPage(browser, { viewport: 'mobile' })
  await loginProfessional(page)
  const tab = page.getByRole('tab', { name: 'Serviços' })
  const button = page.getByRole('button', { name: 'Serviços', exact: true })
  await tab.or(button).first().waitFor({ timeout: 20000 })
  if (await tab.count()) await tab.click()
  else await button.click()
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Continuar' }).click()
  const address = page.getByRole('combobox', { name: 'Endereço-base' })
  await address.waitFor({ timeout: 20000 })
  await page.route('**/service-location/autocomplete**', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500))
    await route.continue()
  })
  await address.fill('Rua Vital')
  const wait = page.getByRole('progressbar', { name: 'Buscando endereços' })
  await wait.waitFor({ timeout: 5000 })
  const cep = page.getByRole('textbox', { name: 'CEP' })
  await cep.waitFor()
  const blocked = await page.getByLabel('Carregando').count()
  await page.screenshot({ path: path.join(out, '16-mobile-buscando.png') })
  const boxes = {
    wait: await wait.boundingBox(),
    field: await address.boundingBox(),
    cep: await cep.boundingBox(),
    blocked,
  }
  console.log(JSON.stringify(boxes))
  await cep.fill('1')
  console.log('cep ainda editavel', await cep.inputValue())
  await page.context().close()
} finally {
  await browser.close()
}
