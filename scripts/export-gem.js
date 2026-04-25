#!/usr/bin/env node
// Exports selected source files into gemini_gem_export/ for use as a Gemini Gem context.
const { cpSync, mkdirSync, rmSync, existsSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const out = resolve(root, 'gemini_gem_export');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const entries = [
  { src: 'src/data/debates', dest: '.' },
  { src: 'src/data/logicalFallacies.json', dest: 'logicalFallacies.json' },
  { src: 'src/types/debateEntities.ts', dest: 'debateEntities.ts' },
  { src: 'docs/logical_fallacies_intro.md', dest: 'logical_fallacies_intro.md' },
  { src: 'docs/logical_fallacies_distribution.md', dest: 'logical_fallacies_distribution.md' },
];

for (const { src, dest } of entries) {
  cpSync(resolve(root, src), resolve(out, dest), { recursive: true });
  console.log(`  copied  ${src}  →  gemini_gem_export/${dest}`);
}

console.log('\nDone. Files are in gemini_gem_export/');
