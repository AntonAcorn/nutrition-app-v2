#!/usr/bin/env node
// Restores iOS patches after `npm install` or `cap sync`
import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// 1. Patch Apple Sign In plugin
const appleSignInDest = join(root, 'node_modules/@capacitor-community/apple-sign-in/ios/Sources/SignInWithApple/Plugin.swift')
const appleSignInSrc = join(root, 'ios-patches/apple-sign-in-Plugin.swift')
copyFileSync(appleSignInSrc, appleSignInDest)
console.log('✓ Applied apple-sign-in patch')

// 2. Patch CapApp-SPM/Package.swift — add GoogleSignIn-iOS
const packagePath = join(root, 'ios/App/CapApp-SPM/Package.swift')
let pkg = readFileSync(packagePath, 'utf8')

const googleDep = '.package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "8.0.0")'
const googleProduct = '.product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")'

if (!pkg.includes('GoogleSignIn-iOS')) {
  pkg = pkg.replace(
    '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git"',
    `${googleDep},\n        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git"`
  )
  pkg = pkg.replace(
    '.product(name: "Capacitor", package: "capacitor-swift-pm"),',
    `.product(name: "Capacitor", package: "capacitor-swift-pm"),\n                ${googleProduct},`
  )
  writeFileSync(packagePath, pkg)
  console.log('✓ Restored GoogleSignIn-iOS in Package.swift')
} else {
  console.log('✓ GoogleSignIn-iOS already present in Package.swift')
}
