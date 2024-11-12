import { ApolloServer } from '@apollo/server';
import { ulid } from 'ulid';
import { startStandaloneServer } from '@apollo/server/standalone';
import config from "./config.js";
import { setupMongo, redisClient, setupRedis, $S } from './src/database.js';
import {globalLogger as log} from './src/utilities/log.js';
import handleSession from "./src/utilities/auth.js";

// Import final schema
import schema from './src/schema.js';

// Import data models
import userModel from './src/models/user.model.js';
import sessionModel from "./src/models/session.model.js";

import telemetryPlugin from "./src/middleware/telemetryPlugin.js";

// Setup Redis client
setupRedis(redisClient);
export {redisClient};

// Setup Mongoose
await setupMongo();

// Construct Apollo server instance
const server = new ApolloServer({
	schema,
	plugins: [telemetryPlugin()],
	includeStacktraceInErrorResponses: (config.server.env === 'development'),
	introspection: (config.server.env === 'development')
})

// Launch the Apollo server
const { url } = await startStandaloneServer(server, {
	listen: {
		port: config.server.port,
		host: config.server.host
	},
	context: async ({req, }) => {
		const telemetryStart = performance.now(); // Request processing start
		const timestampStart = new Date();
		const requestId = ulid(); // Internal correlation / request ID

		// @todo Rate limit, max depth, complexity
		// @todo Add check for client app to prevent direct use.

		const session = await handleSession(req);

		return {
			session,
			req,
			models: {
				user: userModel,
				session: sessionModel
			},
			internal: {
				telemetryStart,
				timestampStart,
				requestId
			},
			systemStatus: $S
		}
	},
	cors: {
		origin: ['https://sandbox.embed.apollographql.com', `http://${config.server.host}:${config.server.port}`],
		credentials: true
	},
})

log.success(`Ready at ${url}, running in ${config.server.env.toLowerCase()} environment...`)