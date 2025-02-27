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
import httpErrors, { type HttpError } from 'http-errors'
import { type RequestError } from 'got'
import qs from 'qs'

import type { Filter, KeysMatching } from './types'

function getGotErrorStatusCode(error: RequestError): number | undefined {
  if (error.response?.statusCode) {
    return error.response.statusCode
  }
  return undefined
}

function getGotErrorMessage(error: RequestError): string {
  if (error.response?.body && (error.response.body as {message?: string}).message) {
    return (error.response.body as {message: string}).message
  }

  if (error.message) {
    return error.message
  }

  return 'Something went wrong'
}

export function getHttpErrors(error: RequestError): HttpError {
  return httpErrors(getGotErrorStatusCode(error) ?? 500, getGotErrorMessage(error))
}

type CrudQuery<T> = Partial<Record<KeysMatching<T, string>, string>> & {
  _q?: string
  _l?: number
  _p?: string
  _s?: string
  _sk?: number
  _rawp?: string
}


export function queryFromFilter<T>(filter: Filter<T> | undefined): string | undefined {
  if (!filter) {
    return undefined
  }

  const createQueryParams = {
    mongoQuery: (value: Filter<T>['mongoQuery']) => ({ _q: value ? JSON.stringify(value) : undefined }),
    limit: (value: Filter<T>['limit']) => ({ _l: value }),
    projection: (value: Filter<T>['projection']) => ({ _p: value?.join(',') }),
    sort: (value: Filter<T>['sort']) => ({ _s: value }),
    skip: (value: Filter<T>['skip']) => ({ _sk: value }),
    rawProjection: (value: Filter<T>['rawProjection']) => ({ _rawp: value ? JSON.stringify(value) : undefined }),
  } as const

  const queryObject = Object.entries(filter).reduce<CrudQuery<T>>((acc, [key, value]) => ({
    ...acc,
    ...(key in createQueryParams
      ? createQueryParams[key as keyof typeof createQueryParams](value as never)
      : { [key]: value }),
  }), {})

  return qs.stringify(queryObject)
}
