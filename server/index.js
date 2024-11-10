import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import config from "./config.js";
import { setupMongo, redisClient, setupRedis, $S } from './src/database.js';
import {$L} from "./src/utilities/log.js";
import handleSession from "./src/utilities/auth.js";

// Import final schema
import schema from './src/schema.js';

// Import data models
import userModel from './src/models/user.model.js';
import sessionModel from "./src/models/session.model.js";

// Setup Redis client
setupRedis(redisClient);
export {redisClient};

// Setup Mongoose
await setupMongo();

// Construct Apollo server instance
const server = new ApolloServer({
	schema
})

// Launch the Apollo server
const { url } = await startStandaloneServer(server, {
	listen: {
		port: config.server.port,
		host: config.server.host
	},
	context: async ({req, }) => {
		// @todo Rate limit, max depth, complexity

		const session = await handleSession(req);

		return {
			session,
			req,
			models: {
				user: userModel,
				session: sessionModel
			},
			systemStatus: $S
		}
	},
	cors: {
		origin: ['https://sandbox.embed.apollographql.com', `http://${config.server.host}:${config.server.port}`],
		credentials: true
	},
})

$L.success(`Live at ${url}`)