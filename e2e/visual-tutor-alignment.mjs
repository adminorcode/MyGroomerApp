import { appUrl, evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginTutor, openCoverageFilters, openPage, saveScreenshot, startRun } from './harness.mjs'
import { assertLayoutInWindow, captureScroll } from './visual-helpers.mjs'

const plan = '022-screen-reference-alignment'
const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/visual-tutor-alignment.mjs', evidence: evidenceFile(plan, 'visual-tutor-alignment.log') })
const { check } = run
let browser
const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"] *)'))
const activeArtwork = (page, name) => page.getByTestId(`artwork-${name}`).and(page.locator(':not([aria-hidden="true"] *)'))
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/tutor-${name}.png`))
async function fit(page, name) {
  for (const [width, height] of [[320, 844], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    check(`VIS-07 ${name} sem overflow ou recorte em ${width}`, await assertLayoutInWindow(page))
    await shot(page, `${name}-${width}`)
    if (width === 390) await captureScroll(page, `tutor-${name}-390-complete`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
}

try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  const categories = { delayMs: 1500, fail: false }
  await gateRoute(page, '**/api/v1/categories', categories)
  await loginTutor(page)
  // Plano 028: a busca precisa de endereço escolhido. Define o padrão e volta à Home para o fluxo abaixo.
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
  await page.getByLabel('Carregando categorias').waitFor()
  check('VIS-07 categorias carregam sem esconder a busca', await page.getByRole('button', { name: 'Buscar um serviço' }).isEnabled())
  await page.getByRole('button', { name: 'Banho e Tosa', exact: true }).waitFor({ timeout: 15000 })
  check('VIS-03 home traz ação de descoberta', await page.getByRole('button', { name: 'Explorar profissionais' }).isEnabled())
  const poodle = activeArtwork(page, 'poodle')
  const sourceLoaded = await poodle.locator('img').evaluate(async image => {
    if (!image.complete) await image.decode()
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  })
  const proportionPreserved = await poodle.evaluate(artwork => {
    const frame = artwork.getBoundingClientRect()
    const imageLayer = [...artwork.querySelectorAll('div')].find(element => getComputedStyle(element).backgroundImage !== 'none')
    if (!imageLayer || frame.width <= 0 || frame.height <= 0) return false
    const image = imageLayer.getBoundingClientRect()
    return image.width > 0 && image.height > 0 && getComputedStyle(imageLayer).backgroundSize === 'contain'
  })
  check('VIS-08 arte da home carregada e proporcional', sourceLoaded && proportionPreserved)
  await fit(page, 'home')

  await page.getByRole('button', { name: 'Banho e Tosa', exact: true }).click()
  await openCoverageFilters(page)
  await page.getByRole('radio', { name: 'Banho', exact: true }).waitFor()
  check('VIS-03 lista de serviços mantém o catálogo real', await page.getByRole('radio', { name: 'Tosa', exact: true }).count() === 1)
  await fit(page, 'servicos')
  await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  await page.getByRole('radio', { name: 'Banho, selecionado', exact: true }).waitFor()
  check('VIS-03 serviço escolhido permanece selecionado', await page.getByRole('radio', { name: 'Banho, selecionado', exact: true }).count() === 1)
  await shot(page, 'busca-inicial')
  if (await page.getByRole('button', { name: 'Trocar endereço', exact: true }).count()) {
    await activeText(page, 'Profissionais disponíveis').waitFor({ timeout: 20000 })
  }
  // A conta sem endereço padrão requer um local; quando houver padrão, a busca usa esse local real.
  check('VIS-07 busca mantém seleção utilizável', await page.getByRole('radio', { name: 'Banho, selecionado', exact: true }).isEnabled())

  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  const petsGate = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/pets', petsGate)
  await page.getByRole('button', { name: 'Meus pets', exact: true }).click()
  await activeText(page, 'Não foi possível carregar os pets.').waitFor({ timeout: 20000 })
  await shot(page, 'pets-erro')
  petsGate.fail = false
  petsGate.delayMs = 1200
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByLabel('Carregando pets', { exact: true }).waitFor()
  check('VIS-07 pets permitem recuperar erro com espera visível', await page.getByLabel('Carregando pets', { exact: true }).isVisible())
  await page.getByRole('button', { name: 'Cadastrar pet', exact: true }).waitFor({ timeout: 15000 })
  await fit(page, 'pets')
  await page.getByRole('button', { name: 'Cadastrar pet', exact: true }).click()
  const petPlaceholder = activeArtwork(page, 'pet-placeholder')
  await petPlaceholder.waitFor()
  check('VIS-08 cadastro de pet usa placeholder vetorial', await petPlaceholder.locator('svg').count() > 0)
  await fit(page, 'pet-form')
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click()
  await activeText(page, 'Informe o nome do pet').waitFor()
  check('VIS-03 formulário preserva validação', await activeText(page, 'Informe a espécie').count() === 1)
  await shot(page, 'pet-invalido')
  await page.getByRole('radio', { name: 'Cão', exact: true }).click()
  await page.getByRole('radio', { name: 'Cão', exact: true, checked: true }).waitFor()
  check('VIS-07 espécie anuncia seleção', await page.getByRole('radio', { name: 'Cão', exact: true, checked: true }).count() === 1)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Endereços', exact: true }).click()
  await page.getByRole('button', { name: 'Cadastrar endereço', exact: true }).waitFor()
  await shot(page, 'enderecos')
  await page.getByRole('button', { name: 'Cadastrar endereço', exact: true }).click()
  await page.getByRole('combobox', { name: 'Endereço', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Casa', exact: true }).click()
  check('VIS-03 rótulo de endereço anuncia seleção', await page.getByRole('button', { name: 'Casa, selecionado', exact: true }).count() === 1)
  await fit(page, 'endereco-form')
  check('VIS-07 endereço pode ser completado com teclado', await page.getByRole('textbox', { name: 'Complemento', exact: true }).isEnabled())

  const missingPhoto = await openPage(browser)
  await missingPhoto.route('**/api/v1/pets', async route => {
    const response = await route.fetch()
    const json = await response.json()
    json.data[0].photo_url = 'http://localhost:8081/visual-missing-pet.png'
    await route.fulfill({ response, json })
  })
  await loginTutor(missingPhoto)
  await missingPhoto.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await missingPhoto.getByRole('button', { name: 'Meus pets', exact: true }).click()
  await missingPhoto.getByTestId('artwork-pet-placeholder').and(missingPhoto.locator(':not([aria-hidden="true"] *)')).waitFor()
  check('VIS-08 falha da foto real preserva placeholder e edição', await missingPhoto.getByRole('button', { name: 'Editar Josefino', exact: true }).isEnabled())
  await shot(missingPhoto, 'pet-photo-fallback')

  const missingArt = await openPage(browser)
  await missingArt.route('**/*AS-02*', route => route.abort())
  await loginTutor(missingArt)
  await missingArt.getByTestId('artwork-poodle').locator('svg').waitFor()
  check('VIS-08 falha de ilustração mantém busca utilizável', await missingArt.getByRole('button', { name: 'Buscar um serviço', exact: true }).isEnabled())
  await shot(missingArt, 'art-fallback')

} catch (error) { run.fail(error) }
finally { await run.finish(browser) }
