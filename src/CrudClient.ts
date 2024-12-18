/**
 * Copyright 2024 Mia srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import got, { type RequestError, type Got } from 'got'
import httpErrors from 'http-errors'
import isEmpty from 'lodash.isempty'

import type { ClientRequestContext, Filter, CrudUID, PatchBody, PatchBulkBody, ICrudClient } from './types'
import { queryFromFilter, getHttpErrors } from './utils'

export class CrudClient<T> implements ICrudClient<T> {
  protected client: Got
  protected resource

  constructor(prefixUrl: string, resource: string) {
    this.client = got.extend({
      prefixUrl,
      retry: 0,
    })

    this.resource = resource
  }

  async getList(ctx: ClientRequestContext, filter?: Filter): Promise<T[]> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: itemList } = await this.client.get<T[]>('', {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy,
        },
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
   *
   * @param {object} ctx The request object
   * @param {object} filter The filter to apply
   * @returns {array} The array of data
   */
  async getExport(ctx: ClientRequestContext, filter?: Filter): Promise<T[]> {
    const { logger, headersToProxy } = ctx
    try {
      const stream = this.client.stream('export', {
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/x-ndjson',
          ...headersToProxy,
        },
      })

      logger.debug({ crudResource: this.resource }, 'export of data')

      const res = await new Promise<T[]>((resolve, reject) => {
        let items: T[] = []
        let data = ''

        stream
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('data', (chunk: any) => {
            // Accumulate the chunks
            data += chunk.toString()
          })

        stream.on('end', () => {
          // Parse the NDJSON data at the end
          try {
            items = data
              .split('\n')
              // Filter out empty lines
              .filter(line => line.trim() !== '')
              .map(line => JSON.parse(line))
            resolve(items)
          } catch (error) {
            logger.error({ error, crudResource: this.resource }, 'fails to parse the NDJSON data')
            reject(error)
          }
        })

        stream.on('error', (error: Error) => {
          reject(error)
        })
      })

      return res
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to get full export of data')
      throw getHttpErrors(error as RequestError)
    }
  }

  async count(ctx: ClientRequestContext, filter?: Omit<Filter, 'projection'>): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: count } = await this.client.get<number>('count', {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy,
        },
      })
      logger.debug({ count, filter, crudResource: this.resource }, 'count of items')
      return count
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to count items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async getById(ctx: ClientRequestContext, id: string, filter?: Pick<Filter, 'projection'>): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.get<T>(id, {
        responseType: 'json',
        followRedirect: false,
        searchParams: queryFromFilter(filter),
        headers: {
          'content-type': 'application/json',
          ...headersToProxy,
        },
      })

      logger.debug({ itemId: id, crudResource: this.resource }, 'get item by id')
      return item
    } catch (error) {
      logger.error({ error, id, crudResource: this.resource }, 'fails to get item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async create(ctx: ClientRequestContext, body: Omit<T, '_id'>): Promise<CrudUID> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.post<CrudUID>('', {
        json: body,
        responseType: 'json',
        headers: headersToProxy,
      })
      logger.debug({ itemId: item._id }, 'created item')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to create item')
      throw getHttpErrors(error as RequestError)
    }
  }

  async bulkInsert(ctx: ClientRequestContext, body: Omit<T, '_id' | 'createdAt' | 'creatorId' | 'updatedAt' | 'updaterId'>[]): Promise<CrudUID[]> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: itemIds } = await this.client.post<CrudUID[]>('bulk', {
        json: body,
        responseType: 'json',
        headers: headersToProxy,
      })
      logger.debug({ itemIds }, 'created items in bulk')
      return itemIds
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to create items in bulk')
      throw getHttpErrors(error as RequestError)
    }
  }

  async upsertOne(ctx: ClientRequestContext, body: Record<string, unknown>, filter?: Filter): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.post<T & CrudUID>('upsert-one', {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy,
      })
      logger.debug({ itemId: item._id }, 'upserted item')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'fails to upsert item')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateById(ctx: ClientRequestContext, id: string, body: PatchBody<T>, filter?: Filter): Promise<T> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.patch<T>(id, {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy,
      })
      logger.debug({ itemId: id, crudResource: this.resource }, 'update item by id')
      return item
    } catch (error) {
      logger.error({ error, itemId: id, crudResource: this.resource }, 'fails to update item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateMany(ctx: ClientRequestContext, body: PatchBody<T>, filter?: Filter): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: item } = await this.client.patch<number>('', {
        json: body,
        responseType: 'json',
        searchParams: queryFromFilter(filter),
        headers: headersToProxy,
      })
      logger.debug({ crudResource: this.resource }, 'update items')
      return item
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'failed to update items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async updateBulk(ctx: ClientRequestContext, body: PatchBulkBody<T>): Promise<number> {
    const { logger, headersToProxy } = ctx
    try {
      const { body: updatedCount } = await this.client.patch<number>('bulk', {
        json: body,
        responseType: 'json',
        headers: headersToProxy,
      })
      logger.debug({ crudResource: this.resource }, 'update items')
      return updatedCount
    } catch (error) {
      logger.error({ error, crudResource: this.resource }, 'failed to update items')
      throw getHttpErrors(error as RequestError)
    }
  }

  async trash(ctx: ClientRequestContext, id: string): Promise<void> {
    const { logger, headersToProxy } = ctx
    try {
      await this.client.post<T>(`${id}/state`, {
        json: { stateTo: 'TRASH' },
        responseType: 'json',
        headers: headersToProxy,
      })
    } catch (error) {
      logger.error({ error, itemId: id }, 'failed to trash item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async deleteOne(ctx: ClientRequestContext, id: string): Promise<void> {
    const { logger, headersToProxy } = ctx
    try {
      await this.client.delete<T>(`${id}`, {
        responseType: 'json',
        headers: headersToProxy,
      })
    } catch (error) {
      logger.error({ error, itemId: id }, 'failed to delete item by id')
      throw getHttpErrors(error as RequestError)
    }
  }

  async delete(ctx: ClientRequestContext, filter: Filter): Promise<number> {
    if (isEmpty(filter.mongoQuery)) {
      throw new httpErrors.BadRequest('Mongo query is required')
    }

    const { logger, headersToProxy } = ctx
    try {
      const { body: deletedCount } = await this.client.delete<number>('', {
        responseType: 'json',
        headers: headersToProxy,
        searchParams: queryFromFilter(filter),
      })
      return deletedCount
    } catch (error) {
      logger.error({ error }, 'failed to delete items')
      throw getHttpErrors(error as RequestError)
    }
  }
}
