import { config } from '@/config'

export const getQueueConnection = () => ({
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    },
  }),
})
