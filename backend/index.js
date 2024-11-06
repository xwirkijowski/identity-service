import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { setupMongo } from './src/database.js';

// Import final schema
import schema from './src/schema.js';

import {$L} from "./src/utilities/log.js";

// Setup Mongoose connection to the database
await setupMongo();

// Load data sources (models)
import userModel from './src/models/user.model.js';

// Construct Apollo server instance
const server = new ApolloServer({
	schema
})

// Launch the Apollo server
const { url } = await startStandaloneServer(server, {
	listen: { port: process.env.PORT || 4000 },
	context: async ({req}) => {
		return {
			dataSources: {
				user: userModel,
				// session:
			}
		}
	}
})

$L.success(`Live at ${url}`)