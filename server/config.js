import Err from './src/utilities/err.js';
import Warn from './src/utilities/warn.js';
import {$L} from "./src/utilities/log.js";

// Load configuration from environment variables
$L.log('Loading configuration...');

const config = {}

// Defaults
const defaults = {
	server: {
		port: 4000
	},
	redis: {
		port: 6379
	}
}

// Server configuration block
config.server = {
	port: process.env?.SERVER_PORT ?? defaults.server.port,
}

!process.env?.SERVER_PORT && new Warn(`No SERVER_PORT specified, using default ${defaults.server.port}`);

// Redis configuration block

if (!process.env?.REDIS_STRING) {
	config.redis = {
		host: process.env?.REDIS_HOST ?? null,
		port: Number(process.env?.REDIS_PORT) ?? defaults.redis.port,
		db: process.env?.REDIS_DB ?? null,
		user: process.env?.REDIS_USER ?? null,
		password: process.env?.REDIS_PASSWORD ?? null,
	};

	!config.redis.host && new Warn('No REDIS_HOST specified, sessions will not be available without a REDIS database');
	!process.env?.REDIS_PORT && new Warn(`No REDIS_PORT specified, using default ${defaults.redis.port}`);
	!config.redis.db && new Warn('No REDIS_DB specified')
	!config.redis.user && new Warn('No REDIS_USER specified');
	config.redis.user && !config.redis.password && new Warn('REDIS_USER specified but no REDIS_PASSWORD, access to database may be limited')
} else {
	config.redis = {
		string: process.env.REDIS_STRING
	}

	$L.log('Using Redis connection string');
}

config.redis.socket = {
	connectTimeout: 0, // 10 s
}

config.redis.connection = () => {
	if (process.env.REDIS_STRING) return process.env.REDIS_STRING;

	if (/(:\|\/\|\?\|#\|\[\|]\|@)/.test(config.redis.password)) config.redis.password = encodeURIComponent(config.redis.password);
	const userString = (config.redis.user) ? `${config.redis.user}:${config.redis.password}@` : '';

	return `redis://${(userString)}${config.redis.host}:${config.redis.port}${config.redis.db?'/'+config.redis.db:''}`
}

// Mongoose configuration block
if (!process.env.MONGO_STRING) {
	config.mongo = {
		host: process.env?.MONGO_HOST ?? null,
		port: Number(process.env?.MONGO_PORT) ?? null,
		db: process.env?.MONGO_DB ?? null,
		user: process.env?.MONGO_USER ?? null,
		password: process.env?.MONGO_PASSWORD ?? null,
		opts: process.env?.MONGO_OPTS ?? null
	};

	!config.mongo.host && new Err('No MONGO_HOST specified, no access to database!')
	!config.mongo.port && new Err('No MONGO_PORT specified, no access to database!')
	!config.mongo.db && new Err('No MONGO_DB specified, no database to access!')
	!config.mongo.user && new Warn('No MONGO_USER specified, access to database may be limited')
	config.mongo.user && !config.mongo.password && new Warn('MONGO_USER specified but no MONGO_PASSWORD, access to database may be limited')
} else {
	config.mongo = {
		string: process.env.MONGO_STRING
	}

	$L.log('Using MongoDB connection string');
}

config.mongo.connection = () => {
	if (process.env.MONGO_STRING) return process.env.MONGO_STRING;

	if (/(:\|\/\|\?\|#\|\[\|]\|@)/.test(config.mongo.password)) config.mongo.password = encodeURIComponent(config.mongo.password);

	const userString = (config.mongo.user) ? `${config.mongo.user}:${config.mongo.password}@` : '';

	return `mongodb://${(userString)}${config.mongo.host}:${config.mongo.port}/${config.mongo.db}${config.mongo.opts||''}`
};

$L.success('Configuration loaded!')

export default config;