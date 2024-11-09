import {Repository, Schema} from 'redis-om';
import {redisClient} from "../../index.js";
import crypto from 'node:crypto';

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
		idStrategy: () => {
			return crypto.randomBytes(64).toString('hex');
		}
	}
);

const sessionRepository = new Repository(sessionSchema, redisClient);

redisClient.on('ready', async () => {
	await sessionRepository.createIndex();
})

export default sessionRepository;