const { _ } = require('@feathersjs/commons');
const { AdapterService } = require('@feathersjs/adapter-commons');
const errors = require('@feathersjs/errors');
const harperive = require('harperive');
const { errorHandler, NO_AUTH, NO_SCHEMA, NO_TABLE, NO_HOST } = require('./error-handler');

const knex = require('knex')({
  client: 'pg',
  wrapIdentifier: (value) => value
});
const { isPlainObject } = require('is-plain-object');

const METHODS = {
  $or: 'orWhere',
  $and: 'andWhere',
  $ne: 'whereNot',
  $in: 'whereIn',
  $nin: 'whereNotIn'
};

const OPERATORS = {
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>='
};

const Client = harperive.Client;

class Service extends AdapterService {
  constructor (options = {}) {
    const { whitelist = [], config = {}, client } = options;
    super(Object.assign({
      id: 'id'
    }, options, {
      whitelist: whitelist.concat(['$and'])
    }));
    try {
      this.client = client || new Client(config);
      this.config = config;
      this.table = config.table || this.name;
      this.schema = config.schema;
      this.idProp = this.id;
      this.sortField = '__createdtime__';
      this.sortDirection = 'asc';
      this.sync = true;
      this.limit = 5000; // required in order to skip anything.  Set high, but can be overriden.
    } catch (e) {
      errorHandler(e);
    }
    this.validateConfig();
  }

  validateConfig () {
    const { schema, table, password, username, harperHost } = this.config;
    if (!harperHost) {
      errorHandler(NO_HOST);
    }
    if (!schema) {
      errorHandler(NO_SCHEMA);
    }
    if (!table) {
      errorHandler(NO_TABLE);
    }
    if (!password || !username) {
      errorHandler(NO_AUTH);
    }
  }

  // instantiate the DB
  async createDB (name) {
    const schema = name || this.schema;
    return this.client.createSchema({ schema }).catch(error => {
      if (!(error.error === `Schema '${this.schema}' already exists` && error.statusCode === 400)) {
        errorHandler(error);
      }
    });
  }

  // Instantiate the table
  async createTable (table, idProp) {
    table = table || this.table;
    idProp = idProp || this.idProp;
    return this.client.createTable({
      schema: this.schema,
      table,
      hashAttribute: idProp
    }).catch(error => {
      if (!(error.error === `Table '${this.table}' already exists in schema '${this.schema}'` && error.statusCode === 400)) {
        errorHandler(error);
      }
    });
  }

  // Wrapper around the SQL query client
  async query (sqlstring) {
    try {
      const result = await this.client.query(sqlstring);
      if (result.statusCode === 200) {
        return result.data;
      } else {
        throw result;
      }
    } catch (e) {
      errorHandler(e);
    }
  }

  async _find (params) {
    // clean up the input
    const { filters, paginate } = this.filterQuery(params);
    // create the query object from knex
    const q = this.createQuery(params);

    if (filters.$limit) {
      q.limit(filters.$limit);
    }

    // Handle $skip, only works in the context of a $limit
    if (filters.$skip >= 0) {
      q.offset(filters.$skip);
      if (!filters.$limit) {
        q.limit(this.limit);
      }
    }

    // provide default sorting if its not set
    if (!filters.$sort) {
      q.orderBy(this.sortField, this.sortDirection);
    }

    // generate SQL string version of query
    const sqlString = q.toString();

    // if you need pagination, we do a count
    if (paginate && paginate.default) {
      const countSql = q.clone()
        .clearSelect()
        .clearOrder()
        .limit(0) // this removes the limit, effectively
        .count(`${this.table}.${this.id} as total`)
        .toString();
      return this.query(countSql)
        .then(count => count[0] ? count[0].total : 0)
        .then(total => this.query(sqlString)
          .then(result => {
            return {
              total: parseInt(total, 10),
              limit: filters.$limit,
              skip: filters.$skip || 0,
              data: filters.$limit === 0 ? [] : result
            };
          }));
    }

    // handle the $limit if not paginated
    if (filters.$limit === 0) {
      return [];
    }

    // if not paginating, return raw result
    const result = await this.query(sqlString);
    return result;
  }

  async _findOrGet (id, params = {}) {
    // disable pagination
    const findParams = Object.assign({}, params, {
      paginate: false,
      query: Object.assign({}, params.query)
    });

    // if no ID, _find them
    if (id === null) {
      return this._find(findParams);
    }

    // if has ID, then find by query AND id.
    // Mismatch on either disqualifies element
    findParams.query.$and = [
      ...(findParams.query.$and || []),
      { [`${this.table}.${this.id}`]: id }
    ];
    return this._find(findParams);
  }

