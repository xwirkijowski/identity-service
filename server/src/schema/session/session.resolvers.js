import { GraphQLError } from 'graphql';
import { scrypt } from "node:crypto";
import { EntityId } from 'redis-om'
import { Result } from "../../utilities/result.js";
import {setupMeta, check} from "../../utilities/resolverHelpers.js";

export default {
	Session: {
		id: (obj) => {
			return obj[EntityId] || null;
		},
		user: async ({userId}, __, {dataSources: {user}}) => {
			return (userId) ? await user.findOne({_id: userId}) : null
		}
	},
	Query: {
		currentUser: async (_, __, {dataSources: {user}, session}) => {
			return (session) ? await user.findOne({_id: session.userId}) : null;
		},
		currentSession: async (_, __, {session}) => {
			return (session) ? session : null;
		}
	},
	Mutation: {
		logIn: async (_, {input}, {dataSources: {user, session}, systemStatus, req}) => {
			check.Needs('redis');

			const result = new Result();

			// Validate required input fields
			check.NN(input);
			check.NN(input.email);
			check.NN(input.password);

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Get user by email
			const userNode = await user.findOne({email: input.email})

			// If no user found or if user found but passwords do not match return operation failed
			if (!userNode || userNode.userType !== 'NORMAL' || input.password !== userNode?.password) {
				result.addError('INVALID_CREDENTIALS');
				return result.response();
			}

			// Set up variables
			const timestamp = new Date();
			const req_userAgent = req.get('User-Agent').normalize('NFKD') || null;

			// Create session
			const sessionNode = await session.save({
				userId: userNode._id.toString(),
				userAgent: req_userAgent,
				loggedInAt: timestamp.toISOString()
			});

			// Set session to expire in 1 hour (3600 s)
			session.expire(sessionNode[EntityId], 3600)

			if (sessionNode.userId !== undefined && sessionNode.userId !== null) {
				return {
					result: result.response(false),
					user: userNode,
					sessionId: sessionNode[EntityId],
				}
			}

			// Default to failed
			return {
				result: {
					success: false
				}
			}
		},
		logOut: async (_, {input}, {dataSources: {session}, systemStatus, req}) => {
			if (systemStatus.redis !== 'connected') throw new GraphQLError('Session domain unavailable', {extensions: ['INTERNAL_SERVER_ERROR']});

			// Validate required input fields
			check.NN(input);

			// Default to failed
			return {
				result: false
			}
		}
	}
}