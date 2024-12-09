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
import { type BaseLogger } from 'pino'

import type { CrudClient } from './CrudClient'

export type ICrudClient<T> = Omit<CrudClient<T>, 'client' | 'resource'>

export type KeysMatching<T, V> = {[K in keyof T]-?: T[K] extends V ? K : never}[keyof T];

export type HeadersToProxy = Record<string, string | string[] | undefined>

export type ClientRequestContext = {
  logger: BaseLogger
  headersToProxy: HeadersToProxy
  userHeaders: HeadersToProxy,
  requestId: string
  localRequestId: string
}

export type Filter = {
  mongoQuery?: Record<string, unknown>
  limit?: number
  skip?: number
  projection?: string[],
  rawProjection?: Record<string, 1 | 0>
  sort?: string
}

export type CrudUID = {
  _id: string
}

export type PatchBody<T> = {
  $set?: Partial<T> & Record<string, unknown>
  $unset?: Partial<T> & Record<string, unknown>
  $inc?: Partial<KeysMatching<T, number>>
  $mul?: Partial<KeysMatching<T, number>>
  $currentDate?: Partial<T>
  $push?: Partial<KeysMatching<T, unknown[]>> | Record<string, unknown>
}

export type PatchBulkEntry<T> = {
  filter: Record<string, unknown>
  update: PatchBody<T>
}

export type PatchBulkBody<T> = PatchBulkEntry<T>[]

export type CrudItem<T> = T & {
  _id: string
  __STATE__: 'PUBLIC' | 'DRAFT' | 'TRASH' | 'DELETED'
  createdAt: string
  creatorId: string
  updatedAt: string
  updaterId: string
}
