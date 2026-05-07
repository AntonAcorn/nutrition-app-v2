// Runs every *.smoke.js sequentially. Each file does its own browser launch.
// Aggregates exit codes so a single failure marks the whole run as failed.
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(here).filter(f => /\.smoke\.(c?js)$/.test(f)).sort()

let failed = 0
for (const file of files) {
  console.log(`\n━━━ ${file} ━━━`)
  const code = await new Promise(resolve => {
    const proc = spawn(process.execPath, [join(here, file)], { stdio: 'inherit' })
    proc.on('exit', resolve)
  })
  if (code !== 0) failed++
}

console.log(`\n${failed === 0 ? '✓ all smoke files passed' : `✗ ${failed} smoke file(s) failed`}`)
process.exit(failed === 0 ? 0 : 1)
