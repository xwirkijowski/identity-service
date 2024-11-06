import { GraphQLError } from 'graphql';
import { scrypt } from "node:crypto";
import { EntityId } from 'redis-om'

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
		logIn: async (_, {input}, {dataSources: {user, session}, systemStatus, req}, ) => {
			// Validate required input fields

			if (!input) {
				throw new GraphQLError('Input is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

			if (!input.email) {
				throw new GraphQLError('Email is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

			if (!input.password) {
				throw new GraphQLError('Password is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Get user by email
			const userNode = await user.findOne({email: input.email})

			// If no user found or if user found but passwords do not match throw GQL error.
			if (!userNode || input.password !== userNode?.password) {
				throw new GraphQLError('Cannot log in')
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
				user: userNode,
				sessionId: sessionNode[EntityId],
			}

		},
		register: async (_, {input}, {dataSources: {user}, systemStatus}) => {

			// Validate required input fields

			if (!input) {
				throw new GraphQLError('Input is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

			if (!input.email) {
				throw new GraphQLError('Email is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

			if (!input.password) {
				throw new GraphQLError('Password is required',
					{ extensions: { code: 'BAD_USER_INPUT' } });
			}

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
				user: userNode
			}
		}
	}
}