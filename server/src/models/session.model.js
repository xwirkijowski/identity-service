import {Repository, Schema} from 'redis-om';
import {redisClient} from "../../index.js";

const sessionSchema = new Schema(
	'session', {
		userId: { type: 'string' },
		userAgent: { type: 'string' },
		loggedInAt: { type: 'date' }
	},
	{
		dataStructure: 'HASH'
	}
);

const sessionRepository = new Repository(sessionSchema, redisClient);

export default sessionRepository;