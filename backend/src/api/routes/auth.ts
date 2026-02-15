import { toNodeHandler } from 'better-auth/node'
import { auth } from '@/lib/better-auth'
import { Router } from 'express'
import express from 'express'
import { authHardeningMiddleware } from '@/api/middlewares/authHardening'

const router = Router()

router.use(express.json({ limit: '1mb' }))
router.use(express.urlencoded({ extended: false }))
router.use(...authHardeningMiddleware)

router.all('/*splat', toNodeHandler(auth))

export default router
