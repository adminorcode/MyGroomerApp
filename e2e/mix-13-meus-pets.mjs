import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-13-meus-pets.mjs',
  evidence: evidenceFile(plan, 'mix-13-meus-pets.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (R5)
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle (R2, CMP-12)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

// Telas empilhadas permanecem no DOM: só conta o elemento visível.
async function visibleOf(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius }
  })
}

async function openPets(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Meus pets', exact: true }).click()
}

let browser
try {
  browser = await launchBrowser()

  // --- Erro, carregando e lista (conta de demonstração, tela 13) ---
  const gate = { fail: true, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/pets', gate)
  await loginTutor(page)
  await openPets(page)
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  await page.getByText('Não foi possível carregar os pets.').waitFor({ timeout: 20000 })
  check('AC-08 erro ao carregar pets mantém texto e Tentar novamente', await retry.isEnabled())
  await shot(page, 'pets-erro')

  gate.fail = false
  gate.delayMs = 1500
  await retry.click()
  await page.getByLabel('Carregando pets', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 carregando pets mostra indicador com rótulo', await page.getByLabel('Carregando pets', { exact: true }).isVisible())
  await shot(page, 'pets-carregando')
  gate.delayMs = 0

  const addButton = page.getByRole('button', { name: 'Cadastrar pet', exact: true })
  await addButton.waitFor({ timeout: 15000 })
  check('R1 Cadastrar pet é action.primary com texto branco', (await styleOf(addButton)).background === CTA_PINK && (await styleOf(addButton.getByText('Cadastrar pet', { exact: true }))).color === WHITE)
  check('AC-07 botão Cadastrar pet com raio 16', (await styleOf(addButton)).radius === '16px')

  const edit = page.getByRole('button', { name: /^Editar / }).first()
  await edit.waitFor({ timeout: 15000 })
  const editLabel = await edit.getAttribute('aria-label')
  const petName = editLabel.replace(/^Editar /, '')
  const avatar = await visibleOf(page.getByLabel(petName, { exact: true }).and(page.locator('div')))
  const avatarStyle = avatar ? await styleOf(avatar) : null
  check('R2 CMP-12 avatar do pet usa pinkSubtle', avatarStyle?.background === PINK_SUBTLE, JSON.stringify(avatarStyle))
  const hasPhoto = avatar ? await avatar.locator('img').count() > 0 : false
  const pawCount = avatar ? await avatar.locator('svg').count() : 0
  check('CMP-12 pet sem foto mostra a pata vetorial', hasPhoto || pawCount > 0)

  const nameStyle = await styleOf(await visibleOf(page.getByText(petName, { exact: true })))
  check('R5 CMP-12 nome do pet em text.primary sobre branco', nameStyle.color === TEXT_PRIMARY, nameStyle.color)
  const editStyle = await styleOf(await visibleOf(edit.getByText('Editar', { exact: true })))
  check('R5 ação Editar em rosa-texto sobre branco', editStyle.color === TEXT_PINK && ratio(editStyle.color, WHITE) >= 4.5, editStyle.color)
  await shot(page, 'pets-lista')

  // --- Vazio (lista sem pets, mock do GET) ---
  const empty = await openPage(browser, { viewport: 'mobile' })
  await empty.route('**/api/v1/pets', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
  await loginTutor(empty)
  await openPets(empty)
  await empty.getByText('Você ainda não cadastrou um pet.').waitFor({ timeout: 15000 })
  check('AC-08 estado vazio mostra título e descrição', await empty.getByText('Nenhum pet cadastrado', { exact: true }).isVisible())
  const emptyCta = empty.getByRole('button', { name: 'Cadastrar pet', exact: true })
  check('R1 CTA do estado vazio é action.primary', (await styleOf(emptyCta)).background === CTA_PINK)
  await shot(empty, 'pets-vazio')

  // --- Desktop (1440) com a mesma lista ---
  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openPets(wide)
  await wide.getByRole('button', { name: /^Editar / }).first().waitFor({ timeout: 15000 })
  check('AC-12 nome do pet visível no desktop', await wide.getByText(petName, { exact: true }).first().isVisible())
  await shot(wide, 'pets-1440')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
