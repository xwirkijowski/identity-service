import { $L } from './log.js';

export default class Warn {
	constructor(msg, ext, mod) {
		// Log reported warning
		$L.warn(msg, ext, mod);
	}
}