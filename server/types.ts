export interface JWT_REGISTERED_CLAIMS {
	/**
	 * Identifies the principal that issued the JWT. It specifies the issuer of the token.
	 */
	iss?: string;
	/**
	 * Identifies the principal that is the subject of the JWT. It typically represents the user or entity associated with the token.
	 */
	sub?: string | number | Buffer;
	/**
	 * Specifies the recipients that the JWT is intended for. It limits the usability of the token to a particular audience.
	 */
	aud?: string;
	/**
	 * Specifies the expiration time after which the JWT should not be accepted for processing. It provides a time limit on the token’s validity.
	 */
	exp?: number;
	/**
	 * Specifies the time before which the JWT must not be accepted for processing. It indicates the time when the token becomes valid.
	 */
	nbf?: number;
	/**
	 * Specifies the time at which the JWT was issued. It can be used to determine the age of the token.
	 */
	iat?: number;
	/**
	 * Provides a unique identifier for the JWT. It can be used to prevent JWT reuse and to maintain token uniqueness.
	 */
	jti?: string;
	/**
	 * Custom claim asserting whether the user is an administrator.
	 */
	adm?: boolean;
	/**
	 * Custom claim. Recommended that the key length is 3 characters long.
	 */
	[key: string]: any;
}

export interface User {
	id: Buffer;
	salt: string | null;
	password: string | null;
	created_at: Date;
}
