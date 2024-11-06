export default {
	User: {
		id: ({_id}) => {
			return _id;
		}
	},
	Query: {
		user: async (_, args, {dataSources: {user}}) => {
			return await user.findOne({id: args.userId});
		},
		users: async (_, __, {dataSources: {user}}) => {
			return await user.find();
		}
	}
}