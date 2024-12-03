# js-crud-service-client

The official [CRUD Service](https://github.com/mia-platform/crud-service) JavaScript client.

## Installation

Using npm:

```sh
npm i @mia-platform/js-crud-service-client
```

## How to use

```ts
import CrudClient from '@mia-platform/js-crud-service-client'

const crudClient = new CrudClient<ResourceType>('/prefix', 'resource-name')

const resourceList = await crudClient.getList(context, filter)
```

## Features

This package allows you to easily integrate with a [CRUD Service](https://github.com/mia-platform/crud-service). It provides the following APIs:

- get a list of resources optionally filtered
- export all data from the CRUD resource
- count the number of resources
- get a single resource by ID
- create a resource
- create multiple resources at once
- upsert a single resource
- update a single resource by ID
- update multiple resources at once
- soft delete (trash) a single resource by ID
- hard delete a single resource by ID
- delete multiple resources at once

## Requirements

Node.js >= 18
