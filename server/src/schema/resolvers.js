export default {
	Query: {
		healthCheck: () => {
			return new Date().toISOString();
		}
	}
}