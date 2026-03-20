import fs from 'fs'
import path from 'path'

const PACKAGE_ROOT = path.resolve(__dirname, '..')
const ENV_FILES = ['.env', '.env.local']

const parseEnvLine = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const separatorIndex = trimmed.indexOf('=')
  if (separatorIndex <= 0) {
    return null
  }

  const key = trimmed.slice(0, separatorIndex).trim()
  if (!key) {
    return null
  }

  let value = trimmed.slice(separatorIndex + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return {
    key,
    value,
  }
}

export const loadRevcenterCliEnv = () => {
  const loadedKeys = new Set<string>()

  for (const filename of ENV_FILES) {
    const targetPath = path.join(PACKAGE_ROOT, filename)
    if (!fs.existsSync(targetPath)) {
      continue
    }

    const source = fs.readFileSync(targetPath, 'utf8')
    for (const line of source.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) {
        continue
      }

      if (
        process.env[parsed.key] === undefined ||
        loadedKeys.has(parsed.key)
      ) {
        process.env[parsed.key] = parsed.value
        loadedKeys.add(parsed.key)
      }
    }
  }
}
