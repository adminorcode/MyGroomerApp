export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

export async function attachPetPhoto(page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /foto/i }).click(),
  ])
  await chooser.setFiles({ name: 'pet.png', mimeType: 'image/png', buffer: TINY_PNG })
  await page.getByText('pet.png', { exact: true }).waitFor({ timeout: 15000 })
}

export async function fillPetWeight(page, value = '8,5') {
  const field = page.getByRole('textbox', { name: 'Peso (kg)', exact: true })
  await field.fill(value)
}
