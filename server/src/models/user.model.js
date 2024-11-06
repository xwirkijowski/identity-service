import mongoose from "mongoose";

export default mongoose.model(
	'User',
	new mongoose.Schema({
		userType: {
			type: String,
			required: true
		},
		email: {
			type: String,
			required: () => {
				return (this.userType === 'NORMAL');
			},
			unique: true
		},
		password: {
			type: String,
			required: () => {
				return (this.userType === 'NORMAL');
			}
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