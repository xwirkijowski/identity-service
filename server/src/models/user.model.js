import mongoose from "mongoose";

export default mongoose.model(
	'User',
	new mongoose.Schema({
		userType: {
			type: String,
			enum: ['NORMAL', 'API'],
			required: true
		},
		email: {
			type: String,
			unique: true
		},
		password: {
			type: String,
		},
		permissions: [{type: String}],
		createdAt: {
			type: String,
		},
		createdBy: {
			type: mongoose.ObjectId,
		},
		updatedAt: {
			type: String,
		},
		updatedBy: {
			type: mongoose.ObjectId
		},
		version: {
			type: Number,
			default: 0
		}
	}, {
		versionKey: false
	})
)

