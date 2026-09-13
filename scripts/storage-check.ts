/**
 * Verify the B2 credentials in .env end-to-end: presign → PUT → HEAD → GET → DELETE.
 *
 *   npm run storage:check
 */
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../src/config/env.js'
import { storage } from '../src/providers/storage.js'

if (!storage.enabled) {
  console.error('✗ B2_* variables are not set')
  process.exit(1)
}

const key = `driver-documents/00000000-0000-4000-8000-000000000000/${crypto.randomUUID()}.png`
const body = Buffer.from('89504e470d0a1a0a', 'hex') // PNG magic bytes

const up = await storage.createUploadUrl({ key, contentType: 'image/png', contentLength: body.length })
const put = await fetch(up.url, { method: 'PUT', headers: up.headers, body })
if (!put.ok) {
  console.error(`✗ PUT failed: ${put.status} ${await put.text()}`)
  process.exit(1)
}
console.log('✓ PUT via presigned URL')

const meta = await storage.stat(key)
if (!meta || meta.contentLength !== body.length) {
  console.error('✗ HEAD did not find the object', meta)
  process.exit(1)
}
console.log(`✓ HEAD: ${meta.contentLength} bytes, ${meta.contentType}`)

const down = await storage.createDownloadUrl(key)
const got = await fetch(down.url)
if (!got.ok || Buffer.compare(Buffer.from(await got.arrayBuffer()), body) !== 0) {
  console.error(`✗ GET via presigned URL failed: ${got.status}`)
  process.exit(1)
}
console.log('✓ GET via presigned URL round-trips the bytes')

const s3 = new S3Client({
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
  credentials: { accessKeyId: env.B2_KEY_ID!, secretAccessKey: env.B2_APPLICATION_KEY! },
  forcePathStyle: true,
})
await s3.send(new DeleteObjectCommand({ Bucket: env.B2_BUCKET, Key: key }))
console.log('✓ DELETE cleaned up — storage is ready')
process.exit(0)
