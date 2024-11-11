# Identity Service API

GraphQL user authentication and authorization API.

Created as a small side-project.

In the future it will most likely be adapted to be part of a supergraph.

---

## Technology Stack

- **Apollo Server** — GraphQL server provider powered by Express.js
- **MongoDB** — primary database for user data storage
- **Redis** — secondary database for session data storage
- Database utilities:
  - **Mongoose** — ODM interface for MongoDB
  - **Redis-om** — Redis object mapper
- Additional utilities:
  - **GraphQL-Tools** — schema (resolver and typeDefs) merging

## Design Choices

### Schema


### Authentication and Authorization

Because this service is meant to control access to business-critical and confidential resources, like project, 
financial and PII (_Personally Identifiable Information_) data, it is critical to choose an authorization method 
that can be revoked at any time.

JWTs are an attractive choice, however the raised concern invalidates it's most attractive quality - which is 
statelessness. For this to work, we would need a blacklist database (preferably Redis), which does not make much sense 
since we need to do the same (with whitelist instead of blacklist) with a session based approach, but without the 
added overhead of JWT.

**Logical conclusion was session based authentication for user authentication.**

> It seems like it would make sense ot use JWT if we wanted to store some more data inside the payload, like 
> user-agent, IP address to verify if they are the same as they were when the token was created.
> 
> However, we can also achieve this by using the session approach. In this case, the session is an object stored in 
> Redis. It contains the associated `userId`, creation timestamp, user-agent,  IP address.

This application will support both user and API access. It creates a session for the user to use in resource servers. 
Resource servers need to look up the session for authentication and the attached users permissions for authorization.

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
3. Simple schema-level authentication and authorization checks;
4. Password policy:
   - From 16 to 128 characters in length;
   - Min. 1 of lowercase `[a-z]`, uppercase `[A-Z]`, number `[0-9]` and special `[^a-zA-Z0-9]` character;
   - Cannot equal email address.

#### Planned security features
1. Rate limiting
2. Complexity checks — primarily in event of compromised session

### Unauthorized Access Handling
Let's imagine a scenario where a threat actor has gained access to a session identifier, managed to impersonate victim's user-agent and is on the victim's network (same IP address). Identity service now cannot differentiate this attacker from the victim.

Implementing checks for specific headers (i.e. client app) with static values do not make sense, since they can be easily used by the attacker.

A simple way to avoid this problem altogether would be to limit access to the server only to specific IPs, like backend servers, but this would prevent clients without a backend (CSR apps) from accessing this API.


Let's also assume that somehow we became aware of this unauthorized access and that the threat actor has begun performing some disruptive actions.

We can disable the Redis database to make authentication impossible, therefor completely close of access to normal users.

In an event a session invalidation is ineffective due to an exception or database issues, there should be an alternative way to automatically invalidate all sessions.