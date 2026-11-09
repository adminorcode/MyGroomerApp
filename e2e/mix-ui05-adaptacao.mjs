import { appUrl, evidenceFile, launchBrowser, loginProfessional, loginTutor, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-ui05-adaptacao.mjs',
  evidence: evidenceFile(plan, 'mix-ui05-adaptacao.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

async function fits(page, label) {
  const extra = await overflow(page)
  check(`${label} sem rolagem horizontal`, extra <= 1, `overflow ${extra}`)
}

async function resize(page, width, height) {
  await page.setViewportSize({ width, height })
}

async function actionReachable(page, actionName, label) {
  const action = page.getByRole('button', { name: actionName, exact: true }).last()
  await action.scrollIntoViewIfNeeded()
  const box = await action.boundingBox()
  const viewport = page.viewportSize()
  const inside = !!box
    && box.y >= -1
    && box.y + box.height <= viewport.height + 1
    && box.x >= -1
    && box.x + box.width <= viewport.width + 1
  check(`${label} ação alcançável com o campo em foco`, inside, box ? JSON.stringify(box) : 'sem caixa')
}

async function focusKeepsAction(page, field, actionName, label) {
  await field.click()
  await actionReachable(page, actionName, label)
}

async function enlargeText(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('div, span, p, h1, h2, h3, label, button, a')) {
      if (el.children.length) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (size > 0) {
        el.style.fontSize = `${size * 2}px`
        el.style.lineHeight = 'normal'
      }
    }
  })
}

async function labelInsideButton(page, actionName, label) {
  const button = page.getByRole('button', { name: actionName, exact: true }).last()
  const text = button.getByText(actionName, { exact: true })
  const buttonBox = await button.boundingBox()
  const textBox = await text.boundingBox()
  const inside = !!buttonBox && !!textBox
    && textBox.x >= buttonBox.x - 1
    && textBox.x + textBox.width <= buttonBox.x + buttonBox.width + 1
  check(`${label} texto ampliado permanece no botão`, inside)
}

const browser = await launchBrowser()
try {
  const page = await openPage(browser, { viewport: 'mobile' })

  await openLogin(page)
  await resize(page, 320, 760)
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor()
  await fits(page, 'UI-05 login em 320')
  await focusKeepsAction(page, page.getByRole('textbox', { name: 'E-mail', exact: true }).last(), 'Entrar', 'UI-05 login')
  await shot(page, 'ui05-login-320')
  await resize(page, 1440, 900)
  await fits(page, 'UI-05 login em 1440')

  await page.getByRole('button', { name: 'Esqueci minha senha', exact: true }).click()
  await page.getByRole('button', { name: 'Enviar', exact: true }).waitFor()
  await resize(page, 320, 760)
  await fits(page, 'UI-05 recuperar senha em 320')
  await focusKeepsAction(page, page.getByRole('textbox', { name: 'E-mail', exact: true }).last(), 'Enviar', 'UI-05 recuperar senha')

  await openLogin(page)
  await page.getByRole('button', { name: 'Não tem uma conta? Cadastre-se', exact: true }).click()
  await page.getByRole('button', { name: 'Sou tutor', exact: true }).waitFor()
  await resize(page, 320, 760)
  await fits(page, 'UI-05 boas-vindas em 320')
  await enlargeText(page)
  await labelInsideButton(page, 'Sou tutor', 'UI-05 boas-vindas')
  await fits(page, 'UI-05 boas-vindas com texto a 200%')
  await shot(page, 'ui05-boas-vindas-texto200')

  await loginTutor(page)
  await resize(page, 320, 760)
  await fits(page, 'UI-05 início em 320')
  await shot(page, 'ui05-inicio-320')
  await resize(page, 1440, 900)
  await fits(page, 'UI-05 início em 1440')
  await resize(page, 320, 760)

  const tutorTabs = ['Agendamentos', 'Mensagens']
  for (const name of tutorTabs) {
    await page.getByRole('tab', { name, exact: true }).click()
    await fits(page, `UI-05 ${name.toLowerCase()} do tutor em 320`)
  }

  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await page.getByRole('button', { name: 'Meus pets', exact: true }).waitFor()
  await fits(page, 'UI-05 perfil do tutor em 320')
  await page.getByRole('button', { name: 'Meus pets', exact: true }).click()
  await page.getByRole('button', { name: 'Cadastrar pet', exact: true }).waitFor({ timeout: 20000 })
  await fits(page, 'UI-05 meus pets em 320')
  await page.goBack()
  await page.getByRole('button', { name: 'Endereços', exact: true }).click()
  await page.getByRole('button', { name: 'Cadastrar endereço', exact: true }).waitFor({ timeout: 20000 })
  await fits(page, 'UI-05 endereços em 320')
  await page.getByRole('button', { name: 'Cadastrar endereço', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar endereço', exact: true }).waitFor({ timeout: 20000 })
  await fits(page, 'UI-05 formulário de endereço em 320')
  await focusKeepsAction(page, page.getByRole('combobox', { name: 'Endereço', exact: true }).last(), 'Salvar endereço', 'UI-05 formulário de endereço')

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await page.getByRole('button', { name: /^Filtros/ }).waitFor({ timeout: 20000 })
  await resize(page, 320, 760)
  await fits(page, 'UI-05 busca em 320')
  await resize(page, 1440, 900)
  await fits(page, 'UI-05 busca em 1440')

  const groomer = await openPage(browser, { viewport: 'mobile' })
  await loginProfessional(groomer)
  await resize(groomer, 320, 760)
  await groomer.getByText('Agenda do groomer', { exact: true }).waitFor()
  await fits(groomer, 'UI-05 agenda em 320')
  await resize(groomer, 1440, 900)
  await fits(groomer, 'UI-05 agenda em 1440')
  await shot(groomer, 'ui05-agenda-1440')
  await resize(groomer, 320, 760)

  for (const name of ['Solicitações', 'Serviços', 'Rendimentos', 'Mensagens']) {
    await groomer.getByRole('tab', { name, exact: true }).click()
    await fits(groomer, `UI-05 ${name.toLowerCase()} do profissional em 320`)
  }

  await groomer.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await groomer.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await groomer.getByRole('button', { name: 'Editar foto', exact: true }).waitFor({ timeout: 20000 })
  await fits(groomer, 'UI-05 perfil público em 320')
  await enlargeText(groomer)
  await labelInsideButton(groomer, 'Visualizar como tutor', 'UI-05 perfil público')
  await fits(groomer, 'UI-05 perfil público com texto a 200%')
  await shot(groomer, 'ui05-perfil-texto200')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
