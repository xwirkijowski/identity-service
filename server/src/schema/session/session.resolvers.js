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
		user: (_, __, {session}) => {
			return (session) ? session.user : null;
		},
		userAddress: (obj) => {
			return obj.userAddr;
		}
	},
	Query: {
		session: async (_, {sessionId}, {models}) => {
			check.needs('redis');
			check.validate(sessionId, 'string');

			const sessionNode = await models.session.fetch(sessionId);

			return (sessionNode?.userId)?sessionNode:null;
		},
		sessionsByUser: async (_, {userId}, {models}) => {
			check.needs('redis');
			check.validate(userId, 'string');

			const sessionNodes = await models.session.search().where('userId').eq(userId).return.all()

			return sessionNodes||[];
		},
		currentUser: (_, __, {models: {user}, session}) => {
			return (session) ? session.user : null
		},
		currentSession: (_, __, {session}) => {
			return (session) ? session : null;
		}
	},
	Mutation: {
		logIn: async (_, {input}, {models: {user, session}, systemStatus, req}, info) => {
			check.needs('redis');

			const result = new Result();

			// Validate required input fields
			check.validate(input, 'object');
			check.validate(input.email, 'string');
			check.validate(input.password, 'string');

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Get user by email
			const userNode = await user.findOne({email: input.email})

			// If no user found or if user found but passwords do not match return operation failed
			if (!userNode || userNode.userType !== 'NORMAL' || input.password !== userNode?.password) {
				return result.addError('INVALID_CREDENTIALS').response();
			}

			// Set up variables
			const timestamp = new Date();
			const req_userAgent = req.get('User-Agent').normalize('NFKD') || null;
			const req_userIPAddress = req.socket.remoteAddress;

			// Create session
			const sessionNode = await session.save({
				userId: userNode._id.toString(),
				userAgent: req_userAgent,
				userAddr: req_userIPAddress,
				createdAt: timestamp.toISOString(),
				updatedAt: null,
				version: 0
			});

			// Set session to expire in 2 hours
			session.expire(sessionNode[EntityId], 60 * 60 * 2) // (60s * 60m * 2h)

			if (sessionNode.userId !== undefined && sessionNode.userId !== null) {
				return {
					result: result.response(false),
					user: userNode,
					sessionId: sessionNode[EntityId],
				}
			}

			// Default to failed
			return {
				result: false
			}
		},
		logOut: async (_, __, {session, models, systemStatus}) => {
			if (!session) { return {result: true}; }

			check.needs('redis');

			const result = new Result();

			// Remove session from Redis
			await models.session.remove(session[EntityId]);

			// Verify that session has been deleted
			const sessionCheck = await models.session.fetch(session[EntityId]);

			if (sessionCheck.userId === undefined) {
				// Set context session to null
				session = null;

				return result.response(true)
			} else {
				return result.addErrorAndLog('SESSION_DELETION_FAILED', null, null, 'error', 'Failed to log out a user!', 'Session').response(true)
			}
		},
		logOutAll: async (_, __, {session, models}) => {
			if (!session) { return {result: true}; }

			check.needs('redis');

			const result = new Result();

			let sessionCount;

			// Collect all sessions
			const sessionNodes = await models.session.search().where('userId').eq(session.userId).return.all()

			// Map session Ids from all sessions
			const sessionIds = sessionNodes.map(node => node[EntityId]);
			sessionCount = sessionIds.length;

			// Remove session from Redis
			await models.session.remove(sessionIds);

			// Verify that sessions has been deleted
			const sessionsCheckNodes = await models.session.fetch(sessionIds);
			const sessionCheckIds = sessionsCheckNodes.filter(node => node?.userId);

			if (sessionCheckIds.length === 0) {
				// Set context session to null
				session = null;

				return {
					result: result.response(false),
					invalidatedSessions: sessionCount
				}
			} else {
				return result.addErrorAndLog('SESSION_DELETION_ALL_FAILED', null, null, 'error', 'Failed to log our user out of all sessions!', 'Session').response(true)
			}
		}
	}
}