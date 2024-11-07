import { GraphQLError } from 'graphql';
import { scrypt } from "node:crypto";
import { EntityId } from 'redis-om'

import {validate as valid} from "../../utilities/resolverHelpers.js";

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
			if (systemStatus.redis !== 'connected') throw new GraphQLError('Session domain unavailable', {extensions: ['INTERNAL_SERVER_ERROR']});

			// Validate required input fields
			valid.NN(input);
			valid.NN(input.email);
			valid.NN(input.password);

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Get user by email
			const userNode = await user.findOne({email: input.email})

			// If no user found or if user found but passwords do not match return operation failed
			if (!userNode || userNode.userType !== 'NORMAL' || input.password !== userNode?.password) {
				return {
					result: {
						success: false,
						errors: [
							{
								code: "INVALID_CREDENTIALS",
							}
						]
					}
				};
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

			// Return user and sessionId
			return {
				result: true,
				user: userNode,
				sessionId: sessionNode[EntityId],
			}
		},
		logOut: async (_, {input}, {dataSources: {session}, systemStatus, req}) => {
			if (systemStatus.redis !== 'connected') throw new GraphQLError('Session domain unavailable', {extensions: ['INTERNAL_SERVER_ERROR']});

			// Validate required input fields
			valid.NN(input);

			return {
				result: true,
			}
		},
		register: async (_, {input}, {dataSources: {user}, systemStatus}) => {
			if (systemStatus.redis !== 'connected') throw new GraphQLError('Session domain unavailable', {extensions: ['INTERNAL_SERVER_ERROR']});

			// Validate required input fields
			valid.NN(input);
			valid.NN(input.email);
			valid.NN(input.password);


			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Validate password
			if (input.password.length < 16) {
				throw new GraphQLError('Password must be at least 16 characters',
					{ extensions: { code: ['BAD_USER_INPUT', 'PASSWORD_TOO_SHORT'] } });
			}

			// @Todo: validate e-mail

			if (await user.countDocuments({ email: input.email }) !== 0) {
				throw new GraphQLError('E-mail already in use',
					{ extensions: { code: ['EMAIL_TAKEN'] } });
			}

			// Hash password

			// Add meta
			input.userType = 'NORMAL';

			input.createdAt = new Date();
			input.createdBy = null;
			input.version = 0;

			const userNode = await user.create({
				userType: 'NORMAL',
				email: input.email,
				password: input.password,
				createdAt: new Date().toISOString(),
				createdBy: "672aad0eb202f368ee0ef761",
				version: 0
			})

			return {
				result: true,
				user: userNode
			}
		}
	}
}