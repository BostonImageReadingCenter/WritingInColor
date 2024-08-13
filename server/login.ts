import {
	origin,
	SECRET_KEY_PAIR,
	ACCESS_TOKEN_EXPIRATION_TIME,
	REFRESH_TOKEN_EXPIRATION_TIME,
	SECRET_PRIVATE_KEY,
	SECRET_PUBLIC_KEY,
	ToS,
	passwordRequirements,
} from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import { uint8ArrayToBase64, base64ToUint8Array, checkPassword } from "./utils";
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
	LoginDataReturnPacket,
	InputLoginDataReturn,
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
import validator from "validator";

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
export async function createRefreshToken(user: User) {
	let refreshToken: JWT_REGISTERED_CLAIMS = {
		iss: origin,
		aud: origin,
		sub: user.id,
		iat: Date.now(),
		exp: Date.now() + REFRESH_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
		rls: user.role_ids,
		fnm: user.first_name,
		lnm: user.last_name,
	};
	return refreshToken;
}
export async function createAccessToken(
	refreshToken: JWT_REGISTERED_CLAIMS,
	database: Database,
	user?: User
) {
	if (!user) {
		let user: User = await database.getUserById(refreshToken.sub);
		// Get roles. Don't use cached value because roles may have been updated.
		let roles: any = await database.getUserRoles(refreshToken.sub);
		user.setRoles(roles.map((role) => role.role_id));
	}
	let accessToken: JWT_REGISTERED_CLAIMS = {
		iss: refreshToken.iss,
		aud: refreshToken.aud,
		sub: refreshToken.sub,
		iat: Date.now(),
		exp: Date.now() + ACCESS_TOKEN_EXPIRATION_TIME,
		jti: uuidv4(),
		rls: user.role_ids,
		fnm: user.first_name,
		lnm: user.last_name,
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
	let user = await database.getUserById(userID);
	user.setRoles(roles.map((role) => role.role_id));
	let refreshToken = await createRefreshToken(user);
	let accessToken = await createAccessToken(refreshToken, database, user);

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
		return false;
	}
}
function getReturn(ret: LoginDataReturn[], type: string) {
	return ret.filter((x) => x.type === type)?.[0];
}

function getInputValue(ret: LoginDataReturn[], input: string) {
	return (getReturn(ret, "input") as InputLoginDataReturn)?.values?.[input];
}

