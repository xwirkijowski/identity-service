import {GraphQLError} from "graphql";


export const validate = {
	/**
	 * Validate if defined and non-null
	 *
	 * @param	input					Input field
	 * @return 	Boolean|GraphQLError	If valid return true, if invalid throw input error.
	 */
	NN: (input) => {
		if (input !== undefined && input !== null) return true;
		throw new GraphQLError('Input is required', { extensions: { code: 'BAD_USER_INPUT' } });
	}
}