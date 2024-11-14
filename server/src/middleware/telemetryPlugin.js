import {globalLogger as log} from './../utilities/log.js';

const telemetryPlugin = () => {
	return {
		requestDidStart: async ({contextValue}) => {


            return {
				didResolveSource: async() => {

				},

				parsingDidStart: async() => {

				},

				validationDidStart: async() => {

				},

				didResolveOperation: async() => {

				},

				responseForOperation: async() => {

				},

				executionDidStart: async() => {

				},

				didEncounterErrors: async() => {

				},

                willSendResponse: async ({contextValue}) => {
                    const telemetryStop = performance.now();

					log.request({
						time: (telemetryStop - contextValue.internal.telemetryStart).toFixed(2),
						requestId: contextValue.internal.requestId,
						timestampStart: contextValue.internal.timestampStart,
						timestampEnd: new Date().toISOString(),
						userId: contextValue.session?.userId
					})
                }
			}

		},

	}

}

export default telemetryPlugin;