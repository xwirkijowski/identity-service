const types = {
	log: {
		start: '\x1b[34m[>]',
		extension: '\x1b[34m---\x1b[0m'
	},
	info: {
		start: '\x1b[36m[\u{0069}]',
		extension: '\x1b[36m---\x1b[0m'
	},
	success: {
		start: '\x1b[32m[\u{2713}]',
		extension: '\x1b[32m---\x1b[0m'
	},
	warn: {
		start: '\x1b[33m[\u{26A0}]',
		extension: '\x1b[1m\x1b[33m---\x1b[0m'
	},
	error: {
		start: '\x1b[31m[\x1b[33m\u{2717}\x1b[31m]',
		extension: '\x1b[1m\x1b[31m---\x1b[0m'
	}
};

const prefix = (type, timestamp, component) => {
	if (component)
		return `${types[type].start} ${timestamp} [${component}]`;
	else return `${types[type].start} ${timestamp}`;
};

/**
 * Logger class
 */
export class Logger {
	constructor(component = null) {
		this.component = component;
	}

	get timestamp() {
		const time = new Date;
		return `[${time.toISOString()}]`;
	}

	/**
	 * @param m	Message
	 * @param e Extension (stack-trace or Error object)
	 * @param c Component (internal application domain or component)
	 */
	log = (m, e = undefined, c = undefined) => {
		const type = 'log';
		const start = prefix(type, this.timestamp, this.component || c)+'\x1b[0m';

		console.log(start, m, (`\x1b[0m${(e !== undefined) ? ('\n' + e + `\n${types[type].extension}`) : ''}`));
	};

	info = (m, e = undefined, c = undefined) => {
		const type = 'info';
		const start = prefix(type, this.timestamp, this.component || c);

		console.info(start, m, (`\x1b[0m${(e !== undefined) ? ('\n' + e + `\n${types[type].extension}`) : ''}`));
	};

	success = (m, e = undefined, c = undefined) => {
		const type = 'success';
		const start = prefix(type, this.timestamp, this.component || c);

		console.log(start, m, (`\x1b[0m${(e !== undefined) ? ('\n' + e + `\n${types[type].extension}`) : ''}`));
	};

	warn = (m, e = undefined, c = undefined) => {
		const type = 'warn';
		const start = prefix(type, this.timestamp, this.component || c);

		console.warn(start, m, (`\x1b[0m${(e !== undefined) ? ('\n' + e + `\n${types[type].extension}`) : ''}`));
	};

	error = (m, e = undefined, c = undefined) => {
		const type = 'error';
		const start = prefix(type, this.timestamp, this.component || c);

		console.error(start, m, (`\x1b[0m${(e !== undefined) ? ('\n' + e + `\n${types[type].extension}`) : ''}`));
	};
}

export const $L = new Logger();