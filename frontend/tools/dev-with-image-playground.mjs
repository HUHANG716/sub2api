import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(frontendDir, '..')
const imagePlaygroundDir = path.resolve(repoRoot, 'third_party', 'gpt_image_playground')
const playgroundPort = process.env.VITE_IMAGE_PLAYGROUND_DEV_PORT || '5174'
const playgroundUrl = `http://127.0.0.1:${playgroundPort}`

const children = new Set()

function run(name, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  children.add(child)
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (stopping) return

    console.error(`${name} exited${signal ? ` with signal ${signal}` : ` with code ${code}`}`)
    stopAll(code && code > 0 ? code : 1)
  })

  child.on('error', (error) => {
    console.error(`${name} failed to start:`, error)
    stopAll(1)
  })

  return child
}

let stopping = false
function stopAll(exitCode = 0) {
  if (stopping) return
  stopping = true

  for (const child of children) {
    child.kill('SIGTERM')
  }

  setTimeout(() => process.exit(exitCode), 200)
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

run(
  'image playground dev server',
  'npm',
  ['run', 'dev', '--', '--host', '0.0.0.0', '--port', playgroundPort, '--base', '/image-playground-app/'],
  {
    cwd: imagePlaygroundDir,
    env: {
      ...process.env
    }
  }
)

run(
  'frontend dev server',
  'pnpm',
  ['run', 'dev'],
  {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_IMAGE_PLAYGROUND_DEV_URL: process.env.VITE_IMAGE_PLAYGROUND_DEV_URL || playgroundUrl
    }
  }
)
