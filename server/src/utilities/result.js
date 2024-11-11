import { $L } from "./log.js";

export class Result {
	constructor (result, errors) {
		this.success = result||true;
		this.errors = errors||[];

		return this;
	}

	addError = (code, path, message) => {
		if (this.success === true) this.success = false;
		this.errors.push(new ResultError(code, path, message))

		return this;
	}

	addErrorAndLog = (code, path, message, type, note, component = undefined) => {
		if (this.success === true) this.success = false;
		this.errors.push(new ResultError(code, path, message))

		if (typeof type === 'string' && ['error', 'warn', 'info', 'log'].includes(type)) {
			$L[type](`${note?note+' ':''}Code: ${code}`, undefined, component);
		}

		return this;
	}

	/**
	 * @description	Build and return `Result` object. Allows for additional data inclusion if .
	 *
	 * @param 		full		Boolean
	 * @param 		include		Object
	 *
	 * @returns 	{*|{result: {success: (*|boolean), errors: (*|*[])}}|{success: (*|boolean), errors: (*|*[])}}
	 */
	response = (full = true, include = {}) => {
		if (this.errors.length !== 0) {
			this.success = false;
		}

		return (full === true ) ? {
			result: {
				success: this.success,
				errors: this.errors
			},
			...include
		} : { success: this.success, errors: this.errors };
	}
}

export class ResultError {
	constructor(code, path = undefined, message = undefined) {
		this.code = code;
		this.path = path || null;
		this.msg = message || null;

		return this;
	}
}