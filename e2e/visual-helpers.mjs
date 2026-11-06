import { evidenceFile, saveScreenshot } from './harness.mjs'

export const plan = '022-screen-reference-alignment'
export const activeText = (page, text) => page.getByText(text, { exact: true }).and(page.locator(':not([aria-hidden="true"]):not([aria-hidden="true"] *)'))
export const capture = async (page, name) => {
  // React Navigation e folhas RN animam por JS; aguardar o fim do slide antes da evidência.
  await page.waitForTimeout(350)
  return saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
}

export async function assertLayoutInWindow(page) {
  const issues = await page.evaluate(() => {
    const issues = []
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('Documento excede a janela')
    for (const el of document.querySelectorAll('[role="button"],input,textarea,[role="heading"]')) {
      if (el.closest('[aria-hidden="true"]')) continue
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight) continue
      if (getComputedStyle(el).visibility === 'hidden') continue
      let scrollable = false
      let clipping = null
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const css = getComputedStyle(parent)
        if (/auto|scroll/.test(css.overflowX) && parent.scrollWidth > parent.clientWidth + 1) { scrollable = true; break }
        if (/hidden|clip/.test(css.overflowX)) {
          const clip = parent.getBoundingClientRect()
          if (rect.left < clip.left - 1 || rect.right > clip.right + 1) { clipping = parent; break }
        }
      }
      if (!scrollable && (clipping || rect.left < -1 || rect.right > innerWidth + 1)) issues.push(`${el.getAttribute('aria-label') || el.textContent?.slice(0, 80) || el.tagName}: x=${rect.left.toFixed(1)}..${rect.right.toFixed(1)}`)
    }
    return issues
  })
  if (issues.length) console.log(`VIS-07 layout: ${issues.join('; ')}`)
  return issues.length === 0
}

export async function captureScroll(page, name) {
  const dimensions = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(el => !el.closest('[aria-hidden="true"]') && /auto|scroll/.test(getComputedStyle(el).overflowY) && el.clientHeight > 100 && el.scrollHeight > el.clientHeight + 50 && el.getBoundingClientRect().width > 0)
    const el = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0]
    if (!el) return null
    el.setAttribute('data-visual-scroll', 'active')
    el.scrollTop = 0
    return { height: el.clientHeight, total: el.scrollHeight }
  })
  await capture(page, name)
  if (!dimensions) return
  for (let top = dimensions.height * .8, i = 1; top < dimensions.total && i <= 18; top += dimensions.height * .8, i++) {
    await page.locator('[data-visual-scroll="active"]').evaluate((el, top) => { el.scrollTop = top }, top)
    await capture(page, `${name}-scroll-${i}`)
    if (top + dimensions.height >= dimensions.total) break
  }
  await page.locator('[data-visual-scroll="active"]').evaluate(el => { el.scrollTop = 0; el.removeAttribute('data-visual-scroll') })
}

export async function fit(page, check, name, { scroll = false } = {}) {
  for (const [width, height] of [[320, 844], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    check(`VIS-07 ${name} sem overflow ou controles cortados em ${width}`, await assertLayoutInWindow(page))
    await (scroll ? captureScroll(page, `${name}-${width}`) : capture(page, `${name}-${width}`))
  }
  await page.setViewportSize({ width: 390, height: 844 })
}

// Somente para rotas registradas sem ação de entrada no produto (lista legada).
// Exercita a navegação real; não injeta componente nem altera o aplicativo.
export async function navigateRegistered(page, name, params) {
  const found = await page.evaluate(({ name, params }) => {
    for (const el of document.querySelectorAll('div')) {
      if (el.closest('[aria-hidden="true"]')) continue
      const key = Object.keys(el).find(key => key.startsWith('__reactFiber$'))
      for (let fiber = key && el[key]; fiber; fiber = fiber.return) {
        const navigation = fiber.memoizedProps?.navigation
        if (navigation?.getState?.()?.routeNames?.includes(name)) {
          navigation.navigate(name, params)
          return true
        }
      }
    }
    return false
  }, { name, params })
  if (!found) throw new Error(`Rota registrada ${name} não encontrada na árvore ativa`)
}
