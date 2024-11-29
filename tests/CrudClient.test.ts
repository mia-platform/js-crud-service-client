import nock from 'nock'
import Pino from 'pino'
import httpErrors from 'http-errors'
import { Readable } from 'stream'
import { describe, it } from "node:test"
import assert from "node:assert"

import { ClientRequestContext } from '../src/utils'
import CrudClient, { Filter } from '../src/CrudClient'
import { buildMockNdjsonStream } from './mock-backend-instance.util.test'


describe('CrudClient', () => {
  nock.disableNetConnect()

  interface Item {
    id: string,
    property: string
  }

  const logger = Pino({ level: 'silent' })

  const CRUD_BASE_PATH = 'https://example.org'

  const client = new CrudClient<Item>(CRUD_BASE_PATH, 'test-crud')
  const headersToProxy = {
    foo: 'bar'
  }
  const requestCtx: ClientRequestContext = {
    logger,
    headersToProxy: {},
    userHeaders: {},
    requestId: 'test-req-id',
    localRequestId: 'test-local-req-id'
  }

  describe('count', () => {
    it('returns the number of entities that match a filter', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/count')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, '1')

      const entityCount = await client.count(requestCtx, filter)
      crudScope.done()

      assert.strictEqual(entityCount, 1)
    })

    it('returns the number of entities that match a filter and proxy headers', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/count')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, '1')

      const entityCount = await client.count({
        ...requestCtx,
        headersToProxy
      }, filter)
      crudScope.done()

      assert.strictEqual(entityCount, 1)
    })

    it('throws 400', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const errorMessage = 'A message of error'
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/count')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(400, { message: errorMessage })

      await assert.rejects(
        async () => await client.count(requestCtx, filter),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('getList', () => {
    it('returns the entities that match a filter', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, expectedResponse)

      const response = await client.getList(requestCtx, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the entities that match a filter - with projection', async () => {
      const filter: Filter = {
        mongoQuery: { fields: 'value' },
        projection: ['some-field', 'some-other-field']
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/')
        .query({
          _q: JSON.stringify(filter.mongoQuery),
          _p: 'some-field,some-other-field'
        })
        .reply(200, expectedResponse)

      const response = await client.getList(requestCtx, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the entities that match a filter and proxy headers', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, expectedResponse)

      const response = await client.getList({
        ...requestCtx,
        headersToProxy
      }, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('correctly applies the raw projection filter', async () => {
      const filter: Filter = {
        mongoQuery: { fields: 'value' },
        rawProjection: {
          f1: 0
        }
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .query({
          _q: JSON.stringify(filter.mongoQuery),
          _rawp: JSON.stringify(filter.rawProjection)
        })
        .reply(200, expectedResponse)

      const response = await client.getList({
        ...requestCtx,
        headersToProxy
      }, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('throws 400', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const errorMessage = 'A message of error'
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(400, { message: errorMessage })

      await assert.rejects(
        async () => await client.getList(requestCtx, filter),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('getExport', () => {
    it('returns the entities that match a filter', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]

      const crudScope = nock(CRUD_BASE_PATH)
        .get('/export')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, Readable.from(buildMockNdjsonStream(expectedResponse)))

      const response = await client.getExport(requestCtx, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the entities that match a filter - with projection', async () => {
      const filter: Filter = {
        mongoQuery: { fields: 'value' },
        projection: ['some-field', 'some-other-field']
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]

      const crudScope = nock(CRUD_BASE_PATH)
        .get('/export')
        .query({
          _q: JSON.stringify(filter.mongoQuery),
          _p: 'some-field,some-other-field'
        })
        .reply(200, Readable.from(buildMockNdjsonStream(expectedResponse)))

      const response = await client.getExport(requestCtx, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the entities that match a filter and proxy headers', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const expectedResponse = [
        {
          id: 'my-id',
          property: 'my-property'
        },
        {
          id: 'my-id-2',
          property: 'my-property-2'
        }
      ]

      const crudScope = nock(CRUD_BASE_PATH)
        .get('/export')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/x-ndjson')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, Readable.from(buildMockNdjsonStream(expectedResponse)))

      const response = await client.getExport({
        ...requestCtx,
        headersToProxy
      }, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('throws 400', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const crudScope = nock(CRUD_BASE_PATH)
        .get('/export')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(400)

      await assert.rejects(
        async () => await client.getExport(requestCtx, filter),
        new httpErrors.BadRequest('Response code 400 (Bad Request)')
      )

      crudScope.done()
    })

    it('throws error when NDJSON includes an incomplete line', async () => {
      const filter = {
        mongoQuery: { fields: 'value' }
      }

      const incompleteResponse = '{"id": "my-id", "property": "my-property"}\n{"id": "my-id-2", "property": "my-property-2"\n' // missing end brace

      const crudScope = nock(CRUD_BASE_PATH)
        .get('/export')
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, Readable.from(incompleteResponse))

      await assert.rejects(
        async () => await client.getExport(requestCtx, filter)
      )

      crudScope.done()
    })
  })

  describe('getById', () => {
    it('returns the item with requested id', async () => {
      const id = 'my-id'
      const expectedResponse = {
        id: 'my-id',
        property: 'my-property'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/my-id')
        .reply(200, expectedResponse)

      const response = await client.getById(requestCtx, id)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the item with requested id with filter', async () => {
      const id = 'my-id'
      const expectedResponse = {
        id: 'my-id',
        property: 'my-property'
      }
      const filter: Pick<Filter, 'projection'> = {
        projection: ['some-field']
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/my-id')
        .query({ _p: 'some-field' })
        .reply(200, expectedResponse)

      const response = await client.getById(requestCtx, id, filter)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the item with requested id and proxy headers', async () => {
      const id = 'my-id'
      const expectedResponse = {
        id: 'my-id',
        property: 'my-property'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/my-id')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, expectedResponse)

      const response = await client.getById({
        ...requestCtx,
        headersToProxy
      }, id)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('throws 500', async () => {
      const id = 'my-id'

      const errorMessage = 'Response code 500 (Internal Server Error)'
      const crudScope = nock(CRUD_BASE_PATH)
        .get('/my-id')
        .reply(500, { message: errorMessage })

      await assert.rejects(async () => await client.getById(requestCtx, id),
        new httpErrors.InternalServerError(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('create', () => {
    it('returns the created item', async () => {
      const body = { id: 'my-id', property: 'my-property' }
      const expectedResponse = {
        _id: 'my-id'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/', body)
        .reply(200, expectedResponse)

      const response = await client.create(requestCtx, body)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the created item and proxy headers', async () => {
      const body = { id: 'my-id', property: 'my-property' }
      const expectedResponse = {
        _id: 'my-id'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/', body)
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, expectedResponse)

      const response = await client.create({ ...requestCtx, headersToProxy }, body)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('bad request', async () => {
      const body = { id: 'my-id', property: 'my-property' }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/', body)
        .reply(400)

      await assert.rejects(
        async () => await client.create(requestCtx, body),
        new httpErrors.BadRequest('Response code 400 (Bad Request)')
      )

      crudScope.done()
    })
  })

  describe('bulkInsert', () => {
    it('returns the created item', async () => {
      const body = [{ id: 'my-id-1', property: 'my-property-1' }, { id: 'my-id-2', property: 'my-property-2' }, { id: 'my-id-3', property: 'my-property-3' }]
      const expectedResponse = [
        { _id: 'my-id-1' }, { _id: 'my-id-2' }, { _id: 'my-id-3' }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/bulk', body)
        .reply(200, expectedResponse)

      const response = await client.bulkInsert(requestCtx, body)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('returns the created item and proxy headers', async () => {
      const body = [{ id: 'my-id-1', property: 'my-property-1' }, { id: 'my-id-2', property: 'my-property-2' }, { id: 'my-id-3', property: 'my-property-3' }]
      const expectedResponse = [
        { _id: 'my-id-1' }, { _id: 'my-id-2' }, { _id: 'my-id-3' }
      ]
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/bulk', body)
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, expectedResponse)

      const response = await client.bulkInsert({ ...requestCtx, headersToProxy }, body)
      crudScope.done()

      assert.deepStrictEqual(response, expectedResponse)
    })

    it('bad request', async () => {
      const body = [{ id: 'my-id-1', property: 'my-property-1' }, { id: 'my-id-2', property: 'my-property-2' }, { id: 'my-id-3', property: 'my-property-3' }]
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/bulk', body)
        .reply(400)

      await assert.rejects(
        async () => await client.bulkInsert(requestCtx, body),
        new httpErrors.BadRequest('Response code 400 (Bad Request)')
      )

      crudScope.done()
    })
  })

  describe('trash', () => {
    it('ok', async () => {
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/my-id/state')
        .reply(204)

      await client.trash(requestCtx, 'my-id')
      crudScope.done()
    })

    it('ok and proxy headers', async () => {
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/my-id/state')
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(204)

      await client.trash({ ...requestCtx, headersToProxy }, 'my-id')
      crudScope.done()
    })

    it('bad request', async () => {
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/my-id/state')
        .reply(400)

      await assert.rejects(
        async () => await client.trash({ ...requestCtx, headersToProxy }, 'my-id'),
        new httpErrors.BadRequest('Response code 400 (Bad Request)')
      )
      crudScope.done()
    })
  })

  describe('updateById', () => {
    it('correctly calls crud service', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const id = 'my-id'
      const resultItem = {
        my: 'item'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .patch(`/${id}`, body)
        .reply(200, resultItem)

      const updateResponse = await client.updateById(requestCtx, id, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service with a filter', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const id = 'my-id'
      const resultItem = {
        my: 'item'
      }
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .patch(`/${id}`, body)
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, resultItem)

      const updateResponse = await client.updateById({ ...requestCtx, headersToProxy }, id, body, filter)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service and proxy headers', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const id = 'my-id'
      const resultItem = {
        my: 'item'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .patch(`/${id}`, body)
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, resultItem)

      const updateResponse = await client.updateById({ ...requestCtx, headersToProxy }, id, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('throws if crud returns', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const id = 'my-id'
      const errorMessage = 'A message of error'
      const crudScope = nock(`${CRUD_BASE_PATH}`)
        .patch(`/${id}`, body)
        .reply(400, { message: errorMessage })

      await assert.rejects(async () => await client.updateById(requestCtx, id, body),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('updateMany', () => {
    it('correctly calls crud service', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const resultItem = 50
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/', body)
        .reply(200, () => 50)

      const updateResponse = await client.updateMany(requestCtx, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service with a filter', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const resultItem = 50
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/', body)
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, () => 50)

      const updateResponse = await client.updateMany({ ...requestCtx, headersToProxy }, body, filter)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service and proxy headers', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const resultItem = 50
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/', body)
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, () => 50)

      const updateResponse = await client.updateMany({ ...requestCtx, headersToProxy }, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('throws if crud returns', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const errorMessage = 'A message of error'
      const crudScope = nock(`${CRUD_BASE_PATH}`)
        .patch('/', body)
        .reply(400, { message: errorMessage })

      await assert.rejects(async () => await client.updateMany(requestCtx, body),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('updateBulk', () => {
    it('correctly calls crud service', async () => {
      const body = [
        {
          filter: { _id: '1234' },
          update: {
            $set: {
              property: 'data'
            }
          }
        }
      ]

      const resultItem = 50
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/bulk', body)
        .reply(200, () => 50)

      const updateResponse = await client.updateBulk(requestCtx, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service with a filter', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const resultItem = 50
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/', body)
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, () => 50)

      const updateResponse = await client.updateMany({ ...requestCtx, headersToProxy }, body, filter)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service and proxy headers', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const resultItem = 50
      const crudScope = nock(CRUD_BASE_PATH)
        .patch('/', body)
        .matchHeader('foo', 'bar')
        .matchHeader('content-type', 'application/json')
        .reply(200, () => 50)

      const updateResponse = await client.updateMany({ ...requestCtx, headersToProxy }, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('throws if crud returns', async () => {
      const body = {
        $set: {
          property: 'data'
        }
      }
      const errorMessage = 'A message of error'
      const crudScope = nock(`${CRUD_BASE_PATH}`)
        .patch('/', body)
        .reply(400, { message: errorMessage })

      await assert.rejects(async () => await client.updateMany(requestCtx, body),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('upsertOne', () => {
    it('correctly calls crud service', async () => {
      const body = {
        $set: {
          some: 'data'
        }
      }
      const resultItem = {
        my: 'item'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/upsert-one', body)
        .reply(200, resultItem)

      const updateResponse = await client.upsertOne(requestCtx, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service with a filter', async () => {
      const body = {
        $set: {
          some: 'data'
        }
      }
      const resultItem = {
        my: 'item'
      }
      const filter = {
        mongoQuery: { fields: 'value' }
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/upsert-one', body)
        .query({
          _q: JSON.stringify(filter.mongoQuery)
        })
        .reply(200, resultItem)

      const updateResponse = await client.upsertOne({ ...requestCtx, headersToProxy }, body, filter)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('correctly calls crud service and proxy headers', async () => {
      const body = {
        $set: {
          some: 'data'
        }
      }
      const resultItem = {
        my: 'item'
      }
      const crudScope = nock(CRUD_BASE_PATH)
        .post('/upsert-one', body)
        .matchHeader('content-type', 'application/json')
        .matchHeader('foo', 'bar')
        .reply(200, resultItem)

      const updateResponse = await client.upsertOne({ ...requestCtx, headersToProxy }, body)
      crudScope.done()

      assert.deepStrictEqual(updateResponse, resultItem)
    })

    it('throws if crud returns', async () => {
      const body = {
        $set: {
          some: 'data'
        }
      }
      const errorMessage = 'A message of error'
      const crudScope = nock(`${CRUD_BASE_PATH}`)
        .post('/upsert-one', body)
        .reply(400, { message: errorMessage })

      await assert.rejects(async () => await client.upsertOne(requestCtx, body),
        new httpErrors.BadRequest(errorMessage)
      )

      crudScope.done()
    })
  })

  describe('delete', () => {
    const filter = { mongoQuery: { field: 'value' } }
    const query = { _q: JSON.stringify(filter.mongoQuery) }

    it('not ok with empty filter', async () => {
      await assert.rejects(
        async () => await client.delete(requestCtx, {}),
        new httpErrors.BadRequest('Mongo query is required')
      )
    })

    it('not ok without query', async () => {
      await assert.rejects(
        async () => await client.delete(requestCtx, { projection: ['field'], limit: 200, mongoQuery: {} }),
        new httpErrors.BadRequest('Mongo query is required')
      )
    })

    it('ok', async () => {
      const crudScope = nock(CRUD_BASE_PATH)
        .delete('/')
        .query(query)
        .reply(200)

      await client.delete(requestCtx, filter)
      crudScope.done()
    })

    it('ok and proxy headers', async () => {
      const crudScope = nock(CRUD_BASE_PATH)
        .delete('/')
        .query(query)
        .matchHeader('foo', 'bar')
        .reply(200)

      await client.delete({ ...requestCtx, headersToProxy }, filter)
      crudScope.done()
    })
  })
})