export async function* login(
	database: Database,
	options: LoginInitializationOptions
): AsyncGenerator<LoginData, LoginData, LoginDataReturnPacket> {
	let authenticationOptions: PublicKeyCredentialRequestOptionsJSON;
	let verifyAuthentication: Function;
	let result: LoginDataReturnPacket;

	// conditionalUIOnly means that there is no login form.
	let actions: Action[] = [];
	if (!options.conditionalUIOnly) {
		actions.push({
			action: "collect",
			types: [{ type: "email" }],
			header: "Log In",
			message:
				"By continuing, you agree to the Terms of Use and Privacy Policy.",
		});
	}

	if (options.supportsWebAuthn) {
		let x = await beginPasskeyAuthentication();
		authenticationOptions = x.WebAuthnOptions;
		verifyAuthentication = x.verify;
		actions.push({
			action: "set-authentication-options",
			authenticationOptions,
		});
		if (!options.conditionalUIOnly) {
			actions.push({
				action: "show-use-passkey-button",
			});
		}
		if (options.supportsConditionalUI)
			actions.push({
				action: "init-conditional-ui",
			});
	}
	result = yield {
		actions,
	};
	let assertionResponse: AuthenticationResponseJSON | undefined =
		result.return.filter((x) => x.type === "assertion-response")?.[0]
			?.assertionResponse;
	if (options.supportsWebAuthn && assertionResponse) {
		let success = await loginUserWithPasskey(
			database,
			assertionResponse,
			verifyAuthentication
		);
		let actions = [];
		if (success)
			actions.push({
				action: "redirect",
				path: "/my-profile",
			});
		else
			actions.push({
				action: "error",
				errors: ["Invalid passkey"],
			});
		return {
			data: { success: success !== false },
			setCookies: success || [],
			actions,
		};
	} else if (!options.conditionalUIOnly) {
		let email = result.return.filter((x) => x.type === "input")?.[0]?.values
			.email;
		while (!validator.isEmail(email)) {
			result = yield {
				actions: [
					{
						action: "error",
						errors: ["Please enter a valid email."],
					},
					{
						action: "collect",
						types: [{ type: "email" }],
						header: "Please enter your email.",
						message: "We need your email to be sure its you.",
					},
				],
			};
			email = result.return.filter((x) => x.type === "input")?.[0]?.values
				.email;
		}
		let user = await database.getUserByEmail(email);
		if (!user) {
			// User does not exist
			result = yield {
				actions: [
					{
						action: "collect",
						types: [{ type: "binary", submits: true }],
						header: "Sign Up",
						message: `No account found for ${email}. Do you want to create one?`,
					},
				],
			};

			if (!result.return.filter((x) => x.type === "input")?.[0].values.binary)
				return {
					actions: [{ action: "reload" }],
				};

			result = yield {
				actions: [
					{
						action: "collect",
						types: [
							{ type: "binary", submits: true },
							{
								type: "show-document",
								html: ToS,
								required: true,
							},
						],
						header: "Do you agree to the Terms of Service?",
						message: "",
					},
				],
			};
			if (!result.return.filter((x) => x.type === "input")?.[0]?.values.binary)
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
					result.return.filter((x) => x.type === "attestation-response")?.[0]
						.attestationResponse;
				const verification = attestationResponse
					? await verify(attestationResponse)
					: undefined;
				if (
					verification &&
					verification.verified &&
					verification.registrationInfo
				) {
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
				}
				yield {
					actions: [],
					data: {
						success: passkeyRegistrationSucceeded,
					},
				};
			}
			let salt = generateSalt();
			let passwordValue: string;
			let errors = [];
			while (true) {
				result = yield {
					actions: [
						{
							action: "error",
							errors,
						},
						{
							action: "collect",
							types: [
								{ type: "create-password", requirements: passwordRequirements },
							],
							header: "Create a Password",
							message: "",
						},
					],
				};
				passwordValue = result.return.filter((x) => x.type === "input")?.[0]
					.values["create-password"];
				errors = checkPassword(passwordValue, passwordRequirements);
				if (errors.length === 0) break;
			}
			let passwordHash = hashPassword(passwordValue, salt);
			await database.createUser({
				user: new User({
					id: userID,
					salt: salt,
					password: passwordHash,
				}),
				emails: [{ email, is_primary: true }],
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
		// User exists
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
				let assertionResponse = result.return.filter(
					(x) => x.type === "assertion-response"
				)?.[0].assertionResponse;
				let success = await loginUserWithPasskey(
					database,
					assertionResponse,
					verifyAuthentication
				);
				let actions = [];
				if (success) {
					actions.push({
						action: "redirect",
						path: "/my-profile",
					});
				} else {
					actions = actions.concat([
						{
							action: "error",
							errors: ["Invalid passkey"],
						},
						{
							action: "reload",
						},
					]);
				}
				return {
					data: { success: success !== false },
					setCookies: success || [],
					actions,
				};
			}
		}
		let errors = [];
		while (true) {
			result = yield {
				actions: [
					{
						action: "error",
						errors,
					},
					{
						action: "collect",
						types: [{ type: "get-password" }],
						header: "Enter Password",
						message: "Enter your password.",
					},
				],
			};
			errors = [];
			let passwordHash = hashPassword(
				result.return.filter((x) => x.type === "input")?.[0].values[
					"get-password"
				],
				user.salt
			);
			if (passwordHash.equals(user.password)) {
				// Password is correct
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

			// Password is incorrect
			errors.push("Invalid password");
		}
	}
}
export async function* addPasskey(database: Database, userID: Buffer) {
	let result: LoginDataReturnPacket;
	let user: User = await database.getUserById(userID);
	let passkeys: Passkey[] = await database.getPasskeysByUserID(user.id);
	let emails = await database.getEmailsByUserID(user.id);
	user.passkeys = passkeys;
	user.emails = emails;
	let primaryEmail =
		user.emails.find((email) => email.is_primary) ?? user.emails[0];
	let passkeyRegistrationSucceeded = false;
	const { WebAuthnOptions, verify } = await beginPasskeyRegistration(
		primaryEmail.email,
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
	let attestationResponse: RegistrationResponseJSON = result.return.filter(
		(x) => x.type === "attestation-response"
	)?.[0].attestationResponse;
	const verification = attestationResponse
		? await verify(attestationResponse)
		: undefined;
	if (verification && verification.verified && verification.registrationInfo) {
		passkeyRegistrationSucceeded = true;
		const { credentialPublicKey, credentialID, counter } =
			verification.registrationInfo;
		const transportsString = JSON.stringify(
			attestationResponse.response.transports
		);
		let passkey = {
			id: Buffer.from(uuidParse(uuidv4())),
			credential_id: credentialID,
			public_key: uint8ArrayToBase64(credentialPublicKey),
			counter: counter,
			transports: transportsString,
		};
		user.passkeys.push(passkey);
		await database.addPasskeyToUser(user.id, passkey);
	}
	return {
		actions: [],
		data: {
			success: passkeyRegistrationSucceeded,
		},
	};
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
