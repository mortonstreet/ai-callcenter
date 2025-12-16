import nodemailer from 'nodemailer'
import { config } from '@/config'

// Use Resend if API key is configured, otherwise fall back to local mail server
const useResend = !!config.resend.apiKey

export const transporter = nodemailer.createTransport({
  host: useResend ? 'smtp.resend.com' : 'localhost',
  port: useResend ? 465 : 1025,
  secure: useResend,
  auth: useResend
    ? {
        user: 'resend',
        pass: config.resend.apiKey,
      }
    : undefined,
})
