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
			return (systemStatus.db === 'connected');
		},
		session: (_, __, {systemStatus}) => {
			return (systemStatus.redis === 'connected');
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