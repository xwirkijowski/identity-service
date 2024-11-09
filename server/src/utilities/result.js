import { $L } from "./log.js";

export class Result {
	constructor (result, errors) {
		this.success = result||true;
		this.errors = errors||[];
	}

	addError = (code, path, message) => {
		if (this.success === true) this.success = false;
		this.errors.push(new Error(code, path, message))

		return this;
	}

	addErrorAndLog = (code, path, message, type, note, component = undefined) => {
		if (this.success === true) this.success = false;
		this.errors.push(new Error(code, path, message))

		if (typeof type === 'string' && ['error', 'warn', 'info', 'log'].includes(type)) {
			$L[type](`${note?note+' ':''}Code: ${code}`, undefined, component);
		}

		return this;
	}

	response = (full = true) => {
		if (this.errors.length !== 0) {
			this.success = false;
		}

		return (full === true ) ? {
			result: {
				success: this.success,
				errors: this.errors
			}
		} : { success: this.success, errors: this.errors };
	}
}

export class Error {
	constructor(code, path = undefined, message = undefined) {
		this.code = code;
		this.path = path || null;
		this.msg = message || null;

		return this;
	}
}