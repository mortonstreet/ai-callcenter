import { config } from '@/config'
import { app } from '@/api/app'

const asciiArt = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ██╗   ██╗ █████╗  ██████╗██╗                        ║
║   ██║   ██║██╔══██╗██╔════╝██║                        ║
║   ██║   ██║███████║██║     ██║                        ║
║   ╚██╗ ██╔╝██╔══██║██║     ██║                        ║
║    ╚████╔╝ ██║  ██║╚██████╗██║                        ║
║     ╚═══╝  ╚═╝  ╚═╝ ╚═════╝╚═╝                        ║
║                                                       ║
║       🤖 AI Call Center - Port ${config.port} 🤖       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`

app.listen(config.port, () => {
  console.log(asciiArt)
})

export default app
