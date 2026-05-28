import { copyFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(frontendDir, '..')
const appDir = path.resolve(repoRoot, 'third_party', 'gpt_image_playground')
const appDistDir = path.resolve(appDir, 'dist')
const targetDir = path.resolve(frontendDir, 'public', 'image-playground-app')

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      }
    })
  })
}

async function copyDirectory(source, target) {
  await mkdir(target, { recursive: true })
  const entries = await import('node:fs/promises').then(({ readdir }) =>
    readdir(source, { withFileTypes: true })
  )

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
    } else if (entry.isFile()) {
      await copyFile(sourcePath, targetPath)
    }
  }
}

if (!existsSync(appDir)) {
  throw new Error(`Missing gpt_image_playground subtree at ${appDir}`)
}

await run('npm', ['ci'], appDir)
await run('npm', ['run', 'build'], appDir)

await rm(targetDir, { recursive: true, force: true })
await copyDirectory(appDistDir, targetDir)

console.log(`Copied gpt_image_playground build to ${path.relative(repoRoot, targetDir)}`)
