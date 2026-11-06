import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '..')
const skip = new Set(['harness.mjs', 'preload.mjs', 'database.mjs', 'run-suite.mjs', 'visual-helpers.mjs', 'visual-audit.mjs'])
const specs = readdirSync(here)
  .filter(name => name.endsWith('.mjs') && !skip.has(name) && !name.startsWith('_'))
  .sort()

let failed = 0
for (const spec of specs) {
  console.log(`\n=== ${spec} ===`)
  const result = spawnSync(process.execPath, ['--import', './e2e/preload.mjs', `e2e/${spec}`], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    failed += 1
    console.error(`fail ${spec} exit ${result.status ?? 'desconhecido'}`)
  } else {
    console.log(`ok ${spec}`)
  }
}

console.log(`\nSUITE DONE failed=${failed} total=${specs.length}`)
process.exitCode = failed ? 1 : 0
