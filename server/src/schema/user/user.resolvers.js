import {EmailAddressResolver} from "graphql-scalars";
import {Result} from "../../utilities/result.js";
import {setupMeta, check} from "../../utilities/helpers.js";

export default {
	EmailAddress: EmailAddressResolver,
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
		createdBy: async ({createdBy}, _, {models: {user}}) => {
			return (createdBy) ? await user.findOne({_id: createdBy}).select('-password') : null;
		},
		updatedBy: async ({updatedBy}, _, {models: {user}}) => {
			return (updatedBy) ? await user.findOne({_id: updatedBy}).select('-password') : null;
		},
	},
	APIUser: {
		id: ({_id}) => {
			return _id;
		},
		createdBy: async ({createdBy}, _, {models: {user}}) => {
			return (createdBy) ? await user.findOne({_id: createdBy}).select('-password') : null;
		},
		updatedBy: async ({updatedBy}, _, {models: {user}}) => {
			return (updatedBy) ? await user.findOne({_id: updatedBy}).select('-password') : null;
		},
	},
	Query: {
		user: async (_, args, {session, models: {user}}) => {
			return (check.auth(session, 'ADMIN'))
				? await user.findOne({id: args.userId}).select('-password')
				: null;
		},
		users: async (_, __, {session, models: {user}}) => {
			return (check.auth(session, 'ADMIN'))
				? await user.find().select('-password')
				: null;
		}
	},
	Mutation: {
		createUser: async (_, {input}, {session, models: {user}}) => {
			check.needs('db')
			check.auth(session, 'CREATE_USER');

			const result = new Result();

			// Validate required input fields
			check.validate(input, 'object');
			check.validate(input.email, 'string');
			check.validate(input.password, 'string');

			// Normalize string user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Validate password
			check.password(input.password, input.email, result);
			if (result.hasErrors()) return result.response();


			// @Todo: validate e-mail

			if (await user.countDocuments({ email: input.email }) !== 0) {
				return result.addError('EMAIL_TAKEN', 'email', 'E-mail address already in use').response();
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
			} else {
				return {
					result: false
				}
			}
		},
		updateUser: async (_, {input}, {session, models: {user}}) => {
			check.needs('db')
			check.auth(session, 'UPDATE_USER');


			const result = new Result();

			return {
				result: false
			}
		},
		deleteUser: async (_, {userId}, {session, models}) => {
			check.needs('db')
			check.auth(session, 'DELETE_USER');

			if (session.userId === userId) return new Result().addError('CANNOT_DELETE_YOURSELF', 'User closeAccount instead.').response();

			const result = new Result();

			check.validate(userId, 'string');

			const userNode = await models.user.deleteOne({_id: userId})

			if (userNode.deletedCount === 1) {
				return result.response(true)
			} else {
				return {
					result: false
				}
			}
		},
		register: async (_, {input}, {session, models: {user}}) => {
			check.needs('db')

			const result = new Result();

			// Validate required input fields
			check.validate(input, 'object');
			check.validate(input.email, 'string');
			check.validate(input.password, 'string');

			// Normalize string user input
			input.email = input.email.normalize('NFKD');
			input.password = input.password.normalize('NFKD');

			// Validate password
			check.password(input.password, input.email, result);
			if (result.hasErrors()) return result.response();

			// @Todo: validate e-mail

			if (await user.countDocuments({ email: input.email }) !== 0) {
				return result.addError('EMAIL_TAKEN', 'email', 'E-mail address already in use').response();
			}

			// Hash password

			// Add meta
			input.userType = 'NORMAL';

			input = setupMeta(session, input);

			const userNode = await user.create(input)

			if (userNode) return result.response();

			// Default to failed
			return {
				result: false
			}
		}
	}
}