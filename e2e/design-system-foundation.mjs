import { appUrl as base, evidenceFile, fixtures, launchBrowser, openPage, startRun } from './harness.mjs'

const tutor = fixtures.tutor
const groomer = fixtures.groomer
const session = startRun({
  command: 'node e2e/design-system-foundation.mjs',
  evidence: evidenceFile('021-design-system-foundation', 'design-system-foundation.log'),
})
const { check } = session

async function textOf(page) {
  return page.locator('body').innerText()
}

async function openWelcome(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sou tutor' }).waitFor({ timeout: 90000 })
}

function visibleButton(page, name) {
  return page.getByRole('button', { name }).filter({ visible: true })
}

async function goToProfile(page) {
  if ((await visibleButton(page, 'Sair').count()) > 0) return
  if ((await visibleButton(page, 'Design System').count()) > 0) return
  await visibleButton(page, 'Abrir perfil').click()
  await visibleButton(page, 'Sair').or(visibleButton(page, 'Design System')).first().waitFor({
    state: 'visible',
    timeout: 20000,
  })
}

async function placeholderColor(page, name) {
  return page.getByRole('textbox', { name }).evaluate((el) => getComputedStyle(el, '::placeholder').color)
}

async function fontFamily(locator) {
  return locator.evaluate((el) => getComputedStyle(el).fontFamily || '')
}

function usesFace(family, face) {
  return family.includes(face)
}

