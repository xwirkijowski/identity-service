import mongoose from "mongoose";
import {createClient} from "redis";

import { $L } from "./utilities/log.js";
import Err from "./utilities/err.js";
import config from "../config.js";
import Warn from "./utilities/warn.js";

class SystemStatus {
	constructor () {
		this.db = false;
		this.redis = false;
	}

	setDB(status) {
		this.db = status;
		return this.db;
	}

	setRedis(status) {
		this.redis = status;
		return this.redis;
	}
}

const $S = new SystemStatus();

const setupMongo = async () => {
	mongoose.set('debug', true);

	mongoose.connection.on('connected', () => {
		$S.setDB('connected');
		$L.success('Database connection established!', undefined, 'Mongoose')
	})

	mongoose.connection.on('error', err => {
		$S.setDB('error');
		new Err(`Code ${err.errorResponse.code}, ${err.errorResponse.errmsg}`, undefined, 'Mongoose');
	})

	mongoose.connection.on('disconnect', e => {
		$S.setDB('disconnected');
		console.log(e);
	})

	// Attempt to connect
	try {
		$S.setDB('connecting');
		$L.log('Attempting to establish database connection...', undefined, 'Mongoose')

		await mongoose.connect(config.mongo.connection(), {
			heartbeatFrequencyMS: 10000,
		})
	} catch (err) {
		// Handle initial errors

		$S.setDB('error');

		if (err instanceof mongoose.Error.MongooseServerSelectionError) {
			// Error while looking for the server. Possibly server is unreachable or disabled.
			new Err(`Cannot connect to the database. Error type: ${err.reason.type}.`, undefined, 'Mongoose')
		} else {
			// Server is found but cannot connect.
			new Err(`Connection error. Code ${err.errorResponse.code}, ${err.errorResponse.errmsg}`, undefined, 'Mongoose');
		}
	}
}

const setupRedis = async () => {
		const redisClient = createClient({
		url: config.redis.connection(),
		socket: {...config.redis.socket,
			reconnectStrategy: (retries, err) => {
				$S.setRedis('connecting');

				// Generate a random jitter between 0 – 200 ms:
				const jitter = Math.floor(Math.random() * 200);
				// Delay is an exponential back off, (times^2) * 50 ms, with a maximum value of 30 s:
				const delay = Math.min(Math.pow(2, retries) * 50, 30000);

				if (retries % 5 === 0) new Err('Cannot connect to the database. Check if the redis database is running!', undefined, 'Redis', false)

				new Warn(`Unexpected error, attempting to connect again [${retries}, ${delay+jitter}ms]...`, undefined, 'Redis');


				return delay + jitter;
			}
		}
	});

	// Redis client has connected and is ready for operations
	redisClient.on('ready', () => {
		$S.setRedis('connected');
		$L.success('Database connection established!', undefined, 'Redis')
	})

	// Redis client has encountered an error
	redisClient.on('error', err => {
		if (err.constructor.name === 'SocketClosedUnexpectedlyError') {
			// Handled by socket.reconnectStrategy
		} else if (err.constructor.name === 'Error' && err.code === 'ECONNREFUSED' && $S.redis === 'connecting') {
			// Handled by socket.reconnectStrategy
		} else {
			$S.setRedis('error');
			new Err(`Code ${err.code}${err?.msg?', '+err.msg:''}`, undefined, 'Redis', true);
		}
	})

	// Attempt to connect
	try {
		$S.setRedis('connecting');
		$L.log('Attempting to establish database connection...', undefined, 'Redis')
		await redisClient.connect();
	} catch (err) {
		// Handle initial errors

		$S.setRedis('error');
		new Err(`Cannot connect to the database. Code ${err.code}.`, undefined, 'Redis')
	}

	return redisClient;
}

export {setupMongo, setupRedis, $S}