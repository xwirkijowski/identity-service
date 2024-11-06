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
	}
}