async function runTutor(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })


  await openWelcome(page)
  let body = await textOf(page)
  const logoFace = await fontFamily(page.getByText('MyGroomer').first())
  const subtitleFace = await fontFamily(page.getByText('Banho e tosa em domicílio').first())
  const tutorButtonFace = await fontFamily(page.getByText('Sou tutor', { exact: true }).first())
  check('AC-14 logotipo permanece em Abres', usesFace(logoFace, 'Abres'), logoFace)
  check('AC-14 subtítulo em Inter Regular', usesFace(subtitleFace, 'Inter-Regular'), subtitleFace)
  check('AC-14 botão em Inter SemiBold', usesFace(tutorButtonFace, 'Inter-SemiBold'), tutorButtonFace)
  check(
    'AC-11 boas-vindas com seletor de perfil',
    body.includes('MyGroomer') &&
      body.includes('Banho e tosa em domicílio') &&
      body.includes('Sou tutor') &&
      body.includes('Sou profissional'),
  )
  const welcomeCentered = await page.getByText('MyGroomer').evaluate((el) => {
    const title = el.getBoundingClientRect()
    const button = Array.from(document.querySelectorAll('[role="button"]')).find((node) =>
      (node.textContent || '').includes('Sou tutor'),
    )
    if (!button) return false
    const btn = button.getBoundingClientRect()
    const titleCenter = title.left + title.width / 2
    const btnCenter = btn.left + btn.width / 2
    const viewportCenter = window.innerWidth / 2
    return Math.abs(titleCenter - viewportCenter) < 40 && Math.abs(btnCenter - viewportCenter) < 40
  })
  check('AC-11 boas-vindas centralizadas', welcomeCentered)
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await page.getByText('Cadastro profissional', { exact: true }).first().waitFor({ timeout: 15000 })
  body = await textOf(page)
  check('AC-11 profissional abre cadastro groomer', body.includes('Cadastro profissional'))
  const registerLayout = await page.getByRole('textbox', { name: 'Nome completo' }).evaluate((el) => {
    const field = el.getBoundingClientRect()
    const title = Array.from(document.querySelectorAll('div,span,h1,p')).find((node) =>
      (node.textContent || '').trim() === 'Cadastro profissional',
    )
    const titleBox = title?.getBoundingClientRect()
    let pageBg = 'none'
    let node = el.parentElement
    while (node) {
      const bg = getComputedStyle(node).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        pageBg = bg
        break
      }
      node = node.parentElement
    }
    const fieldBg = getComputedStyle(el).backgroundColor
    const viewportCenter = window.innerWidth / 2
    const fieldCenter = field.left + field.width / 2
    const titleCentered = titleBox ? Math.abs(titleBox.left + titleBox.width / 2 - viewportCenter) < 48 : false
    return {
      fieldDistinct: fieldBg !== pageBg || (parseFloat(getComputedStyle(el).borderWidth) >= 1 && getComputedStyle(el).borderColor !== fieldBg),
      fieldBg,
      pageBg,
      centered: Math.abs(fieldCenter - viewportCenter) < 90 && !!titleBox,
    }
  })
  check(
    'AC-11 campo MG distinguível por superfície ou borda',
    registerLayout.fieldDistinct,
    `field=${registerLayout.fieldBg} page=${registerLayout.pageBg}`,
  )
  check('AC-11 cadastro profissional centralizado', registerLayout.centered)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Sou tutor' }).waitFor()
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).waitFor()
  body = await textOf(page)
  check('AC-11 login tutor usa campos MG', body.includes('E-mail') && body.includes('Senha') && body.includes('Entrar'))

  await page.getByText('Não tem uma conta? Cadastre-se').click()
  await page.getByRole('button', { name: 'Criar conta' }).waitFor()
  const namePlaceholder = await placeholderColor(page, 'Nome completo')
  const emailPlaceholder = await placeholderColor(page, 'E-mail')
  const phonePlaceholder = await placeholderColor(page, 'Telefone')
  check(
    'AC-11 placeholder do telefone alinhado ao nome/e-mail',
    phonePlaceholder === namePlaceholder && phonePlaceholder === emailPlaceholder,
    `nome=${namePlaceholder} email=${emailPlaceholder} telefone=${phonePlaceholder}`,
  )
  const phonePhText = await page.getByRole('textbox', { name: 'Telefone' }).getAttribute('placeholder')
  check('AC-11 placeholder do telefone em português', phonePhText === 'Digite seu telefone', phonePhText ?? '')
  await page.getByText('Já tem uma conta? Entrar', { exact: false }).click().catch(async () => {
    await openWelcome(page)
    await page.getByRole('button', { name: 'Sou tutor' }).click()
    await page.getByRole('textbox', { name: 'E-mail' }).waitFor()
  })

  await page.getByRole('textbox', { name: 'E-mail' }).fill(tutor.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(tutor.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
  body = await textOf(page)
  check('AC-12 home do tutor', /Olá/.test(body) && body.includes('Início'))

  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).waitFor({ timeout: 15000 })
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
  const banho = page.getByRole('radio', { name: /Banho/i }).first()
  if ((await banho.count()) > 0) {
    await banho.click()
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.waitForTimeout(1500)
  body = await textOf(page)
  const hasGroomerCard =
    body.includes('Marina') ||
    body.includes('groomer') ||
    body.includes('Groomer') ||
    /A partir de|R\$/.test(body) ||
    body.includes('Nenhum groomer') ||
    body.includes('não encontrou')
  check('AC-12 busca renderiza resultado ou vazio MG', hasGroomerCard, body.slice(0, 280))

  await goToProfile(page)
  body = await textOf(page)
  check('AC-12 perfil tutor', body.includes('Sair') && (body.includes('Perfil') || body.includes('Design System')))

  const showcaseEntry = visibleButton(page, 'Design System')
  const hasShowcase = (await showcaseEntry.count()) > 0
  check('AC-10 entrada do showcase em __DEV__', hasShowcase)
  if (hasShowcase) {
    await showcaseEntry.first().click()
    await page.getByText('Showcase de desenvolvimento', { exact: false }).waitFor({ timeout: 15000 })
    body = await textOf(page)
    check(
      'AC-10 showcase com MG e patterns',
      body.includes('Tipografia') &&
        body.includes('Botões') &&
        body.includes('Padrões de domínio') &&
        body.includes('Primário') &&
        (body.includes('Luna') || body.includes('Marina Groomer')),
    )
    const faces = {
      display: await fontFamily(page.getByText('Display', { exact: true })),
      heading: await fontFamily(page.getByText('Heading 2', { exact: true })),
      section: await fontFamily(page.getByText('Tipografia', { exact: true })),
      body: await fontFamily(page.getByText('Corpo de texto padrão', { exact: true })),
      label: await fontFamily(page.getByText('Rótulo', { exact: true })),
      fieldLabel: await fontFamily(page.getByText('Nome do pet', { exact: true })),
      button: await fontFamily(page.getByText('Primário', { exact: true })),
      numeric: await fontFamily(page.getByText('R$ 120', { exact: true })),
      price: await fontFamily(page.getByText('A partir de R$ 89', { exact: true })),
      total: await fontFamily(page.getByText('R$ 120,00', { exact: true }).first()),
      input: await fontFamily(page.getByRole('textbox', { name: 'Nome do pet' })),
    }
    check('AC-14 título principal em Inter Bold', usesFace(faces.display, 'Inter-Bold') && usesFace(faces.heading, 'Inter-Bold'), JSON.stringify(faces))
    check('AC-14 seção em Inter SemiBold', usesFace(faces.section, 'Inter-SemiBold'), faces.section)
    check('AC-14 texto em Inter Regular', usesFace(faces.body, 'Inter-Regular') && usesFace(faces.input, 'Inter-Regular'), `${faces.body} | ${faces.input}`)
    check('AC-14 label e botão em Inter SemiBold', usesFace(faces.label, 'Inter-SemiBold') && usesFace(faces.fieldLabel, 'Inter-SemiBold') && usesFace(faces.button, 'Inter-SemiBold'), `${faces.label} | ${faces.fieldLabel} | ${faces.button}`)
    check('AC-14 preço e métrica em Inter Bold', usesFace(faces.numeric, 'Inter-Bold') && usesFace(faces.price, 'Inter-Bold') && usesFace(faces.total, 'Inter-Bold'), `${faces.numeric} | ${faces.price} | ${faces.total}`)
    await visibleButton(page, 'Voltar').first().click()
    await visibleButton(page, 'Design System').first().waitFor({ state: 'visible', timeout: 15000 })
  }

  await goToProfile(page)
  const petsEntry = visibleButton(page, 'Meus pets')
  if ((await petsEntry.count()) > 0) {
    await petsEntry.first().click()
    const petsReady = await visibleButton(page, 'Cadastrar pet')
      .or(page.getByText('Cadastre e reutilize', { exact: false }).filter({ visible: true }))
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false)
    body = await textOf(page)
    check(
      'AC-12 pets com card ou empty MG',
      petsReady &&
        (body.includes('Cadastrar pet') ||
          body.includes('Nenhum pet') ||
          body.includes('Editar') ||
          /cão|gato|Cão|Gato/i.test(body) ||
          body.includes('Cadastre e reutilize')),
      petsReady ? '' : body.slice(0, 280),
    )
  } else {
    check('AC-12 atalho Meus pets', false, 'botão Meus pets não visível no perfil')
  }

  await page.context().close()
}

