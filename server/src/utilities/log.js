import fs from 'node:fs';

class Eudoros {
	/**
	 * ANSI Bindings
	 *
	 * Code				Description		Reset
	 * `\x1b[1m`		Bold			`\x1b[22m`
	 * `\x1b[0m`		Reset all
	 * `\x1b[31m`		Red
	 * `\x1b[32m`		Green
	 * `\x1b[33m`		Yellow
	 */

	#levels;		// Logging levels, extracted from options;
	#directory;		// Logging directory;

	/**
	 * Dynamically set up methods for each logging level defined in options.
	 */
	#initLevels () {
		this.#levels.forEach((level) => {
			this[level.label.toLowerCase()] = async (...args) => {
				// Fire and forget - don't block
				this.#handleLog(level, undefined, ...args).catch(err => {
					console.error(`Error during error handling ${level.label}: ${err}`)
				});
			}
		})
	}

	/**
	 * Apply user defined log level formatting and prepare the payload itself.
	 * All `args` are turned into a single string, objects undergo `JSON.stringify`.
	 *
	 * @param 	level	The logging level
	 * @param	domain	Optional domain (extra tag after timestamp)
	 * @param 	args	Log payload
	 */
	#formatPayload = (level, domain = null, ...args) => {
		const prefix = level.prefix; // @todo: add alt
		const timestamp = `${level.format[0]||''}${new Date().toISOString()}${level.format[1]||''}`;

		let payload = args;

		if (level?.toHumanReadable) {
			payload = level.toHumanReadable(payload[0]);
		}

		const message = (typeof payload === "object")
			? payload
				.map(arg => {
					if (typeof arg === 'object') {
						return JSON.stringify(arg, null, 2);
					}
					return String(arg);
				})
				.join(' ')
			: payload;

		if (domain) {
			domain = `${level.format[0]||''}[${domain}]${level.format[1]||''}`;
		}

		return `${prefix} ${timestamp}${domain?` ${domain} `:' '}${level.format[2] || ''}${message}${level.format[3] || ''}`;
	}

	/**
	 * Format log message and call appropriate dynamic method.
	 * If level has file logging enabled, call the file logging method.
	 * File logging method uses its own format.
	 *
	 * @param	level	The logging level
	 * @param	domain	Optional domain (extra tag after timestamp)
	 * @param 	args	Log payload
	 */
	#handleLog = async (level, domain = null, ...args) => {
		const message = this.#formatPayload(level, domain, ...args);

		// Run as soon as possible, do not block current operations
		process.nextTick(() => console[level.method](message));

		if (level.logToFile) this.#logToFile(level, ...args);
	}

	/**
	 * Prepare the log payload for file logging.
	 * File logs are saved as a JSON string to make them compatible with Grafana.
	 *
	 * @param 	level	The logging level
	 * @param 	args	Log payload
	 */
	#logToFile = (level, ...args) => {
		const date = new Date();
		const dateString = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

		// Prepare message

		const message = ''

		const fileName = (typeof level.logToFile === "string")
			? `${level.label}-log-${dateString}`
			: `log-${dateString}`;

		fs.appendFile(`${this.#directory}/${fileName}.txt`, message, { flag: 'a+' }, err => {
			if (err) console.error(`Cannot write log to file. ${err}`);
		})
	}

	/**
	 * Alternative to dynamically generated methods, includes an extra tag (domain) in the log.
	 *
	 * @param	level	The logging level
	 * @param	domain	Optional domain (extra tag after timestamp)
	 * @param 	args	Log payload
	 */
	withDomain = (level, domain, ...args) => {
		const levelObject = this.#levels.find(obj => obj.label === level);

		this.#handleLog(levelObject, domain, ...args).catch(err => {
			console.error(`Error during error handling ${level.label} with domain: ${err}`)
		});
	}

	/**
	 * @param 	opts	Configuration object
	 */
	constructor (opts) {
		if (opts) {
			this.#levels = opts.levels; // Assign levels
			this.#directory = opts.directory||'logs'; // Set logging directory

			this.#initLevels(); // Set up dynamic methods
		}
	}
}

const opts = {
	directory: './logs',
	levels: [
		{ // Critical errors that cause performance degradation or shutdown
			label: 'critical',
			prefix: `\x1b[1m\x1b[31m[\u{2717}]\x1b[0m`, // Bold, red
			format: ['\x1b[1m\x1b[31m', '\x1b[0m'], // Bold, red
			logToFile: true,
			method: 'error'
		},
		{ // Non-critical errors
			label: 'error',
			prefix: `\x1b[31m[\u{2717}]\x1b[0m`, // Red
			format: ['\x1b[31m', '\x1b[0m'], // Red
			logToFile: true,
			method: 'error'
		},
		{ // Warnings, expected exceptions
			label: 'warn',
			prefix: `\x1b[33m[\u{26A0}]\x1b[0m`, // Yellow
			format: ['\x1b[33m', '\x1b[0m'], // Yellow
			logToFile: true,
			method: 'warn'
		},
		{
			label: 'success',
			prefix: `\x1b[32m[\u{2713}]\x1b[0m`, // Green
			format: ['\x1b[32m', '\x1b[0m'], // Green
			logToFile: true,
			method: 'log'
		},
		{ // Request logging
			label: 'request',
			prefix: '[>]',
			format: [],
			logToFile: 'request',
			method: 'log',
			toHumanReadable: (payload) => {
				return `Request ${payload.requestId} finished in ${payload.time}ms, received at ${payload.timestampStart.toISOString()}, user ${payload?.userId||'UNAUTHENTICATED'}`
			}
		},
		{ // Authentication and authorization logging
			label: 'audit',
			prefix: '',
			format: [],
			logToFile: 'audit',
			method: 'log'
		},
		{ // Standard logging
			label: 'log',
			prefix: '',
			format: [],
			logToFile: true,
			method: 'std'
		},
		{ // Information
			label: 'info',
			prefix: '\x1b[34m[\u{0069}]\x1b[0m',
			format: ['\x1b[34m', '\x1b[0m'],
			logToFile: true,
			method: 'info'
		},
		{ // Debugging
			label: 'debug',
			prefix: '',
			format: [],
			logToFile: 'debug',
			method: 'debug'
		}
	]
}

export const globalLogger = new Eudoros(opts);