  _get (id, params = {}) {
    // fetch by ID
    return this._findOrGet(id, params).then(data => {
      if (data.length !== 1) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }
      // return de-arrayed item
      return data[0];
    }).catch(errorHandler);
  }

  async _create (data, params) {
    const { filters } = this.filterQuery(params);

    // only allow selected fields in the
    data = Array.isArray(data) ? data : [data];
    if (filters.$select) {
      data = data.map(entry => {
        return filters.$select.reduce((result, key) => {
          result[key] = entry[key];
          return result;
        }, {});
      });
    }

    // validate fields
    const options = {
      operation: 'insert',
      schema: this.schema,
      table: this.table,
      records: data
    };
    const result = await this.client.insert(options);
    if (result.statusCode === 200) {
      const hashes = result.data.inserted_hashes;
      const options = {
        table: this.table,
        hashValues: hashes,
        attributes: ['*']
      };

      const found = await this.client.searchByHash(options);
      return found.data.length === 1 ? found.data[0] : found.data;
    }
  }

  async _update (id, data, params) {
    // fetch by ID
    return this._get(id, params).then(oldObject => {
      // construct a new object, replacing old fields that are missing with null
      const newObject = Object.keys(oldObject).reduce((result, key) => {
        result[key] = data[key] === undefined ? null : data[key];
        return result;
      }, {});
      newObject[`${this.idProp}`] = id;

      const options = {
        schema: this.schema,
        table: this.table,
        records: [newObject]
      };
      // update via NoSQL path
      return this.client.update(options)
        .then(result => {
          if (
            result.statusCode === 200 &&
            result.data &&
            result.data.update_hashes &&
            result.data.update_hashes.length) {
            // fetch the new version and return
            return this._get(id, params);
          }
        })
        .catch(errorHandler);
    });
  }

  async _patch (id, data, params) {
    // if its a multi-update
    let idList;
    if (!id) {
      // get the ids that match
      const matched = await this._findOrGet(id, Object.assign({}, params, {
        query: _.extend({}, params.query, { $select: [`${this.table}.${this.idProp}`] })
      }));
      // then merge the new data with the old objects {id:xxx}
      data = matched.map(i => Object.assign({}, i, data));
      idList = matched.map(i => i[this.idProp]);
      const query = {
        [`${this.table}.${this.idProp}`]: { $in: idList }
      };
      const originalQuerySubset = params.query && params.query.$select ? { $select: params.query.$select } : {};
      params = Object.assign({}, params, {
        query: Object.assign(originalQuerySubset, query)
      });
    } else {
      // insert the id into the object for reference
      data = [Object.assign({}, data, { [`${this.idProp}`]: id })];
    }
    const options = {
      schema: this.schema,
      table: this.table,
      records: data
    };
    return this.client.update(options)
      .then(result => {
        if (
          result.statusCode === 200 &&
          result.data &&
          result.data.update_hashes &&
          result.data.update_hashes.length) {
          return this._findOrGet(id, params).then(items => {
            if (items.length === 0) {
              throw new errors.NotFound(`No record found for id '${id}'`);
            }
            return items.length > 1 ? items : items[0];
          });
        }
        throw new errors.NotFound(`No record found for id '${id}'`);
      })
      .catch(errorHandler);
  }

  _remove (id, params = {}) {
    return this._findOrGet(id, params).then(items => {
      const idList = items.map(current => current[this.id]);
      if (!idList.length) throw new errors.NotFound();
      return this.client.delete({
        table: this.table,
        hashValues: idList
      }).then(result => {
        if (
          result.statusCode === 200 &&
          result.data &&
          result.data.deleted_hashes &&
          result.data.deleted_hashes.length === idList.length) {
          return items.length > 1 ? items : items[0];
        }
        throw new errors.NotFound(`No record found for id '${id}'`);
      });
    }).catch(errorHandler);
  }

  knexify (query, params, parentKey) {
    Object.keys(params || {}).forEach(key => {
      const value = params[key];

      if (isPlainObject(value)) {
        return this.knexify(query, value, key);
      }

      const column = parentKey || key;
      const method = METHODS[key];
      const operator = OPERATORS[key] || '=';

      if (method) {
        if (key === '$or' || key === '$and') {
          const self = this;

          return query.where(function () {
            return value.forEach((condition) => {
              this[method](function () {
                self.knexify(this, condition);
              });
            });
          });
        }
        // eslint-disable-next-line no-useless-call
        return query[method].call(query, column, value);
      }

      return operator === '='
        ? query.where(column, value)
        : query.where(column, operator, value);
    });

    return query;
  }

  createQuery (params = {}) {
    const { schema, table, id } = this;
    const { filters, query } = this.filterQuery(params);
    let q = knex(table);

    if (schema) {
      q = q.withSchema(schema).from(`${table} as ${table}`);
    }

    // $select uses a specific find syntax, so it has to come first.
    q = filters.$select
      // always select the id field, but make sure we only select it once
      ? q.select([...new Set([...filters.$select, `${table}.${id}`])])
      : q.select([`${table}.*`]);

    // build up the knex query out of the query params
    this.knexify(q, query);

    // Handle $sort
    if (filters.$sort) {
      Object.keys(filters.$sort).forEach(key => {
        q = q.orderBy(key, filters.$sort[key] === 1 ? 'asc' : 'desc');
      });
    }
    return q;
  }

  async setup () {
    if (this.force && this.sync) {
      await this.client.deleteDB({ schema: this.schema });
    }
    if (this.sync) {
      await this.createDB();
      await this.createTable();
    }
  }
}

module.exports = options => {
  return new Service(options);
};

module.exports.Service = Service;
