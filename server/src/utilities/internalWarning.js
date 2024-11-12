import { globalLogger as log } from './log.js';

export default class InternalWarning {
	constructor(msg, ext, mod) {
		// Log reported warning
		if (mod) {
			log.withDomain('warn', `${mod}`, msg, ext);
		} else {
			log.warn(msg, ext)
		}
	}
}