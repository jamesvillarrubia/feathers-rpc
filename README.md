# feathers-rpc
                    
[![NPM](https://img.shields.io/npm/l/feathers-rpc)](https://github.com/jamesvillarrubia/feathers-rpc/blob/main/LICENSE) 

[![npm](https://img.shields.io/npm/v/feathers-rpc?label=latest)](https://www.npmjs.com/package/feathers-rpc)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/jamesvillarrubia/feathers-rpc/npm-publish.yml?branch=main)

[![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/NPM/feathers-rpc)]()

<!-- [![Download Status](https://img.shields.io/npm/dm/feathers-rpc.svg)](https://www.npmjs.com/package/feathers-rpc) -->

This library is a FeathersJS middleware to allow simple Remote Procedure Calls (RPCs) to interact with [Feathers Services](https://feathersjs.com/guides/basics/services.html) and [custom methods](https://feathersjs.com/api/services.html#custom-methods). 

To function, this middleware takes an RPC verb from between the end of a path behind a colon (e.g. `/messages:callMySpecialMethod)` and then appends `callMySpecialMethod` as a parameter in the Feathers context as well as overwriting the `x-service-method` header.  This allows a custom method to be trigerred within the `/messages` service without requiring modification of headers directly, which can be disabled in some webhook and integration tools.


## Installation
```bash
npm install --save feathers-rpc
```

Then add the library to your middleware:

```js 
//app.js
const parseRpcVerb = require('feathers-rpc');

//...

app.use(express.urlencoded({ extended: true }));
app.use(parseRpcVerb());                          //<--------
app.configure(express.rest());
```

### `service(options)`
__Options:__
- `disableHeader` (**optional**, default: `false`) - Set to true to prevent the `x-service-method` header from being overwritten by the middleware.  The RPC verb can still get captured and used from the Feathers hook ctx object.
- `allowedRpcVerbs` (**optional**. default: `any`) - Accepts a string or an array of strings.  Defaults to fully open, allowing any verb.  Setting to `[]` will disallow any verb. In order to use the `x-service-method` automatic call, the custom method of the service **must** be named exactly the same as the verb sent.


## Example Service
```javascript
//app.js

class MessageService {
  async find (params) { return { data: 'find', params }; }
  async create (data, params) { return { data: 'create', params }; }
  async callRpcMethod (data, params) { return { data: 'rpc', params }; }
}

const app = feathers()
  .configure(rest())
  .use('/messages', new MessageService(), {
    methods: ['find', 'create', 'callRpcMethod']
  });
```

Then to hit this service you can follow the instructions [here](https://feathersjs.com/api/client/rest.html#custom-methods-1)

The following two curl requests are then basically equivalent:

```bash 
curl -H "Content-Type: application/json" \
  -H "x-service-method: callRpcMethod" \
  -X POST -d '{"message": "Hello world"}' \ 
  http://localhost:3030/messages

curl -H "Content-Type: application/json" \
  -X POST -d '{"message": "Hello world"}' \ 
  http://localhost:3030/messages:callRpcMethod
```

### Using Verbs with ID

Because the middleware doesn't know available routes or nesting, it cannot distinguish between `messages:verb` and `messages/1:verb`.  In order to pass a specific ID to your custom function, include it in the data `{ id: 1 }` or in the query `messages:verb?id=1`;  This will allow you to fetch that entity and still use the custom methods.

### Extending an existing Service

You can easily add a custom method to any service and use the RPC middleware.  For example, if I was extending a Knex/SQL based service generated from the CLI, I would modify it like so:

```javascript
export class MessagesService extends KnexService {
   async callRpcMethod(data, params){
      //... do fancy stuff
    }
}
```

## Compatability
This library is tested against REST APIs for Feathers v4 and v5.  This library also supports Koa on v5. Since the `x-service-method` header functionality does not exist in `v4`, the RPC verb can be extracted inside a hook context or params with the property `params.rpcVerb`.  You can then redirect to a separate function directly.

Additional testing and PRs are welcome.

| feathers | v5                 | v4                 | v3              | 
|----------|--------------------|--------------------|-----------------|
| express  | :white_check_mark: | :white_check_mark: | :grey_question: |  
| koa      | :white_check_mark: | :grey_question:    | :grey_question: |  
| primus   | :grey_question:    | :grey_question:    | :grey_question: |


## Contributing
Please see https://github.com/jamesvillarrubia/feathers-rpc/blob/main/.github/contributing.md
 
## Credit
Inspired by work by Ben Zelinski.

