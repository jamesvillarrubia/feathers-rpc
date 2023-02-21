const { Unprocessable } = require('@feathersjs/errors');

const koaMiddleware = async (ctx, next, allowedRpcVerbs) => {
  const { req } = ctx;
  const { url } = req;
  const allowAny = allowedRpcVerbs === 'any';
  const colonIdx = url.indexOf(':');
  const queryStartIdx = url.indexOf('?');

  if (colonIdx > 0) {
    const revisedPath = url.slice(0, colonIdx);
    const rpcVerb = url.slice(
      colonIdx + 1, queryStartIdx > 0 ? queryStartIdx : undefined
    );
    // validate allowed verbs, otherwise throw 422 Unprocessable error
    if (!allowAny && !allowedRpcVerbs.includes(ctx.request.rpcVerb)) {
      throw new Unprocessable('Invalid RPC verb');
    }

    ctx.url = revisedPath;
    ctx.originalUrl = revisedPath;
    ctx.req.url = revisedPath;
    ctx.request.originalUrl = revisedPath;

    ctx.feathers.rpcVerb = rpcVerb;
    ctx.request.header['x-service-method'] = rpcVerb;
    ctx.headers['x-service-method'] = rpcVerb;
    ctx.req.headers['x-service-method'] = rpcVerb;
    ctx.req.rawHeaders.push('x-service-method', rpcVerb);

    if (queryStartIdx > 0) {
      ctx.request.url = revisedPath + url.slice(queryStartIdx);
    }
  }
  await next();
};

const expressMiddleware = (req, next, allowedRpcVerbs) => {
  const { url } = req;
  const allowAny = allowedRpcVerbs === 'any';
  const colonIdx = url.indexOf(':');
  const queryStartIdx = url.indexOf('?');

  if (colonIdx > 0) {
    const revisedPath = url.slice(0, colonIdx);
    const rpcVerb = url.slice(
      colonIdx + 1, queryStartIdx > 0 ? queryStartIdx : undefined
    );

    // validate allowed verbs, otherwise throw 422 Unprocessable error
    if (!allowAny && !allowedRpcVerbs.includes(req.feathers.rpcVerb)) {
      throw new Unprocessable('Invalid RPC verb');
    }
    req.originalUrl = revisedPath;
    req.url = revisedPath;
    req.feathers.rpcVerb = rpcVerb;
    req.headers['x-service-method'] = rpcVerb;
    req.rawHeaders.push('x-service-method', rpcVerb);

    if (queryStartIdx > 0) {
      req.url = req.url + url.slice(queryStartIdx);
    }
  }

  next();
};

const parseRpcVerbFromUrl = (allowedRpcVerbs = 'any') => {
  return async (arg1, arg2, arg3) => {
    const engine = (!!arg2 && typeof arg2 === 'function')
      ? 'koa'
      : 'express';

    if (engine === 'koa') {
      await koaMiddleware(arg1, arg2, allowedRpcVerbs);
    } else {
      expressMiddleware(arg1, arg3, allowedRpcVerbs);
    }
  };
};

module.exports = parseRpcVerbFromUrl;
