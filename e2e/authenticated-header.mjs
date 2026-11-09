import { APP_NAME, evidenceFile, launchBrowser, loginProfessional, loginTutor, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '028-explorar-groomers-servicos'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/authenticated-header.mjs',
  evidence: evidenceFile(plan, 'authenticated-header.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/header/${name}.png`))

const TEAL = 'rgb(22, 125, 131)'
const PINK = 'rgb(198, 72, 120)'
const WHITE = 'rgb(255, 255, 255)'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

async function firstVisible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return locator.nth(index)
  }
  return locator.first()
}

async function visibleCount(locator) {
  let count = 0
  for (let index = 0; index < await locator.count(); index += 1) {
    if (await locator.nth(index).isVisible()) count += 1
  }
  return count
}

async function enclosingBackground(locator) {
  return locator.evaluate(el => {
    for (let node = el; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor
      if (background !== 'rgba(0, 0, 0, 0)') return background
    }
    return ''
  })
}

let browser
try {
  browser = await launchBrowser()

  const loggedOut = await openPage(browser)
  await openLogin(loggedOut)
  check('H-07 login não mostra o avatar da conta', await visibleCount(loggedOut.getByRole('button', { name: 'Abrir perfil', exact: true })) === 0)
  check('H-09 o aviso de ambiente de teste não aparece', await loggedOut.getByText('Ambiente de teste local', { exact: false }).count() === 0)

  const tutor = await openPage(browser)
  await loginTutor(tutor)
  const tutorBrand = () => firstVisible(tutor.getByText(APP_NAME, { exact: true }))
  check('H-01 tutor vê uma marca e um avatar', await visibleCount(tutor.getByText(APP_NAME, { exact: true })) === 1 && await visibleCount(tutor.getByRole('button', { name: 'Abrir perfil', exact: true })) === 1)
  const homeBrand = await tutorBrand()
  check('H-08 início usa a barra verde com a marca em branco', await enclosingBackground(homeBrand) === TEAL && await homeBrand.evaluate(el => getComputedStyle(el).color) === WHITE)
  await shot(tutor, '01-tutor-inicio-390')

  for (const tab of ['Agendamentos', 'Mensagens', 'Início']) {
    await (await firstVisible(tutor.getByRole('tab', { name: tab, exact: true }))).click()
    check(`H-06 tutor mantém um avatar em ${tab}`, await visibleCount(tutor.getByRole('button', { name: 'Abrir perfil', exact: true })) === 1)
  }

  await tutor.getByRole('button', { name: 'Buscar um serviço' }).click()
  await tutor.getByRole('heading', { name: 'Quem atende', exact: true }).waitFor()
  const heading = await firstVisible(tutor.getByRole('heading', { name: 'Quem atende', exact: true }))
  const headingColor = await heading.evaluate(el => getComputedStyle(el).color)
  const band = await enclosingBackground(heading)
  check('H-04 título branco sobre a faixa teal', headingColor === WHITE && band === TEAL && ratio(headingColor, band) >= 4.5, `${headingColor} ${band} ${ratio(headingColor, TEAL).toFixed(2)}`)
  const back = await firstVisible(tutor.getByRole('button', { name: 'Voltar', exact: true }))
  const backBox = await back.evaluate(el => {
    const box = el.getBoundingClientRect()
    return { width: box.width, height: box.height }
  })
  check('H-04 Voltar tem alvo de pelo menos 48 pt', backBox.width >= 48 && backBox.height >= 48, JSON.stringify(backBox))
  check('H-01 a busca não repete a marca', await visibleCount(tutor.getByText(APP_NAME, { exact: true })) === 1)
  await (await firstVisible(tutor.getByRole('button', { name: 'Filtros', exact: true }))).click()
  check('H-05 Filtros ainda abre o painel da busca', await tutor.getByRole('radiogroup', { name: 'Serviço' }).isVisible())
  await (await firstVisible(tutor.getByRole('button', { name: 'Cancelar', exact: true }))).click()
  const query = tutor.getByRole('textbox', { name: 'Profissional, serviço ou tipo de atendimento' })
  await query.fill('Banho')
  await (await firstVisible(tutor.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await tutor.getByText('Gerencie sua conta', { exact: true }).waitFor()
  check('H-07 avatar do tutor abre o perfil', await tutor.getByText('Gerencie sua conta', { exact: true }).isVisible())
  check('H-08 perfil do tutor usa a barra rosa', await enclosingBackground(await tutorBrand()) === PINK)
  await shot(tutor, '06-perfil-tutor-rosa')
  await (await firstVisible(tutor.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  check('H-07 avatar no próprio perfil não empilha outra conta', await visibleCount(tutor.getByText('Gerencie sua conta', { exact: true })) === 1)
  await (await firstVisible(tutor.getByRole('tab', { name: 'Início', exact: true }))).click()
  check('H-02 a busca preserva o texto ao voltar do perfil', await query.inputValue() === 'Banho', await query.inputValue())
  await (await firstVisible(tutor.getByRole('button', { name: 'Voltar', exact: true }))).click()
  await tutor.getByRole('button', { name: 'Buscar um serviço' }).waitFor()
  check('H-02 Voltar retorna ao início', await tutor.getByRole('button', { name: 'Buscar um serviço' }).isVisible())

  await tutor.setViewportSize({ width: 320, height: 700 })
  await tutor.getByRole('button', { name: 'Buscar um serviço' }).click()
  await tutor.getByRole('heading', { name: 'Quem atende', exact: true }).waitFor()
  const clamp = await tutor.getByText('Profissionais que atendem no seu endereço', { exact: true }).evaluate(el => getComputedStyle(el).webkitLineClamp || el.style.webkitLineClamp || '')
  check('H-03 subtítulo da faixa continua legível em 320', await tutor.getByText('Profissionais que atendem no seu endereço', { exact: true }).isVisible() && clamp !== '1')
  await shot(tutor, '02-busca-320')
  await tutor.setViewportSize({ width: 1440, height: 900 })
  await shot(tutor, '03-busca-1440')

  await (await firstVisible(tutor.getByRole('tab', { name: 'Mensagens', exact: true }))).click()
  await (await firstVisible(tutor.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }))).click()
  await tutor.getByRole('heading', { name: 'Conversa', exact: true }).waitFor()
  check('H-01 chat do tutor mantém marca, avatar e o cabeçalho da conversa', await visibleCount(tutor.getByText(APP_NAME, { exact: true })) === 1 && await visibleCount(tutor.getByRole('button', { name: 'Abrir perfil', exact: true })) === 1 && await tutor.getByRole('heading', { name: 'Conversa', exact: true }).isVisible())
  check('H-08 chat do tutor usa a barra rosa', await enclosingBackground(await tutorBrand()) === PINK)
  await (await firstVisible(tutor.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await tutor.getByText('Gerencie sua conta', { exact: true }).waitFor()
  check('H-07 avatar no chat do tutor abre o perfil', await tutor.getByText('Gerencie sua conta', { exact: true }).isVisible())
  tutor.once('dialog', dialog => dialog.accept())
  await (await firstVisible(tutor.getByRole('button', { name: 'Sair', exact: true }))).click()
  await tutor.getByRole('button', { name: 'Entrar', exact: true }).waitFor()
  check('H-07 sair remove o topo da conta', await visibleCount(tutor.getByRole('button', { name: 'Abrir perfil', exact: true })) === 0)
  await shot(tutor, '04-login-sem-avatar')

  const professional = await openPage(browser, { viewport: 'desktop' })
  await loginProfessional(professional)
  const professionalBrand = () => firstVisible(professional.getByText(APP_NAME, { exact: true }))
  check('H-01 profissional vê uma marca e um avatar', await visibleCount(professional.getByText(APP_NAME, { exact: true })) === 1 && await visibleCount(professional.getByRole('button', { name: 'Abrir perfil', exact: true })) === 1)
  check('H-08 agenda do profissional usa a barra verde', await enclosingBackground(await professionalBrand()) === TEAL)
  for (const tab of ['Solicitações', 'Serviços', 'Rendimentos', 'Mensagens', 'Agenda']) {
    await (await firstVisible(professional.getByRole('tab', { name: tab, exact: true }))).click()
    check(`H-06 profissional mantém um avatar em ${tab}`, await visibleCount(professional.getByRole('button', { name: 'Abrir perfil', exact: true })) === 1)
  }
  await (await firstVisible(professional.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await professional.getByText('Gerencie sua conta', { exact: true }).waitFor()
  check('H-07 avatar do profissional abre o perfil', await professional.getByRole('button', { name: 'Perfil público', exact: true }).isVisible())
  check('H-08 perfil do profissional mantém a barra verde', await enclosingBackground(await professionalBrand()) === TEAL)
  await (await firstVisible(professional.getByRole('tab', { name: 'Mensagens', exact: true }))).click()
  await (await firstVisible(professional.getByRole('button', { name: 'Conversa com Tutor de Teste', exact: true }))).click()
  await professional.getByRole('heading', { name: 'Conversa', exact: true }).waitFor()
  check('H-01 chat do profissional mantém marca e o cabeçalho da conversa', await visibleCount(professional.getByText(APP_NAME, { exact: true })) === 1 && await professional.getByRole('heading', { name: 'Conversa', exact: true }).isVisible())
  await (await firstVisible(professional.getByRole('button', { name: 'Abrir perfil', exact: true }))).click()
  await professional.getByText('Gerencie sua conta', { exact: true }).waitFor()
  check('H-07 avatar no chat do profissional abre o perfil', await professional.getByRole('button', { name: 'Perfil público', exact: true }).isVisible())
  await shot(professional, '05-profissional-perfil-1440')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
