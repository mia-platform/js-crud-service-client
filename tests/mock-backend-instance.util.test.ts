import { Readable } from 'stream'

export function buildMockNdjsonStream(data: unknown[]): Readable {
  const ndjsonString = data.map(item => JSON.stringify(item)).join('\n')
  return Readable.from(ndjsonString)
}
