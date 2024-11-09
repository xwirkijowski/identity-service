import {$S} from "../database.js";
import sessionModel from "../models/session.model.js";
import userModel from "../models/user.model.js";
import {GraphQLError} from "graphql";
import {EntityId} from "redis-om";

const deny = () => {
	throw new GraphQLError('Credential manipulation detected', {
		extensions: {
			code: 'UNAUTHENTICATED',
			http: { status: 401 },
		}
	});
}

export default async (req) => {
	let token = req.headers?.authorization;
	let session;

	// Validate token
	if (token && typeof token === 'string') {
		token = token.replace('Bearer ', '');
	} else return null;

	// Sessions for users only supported when Redis and DB is online
	// Await can make server unresponsive if Redis is attempting to connect
	if ($S.redis === 'connected' && $S.db === 'connected') {
		const sessionNode = await sessionModel.fetch(token);

		// Compare user-agent and IP address
		const req_userAgent = req.headers['user-agent'];
		const req_userIPAddress = req.socket.remoteAddress
		if (req_userAgent !== sessionNode.userAgent || req_userIPAddress !== sessionNode.userAddr) {
			await sessionModel.remove(token)
			deny();
		}

		// Get user from database
		const userNode = await userModel.findOne({_id: sessionNode.userId}).select('-password');

		if (!userNode) { // This can happen when user account is deleted
			await sessionModel.remove(token);
			throw new GraphQLError('User does not exist');
		}

		session = sessionNode;
		session.user = userNode;

		// Extend session time
		await sessionModel.expire(sessionNode[EntityId], 60 * 60 * 2) // (60s * 60m * 2h)
	}

	return session||null;
}