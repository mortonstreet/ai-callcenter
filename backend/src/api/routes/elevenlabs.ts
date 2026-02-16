import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import {
  healthCheck,
  listVoices,
} from '@/api/controllers/elevenlabs.controller'

const router = Router()

router.get('/health', withBetterAuth, healthCheck as any)
router.get('/voices', withBetterAuth, listVoices as any)

export default router
