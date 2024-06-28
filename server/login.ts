import {
	origin,
	SECRET_KEY_PAIR,
	ACCESS_TOKEN_EXPIRATION_TIME,
	REFRESH_TOKEN_EXPIRATION_TIME,
	SECRET_PRIVATE_KEY,
	SECRET_PUBLIC_KEY,
} from "./constants.js";
import { Pool as PromisePool } from "mysql2/promise";

import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import { uint8ArrayToBase64, base64ToUint8Array } from "./utils";
import {
	beginPasskeyRegistration,
	beginPasskeyAuthentication,
} from "./passkeys";
import { sign, verify, decode } from "jwt-falcon";
import { falcon } from "falcon-crypto";
import { JWT_REGISTERED_CLAIMS, User, LoginStatus, Passkey } from "./types.js";
import { UserService } from "./db.js";
import { base64URLStringToBuffer } from "@simplewebauthn/browser";
import { FastifyReply, FastifyRequest } from "fastify";
import {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/typescript-types";

export async function CreateJWT(payload: JWT_REGISTERED_CLAIMS) {
	const jwt: string = await sign(
		{
			iss: payload.iss || origin,
			aud: payload.aud || origin,
			iat: payload.iat || Date.now(),
			jti: payload.jti || uuidv4(),
			...payload,
		} as JWT_REGISTERED_CLAIMS,
		SECRET_KEY_PAIR.privateKey
	);
	return jwt;
}

export async function VerifyJWT(jwt: string): Promise<boolean> {
	return await verify(jwt, SECRET_PUBLIC_KEY);
}

export async function DecodeJWT(jwt: string): Promise<JWT_REGISTERED_CLAIMS> {
	return await decode(jwt);
}

export function isValidJWT(jwt: JWT_REGISTERED_CLAIMS) {
	let now = Date.now();
	if (jwt.exp && jwt.exp <= now) return false;
	if (jwt.nbf && jwt.nbf > now) return false;

	return true;
}

export async function signCookie(value: string) {
	let signed = await falcon.sign(Buffer.from(value), SECRET_PRIVATE_KEY);
	let as_text = uint8ArrayToBase64(signed);
	return as_text;
}
/**
 * unsign a cookie
 * @param value Base64 encoded
 * @returns Promise<{verified: boolean, text: string | null}>
 */
export async function unsignCookie(value: string): Promise<{
	verified: boolean;
	text: string | null;
}> {
	try {
		const result = await falcon.open(
			base64ToUint8Array(value),
			SECRET_PUBLIC_KEY
		);
		const as_text = new TextDecoder().decode(result);
		return {
			verified: true,
			text: as_text,
		};
	} catch (e) {
		return {
			verified: false,
			text: null,
		};
	}
}
export async function isLoggedIn(
	request: FastifyRequest,
	promisePool: PromisePool
): Promise<LoginStatus> {
	try {
		let jwt = request.cookies.accessToken;
		if (!jwt) throw "No access token";

		let verified = await VerifyJWT(jwt);
		if (!verified) throw "Fraudulant access token";

		let payload = await DecodeJWT(jwt);
		if (!payload) throw "Access token malformed";

		let validity = isValidJWT(payload);
		if (!validity) throw "Invalid access token";

		return { payload, valid: true, setCookies: {} };
	} catch (e) {}

	// If it gets here, its invalid, so we may need to refresh it.
	try {
		let refreshToken = request.cookies.refreshToken;
		if (!refreshToken) throw "No refresh token";

		let verified = await VerifyJWT(refreshToken);
		if (!verified) throw "Fraudulant refresh token";

		let payload = await DecodeJWT(refreshToken);
		if (!payload) throw "Refresh token malformed";

		let validity = isValidJWT(payload);
		if (!validity) throw "Invalid refresh token";

		let newAccessToken = await createAccessTokenIfNotRevoked(
			promisePool,
			payload
		);
		if (newAccessToken === false) throw "Refresh token revoked";

		return {
			payload,
			valid: true,
			setCookies: {
				accessToken: {
					value: await CreateJWT(newAccessToken),
					expires: newAccessToken.exp,
				},
			},
		};
	} catch (e) {}
	return { payload: null, valid: false, setCookies: {} };
}
export async function createRefreshToken(userID: Buffer, is_admin = false) {
	let refreshToken: JWT_REGISTERED_CLAIMS = {
		iss: origin,
		aud: origin,
		sub: userID,
		iat: Date.now(),
		exp: Date.now() + REFRESH_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
		adm: true, //is_admin,
	};
	return refreshToken;
}
export async function createAccessToken(refreshToken: JWT_REGISTERED_CLAIMS) {
	let accessToken: JWT_REGISTERED_CLAIMS = {
		iss: refreshToken.iss,
		aud: refreshToken.aud,
		sub: refreshToken.sub,
		adm: refreshToken.adm,
		iat: Date.now(),
		exp: Date.now() + ACCESS_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
	};

	return accessToken;
}
export async function createAccessTokenIfNotRevoked(
	promisePool: PromisePool,
	decoded_refresh_token: JWT_REGISTERED_CLAIMS
): Promise<false | JWT_REGISTERED_CLAIMS> {
	if (!decoded_refresh_token || !decoded_refresh_token.jti) return false;
	const revoked = await promisePool.query(
		"SELECT * FROM revoked_refresh_tokens WHERE token_id = ?",
		[decoded_refresh_token.jti]
	)[0];
	if (revoked.length > 0) return false;

	return createAccessToken(decoded_refresh_token);
}
export async function loginUser(userID: Buffer) {
	let refreshToken = await createRefreshToken(userID);
	let accessToken = await createAccessToken(refreshToken);

	return {
		refreshToken: {
			value: await CreateJWT(refreshToken),
			expires: refreshToken.exp,
		},
		accessToken: {
			value: await CreateJWT(accessToken),
			expires: accessToken.exp,
		},
	};
}
export async function loginUserWithPasskey(
	promisePool: PromisePool,
	assertionResponse: AuthenticationResponseJSON,
	verifyAuthentication: Function
) {
	// @ts-ignore
	const [[passkey]] = await promisePool.query(
		"SELECT * FROM passkeys WHERE credential_id = ?",
		[assertionResponse.rawId]
	);
	const verification = await verifyAuthentication(assertionResponse, passkey);
	if (verification.verified && verification.authenticationInfo) {
		let userID = Buffer.from(
			base64URLStringToBuffer(assertionResponse.response.userHandle)
		);
		// const user = await UserService.getById(userID, promisePool);
		console.log("\n\n\x1b[32;1mAuthentication Successful!\x1b[0m\n\n");
		return loginUser(userID);
	} else {
		console.log("\n\n\x1b[31;1mAuthentication Failed!\x1b[0m\n\n");
		// TODO: Handle verification failure
		return false;
	}
}

export async function* login(promisePool: PromisePool, options) {
	let authenticationOptions, verifyAuthentication;
	if (options.supportsWebAuthn) {
		let x = await beginPasskeyAuthentication();
		authenticationOptions = x.WebAuthnOptions;
		verifyAuthentication = x.verify;
	}
	let { request, reply, json } = yield {
		actions: [
			{
				action: "collect",
				type: "email",
				header: "Please enter your email.",
				message: "We need your email to be sure its you.",
			},
			{
				action: "init-conditional-ui",
			},
		],
		authenticationOptions,
	};
	if (options.supportsWebAuthn && json.assertionResponse) {
		let assertionResponse: AuthenticationResponseJSON = json.assertionResponse;
		let success = await loginUserWithPasskey(
			promisePool,
			assertionResponse,
			verifyAuthentication
		);
		return {
			success: success !== false,
			setCookies: success || {},
		};
	} else {
		let email = json.value;
		let user = await UserService.getByEmail(email, promisePool);
		if (!user) {
			// User does not exist
			let {
				request,
				reply,
				json: consent,
			} = yield {
				action: "collect",
				type: "binary",
				header: "Create an Account?",
				message: "You don't have an account yet. Would you like to create one?",
			};
			if (!consent.value)
				return {
					action: "exit",
				};
			let userID = Buffer.from(uuidParse(uuidv4()));
			if (options.supportsWebAuthn) {
				let passkeyRegistrationSucceeded = false;
				const { WebAuthnOptions, verify } = await beginPasskeyRegistration(
					email,
					userID
				);
				let { request, reply, json } = yield {
					action: "register-passkey",
					WebAuthnOptions,
				};
				let attestationResponse: RegistrationResponseJSON =
					json.attestationResponse;
				const verification = await verify(attestationResponse);
				if (verification.verified && verification.registrationInfo) {
					const { credentialPublicKey, credentialID, counter } =
						verification.registrationInfo;
					const transportsString = JSON.stringify(
						attestationResponse.response.transports
					);
					// Use a single transaction to ensure atomicity
					await promisePool.getConnection().then(async (connection) => {
						await connection.beginTransaction();
						try {
							// Create user
							await connection.query("INSERT INTO users (id) VALUES (?)", [
								userID,
							]);

							// Add email
							await connection.query(
								"INSERT INTO emails (user_id, email) VALUES (?, ?)",
								[userID, email]
							);

							// Save Passkey
							await connection.query(
								"INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?, ?)",
								[
									Buffer.from(uuidParse(uuidv4())),
									userID,
									credentialID,
									uint8ArrayToBase64(credentialPublicKey),
									counter,
									transportsString,
								]
							);

							await connection.commit();
						} catch (error) {
							await connection.rollback(); // Undo the changes in case of an error.
							throw error;
						} finally {
							connection.release();
						}
					});
				} else {
					// TODO: Handle verification failure
				}
				yield {
					action: "data",
					for: "passkey-registration",
					success: passkeyRegistrationSucceeded,
				};
			} else {
				// Password only registration
				// TODO
			}

			// TODO: Continue with registration, backup password, etc...
		}
		if (options.supportsWebAuthn) {
			const passkeys: Passkey[] = await promisePool.query(
				"SELECT * FROM passkeys WHERE user_id = ?",
				[user.id]
			)[0];
			authenticationOptions.allowCredentials = passkeys.map((passkey) => ({
				type: "public-key",
				id: passkey.credential_id,
				transports: JSON.parse(passkey.transports),
			}));
			let {
				request,
				reply,
				json: { assertionResponse },
			} = yield {
				action: "authenticate-passkey",
				WebAuthnOptions: authenticationOptions,
			};
			let success = await loginUserWithPasskey(
				promisePool,
				assertionResponse,
				verifyAuthentication
			);
			return {
				success: success !== false,
				setCookies: success || {},
			};
		} else {
			// TODO: Password only login
		}
	}
}
