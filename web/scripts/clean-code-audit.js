#!/usr/bin/env node
/*
 * Clean code audit script using TypeScript compiler API.
 * Checks:
 * - max params per function (default 6)
 * - max lines per function (default 150)
 * - max lines per file (default 400)
 *
 * Run: `node scripts/clean-code-audit.js`
 */

import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const ROOT = path.resolve('./')
const SRC = path.join(ROOT, 'src')

const maxParams = 6
const maxFnLines = 150
const maxFileLines = 400

const results = []

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      analyzeFile(full)
    }
  }
}

function analyzeFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const lineCount = src.split(/\r?\n/).length
  if (lineCount > maxFileLines) {
    results.push({ type: 'file-long', file: filePath, lines: lineCount })
  }

  const sourceFile = ts.createSourceFile(filePath, src, ts.ScriptTarget.ESNext, true)

  function checkNode(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      const params = node.parameters ? node.parameters.length : 0
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
      const fnLines = end.line - start.line + 1
      if (params > maxParams) {
        results.push({ type: 'too-many-params', file: filePath, line: start.line + 1, params })
      }
      if (fnLines > maxFnLines) {
        results.push({ type: 'fn-too-long', file: filePath, line: start.line + 1, lines: fnLines })
      }
    }
    ts.forEachChild(node, checkNode)
  }

  checkNode(sourceFile)
}

(function main() {
  if (!fs.existsSync(SRC)) {
    console.error('No src/ directory found; aborting audit.')
    process.exit(1)
  }
  walk(SRC)

  if (results.length === 0) {
    console.log('Clean code audit: no issues found ✅')
    process.exit(0)
  }

  console.log('Clean code audit results:')
  for (const r of results) {
    if (r.type === 'file-long') {
      console.log(`- [FILE TOO LONG] ${r.file} (${r.lines} lines)`) 
    } else if (r.type === 'too-many-params') {
      console.log(`- [TOO MANY PARAMS] ${r.file}:${r.line} — ${r.params} params`) 
    } else if (r.type === 'fn-too-long') {
      console.log(`- [FUNCTION TOO LONG] ${r.file}:${r.line} — ${r.lines} lines`) 
    }
  }
  process.exit(2)
})()
