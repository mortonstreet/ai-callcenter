import { Router } from 'express'
import campaignsRoutes from './campaigns'

const router = Router()

router.use((req, _res, next) => {
  if (req.method === 'GET' && req.path === '/') {
    req.query = {
      ...req.query,
      channel: 'sms',
    }
  }

  if (
    req.method === 'POST' &&
    req.path === '/' &&
    typeof req.body === 'object'
  ) {
    req.body = {
      ...req.body,
      channels: ['sms'],
    }
  }

  next()
})

router.use('/', campaignsRoutes)

export default router
