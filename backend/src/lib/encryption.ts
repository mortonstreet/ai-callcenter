import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto'
import { config } from '@/config'

const ENCRYPTION_VERSION = 'v1'
const ENCRYPTION_PREFIX = `enc:${ENCRYPTION_VERSION}:`
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_BYTE_LENGTH = 12

let cachedKey: Buffer | null = null

const getEncryptionKey = () => {
  if (cachedKey) {
    return cachedKey
  }

  cachedKey = createHash('sha256')
    .update(config.security.encryptionKey, 'utf8')
    .digest()

  return cachedKey
}

const encode = (value: Buffer) => value.toString('base64url')
const decode = (value: string) => Buffer.from(value, 'base64url')

export const encryptSecret = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  const iv = randomBytes(IV_BYTE_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}${encode(iv)}:${encode(authTag)}:${encode(encrypted)}`
}

export const decryptSecret = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return value
  }

  const payload = value.slice(ENCRYPTION_PREFIX.length)
  const [ivEncoded, tagEncoded, encryptedEncoded] = payload.split(':')

  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Invalid encrypted secret payload')
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    decode(ivEncoded),
  )
  decipher.setAuthTag(decode(tagEncoded))

  const decrypted = Buffer.concat([
    decipher.update(decode(encryptedEncoded)),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
