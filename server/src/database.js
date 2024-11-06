import mongoose from "mongoose";
import {$L} from "./utilities/log.js";
import Err from "./utilities/err.js";
import config from "../config.js";

const setupRedis = async () => {

}

const setupMongo = async () => {
	mongoose.set('debug', true);

	mongoose.connection.on('connected', cb => {
		$L.success('Database connection established!', undefined, 'Mongoose')
	})

	mongoose.connection.on('error', err => {
		new Err(`Code ${err.errorResponse.code}, ${err.errorResponse.errmsg}`, undefined, 'Mongoose');
	})

	mongoose.connection.on('disconnect', e => {
		console.log(e);
	})

	try {
		$L.log('Attempting to establish database connection...', undefined, 'Mongoose')

		await mongoose.connect(config.mongo.connection(), {
			heartbeatFrequencyMS: 10000,
		})
	} catch (err) {
		if (err instanceof mongoose.Error.MongooseServerSelectionError) {
			// Unknown error while looking for the server. Possibly server is unreachable or disabled.
			new Err(`Cannot connect to the database. Error type: ${err.reason.type}.`, undefined, 'Mongoose')
		} else {
			// Server is found but cannot connect.
			new Err(`Connection error. Code ${err.errorResponse.code}, ${err.errorResponse.errmsg}`, undefined, 'Mongoose');
		}
	}
}

export {setupRedis, setupMongo}