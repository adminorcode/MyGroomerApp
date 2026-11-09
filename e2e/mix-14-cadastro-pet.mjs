import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-14-cadastro-pet.mjs',
  evidence: evidenceFile(plan, 'mix-14-cadastro-pet.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, CMP-06)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (CMP-06 contorno)
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle (R2, CMP-12)
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const WHITE = 'rgb(255, 255, 255)'

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
    return {
      background: cs.backgroundColor,
      color: cs.color,
      border: cs.borderTopColor,
      radius: cs.borderTopLeftRadius,
      minHeight: cs.minHeight,
      checked: el.getAttribute('aria-checked'),
    }
  })
}

async function openPets(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Meus pets', exact: true }).click()
  await page.getByText('Cadastre os pets para reutilizar nos agendamentos').waitFor({ timeout: 15000 })
}

const petName = `Mix Pet ${Date.now()}`

let browser
try {
  browser = await launchBrowser()
  const gate = { fail: false, delayMs: 0 }
  const petGate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/pets', gate)
  await gateRoute(page, '**/api/v1/pets/*', petGate)
  await loginTutor(page)
  await openPets(page)

  // --- Cadastro: estado inicial (tela 14) ---
  await page.getByRole('button', { name: 'Cadastrar pet', exact: true }).click()
  await page.getByText('A foto é opcional. O pet pode ser salvo sem ela.').waitFor({ timeout: 15000 })
  const placeholder = await visibleOf(page.getByTestId('artwork-pet-placeholder'))
  const frame = placeholder ? await placeholder.locator('xpath=..').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderTopLeftRadius, width: getComputedStyle(el).width, height: getComputedStyle(el).height })) : null
  const pawSvg = placeholder ? await placeholder.locator('svg').count() : 0
  check('CMP-12 placeholder de foto em pinkSubtle com pata', frame?.background === PINK_SUBTLE && pawSvg > 0, JSON.stringify(frame))
  // Círculo: raio = metade do lado (96 pt → 48 px) e largura igual à altura.
  check('AC-07 placeholder de foto em círculo', frame?.radius === '48px' && frame?.width === frame?.height && frame?.width === '96px', JSON.stringify(frame))

  const dog = page.getByRole('radio', { name: 'Cão', exact: true })
  const dogIdle = await styleOf(dog)
  check('CMP-06 espécie não selecionada usa contorno rosa-texto sobre branco', dogIdle.border === TEXT_PINK && dogIdle.background === WHITE, JSON.stringify(dogIdle))
  await shot(page, 'cadastro-vazio')

  // --- Validação com texto (AC-08) ---
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click()
  await page.getByText('Informe o nome do pet').waitFor({ timeout: 15000 })
  const errorStyle = await styleOf(page.getByText('Informe o nome do pet'))
  check('AC-08 erro de validação com texto e cor de erro', errorStyle.color === ERROR, errorStyle.color)
  await page.getByText('Informe o nome do pet').scrollIntoViewIfNeeded()
  // F-B13: o grupo Espécie é fixo no formulário; espera o estado de erro pintado (chips com contorno feedback.error e altura > 0) antes da captura.
  await dog.getByText('Cão', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(({ error, names }) => names.every(name => {
    const chip = Array.from(document.querySelectorAll('[role="radio"]'))
      .filter(el => el.getClientRects().length > 0)
      .find(el => el.getAttribute('aria-label') === name)
    return !!chip && chip.getBoundingClientRect().height > 0 && getComputedStyle(chip).borderTopColor === error
  }), { error: ERROR, names: ['Cão', 'Gato', 'Outro'] }, { timeout: 15000 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

  // F-B13: no erro de validação os três chips de espécie precisam estar visíveis, com papel radio, nome exato e contorno de erro.
  const specieChips = ['Cão', 'Gato', 'Outro'].map(name => page.getByRole('radio', { name, exact: true }))
  const specieInError = []
  for (const chip of specieChips) specieInError.push({ visible: await chip.isVisible(), border: (await styleOf(chip)).border })
  check('F-B13 chips de espécie visíveis no estado de erro', specieInError.every(state => state.visible && state.border === ERROR), JSON.stringify(specieInError))
  await shot(page, 'cadastro-erro')

  await page.getByText('Espécie', { exact: true }).scrollIntoViewIfNeeded()
  await shot(page, 'cadastro-erro-especie')

  // --- Preenchimento: chips selecionados em rosa (CMP-06, R1) ---
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill(petName)
  const nameField = await styleOf(page.getByRole('textbox', { name: 'Nome', exact: true }))
  check('AC-07 campo com raio 12 e altura 40', nameField.radius === '12px' && nameField.minHeight === '40px', `${nameField.radius} ${nameField.minHeight}`)

  await dog.click()
  const dogSelected = await styleOf(page.getByRole('radio', { name: 'Cão', exact: true, checked: true }))
  const dogLabel = await styleOf(page.getByRole('radio', { name: 'Cão', exact: true, checked: true }).getByText('Cão', { exact: true }))
  check('CMP-06 espécie selecionada em action.primary com texto branco', dogSelected.background === CTA_PINK && dogLabel.color === WHITE, dogSelected.background)
  check('AC-08 espécie selecionada anuncia estado marcado', dogSelected.checked === 'true')

  await page.getByRole('radio', { name: 'Médio', exact: true }).click()
  const size = await styleOf(page.getByRole('radio', { name: 'Médio', exact: true, checked: true }))
  check('CMP-06 porte selecionado em action.primary', size.background === CTA_PINK, size.background)

  await page.getByRole('textbox', { name: 'Raça', exact: true }).fill('SRD')
  await page.getByRole('textbox', { name: 'Idade (anos)', exact: true }).fill('3')
  await page.getByRole('button', { name: 'Em dia', exact: true }).click()
  const vaccine = await styleOf(page.getByRole('button', { name: 'Em dia', exact: true }))
  check('CMP-06 vacinação selecionada em action.primary', vaccine.background === CTA_PINK, vaccine.background)
  await shot(page, 'cadastro-preenchido')

  // --- Salvando: CTA ocupado e bloqueado (AC-08) ---
  gate.delayMs = 1500
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click()
  const busy = await page.getByRole('button', { name: 'Salvar e continuar', exact: true, disabled: true }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  check('AC-08 salvar mostra carregamento e bloqueia o CTA', busy)
  await shot(page, 'cadastro-salvando')
  gate.delayMs = 0

  // --- Sucesso: volta à lista com o pet salvo ---
  await page.getByText('Cadastre os pets para reutilizar nos agendamentos').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: `Editar ${petName}`, exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 sucesso volta à lista com o pet salvo', true)

  // --- Edição (tela 14): carregando e dados preservados ---
  petGate.delayMs = 1500
  await page.getByRole('button', { name: `Editar ${petName}`, exact: true }).click()
  await page.getByLabel('Carregando pet', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 carregando pet mostra indicador com rótulo', await page.getByLabel('Carregando pet', { exact: true }).isVisible())
  petGate.delayMs = 0
  await page.getByRole('textbox', { name: 'Nome', exact: true }).waitFor({ timeout: 15000 })
  check('AC-13 edição preserva o nome do pet', await page.getByRole('textbox', { name: 'Nome', exact: true }).inputValue() === petName)
  const save = page.getByRole('button', { name: 'Salvar', exact: true })
  check('R1 Salvar na edição é action.primary com texto branco', (await styleOf(save)).background === CTA_PINK && (await styleOf(save.getByText('Salvar', { exact: true }))).color === WHITE)
  await shot(page, 'cadastro-edicao')

  // --- Erro ao abrir o pet (AC-08) ---
  const broken = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(broken, '**/api/v1/pets/*', { fail: true, delayMs: 0 })
  await loginTutor(broken)
  await openPets(broken)
  await broken.getByRole('button', { name: `Editar ${petName}`, exact: true }).click()
  await broken.getByText('Não foi possível carregar este pet.').waitFor({ timeout: 20000 })
  check('AC-08 erro ao abrir o pet mantém texto e voltar', await broken.getByRole('button', { name: 'Voltar', exact: true }).isEnabled())
  check('AC-08 erro ao abrir pet oferece Tentar novamente', (await visibleOf(broken.getByRole('button', { name: 'Tentar novamente', exact: true }))) !== null)
  await shot(broken, 'cadastro-erro-carregar')

  // --- Desktop (1440) ---
  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openPets(wide)
  await wide.getByRole('button', { name: 'Cadastrar pet', exact: true }).click()
  await wide.getByText('A foto é opcional. O pet pode ser salvo sem ela.').waitFor({ timeout: 15000 })
  const wideSave = await styleOf(wide.getByRole('button', { name: 'Salvar e continuar', exact: true }))
  check('R1 CTA do cadastro em desktop é action.primary', wideSave.background === CTA_PINK, wideSave.background)
  await shot(wide, 'cadastro-1440')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
