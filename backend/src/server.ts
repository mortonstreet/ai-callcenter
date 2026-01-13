import { config } from '@/config'
import { app } from '@/api/app'

const asciiArt = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ██████╗ ███████╗██╗   ██╗ ██████╗███████╗███╗   ██╗████████╗ ║
║   ██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝████╗  ██║╚══██╔══╝ ║
║   ██████╔╝█████╗  ██║   ██║██║     █████╗  ██╔██╗ ██║   ██║    ║
║   ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║     ██╔══╝  ██║╚██╗██║   ██║    ║
║   ██║  ██║███████╗ ╚████╔╝ ╚██████╗███████╗██║ ╚████║   ██║    ║
║   ╚═╝  ╚═╝╚══════╝  ╚═══╝   ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ║
║                                                                ║
║            🚀 RevCenter - Port ${config.port} 🚀                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(asciiArt)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use`)
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

export default app
