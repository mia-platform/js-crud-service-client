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

import type { Filter } from './types.js'

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

export function queryFromFilter(filter: Filter | undefined): string | undefined {
  return filter
    ? qs.stringify({
      _q: filter.mongoQuery ? JSON.stringify(filter.mongoQuery) : undefined,
      _l: filter.limit,
      _p: filter.projection?.join(','),
      _s: filter.sort,
      _sk: filter.skip,
      _rawp: filter.rawProjection ? JSON.stringify(filter.rawProjection) : undefined,
    })
    : undefined
}
