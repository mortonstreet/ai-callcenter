export const REVCENTER_CLI_BANNER = String.raw`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ██████╗ ███████╗██╗   ██╗ ██████╗███████╗███╗   ██╗████████╗ ║
║   ██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝████╗  ██║╚══██╔══╝ ║
║   ██████╔╝█████╗  ██║   ██║██║     █████╗  ██╔██╗ ██║   ██║    ║
║   ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║     ██╔══╝  ██║╚██╗██║   ██║    ║
║   ██║  ██║███████╗ ╚████╔╝ ╚██████╗███████╗██║ ╚████║   ██║    ║
║   ╚═╝  ╚═╝╚══════╝  ╚═══╝   ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ║
║                                                                ║
║                         RevCenter CLI                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`.trim()

const firstCommandArg = (argv: string[]) =>
  argv.find((entry) => !entry.startsWith('-'))

export const shouldPrintCliBanner = (argv: string[], isTty: boolean) => {
  if (process.env.REVCENTER_CLI_NO_BANNER === '1') {
    return false
  }

  if (argv.includes('--json')) {
    return false
  }

  const command = firstCommandArg(argv) || 'guided'
  if (command === 'guided') {
    return true
  }

  if (command === 'template' && !argv.includes('--output')) {
    return false
  }

  return isTty
}
