/**
 * Normalize a phone number to E.164-like format (+1XXXXXXXXXX for US numbers).
 * Strips all non-digit characters and prepends country code when needed.
 */
export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}
