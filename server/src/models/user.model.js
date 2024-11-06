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
		createdAt: {
			type: String,
			required: true
		},
		createdBy: {
			type: mongoose.ObjectId,
			required: true
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

