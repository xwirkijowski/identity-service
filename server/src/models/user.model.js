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
			required: true,
			unique: true
		},
		password: {
			type: String,
			required: true
		},
	}, {
		versionKey: false
	})
)