/* eslint-disable no-console */
import fs from 'fs/promises'
import path from 'path'
import { build, type BuildOptions } from 'esbuild'
import { rimraf } from 'rimraf'

const outDir = path.resolve(process.cwd(), 'dist')

async function main(): Promise<void> {
  await rimraf(path.resolve(outDir))
  await fs.mkdir(outDir)

  const baseOpts: BuildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    sourcemap: true,
    target: ['node18'],
  }

  await build({
    ...baseOpts,
    format: 'cjs',
    outfile: path.resolve(outDir, 'cjs/index.cjs'),
  })

  await build({
    ...baseOpts,
    format: 'esm',
    outfile: path.resolve(outDir, 'es/index.mjs'),
  })
}

main().catch(console.error)
