# Identity Service API

GraphQL user authentication and authorization API.

Created as a small side-project. This file includes ramblings that attempt to rationalize my design choices and tackle some problems.

In the future it will most likely be adapted to be part of a supergraph.

---

## Technology Stack

- **Apollo Server** — GraphQL server provider powered by Express.js
- **MongoDB** — primary database for user data storage
- **Redis** — secondary database for session data storage
- Database interfaces/clients:
  - **Mongoose** — ODM interface for MongoDB
  - **Redis-om** — Redis object mapper
- Other utilities:
  - **GraphQL-Tools** — schema (resolver and typeDefs) loading and merging
  - **GrqphQL-Sclars** — validation of EmailAddress, IP (IPAddress) and DateTime.

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

## Design Choices

### Caching

Since the data provided by this service is critical to other services, and any update to the data needs to be immediately available, it is my understanding that caching possibilities are limited to non-critical information, like `createdBy` or `createdAt` fields.

It is viable to cache all data retrieved through query requests and update the cache on each create, update or delete request, but this approach would yield consistent results when performing operations on the data is possible only though this API. Any data manipulation that for any reason happens directly on the database, is endangered to not have any effect on the data returned by the API until the cache expires. In a critical event (e.g. password change on suspicion of unauthorized access), this could have serious consequences.

### Authentication and Authorization

Because this service is meant to control access to business-critical and confidential resources, like project, 
financial and PII (_Personally Identifiable Information_) data, it is critical to choose an authorization method 
that can be instantly revoked at any time.

Unfortunately, authentication using 3rd party identity providers is not an option for my use case.

JWTs are an attractive choice, however the raised concern invalidates it's most attractive quality - which is 
statelessness. For this to work, we would need a blacklist database (preferably Redis), which does not make much sense 
since we need to do the same (with whitelist instead of blacklist) with a session based approach, but without the 
added overhead of JWT.

Short-lived stateless JWTs with frequent refreshes could be considered in the future. However, since they lack immediate revocation control without blacklists and rotation, **a traditional session-based approach is a logical choice for its enhanced access control**.

> It seems like it would make sense ot use JWT if we wanted to store some more data inside the payload, like 
> user-agent, IP address to verify if they are the same as they were when the token was created.
> 
> However, we can also achieve this by using the session approach. In this case, the session is an object stored in 
> Redis. It contains the associated `userId`, creation timestamp, user-agent,  IP address.

This application will support both user and API access. It creates a session for the user to use in resource servers. 
Resource servers need to look up the session for authentication and the attached users permissions for authorization.

This service is not expected to handle a large quantity of operations, so in my understanding scalability concerns are not that big.

#### User Access Flow

1. _User_ inputs their login and password information on the client app login page.
2. _Client_ sends login information in a GraphQL login mutation to the _Identity service_.
3. _Identity service_ validates input and checks login info.
4. _Identity service_ creates session and returns sessionId with user object.
5. _Client_ saves returned sessionId as cookie.
6. _Client_ sends a request for some resource, with the sessionId from the cookie included as a header.
7. _Resource service_ sends a lookup request with the sessionId to the _Identity service_. 
8. _Identity service_ checks if the sessionId is valid and exists.
9. _Identity service_ extends the session time and returns associated user with their permissions to the _Resource service_.
10. _Resource service_ returns resource to _Client_.
11. _Client_ uses the resource.

```
      User                | Client                     | Identity service                | Resource service
       	                  |                            |                                 | 
1.    Input login info -> |                            |                                 | 
2.                        | Login info via GraphQL ->  |                                 |
3.                        |                            | Validate & check login info     | 
4.                        |                            | <- Return sessionId & user      |
5.                        | Save sessionId as cookie.  |                                 | 
6.                        | Get list of projects ------|-------------------------------> | 
7.                        |                            |                                 | <- Lookup sessionId
8.                        |                            | Check if session valid          |
9.                        |                            | Return user, extend session ->  | 
10.                       |                            | <-------------------------------| Return resource to client
11.                       | Display list of projects   |                                 | 
```

### Security

By its nature, this API server needs to properly control access to sensitive data. If this API becomes compromised, security of other services may be at stake. This makes proper security (i.e. rate limiting, access control) a primary concern.

Identity service checks every request by checking if the request contains a `sessionId`, validating it and looking it up in the Redis database, then looking the user up in the user MongoDB collection. While this increases the processing time of the request, it also covers unexpected edge cases when token invalidation did not happen properly, or if user access has been suddenly revoked.

