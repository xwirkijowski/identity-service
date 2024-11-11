import {GraphQLError} from "graphql";
import {$S} from "../database.js";

export const check = {
	/**
	 * Validate if defined and non-null
	 *
	 * @param	input					Input field.
	 * @param	type					Expected type of input.
	 * @return 	Boolean|GraphQLError	If valid return true, if invalid throw input error.
	 */
	validate: (input, type) => {
		if (input !== undefined // Is defined
			&& input !== null // Is not null
			&& (typeof input === type || type === 'array' && Array.isArray(input)) // Equals expected type
			&& ((typeof input === 'string' && input.length > 0) || true) // String is not empty
			&& ((type === 'array' && input.length > 0) || true)) return true; // Array is not empty
		else throw new GraphQLError('Input empty or wrong type', { extensions: { code: 'BAD_USER_INPUT' } });
	},
	needs: (system) => {
		if (system === 'db' && $S.db !== 'connected') {
			throw new GraphQLError('Database unavailable.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
		} else if (system === 'redis' && $S.redis !== 'connected') {
			throw new GraphQLError('Session database unavailable.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
		}
	},
	password: (pwd, email = undefined, result = undefined) => {
		// @todo Detect non-ASCII characters in password

		if (result) {
			pwd.length < 16 && result.addError('PASSWORD_TOO_SHORT', 'password', 'Password must be at least 16 characters');

			pwd.length > 128 && result.addError('PASSWORD_TOO_LONG', 'password', 'Password cannot be more than 128 characters long');

			/\s/.test(pwd) && result.addError('PASSWORD_WHITESPACE', 'password', 'Password cannot contain whitespace');
			!/[A-Z]/.test(pwd) && result.addError('PASSWORD_UPPERCASE_LETTERS', 'password', 'Password must contain at least a single uppercase letter');
			!/[a-z]/.test(pwd) && result.addError('PASSWORD_LOWERCASE_LETTERS', 'password', 'Password must contain at least a single lowercase letter');
			!/[0-9]/.test(pwd) && result.addError('PASSWORD_NUMBERS', 'password', 'Password must contain at least a single number');
			!/[^a-zA-Z0-9]/.test(pwd) && result.addError('PASSWORD_SPECIAL_CHAR', 'password', 'Password must contain at least a single special character');

			// !pwd.match(/[A-Za-z0-9]/g).length < 4

			(email && email === pwd) && result.addError('PASSWORD_EQUALS_EMAIL', 'password', 'Password cannot be your email address');

			return result;
		} else {
			return pwd.length >= 16
				&& pwd.length <= 128
				&& !/\s/.test(pwd)
				&& /[a-z]/.test(pwd)
				&& /[A-Z]/.test(pwd)
				&& /[0-9]/.test(pwd)
				&& /[^A-Za-z0-9]/.test(pwd)
				&& (!email || email && email !== pwd)
		}
	},
	/**
	 * @description
	 *
	 * Check if user has permissions to run this operation (query or mutation).
	 * If no permission present, only checks if there is a user logged in.	 *
	 * If user is not authorized, returns an error.
	 *
	 * @param 	session					Current session from context.
	 * @param 	permission				The permission to check for in current user's permissions.
	 * @param	silent					If set to true, will not return unauthorized error, only `false`.
	 * @param	altCondition			Alternative condition to check against in user does not have permission.
	 *
	 * @return	Boolean|GraphQLError	If checks pass, return true, else error.
	 */
	auth: (session, permission = undefined, silent = false, altCondition) => {
		if (silent && typeof silent !== 'boolean') return false; // Typo precaution

		// Handle no session
		if (!session) {
			throw new GraphQLError('Unauthenticated. You need to be logged in to access this resource.', {
				extensions: {
					code: 'UNAUTHORIZED'
				},
				http: { status: 401 }
			});
		}

		// If permission not defined return true, at this point authentication confirmed.
		if (!permission) return true;

		let authorized = false; // Default to false

		const userPermissions = session.user.permissions; // Get user permissions

		// Check if user has specified permission or is `ADMIN`.
		if (userPermissions.includes(permission) || userPermissions.includes('ADMIN')) authorized = true;

		if (authorized === false && typeof altCondition === 'boolean' && altCondition === true) {
			authorized = true;
		}

		// Handle user not authorized
		if (!authorized && silent === false) {
			throw new GraphQLError('Unauthorized. You do not have access to this resource.', {
				extensions: {
					code: 'FORBIDDEN'
				},
				http: { status: 403 }
			});
		}

		// Return check result
		return authorized;
	}
}

export const getIP = (req) => {
	let ip;

	if (req.headers?.["p9s-user-ip"] !== null) { // Check custom header
		ip = req.headers["p9s-user-ip"];
	} else if (req.headers?.["x-forwarded-for"] !== null) { // Check x-forwarder-for header
		ip = req.headers["x-forwarded-for"].split(",")[0];
	} else if (req.headers?.["x-real-ip"] !== null) { // Check x-real-ip header @todo needs testing
		ip = req.headers["x-real-ip"];
	} else if (req.connection && req.connection.remoteAddress !== null) { // Check connection @todo needs testing
		ip = req.connection.remoteAddress;
	} else if (req.socket && req.socket.remoteAddress !== null) { // Check socket @todo needs testing
		ip = req.socket.remoteAddress;
	} else { // No IP found
		throw new GraphQLError('Cannot find IP address.', {
			extensions: {
				code: 'INTERNAL_SERVER_ERROR'
			}
		});
	}

	return ip;
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