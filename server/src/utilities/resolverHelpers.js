import {GraphQLError} from "graphql";
import {$S} from "../database.js";

export const check = {
	/**
	 * Validate if defined and non-null
	 *
	 * @param	input					Input field
	 * @param	type					Expected type of input
	 * @return 	Boolean|GraphQLError	If valid return true, if invalid throw input error.
	 */
	validate: (input, type) => {
		if (input !== undefined && input !== null && typeof input === type) return true;
		throw new GraphQLError('Input is required', { extensions: { code: 'BAD_USER_INPUT' } });
	},
	needs: (system) => {
		if (system === 'db' && $S.db !== 'connected') {
			throw new GraphQLError('Database unavailable.', {extensions: ['INTERNAL_SERVER_ERROR']});
		} else if (system === 'redis' && $S.redis !== 'connected') {
			throw new GraphQLError('Session database unavailable.', {extensions: ['INTERNAL_SERVER_ERROR']});
		}
	}
}

export const setupMeta = (session, input, node = undefined, mode = 'create') => {
	const timestamp = new Date().toISOString();

	if (mode === 'create') {
		input.createdBy = session?.userId||null;
		input.createdAt = timestamp;
	} else if (mode === 'update') {
		input.updatedBy = session?.userId||null;
		input.updatedAt = timestamp;
	}

	input.version = (node?.version)?node.version+1:0;

	return input;
}