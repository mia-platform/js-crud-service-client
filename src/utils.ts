/*
 * Copyright © 2021-present Mia s.r.l.
 * All rights reserved
 */
import httpErrors, { type HttpError } from 'http-errors'
import { type RequestError } from 'got'
import { type BaseLogger } from 'pino'

export type KeysMatching<T, V> = {[K in keyof T]-?: T[K] extends V ? K : never}[keyof T];

export type HeadersToProxy = Record<string, string | string[] | undefined>

export type ClientRequestContext = {
  logger: BaseLogger
  headersToProxy: HeadersToProxy
  userHeaders: HeadersToProxy,
  requestId: string
  localRequestId: string
}

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

function getHttpErrors(error: RequestError): HttpError {
  return httpErrors(getGotErrorStatusCode(error) ?? 500, getGotErrorMessage(error))
}

export {
  getHttpErrors,
}
