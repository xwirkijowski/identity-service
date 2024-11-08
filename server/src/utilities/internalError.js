import { $L } from './log.js';

export default class InternalError {
	constructor(msg, ext, mod, critical = true) {
		// Log reported error
		$L.error(msg, ext, mod);

		if (critical === true) throw Error(); // Throw exception if error is critical
	}
}