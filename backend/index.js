import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import schema from './src/schema.js';

const server = new ApolloServer({
	schema
})

const { url } = await startStandaloneServer(server, {
	listen: { port: process.env.PORT || 4000 },
})

console.log(`live at ${url}`)
