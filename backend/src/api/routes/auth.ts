import { toNodeHandler } from 'better-auth/node'
import { auth } from '@/lib/better-auth'
import { Router } from 'express'
import express from 'express'
import { authHardeningMiddleware } from '@/api/middlewares/authHardening'

const router = Router()

router.use(express.json({ limit: '1mb' }))
router.use(express.urlencoded({ extended: false }))
router.use(...authHardeningMiddleware)
router.use((req, _res, next) => {
  // Keep legacy clients working after the Better Auth reset endpoint rename.
  if (req.method === 'POST' && req.url === '/forget-password') {
    req.url = '/request-password-reset'
  }
  next()
})

router.all('/*splat', toNodeHandler(auth))

export default router