async function runGroomer(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })

  await openWelcome(page)
  await page.getByRole('button', { name: 'Sou tutor' }).click()
  await page.getByRole('textbox', { name: 'E-mail' }).waitFor({ timeout: 20000 })
  await page.getByRole('textbox', { name: 'E-mail' }).fill(groomer.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(groomer.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/Agendamentos|Serviços|Rendimentos|Meus serviços/i).first().waitFor({ timeout: 25000 })
  let body = await textOf(page)
  check(
    'AC-13 groomer autenticado',
    body.includes('Agendamentos') || body.includes('Serviços') || body.includes('Rendimentos') || body.includes('Meus serviços'),
  )

  const servicesTab = page.getByText('Serviços', { exact: true }).first()
  if ((await servicesTab.count()) > 0) {
    await servicesTab.click()
    await page.getByText(/Meus serviços|Adicionar serviço|Nenhum serviço/i).first().waitFor({ timeout: 15000 })
    body = await textOf(page)
    check(
      'AC-13 lista de serviços com ServiceEditorCard ou empty',
      body.includes('Meus serviços') || body.includes('Editar') || body.includes('Ativo') || body.includes('Nenhum serviço'),
    )
  } else {
    check('AC-13 aba Serviços do groomer', false, 'aba não encontrada')
  }

  await page.context().close()
}

async function runLightOnlyGuard(browser) {
  const page = await openPage(browser, { viewport: 'mobile', colorScheme: 'dark' })
  await openWelcome(page)
  const background = await page.getByText('MyGroomer').evaluate((el) => {
    let node = el
    while (node) {
      const bg = getComputedStyle(node).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
      node = node.parentElement
    }
    return 'none'
  })
  // canvas #F9F8F6 ≈ rgb(249, 248, 246); night mode would be near #121C1F
  const match = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  const [r, g, b] = match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0]
  const isLight = r > 200 && g > 200 && b > 200
  check('tema claro mesmo com colorScheme dark do SO', isLight, background)
  await page.context().close()
}

async function run() {
  const browser = await launchBrowser()
  await runLightOnlyGuard(browser)
  await runTutor(browser)
  await runGroomer(browser)

  const summary = { passed: session.failures.length === 0, failures: session.failures }
  console.log(JSON.stringify(summary))
  await session.finish(browser)
}

run().catch(async (error) => {
  session.fail(error)
  await session.finish()
})
