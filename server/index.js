import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { setupMongo, redisClient, setupRedis, $S } from './src/database.js';
import config from "./config.js";

// Import final schema
import schema from './src/schema.js';

import {$L} from "./src/utilities/log.js";

// Setup Redis client
await setupRedis(redisClient);

export {redisClient};

// Setup Mongoose connection to the database
await setupMongo();

// Load data sources (models)
import userModel from './src/models/user.model.js';
import sessionRepository from "./src/models/session.model.js";

// Construct Apollo server instance
const server = new ApolloServer({
	schema
})

// Launch the Apollo server
const { url } = await startStandaloneServer(server, {
	listen: { port: process.env.PORT || 4000 },
	context: async ({req, }) => {
		let token = req.headers?.authorization || null;
		let session = null;

		if (token) {
			token = token.replace('Bearer ', '');

			const sessionFetch = await sessionRepository.fetch(token);

			if (sessionFetch.userId !== null) {
				session = sessionFetch
			}
		}

		return {
			session,
			req,
			dataSources: {
				user: userModel,
				session: sessionRepository
			},
			systemStatus: $S
		}
	},
	cors: {
		origin: ['https://sandbox.embed.apollographql.com', `http://localhost:${config.server.port}`],
		credentials: true
	},
})

$L.success(`Live at ${url}`)