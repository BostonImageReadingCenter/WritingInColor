import {
	origin,
	SECRET_KEY_PAIR,
	ACCESS_TOKEN_EXPIRATION_TIME,
	REFRESH_TOKEN_EXPIRATION_TIME,
	SECRET_PRIVATE_KEY,
	SECRET_PUBLIC_KEY,
} from "./constants.js";
import { Pool } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import {
	uint8ArrayToBase64,
	base64ToUint8Array,
	Uint8ArrayFromHexString,
} from "./utils";
import {
	beginPasskeyRegistration,
	beginPasskeyAuthentication,
} from "./passkeys";
import { sign, verify, decode } from "jwt-falcon";
import { falcon } from "falcon-crypto";
import {
	JWT_REGISTERED_CLAIMS,
	User,
	LoginStatus,
	Passkey,
	RevokedRefreshToken,
	Action,
	LoginInitializationOptions,
	LoginData,
	LoginDataReturn,
	SetCookieOptions,
	UserRole,
} from "./types.js";
import { base64URLStringToBuffer } from "@simplewebauthn/browser";
import { FastifyReply, FastifyRequest } from "fastify";
import {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
	PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import { Database } from "./db.js";
import { generateSalt, hashPassword } from "./security.js";

// JWTs
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

// Cookie signing
export async function signCookie(value: string) {
	let signed = await falcon.sign(Buffer.from(value), SECRET_PRIVATE_KEY);
	let as_text = uint8ArrayToBase64(signed);
	return as_text;
}

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

// Login
export async function revokeRefreshToken(
	refresh_token_id: Buffer,
	refresh_token_expiration_time: Date,
	database: Database
) {
	try {
		// Add to revoked_refresh_tokens table
		database.query(
			"INSERT IGNORE INTO revoked_refresh_tokens (token_id, expires_at) VALUES (?, ?)",
			[refresh_token_id, refresh_token_expiration_time]
		);
	} catch (e) {
		// Already revoked.
	}
}
export async function createRefreshToken(userID: Buffer, roles: number[]) {
	let refreshToken: JWT_REGISTERED_CLAIMS = {
		iss: origin,
		aud: origin,
		sub: userID,
		iat: Date.now(),
		exp: Date.now() + REFRESH_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
		rls: roles,
	};
	return refreshToken;
}
export async function createAccessToken(
	refreshToken: JWT_REGISTERED_CLAIMS,
	database: Database,
	rls?: number[]
) {
	if (!rls) {
		// Get roles. Don't use cached value because roles may have been updated.
		let roles: any = await database.getUserRoles(refreshToken.sub);
		rls = roles.map((role: UserRole) => role.role_id);
	}
	let accessToken: JWT_REGISTERED_CLAIMS = {
		iss: refreshToken.iss,
		aud: refreshToken.aud,
		sub: refreshToken.sub,
		rls: refreshToken.rls,
		iat: Date.now(),
		exp: Date.now() + ACCESS_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
	};

	return accessToken;
}
export async function createAccessTokenIfNotRevoked(
	database: Database,
	decoded_refresh_token: JWT_REGISTERED_CLAIMS
): Promise<false | JWT_REGISTERED_CLAIMS> {
	if (!decoded_refresh_token || !decoded_refresh_token.jti) return false;
	const revoked = (
		await database.query(
			"SELECT * FROM revoked_refresh_tokens WHERE token_id = ?",
			[Buffer.from(uuidParse(decoded_refresh_token.jti))]
		)
	)[0] as RevokedRefreshToken[];
	if (revoked.length > 0) return false;

	return createAccessToken(decoded_refresh_token, database);
}
export async function loginUser(
	userID: Buffer,
	database: Database
): Promise<SetCookieOptions[]> {
	let roles: any = await database.getUserRoles(userID);
	let role_ids = roles.map((role: UserRole) => role.role_id);
	let refreshToken = await createRefreshToken(userID, role_ids);
	let accessToken = await createAccessToken(refreshToken, database, role_ids);

	return [
		{
			name: "refreshToken",
			value: await CreateJWT(refreshToken),
			expires: new Date(refreshToken.exp),
		},
		{
			name: "accessToken",
			value: await CreateJWT(accessToken),
			expires: new Date(accessToken.exp),
		},
	];
}
export async function loginUserWithPasskey(
	database: Database,
	assertionResponse: AuthenticationResponseJSON,
	verifyAuthentication: Function
): Promise<false | SetCookieOptions[]> {
	const passkey = (
		await database.query("SELECT * FROM passkeys WHERE credential_id = ?", [
			assertionResponse.rawId,
		])
	)[0][0];
	const verification = await verifyAuthentication(assertionResponse, passkey);
	if (verification.verified && verification.authenticationInfo) {
		let userID = Buffer.from(
			base64URLStringToBuffer(assertionResponse.response.userHandle)
		);
		console.log("\n\n\x1b[32;1mAuthentication Successful!\x1b[0m\n\n");
		return loginUser(userID, database);
	} else {
		console.log("\n\n\x1b[31;1mAuthentication Failed!\x1b[0m\n\n");
		// TODO: Handle verification failure
		return false;
	}
}

export async function* login(
	database: Database,
	options: LoginInitializationOptions
): AsyncGenerator<LoginData, LoginData, LoginDataReturn> {
	let authenticationOptions: PublicKeyCredentialRequestOptionsJSON;
	let verifyAuthentication: Function;
	let result: LoginDataReturn;

	let actions: Action[] = [
		{
			action: "collect",
			type: "email",
			header: "Please enter your email.",
			message: "We need your email to be sure its you.",
		},
	];
	if (options.supportsWebAuthn) {
		let x = await beginPasskeyAuthentication();
		authenticationOptions = x.WebAuthnOptions;
		verifyAuthentication = x.verify;
		actions.push({
			action: "show-use-passkey-button",
		});
		actions.push({
			action: "set-authentication-options",
			authenticationOptions,
		});
		if (options.supportsConditionalUI)
			actions.push({
				action: "init-conditional-ui",
			});
	}
	result = yield {
		actions,
	};
	if (options.supportsWebAuthn && result.json.assertionResponse) {
		let assertionResponse: AuthenticationResponseJSON =
			result.json.assertionResponse;
		let success = await loginUserWithPasskey(
			database,
			assertionResponse,
			verifyAuthentication
		);
		console.log("Login with passkey (conditional ui)", success !== false);
		return {
			data: { success: success !== false },
			setCookies: success || [],
			actions: [
				{
					action: "redirect",
					path: "/my-profile",
				}, // TODO: redirect only if successful
			],
		};
	} else {
		let email = result.json.value;
		let user = await database.getUserByEmail(email);
		if (!user) {
			// User does not exist
			result = yield {
				actions: [
					{
						action: "collect",
						type: "binary",
						header: "Create an Account?",
						message:
							"You don't have an account yet. Would you like to create one?",
					},
				],
			};

			if (!result.json.value)
				return {
					actions: [{ action: "exit" }],
				};
			let userID = Buffer.from(uuidParse(uuidv4()));
			let passkeys: Passkey[] = [];
			if (options.supportsWebAuthn) {
				let passkeyRegistrationSucceeded = false;
				const { WebAuthnOptions, verify } = await beginPasskeyRegistration(
					email,
					userID
				);
				result = yield {
					actions: [
						{
							action: "register-passkey",
							WebAuthnOptions,
						},
					],
				};
				let attestationResponse: RegistrationResponseJSON =
					result.json.attestationResponse;
				const verification = await verify(attestationResponse);
				if (verification.verified && verification.registrationInfo) {
					passkeyRegistrationSucceeded = true;
					const { credentialPublicKey, credentialID, counter } =
						verification.registrationInfo;
					const transportsString = JSON.stringify(
						attestationResponse.response.transports
					);
					passkeys.push({
						id: Buffer.from(uuidParse(uuidv4())),
						credential_id: credentialID,
						public_key: uint8ArrayToBase64(credentialPublicKey),
						counter: counter,
						transports: transportsString,
					});
				} else {
					// TODO: Handle verification failure
				}
				yield {
					actions: [],
					data: {
						success: passkeyRegistrationSucceeded,
					},
				};
			}
			let salt = generateSalt();
			result = yield {
				actions: [
					{
						action: "collect",
						type: "create-password",
						header: "Create Password",
						message: "Create a password for your account.",
					},
				],
			};
			let passwordHash = hashPassword(result.json.value, salt);
			console.log(passwordHash.byteLength);
			await database.createUser({
				user: {
					id: userID,
					salt: salt,
					password: passwordHash,
				},
				emails: [email],
				passkeys,
			});
			let setCookies = await loginUser(userID, database);
			return {
				data: { success: true },
				setCookies,
				actions: [
					{
						action: "redirect",
						path: "/my-profile",
					},
				],
			};
		}
		if (options.supportsWebAuthn) {
			const passkeys = await database.getPasskeysByUserID(user.id);
			if (passkeys.length !== 0) {
				// Make sure the user has a passkey
				authenticationOptions.allowCredentials = passkeys.map((passkey) => ({
					type: "public-key",
					id: passkey.credential_id,
					transports: JSON.parse(passkey.transports),
				}));
				result = yield {
					actions: [
						{
							action: "authenticate-passkey",
							WebAuthnOptions: authenticationOptions,
						},
						{
							action: "show-use-password-button",
						},
					],
				};
				let assertionResponse = result.json.assertionResponse;
				let success = await loginUserWithPasskey(
					database,
					assertionResponse,
					verifyAuthentication
				);
				return {
					data: { success: success !== false },
					setCookies: success || [],
					actions: [
						{
							action: "redirect",
							path: "/my-profile",
						},
					],
				};
			}
		}
		result = yield {
			actions: [
				{
					action: "collect",
					type: "get-password",
					header: "Enter Password",
					message: "Enter your password.",
				},
			],
		};
		let passwordHash = hashPassword(result.json.value, user.salt);
		if (passwordHash.equals(user.password)) {
			let setCookies = await loginUser(user.id, database);
			return {
				data: { success: true },
				setCookies,
				actions: [
					{
						action: "redirect",
						path: "/my-profile",
					},
				],
			};
		}
		// Wrong password
		return {
			data: { success: false },
			actions: [{ action: "exit" }],
		};
	}
}

export async function isLoggedIn(
	request: FastifyRequest,
	database: Database,
	createNewIfInvalid = true
): Promise<LoginStatus> {
	let errors = [];
	try {
		let jwt = request.cookies.accessToken;
		if (!jwt) throw "No access token";

		let verified = await VerifyJWT(jwt);
		if (!verified) throw "Fraudulent access token";

		let payload = await DecodeJWT(jwt);
		if (!payload) throw "Access token malformed";

		let validity = isValidJWT(payload);
		if (!validity) throw "Invalid access token";

		return { payload, valid: true, setCookies: [], errors };
	} catch (e) {
		errors.push(e);
	}

	// If it gets here, its invalid, so we may need to refresh it.
	try {
		let setCookies: SetCookieOptions[] = [];
		let refreshToken = request.cookies.refreshToken;
		if (!refreshToken) throw "No refresh token";

		let verified = await VerifyJWT(refreshToken);
		if (!verified) throw "Fraudulent refresh token";

		let payload = await DecodeJWT(refreshToken);
		if (!payload) throw "Refresh token malformed";

		let validity = isValidJWT(payload);
		if (!validity) throw "Invalid refresh token";
		if (createNewIfInvalid) {
			let newAccessToken = await createAccessTokenIfNotRevoked(
				database,
				payload
			);
			if (newAccessToken === false) throw "Refresh token revoked";
			setCookies.push({
				name: "accessToken",
				value: await CreateJWT(newAccessToken),
				expires: new Date(newAccessToken.exp),
			});
		}

		return {
			payload,
			valid: true,
			setCookies,
			errors,
		};
	} catch (e) {
		errors.push(e);
	}
	return { payload: null, valid: false, setCookies: [], errors };
}
