# Identity Service API

GraphQL user authentication and authorization API. Created as a small side-project. 

**This is a prototype, this project is not production ready.**

> Read [ARCHITECTURE.md](ARCHITECTURE.md) for design choices information, scalability and security strategies breakdown.

---
## Technology Stack

- **Apollo Server** — GraphQL server provider powered by Express.js
- **MongoDB** — primary database for user data storage
- **Redis** (stack) — secondary database for session data storage
- Database interfaces/clients:
  - **Mongoose** — ODM interface for MongoDB
  - **Redis-om** — Redis object mapper
- Other utilities:
  - **GraphQL-Tools** — schema (resolver and typeDefs) loading and merging
  - **GrqphQL-Sclars** — validation of EmailAddress, IPAddress and DateTime

---

## Development

`<startup instructions>`

---

## Configuration

There is a handful of environment variables used by this project. Those environment variables are loaded by the `config.js` file.

Server throws an error when a required environment variable has not been found. It also logs each optional undefined variable with a warning and if a default value has been used instead.

### Environment Variables
- NODE_ENV _(optional, default: `development`)_
- SERVER_PORT _(optional, default: `4000`)_
- SERVER_HOST _(optional, default `undefined`)_

#### Redis credentials _(optional, required for session handling)_
- REDIS_HOST
- REDIS_PORT _(default: `6379`)_
- REDIS_DB
- REDIS_USER
- REDIS_PASSWORD
- _or only_ REDIS_STRING


 #### MongoDB credentials (required)
- MONGO_HOST
- MONGO_PORT
- MONGO_DB
- MONGO_USER
- MONGO_PASSWORD
- _or only_ MONGO_STRING

---

## Health Checks

A `healthcheck` query is available without authentication. It returns a timestamp, database connection status and availability of data domains provided by the server (user, session).

---

## Error Handling

### Responses

Service returns `GraphQLErrors` where applicable, i.e. when an internal server error that makes carrying out a requested query or operation impossible occurs or when a user is unauthenticated or unauthorized.

All mutation requests return a `Result` type alongside their other fields. All mutations use a `Result` class to track custom errors. If a `Result` contains errors, the request will always return a `Result` with `success: false`. Those are meant to be used by the client application (e.g. password validation errors).

If an input on mutation is not valid, the server throws a `GraphQLError` with `BAD_USER_INPUT`. If an input is valid but does not satisfy some business logic checks, the server will return `null` for all fields and a `Result` field with `success: false` and a list of errors.

#### Result type (GraphQL)
```graphql
type Result {
    "If the mutation was a success"
    success: Boolean!
    "Array of Error objects"
    errors: [Error]
    """
    Array of error codes from all Error objects.
    Error codes do not repeat.    
    """
    errorCodes: [String]
}
```
#### Error type (GraphQL)
```graphql
type Error {
    "Short descriptive error code used by client application"
    code: String
    "Path (on input) on which the error has occurred"
    path: String
    "Error description or explanation"
    msg: String
}
```

### Database Errors

Service will generally stop only when it encounters a mongoose error.

If the Redis client looses connection or will not connect on start, it will infinitely attempt to connect to a Redis server using a defined `reconnectStrategy` with exponential back off and jitter.

```js
// Generate a random jitter between 0 – 200 ms:
const jitter = Math.floor(Math.random() * 200);
// Delay is an exponential back off, (times^2) * 50 ms, with a maximum value of 30 s:
const delay = Math.min(Math.pow(2, retries) * 50, 30000);

return delay + jitter;
```

When a database is unavailable, the server updates a special `$S` variable so we can always check the status of the database. We use this variable in context, the `healthcheck` query and to check if performing a specific query or mutation is currently possible (if not, return `GraphQLError` with `INTERNAL_SERVER_ERROR`). 

The idea is to avoid complete breakdowns. There is no sense in shutting down the whole API only because there was a temporary connection loss. API itself can still function, but just returns an informative error. This also allows us to keep part of the API that does not need a specific database online.

For example: Other APIs do not need sessions for request not made on behalf of another user. This means that they can still get some data without a need for a Redis  database that stores session data.

All status changes of MongoDB and Redis connectors (e.g. `connected`, `error`, `connecting`) are also logged.

---

## Logging

This project uses a small custom log wrapper to style log messages.

`<more details>`