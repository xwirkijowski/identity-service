import { $L } from './log.js';

export default class Err {
	constructor(msg, ext, mod) {
		// Log reported error
		$L.error(msg, ext, mod);

		// Throw exception
		throw Error();
	}
}