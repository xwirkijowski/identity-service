import { globalLogger as log } from './log.js';

export default class InternalError {
	constructor(msg, ext, mod, critical = true) {
		// Log reported error
		if (mod) {
			log.withDomain(critical?'critical':'error', mod, msg, ext);
		} else {
			log[critical?'critical':'error'](msg, ext)
		}

		if (critical === true) throw Error(); // Throw exception if error is critical
	}
}