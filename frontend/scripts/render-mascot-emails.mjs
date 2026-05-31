#!/usr/bin/env node
// One-shot script: re-render the email mascot PNGs from the same SVG primitives
// used by features/current-day/components/MascotSvg.tsx.
//
// Run with:  npm install --no-save @resvg/resvg-js && node scripts/render-mascot-emails.mjs
// Output:    public/mascot-email/welcome.png and reset.png
// Email     EmailTemplates.java references these filenames; rerun this if the
// component above changes and you want the email to match.

import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'mascot-email')
mkdirSync(OUT_DIR, { recursive: true })

const D = '#0E1520'
const C = '#1C2E3A'
const BODY_MID = '#9CCAF4'

function sparkle(cx, cy, r) {
  const d = r * 0.5
  return `
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#FFE040" stroke-width="${r * 0.38}" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#FFE040" stroke-width="${r * 0.38}" stroke-linecap="round"/>
    <line x1="${cx - d}" y1="${cy - d}" x2="${cx + d}" y2="${cy + d}" stroke="#FFE040" stroke-width="${r * 0.26}" stroke-linecap="round"/>
    <line x1="${cx + d}" y1="${cy - d}" x2="${cx - d}" y2="${cy + d}" stroke="#FFE040" stroke-width="${r * 0.26}" stroke-linecap="round"/>
  `
}

function openEye(cx, cy) {
  return `
    <circle cx="${cx}" cy="${cy}" r="18" fill="white"/>
    <circle cx="${cx}" cy="${cy + 1}" r="13" fill="${D}"/>
    <circle cx="${cx + 5}" cy="${cy - 5}" r="5.5" fill="white"/>
    <circle cx="${cx + 1}" cy="${cy + 5}" r="2" fill="rgba(255,255,255,0.45)"/>
  `
}

function winkEye(cx, cy) {
  return `<path d="M ${cx - 16} ${cy} Q ${cx} ${cy - 10} ${cx + 16} ${cy}" stroke="${D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
}

function openMouth() {
  const w = 40
  const lx = 100 - w / 2
  const rx = 100 + w / 2
  const MY = 136
  const depth = 24
  return `
    <path d="M ${lx} ${MY} Q 100 ${MY - 4} ${rx} ${MY}" stroke="${C}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M ${lx} ${MY} Q ${lx} ${MY + depth} 100 ${MY + depth * 0.95} Q ${rx} ${MY + depth} ${rx} ${MY} Z" fill="${C}"/>
    <path d="M ${lx + 3} ${MY + 1} Q ${lx + 3} ${MY + depth - 4} 100 ${MY + depth * 0.95 - 3} Q ${rx - 3} ${MY + depth - 4} ${rx - 3} ${MY + 1} Z" fill="#E03050"/>
    <path d="M ${lx + 2} ${MY + 7} L ${rx - 2} ${MY + 7}" stroke="white" stroke-width="4.5" stroke-linecap="round" opacity="0.92"/>
  `
}

function rightArmRaised() {
  return `
    <ellipse cx="166" cy="116" rx="22" ry="13" fill="${BODY_MID}" transform="rotate(48 166 116)"/>
    <circle cx="178" cy="99" r="14" fill="${BODY_MID}"/>
  `
}

function buildSvg({ withSparkles }) {
  const extras = withSparkles
    ? sparkle(160, 70, 10) + sparkle(40, 78, 7)
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <defs>
    <radialGradient id="bg" cx="33%" cy="27%" r="72%">
      <stop offset="0%" stop-color="#E4F4FF"/>
      <stop offset="40%" stop-color="#A8CFF4"/>
      <stop offset="100%" stop-color="#6AAAE8"/>
    </radialGradient>
  </defs>
  <ellipse cx="100" cy="220" rx="62" ry="10" fill="rgba(0,0,0,0.08)"/>
  <circle cx="74" cy="206" r="20" fill="#6AAAE8" opacity="0.6"/>
  <circle cx="126" cy="206" r="20" fill="#6AAAE8" opacity="0.6"/>
  <circle cx="66" cy="208" r="5" fill="#5090C8" opacity="0.5"/>
  <circle cx="76" cy="212" r="5" fill="#5090C8" opacity="0.5"/>
  <circle cx="118" cy="212" r="5" fill="#5090C8" opacity="0.5"/>
  <circle cx="128" cy="208" r="5" fill="#5090C8" opacity="0.5"/>
  ${rightArmRaised()}
  <circle cx="100" cy="126" r="78" fill="url(#bg)"/>
  <circle cx="80" cy="82" r="22" fill="rgba(255,255,255,0.72)"/>
  <circle cx="94" cy="96" r="12" fill="rgba(255,255,255,0.5)"/>
  <circle cx="115" cy="88" r="7" fill="rgba(255,255,255,0.38)"/>
  <circle cx="130" cy="100" r="5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="70" cy="110" r="4.5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="68" cy="158" r="5" fill="rgba(255,255,255,0.35)"/>
  <circle cx="79" cy="168" r="3.5" fill="rgba(255,255,255,0.27)"/>
  <circle cx="128" cy="154" r="4.5" fill="rgba(255,255,255,0.28)"/>
  <circle cx="60" cy="120" r="13" fill="#FFB0C0" opacity="0.3"/>
  <circle cx="140" cy="120" r="13" fill="#FFB0C0" opacity="0.3"/>
  ${winkEye(76, 104)}
  ${openEye(124, 104)}
  ${openMouth()}
  ${extras}
</svg>`
}

function render(svg, outFile) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 400 }, // 2x retina
    background: 'rgba(0, 0, 0, 0)',
  })
  const png = resvg.render().asPng()
  writeFileSync(outFile, png)
  console.log(`✓ wrote ${outFile} (${png.length} bytes)`)
}

render(buildSvg({ withSparkles: true }),  join(OUT_DIR, 'welcome.png'))
render(buildSvg({ withSparkles: false }), join(OUT_DIR, 'reset.png'))
