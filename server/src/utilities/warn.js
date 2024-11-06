import { $L } from './log.js';

export default class Warn {
	constructor(msg) {
		// Log reported warning
		$L.warn(msg);
	}
}