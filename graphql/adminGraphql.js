const { graphqlHTTP } = require("express-graphql");
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLScalarType,
  GraphQLError,
} = require("graphql");
const { Kind } = require("graphql/language");

const adminService = require("../services/adminService");
const managerService = require("../services/managerService");
const serviceCategoryController = require("../controllers/serviceCategoryController");
const productCategoryController = require("../controllers/productCategoryController");

function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return Object.fromEntries(
        ast.fields.map((field) => [field.name.value, parseLiteral(field.value)]),
      );
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

const GraphQLJSON = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});

function createError(statusCode, payload) {
  return new GraphQLError(payload?.message || payload?.error || "Request failed", {
    extensions: {
      code: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_USER_INPUT",
      statusCode,
      payload,
    },
  });
}

function createGraphqlReq(baseReq, overrides = {}) {
  return {
    ...baseReq,
    ...overrides,
    params: {
      ...(baseReq.params || {}),
      ...(overrides.params || {}),
    },
    query: {
      ...(baseReq.query || {}),
      ...(overrides.query || {}),
    },
    body: {
      ...(baseReq.body || {}),
      ...(overrides.body || {}),
    },
  };
}

async function runJsonHandler(handler, baseReq, overrides = {}) {
  const req = createGraphqlReq(baseReq, overrides);

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          reject(createError(this.statusCode, payload));
          return this;
        }
        resolve(payload);
        return this;
      },
      send(payload) {
        if (this.statusCode >= 400) {
          reject(createError(this.statusCode, { message: String(payload) }));
          return this;
        }
        resolve(payload);
        return this;
      },
    };

    Promise.resolve(handler(req, res)).catch((error) => {
      reject(
        new GraphQLError(error?.message || "Handler execution failed", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        }),
      );
    });
  });
}

const QueryType = new GraphQLObjectType({
  name: "AdminQuery",
  fields: {
    adminDashboard: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(adminService.getApiDashboard, context.req),
    },
    managerDashboard: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(managerService.getApiDashboard, context.req),
    },
    users: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) => runJsonHandler(managerService.getApiUsers, context.req),
    },
    services: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(managerService.getApiServices, context.req),
    },
    orders: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) => runJsonHandler(managerService.getApiOrders, context.req),
    },
    payments: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(managerService.getApiPayments, context.req),
    },
    support: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) => runJsonHandler(managerService.getApiSupport, context.req),
    },
    profileOverview: {
      type: new GraphQLNonNull(GraphQLJSON),
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: (_, args, context) =>
        runJsonHandler(managerService.getProfileOverview, context.req, {
          params: { id: args.id },
        }),
    },
    userAnalytics: {
      type: new GraphQLNonNull(GraphQLJSON),
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: (_, args, context) =>
        runJsonHandler(managerService.getUserAnalytics, context.req, {
          params: { id: args.id },
        }),
    },
    serviceCategories: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(serviceCategoryController.getCategories, context.req),
    },
    productCategories: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: (_, __, context) =>
        runJsonHandler(productCategoryController.getCategories, context.req),
    },
  },
});

const schema = new GraphQLSchema({
  query: QueryType,
});

function createAdminGraphqlMiddleware() {
  return graphqlHTTP((req) => ({
    schema,
    graphiql: process.env.NODE_ENV !== "production",
    context: { req },
    customFormatErrorFn: (error) => ({
      message: error.message,
      code: error.extensions?.code,
      statusCode: error.extensions?.statusCode,
      details: error.extensions?.payload,
      path: error.path,
    }),
  }));
}

module.exports = createAdminGraphqlMiddleware;
