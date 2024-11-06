import Err from './src/utilities/err.js';
import Warn from './src/utilities/warn.js';
import {$L} from "./src/utilities/log.js";

// Load configuration from environment variables
$L.log('Loading configuration...');

const config = {}

// Defaults
const defaults = {
	port: 4000
}

// Server configuration block
config.server = {
	port: process.env?.SERVER_PORT ?? defaults.port,
}

!process.env?.SERVER_PORT && new Warn(`No SERVER_PORT specified, using default ${defaults.port}`);

// Redis configuration block
config.redis = {
	host: process.env?.REDIS_HOST ?? null,
	port: Number(process.env?.REDIS_PORT) ?? null,
	user: process.env?.REDIS_USER ?? null,
	password: process.env?.REDIS_PASSWORD ?? null,
};

!config.redis.host && new Warn('No REDIS_HOST specified, sessions will not be available without a REDIS database');
!config.redis.port && new Warn('No REDIS_PORT specified, sessions will not be available without a REDIS database');
!config.redis.user && new Warn('No REDIS_USER specified');
!config.redis.password && new Warn('No REDIS_PASSWORD specified');

// Mongoose configuration block
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

config.mongo.connection = () => {
	if (process.env.MONGO_STRING) return process.env.MONGO_STRING;

	if (/(:\|\/\|\?\|#\|\[\|]\|@)/.test(config.mongo.password)) config.mongo.password = encodeURIComponent(config.mongo.password);

	const userString = (config.mongo.user) ? `${config.mongo.user}:${config.mongo.password}@` : '';

	return `mongodb://${(userString)}${config.mongo.host}:${config.mongo.port}/${config.mongo.db}${config.mongo.opts||''}`
};

$L.success('Configuration loaded!')

export default config;