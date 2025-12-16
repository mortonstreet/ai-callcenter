import { Router } from 'express'
import exampleRoutes from './example'
import mcpRoutes from './mcp'
import agentRoutes from './agent'
import taskRoutes from './task'
import userRoutes from './user'
import adminRoutes from './admin'
import callCenterRoutes from './call-center'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
router.use('/example', exampleRoutes)
router.use('/mcp', mcpRoutes)
router.use('/agent', agentRoutes)
router.use('/task', taskRoutes)
router.use('/user', userRoutes)
router.use('/admin', adminRoutes)
router.use('/call-center', callCenterRoutes)
router.use('/sentry', (req, res) => {
  throw new Error('Testing sentry error')
})

export const apiRoutes = router