#### Currently implemented security features
1. Extra variables used in session verification (user-agent and IP address);
2. Session limit (3 sessions per user);
3. Simple schema-level authentication and authorization checks loosely based on `graphql-shield`;
4. Password policy:
   - From 16 to 128 characters in length;
   - Min. 1 of lowercase `[a-z]`, uppercase `[A-Z]`, number `[0-9]` and special `[^a-zA-Z0-9]` character;
   - Cannot equal email address.
5. Input validation, unicode serialization;

#### Planned security features
1. Rate limiting
2. Complexity checks — primarily in event of compromised session
3. Query depth limit
4. CORS policy
5. Set allowed methods
6. Request headers validation
7. Preflight check
8. SSL

### Unauthorized Access Handling
Let's imagine a scenario where a threat actor has gained access to a session identifier, managed to impersonate victim's user-agent and is on the victim's network (same IP address). The user had `['ADMIN']` permissions. Identity service now cannot differentiate this attacker from the victim.

- Implementing checks for specific headers (e.g. client app) with static values do not make sense, since they can be easily spoofed by the attacker (e.g. by using curl). However, by using dynamic variables set by the client in a predictable way (like using a modified session identifier or part of it) this approach can be an effective deterrent, but still not a solid security guarantee.


- A simple way to avoid this problem altogether would be to limit access to the server only to specific IPs, like backend servers, but this would prevent clients without a backend (CSR apps) from accessing this API.

Let's now also assume that somehow we became aware of this unauthorized access and that the threat actor has begun performing some disruptive actions.

- We can log out the victim out of all sessions using the API or directly from the Redis database. However, with the attacker actively degrading the servers performance or trying to exploit it, in an unlikely edge case there could be an error during session invalidation call.


- We can completely shut down the Redis database to make authentication impossible, therefore completely close of access to normal users.
  - This will not stop other APIs from accessing the identity service, but all actions carried out on behalf of users by other APIs need a user session.
  - API calls to the identity service that are not performed on behalf of users (not related to them trying to access a resource) need to be made from IPs on an allow list. This makes this vector of attack virtually impossible to carry out without direct access to the hosting infrastructure.


- In an event where we do not have control over Redis, and therefore session invalidation is not possible, there has to be a non-destructive (i.e. without deleting the user) option to stop the session validating.
  1. Since every time a request starts being processed by the server the authentication function has to retrieve the associated user from the MongoDB database, we could introduce a special `secret` that would coexist with the password. We shouldn't use the password hash to store it with the rest of session object properties to avoid its possible leakage.
  2. That's where the `secret` comes in. It's an independent user-level salt that is used solely to invalidate all sessions. This salt, combined with a server-level salt defined as an environment variable, could be stored inside the session.
  3. Every time a user changes his password, the API will invalidate all other sessions, update the current session with a new `secret` to keep the user logged in and update the user in the MongoDB database.
  4. This `secret` can also be changed directly in the MongoDB database, making it impossible to validate existing sessions.

While it seems overly complex and over the top, I believe that in conjunction with other security features like rate limiting, it would make a solid defence line in case of emergency or at least in suspicion of unauthorized access.

> In an ideal scenario, the server could analyze user's actions, including rate of queries, their types and complexity, and based on those variables invalidate the session automatically if it detects any anomalous activity. That, however, with a raising amount of calls could become an enormous burden on the server's resources and is not sensible for a project of such small scale.

## Health Checks

A `healthcheck` query is available without authentication. It returns a timestamp, database connection status and availability of data domains provided by the server (user, session).

## Error handling

### Responses

Service returns `GraphQLErrors` where applicable, i.e. when an internal server error that makes carrying out a requested query or operation impossible occurs or when a user is unauthenticated or unauthorized.

All mutation requests return a `Result` type alongside their other fields. All mutations use a `Result` class to track custom errors. If a `Result` contains errors, the request will always return a `Result` with `success: false`. Those are meant to be used by the client application (e.g. password validation errors).

If an input on mutation is not valid, the server throws a `GraphQLError` with `BAD_USER_INPUT`. If an input is valid but does not satisfy some business logic checks, the server will return `null` for all fields and a `Result` field with `success: false` and a list of errors.

#### Result type
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
#### Error type
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

## Logging

This project uses a small custom log wrapper to style log messages.