/** Medições web para revisão humana; candidatos não são aprovação automática. */
export async function inspectRenderedText(page) {
  return page.evaluate(() => {
    const rgb = value => {
      const values = value.match(/[\d.]+/g)?.map(Number)
      return values?.length >= 3 ? [values[0], values[1], values[2], values[3] ?? 1] : [255, 255, 255, 0]
    }
    const over = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]))
    const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
    const measured = []
    for (const el of document.querySelectorAll('div,span,p,input,textarea')) {
      if (el.closest('[aria-hidden="true"],[aria-disabled="true"]') || el.disabled) continue
      const text = /INPUT|TEXTAREA/.test(el.tagName) ? el.value || el.placeholder : [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('')
      if (!text?.trim()) continue
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el)
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || css.visibility === 'hidden') continue
      const ancestors = []; let visible = true
      for (let node = el; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) === 0) visible = false
        ancestors.push(node)
      }
      if (!visible) continue
      let background = [255, 255, 255]
      for (const node of ancestors.reverse()) background = over(rgb(getComputedStyle(node).backgroundColor), background)
      const color = rgb(/INPUT|TEXTAREA/.test(el.tagName) && !el.value ? getComputedStyle(el, '::placeholder').color : css.color)
      const foreground = over(color, background)
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      const contrast = (values[0] + .05) / (values[1] + .05)
      const size = parseFloat(css.fontSize)
      const bold = Number(css.fontWeight) >= 700 || /bold/i.test(css.fontFamily)
      const minimum = size >= 24 || size >= 18.66 && bold ? 3 : 4.5
      measured.push({ text: text.trim().slice(0, 120), contrast: +contrast.toFixed(3), minimum, fontSize: size, color: foreground.map(Math.round), background: background.map(Math.round), candidate: contrast + .01 < minimum })
    }
    return { viewport: { width: innerWidth, height: innerHeight }, measured, candidates: measured.filter(item => item.candidate) }
  })
}
