import { evidenceFile, launchBrowser, loginProfessional, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-23-perfil-conta.mjs',
  evidence: evidenceFile(plan, 'mix-23-perfil-conta.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

// Tokens resolvidos em rgb (R2, R3, R8, AC-02, AC-07, CMP-21).
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle
const PINK_TEXT = 'rgb(198, 38, 105)' // action.primaryText (rosa-texto, R5)
const TEAL = 'rgb(22, 125, 131)' // brand.teal
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const TEXT = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)' // text.inverse

// Telas empilhadas permanecem no DOM: usa o primeiro elemento visível.
async function firstVisible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

// Fundo efetivo: primeiro ancestral (ou o próprio elemento) com fundo não transparente.
const backgroundOf = locator => locator.evaluate(el => {
  for (let node = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg !== 'rgba(0, 0, 0, 0)') return bg
  }
  return 'rgba(0, 0, 0, 0)'
})
const colorOf = locator => locator.evaluate(el => getComputedStyle(el).color)
const borderColorOf = locator => locator.evaluate(el => getComputedStyle(el).borderTopColor)
const boxOf = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  return { minHeight: cs.minHeight, radius: cs.borderRadius }
})
// Traço do ícone (lucide): primeiro nó do SVG com traço definido.
const iconStroke = locator => locator.evaluate(el => {
  for (const node of [el, ...el.querySelectorAll('*')]) {
    const stroke = getComputedStyle(node).stroke
    if (stroke && stroke !== 'none') return stroke
  }
  return 'none'
})

let browser
try {
  browser = await launchBrowser()

  // --- Tutor (papel rosa, R8) ---
  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await (await firstVisible(tutor.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await tutor.getByText('Gerencie sua conta', { exact: true }).waitFor({ timeout: 15000 })

  const tutorAvatar = await firstVisible(tutor.getByLabel('Tutor de Teste', { exact: true }))
  check('R8 avatar do tutor em rosa sutil (pinkSubtle)', await backgroundOf(tutorAvatar) === PINK_SUBTLE, await backgroundOf(tutorAvatar))
  check('R5 inicial do avatar do tutor em rosa-texto sobre pinkSubtle', await colorOf(tutorAvatar.getByText('T', { exact: true })) === PINK_TEXT)

  const tutorPill = await firstVisible(tutor.getByText('Tutor', { exact: true }))
  check('R8 etiqueta do papel Tutor em pinkSubtle com texto primário', await backgroundOf(tutorPill) === PINK_SUBTLE && await colorOf(tutorPill) === TEXT)

  const petsItem = await firstVisible(tutor.getByRole('button', { name: 'Meus pets', exact: true }))
  check('R2 ícone de Meus pets em rosa-texto', await iconStroke(petsItem.locator('svg').first()) === PINK_TEXT, await iconStroke(petsItem.locator('svg').first()))
  const addressItem = await firstVisible(tutor.getByRole('button', { name: 'Endereços', exact: true }))
  check('R2 ícone de Endereços em rosa-texto', await iconStroke(addressItem.locator('svg').first()) === PINK_TEXT)
  check('R2 Meus pets mantém título e descrição do papel tutor', await tutor.getByText('Cadastre e reutilize os pets nos agendamentos', { exact: true }).isVisible())

  const logoutTutor = await firstVisible(tutor.getByRole('button', { name: 'Sair', exact: true }))
  check('R6 Sair usa feedback.error no contorno', await borderColorOf(logoutTutor) === ERROR, await borderColorOf(logoutTutor))
  check('R6 Sair usa feedback.error no texto', await colorOf(logoutTutor.getByText('Sair', { exact: true })) === ERROR)
  const logoutBox = await boxOf(logoutTutor)
  check('AC-07 Sair mantém altura 40 e raio 16', logoutBox.minHeight === '40px' && logoutBox.radius === '16px', JSON.stringify(logoutBox))
  await shot(tutor, 'perfil-tutor')

  // --- Profissional (papel teal, R8) ---
  const professional = await openPage(browser)
  await loginProfessional(professional)
  await (await firstVisible(professional.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await professional.getByText('Gerencie sua conta', { exact: true }).waitFor({ timeout: 15000 })

  const proAvatar = await firstVisible(professional.getByLabel('Groomer de Teste', { exact: true }))
  check('R8 avatar do profissional em teal sólido', await backgroundOf(proAvatar) === TEAL, await backgroundOf(proAvatar))
  check('R5 inicial do avatar do profissional em branco sobre teal', await colorOf(proAvatar.getByText('G', { exact: true })) === WHITE)

  const proPill = await firstVisible(professional.getByText('Profissional', { exact: true }))
  check('R8 etiqueta do papel Profissional em tealSubtle com texto primário', await backgroundOf(proPill) === TEAL_SUBTLE && await colorOf(proPill) === TEXT)

  const publicItem = await firstVisible(professional.getByRole('button', { name: 'Perfil público', exact: true }))
  check('R3 ícone de Perfil público em teal', await iconStroke(publicItem.locator('svg').first()) === TEAL, await iconStroke(publicItem.locator('svg').first()))
  const petsForProfessional = professional.getByRole('button', { name: 'Meus pets', exact: true })
  let visiblePets = 0
  for (let index = 0; index < await petsForProfessional.count(); index += 1) {
    if (await petsForProfessional.nth(index).isVisible()) visiblePets += 1
  }
  check('AC-13 papel profissional não mostra Meus pets', visiblePets === 0, `${visiblePets} visível(is)`)
  await shot(professional, 'perfil-profissional')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
