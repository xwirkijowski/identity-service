export default {
	InternalStatus: {
		database: (_, __, {systemStatus}) => {
			return systemStatus.db;
		},
		redis: (_, __, {systemStatus}) => {
			return systemStatus.redis;
		},
	},
	DomainStatus: {
		user: (_, __, {systemStatus}) => {
			if (systemStatus.db === 'connected') return 'available';
			return 'unavailable';
		},
		session: (_, __, {systemStatus}) => {
			if (systemStatus.redis === 'connected') return 'available';
			if (systemStatus.redis !== 'connected' && systemStatus.db === 'connected') return 'limited';

			return 'unavailable';
		}
	},
	HealthCheck: {
		timestamp: () => {
			return new Date().toISOString();
		},
		internal: () => {
			return true;
		},
		domains: () => {
			return true;
		}
	},
	Query: {
		healthCheck: () => {
			return true;
		}
	}
}