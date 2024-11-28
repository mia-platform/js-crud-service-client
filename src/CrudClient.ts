import got, { type RequestError } from 'got'
import qs from 'qs'
import httpErrors from 'http-errors'
import { isEmpty } from 'lodash-es'

import { type ClientRequestContext, type KeysMatching, getHttpErrors } from './utils'

interface CrudUID {
  _id: string
}

type PatchBulkEntry<T> = {
  filter: Record<string, unknown>
  update: PatchBody<T>
}
export type PatchBulkBody<T> = PatchBulkEntry<T>[]

export interface PatchBody<T>{
  $set?: Partial<T> & Record<string, unknown>
  $unset?: Partial<T> & Record<string, unknown>
  $inc?: Partial<KeysMatching<T, number>>
  $mul?: Partial<KeysMatching<T, number>>
  $currentDate?: Partial<T>
  $push?: Partial<KeysMatching<T, Array<unknown>>> | Record<string, unknown>
}

export type ICrudClient<T> = Omit<CrudClient<T>, 'client' | 'resource'>

class CrudClient<T> implements ICrudClient<T> {
  protected client
  protected resource

  constructor (prefixUrl: string, resource: string) {
    this.client = got.extend({
      prefixUrl,
      retry: 0
    })
    this.resource = resource
  }

  async getList (ctx: ClientRequestContext, filter?: Filter): Promise<T[]> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: itemList } = await this.client.get<T[]>('', {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy
        }
      })
      logger.debug({ itemsLength: itemList.length, crudResource: this.resource }, 'list of item')
      return itemList
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to get list of item')
      throw getHttpErrors(error as RequestError)
    }
  }

  /**
   * export all data from the crud resource
   *
   * data are exported as a NDJSON stream from the crud and converted to an array of object
   *
   * @warning be careful about the size of the data to export, remember to set a reasonable limit
   */
  async getExport (ctx: ClientRequestContext, filter?: Filter): Promise<Array<T>> {
    const { logger, headersToProxy } = ctx
    try {
      const stream = this.client.stream('export', {
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/x-ndjson',
          ...headersToProxy
        }
      })

      logger.debug({ crudResource: this.resource }, 'export of data')

      const data = await new Promise<Array<T>>((resolve, reject) => {
        let items: Array<T> = []
        let data = ''

        stream
          .on('data', chunk => {
            // Accumulate the chunks
            data += chunk.toString()
          })

        stream.on('end', () => {
          // Parse the NDJSON data at the end
          try {
            items = data
              .split('\n')
              .filter(line => line.trim() !== '') // Filter out empty lines
              .map(line => JSON.parse(line))
            resolve(items)
          } catch (e) {
            logger.error({ error: e, crudResource: this.resource }, 'fails to parse the NDJSON data')
            reject(e)
          }
        })

        stream.on('error', err => {
          reject(err)
        })
      })

      return data
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to get full export of data')
      throw getHttpErrors(error as RequestError)
    }
  }

  async count (ctx: ClientRequestContext, filter?: Omit<Filter, 'projection'>): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: count } = await this.client.get<number>('count', {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy
        }
      })
      logger.debug({ count, filter, crudResource: this.resource }, 'count of items')
      return count
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to count items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async getById (ctx: ClientRequestContext, id: string, filter?: Pick<Filter, 'projection'>): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.get<T>(id, {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy
        }
      })

      logger.debug({ itemId: id, crudResource: this.resource }, 'get item by id')
      return item
    } catch (error) {
      logger.error({ error, id, crudResource: this.resource }, 'fails to get item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async create (ctx: ClientRequestContext, body: Omit<T, '_id'>): Promise<CrudUID> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.post<CrudUID>('', {
        json: body,
        responseType: 'json',
        headers: headersToProxy
      })
      logger.debug({ itemId: item._id }, 'created item')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to create item')
      throw getHttpErrors(error as RequestError)
    }
  }

  async bulkInsert (ctx: ClientRequestContext, body: Omit<T, '_id' | 'createdAt' | 'creatorId' | 'updatedAt' | 'updaterId'>[]): Promise<CrudUID[]> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: itemIds } = await this.client.post<CrudUID[]>('bulk', {
        json: body,
        responseType: 'json',
        headers: headersToProxy
      })
      logger.debug({ itemIds }, 'created items in bulk')
      return itemIds
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to create items in bulk')
      throw getHttpErrors(error as RequestError)
    }
  }

  async upsertOne (ctx: ClientRequestContext, body: Record<string, unknown>, filter?: Filter): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.post<T & CrudUID>('upsert-one', {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy
      })
      logger.debug({ itemId: item._id }, 'upserted item')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to upsert item')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateById (ctx: ClientRequestContext, id: string, body: PatchBody<T>, filter?: Filter): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.patch<T>(id, {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy
      })
      logger.debug({ itemId: id, crudResource: this.resource }, 'update item by id')
      return item
    } catch (error) {
      logger.error({ error, itemId: id, crudResource: this.resource }, 'fails to update item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateMany (ctx: ClientRequestContext, body: PatchBody<T>, filter?: Filter): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.patch<number>('', {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy
      })
      logger.debug({ crudResource: this.resource }, 'update items')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'failed to update items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateBulk (ctx: ClientRequestContext, body: PatchBulkBody<T>): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: updatedCount } = await this.client.patch<number>('bulk', {
        json: body,
        responseType: 'json',
        headers: headersToProxy
      })
      logger.debug({ crudResource: this.resource }, 'update items')
      return updatedCount
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'failed to update items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async trash (ctx: ClientRequestContext, id: string) {
    const { logger, headersToProxy } = ctx
    try {
      await this.client.post<T>(`${id}/state`, {
        json: { stateTo: 'TRASH' },
        responseType: 'json',
        headers: headersToProxy
      })
    } catch (error) {
      logger.error({ error, itemId: id }, 'failed to trash item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async deleteOne (ctx: ClientRequestContext, id: string) {
    const { logger, headersToProxy } = ctx
    try {
      await this.client.delete<T>(`${id}`, {
        responseType: 'json',
        headers: headersToProxy
      })
    } catch (error) {
      logger.error({ error, itemId: id }, 'failed to delete item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async delete (ctx: ClientRequestContext, filter: Filter) {
    if (isEmpty(filter.mongoQuery)) {
      throw new httpErrors.BadRequest('Mongo query is required')
    }

    const { logger, headersToProxy } = ctx
    try {
      await this.client.delete<T>('', {
        responseType: 'json',
        headers: headersToProxy,
        searchParams: queryFromFilter(filter)
      })
    } catch (error) {
      logger.error({ error }, 'failed to delete items')
      throw getHttpErrors(error as RequestError)
    }
  }
}

export interface Filter {
  mongoQuery?: Record<string, unknown>
  limit?: number
  skip?: number
  projection?: string[],
  rawProjection?: Record<string, 1 | 0>
  sort?: string
}
function queryFromFilter (filter: Filter | undefined) {
  return filter
    ? qs.stringify({
      _q: filter.mongoQuery ? JSON.stringify(filter.mongoQuery) : undefined,
      _l: filter.limit,
      _p: filter.projection?.join(','),
      _s: filter.sort,
      _sk: filter.skip,
      _rawp: filter.rawProjection ? JSON.stringify(filter.rawProjection) : undefined
    })
    : undefined
}

export default CrudClient
