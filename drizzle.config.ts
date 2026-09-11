import { defineConfig } from 'drizzle-kit'
import { env } from './src/config/env.js'

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})
