import {Result} from "../../utilities/result.js";
import {setupMeta, check} from "../../utilities/resolverHelpers.js";

export default {
	User: {
		__resolveType: (obj) => {
			switch (obj.userType) {
				case 'NORMAL':
					return 'NormalUser';
				case 'API':
					return 'APIUser';
				default:
					return null;
			}
		}
	},
	NormalUser: {
		id: ({_id}) => {
			return _id;
		},
		createdBy: async ({createdBy}, _, {dataSources: {user}}) => {
			return (createdBy) ? await user.findOne({_id: createdBy}) : null;
		},
		updatedBy: async ({updatedBy}, _, {dataSources: {user}}) => {
			return (updatedBy) ? await user.findOne({_id: updatedBy}) : null;
		},
	},
	APIUser: {
		id: ({_id}) => {
			return _id;
		},
		createdBy: async ({createdBy}, _, {dataSources: {user}}) => {
			return (createdBy) ? await user.findOne({_id: createdBy}) : null;
		},
		updatedBy: async ({updatedBy}, _, {dataSources: {user}}) => {
			return (updatedBy) ? await user.findOne({_id: updatedBy}) : null;
		},
	},
	Query: {
		user: async (_, args, {dataSources: {user}}) => {
			return await user.findOne({id: args.userId});
		},
		users: async (_, __, {dataSources: {user}}) => {
			return await user.find();
		}
	},
	Mutation: {
		createUser: async (_, {input}, {session, dataSources: {user}, systemStatus}) => {
			check.Needs('db')

			const result = new Result();

			// Validate required input fields
			check.NN(input);
			check.NN(input.email);
			check.NN(input.password);

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Validate password
			if (input.password.length < 16) {
				result.addError('PASSWORD_TOO_SHORT', 'password', 'Password must be at least 16 characters');
				return result.response();
			}

			// @Todo: validate e-mail

			if (await user.countDocuments({ email: input.email }) !== 0) {
				result.addError('EMAIL_TAKEN', 'email', 'E-mail address already in use');
				return result.response();
			}

			// Add meta
			input.userType = 'NORMAL';

			input = setupMeta(session, input);

			const userNode = await user.create(input)

			if (userNode) { // @todo: Add proper checks
				return {
					result: result.response(false),
					user: userNode
				}
			}

			// Default to failed
			return {
				result: false
			}
		},
		updateUser: async (_, {input}, {session, dataSources: {user}, systemStatus}) => {
			check.Needs('db')
		},
		deleteUser: async (_, {input}, {session, dataSources: {user}, systemStatus}) => {
			check.Needs('db')
		},
		register: async (_, {input}, {session, dataSources: {user}, systemStatus}) => {
			check.Needs('db')

			const result = new Result();

			// Validate required input fields
			check.NN(input);
			check.NN(input.email);
			check.NN(input.password);

			// Normalize user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Validate password
			if (input.password.length < 16) {
				result.addError('PASSWORD_TOO_SHORT', 'password', 'Password must be at least 16 characters');
				return result.response();
			}

			// @Todo: validate e-mail

			if (await user.countDocuments({ email: input.email }) !== 0) {
				result.addError('EMAIL_TAKEN', 'email', 'E-mail address already in use');
				return result.response();
			}

			// Hash password

			// Add meta
			input.userType = 'NORMAL';

			input = setupMeta(session, input);

			const userNode = await user.create(input)

			if (userNode) { // @todo: Add proper checks
				return {
					result: result.response(false),
					user: userNode
				}
			}

			// Default to failed
			return {
				result: false
			}
		}
	}
}