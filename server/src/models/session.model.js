import {Repository, Schema} from 'redis-om';
import {redisClient} from "../../index.js";

const sessionSchema = new Schema(
	'session', {
		userId: { type: 'string' },
		userAgent: { type: 'string' },
		userAddr: { type: 'string' },
		createdAt: { type: 'date' },
		updatedAt: { type: 'date'} ,
		version: { type: 'number' },
	},
	{
		dataStructure: 'JSON',
	}
);

const sessionRepository = new Repository(sessionSchema, redisClient);

redisClient.on('ready', async () => {
	await sessionRepository.createIndex();
})

export default sessionRepository;