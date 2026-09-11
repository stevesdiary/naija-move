import { buildApp } from './app.js'
import { env } from './config/env.js'
import { startWorkers } from './queues/workers/index.js'

async function start() {
  const app = await buildApp()

  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  startWorkers()
  app.log.info(`Workers started`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
