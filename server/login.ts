import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	generateRegistrationOptions,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array, isoBase64URL } from "@simplewebauthn/server/helpers";
import { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import {
	rpID,
	rpName,
	origin,
	SECRET_KEY_PAIR,
	JWT_EXPIRATION_TIME,
} from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import {
	uint8ArrayToBase64,
	Uint8ArrayFromHexString,
	base64ToUint8Array,
} from "./utils";
import {
	beginPasskeyRegistration,
	beginPasskeyAuthentication,
} from "./passkeys";
import { SignJWT, jwtVerify } from "jose";
import Falcon from "falcon-crypto";
import { sign, verify, decode } from "jwt-falcon";

const JWT_REGISTERED_CLAIMS = {
	iss: origin, // Identifies the principal that issued the JWT. It specifies the issuer of the token.
	sub: "user", // Identifies the principal that is the subject of the JWT. It typically represents the user or entity associated with the token.
	aud: origin, // Specifies the recipients that the JWT is intended for. It limits the usability of the token to a particular audience.
	exp: 1624837200, // Specifies the expiration time after which the JWT should not be accepted for processing. It provides a time limit on the token’s validity.
	nbf: 1624830000, // Specifies the time before which the JWT must not be accepted for processing. It indicates the time when the token becomes valid.
	iat: 1624833600, // Specifies the time at which the JWT was issued. It can be used to determine the age of the token.
	jti: uuidv4(), // Provides a unique identifier for the JWT. It can be used to prevent JWT reuse and to maintain token uniqueness.
};

//PQC: https://dev.to/johnb8005/a-practical-approach-to-quantum-resistant-jwts-9ob
async function CreateJWT(payload, expiration_time = 1734480000000) {
	const token = await sign(
		{
			iss: origin,
			aud: origin,
			iat: Date.now(),
			exp: expiration_time,
			jti: uuidv4(),
			...payload,
		},
		SECRET_KEY_PAIR.privateKey
	);
	console.log(token);
	return token;
}
CreateJWT({
	a: "c",
});
async function loginUserWithPasskey(
	promisePool,
	assertionResponse,
	verifyAuthentication
) {
	const [[passkey]] = await promisePool.query(
		"SELECT * FROM passkeys WHERE credential_id = ?",
		[assertionResponse.rawId]
	);
	const verification = await verifyAuthentication(assertionResponse, passkey);
	if (verification.verified && verification.authenticationInfo) {
		console.log("\n\n\x1b[32;1mAuthentication Successful!\x1b[0m\n\n");
		// TODO: Continue with authentication
		return true;
	} else {
		console.log("\n\n\x1b[31;1mAuthentication Failed!\x1b[0m\n\n");
		// TODO: Handle verification failure
		return false;
	}
}

async function* login(promisePool, options) {
	let authenticationOptions, verifyAuthentication;
	if (options.supportsWebAuthn) {
		let x = await beginPasskeyAuthentication();
		authenticationOptions = x.WebAuthnOptions;
		verifyAuthentication = x.verify;
	}
	let data = yield {
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
	if (options.supportsWebAuthn && data.assertionResponse) {
		let assertionResponse = data.assertionResponse;
		let success = await loginUserWithPasskey(
			promisePool,
			assertionResponse,
			verifyAuthentication
		);
		return {
			success,
		};
	} else {
		let email = data.value;
		let [[user]] = await promisePool.query(
			"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
			[email]
		);
		if (!user) {
			// User does not exist
			let consent = yield {
				action: "collect",
				type: "binary",
				header: "Create an Account?",
				message: "You don't have an account yet. Would you like to create one?",
			};
			if (!consent.value)
				return {
					action: "exit",
				};
			let userID = uuidv4();
			let userIDBuffer = Buffer.from(uuidParse(userID));
			if (options.supportsWebAuthn) {
				let passkeyRegistrationSucceeded = false;
				const { WebAuthnOptions, verify } = await beginPasskeyRegistration(
					email,
					userID
				);
				let { attestationResponse } = yield {
					action: "register-passkey",
					WebAuthnOptions,
				};
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
								userIDBuffer,
							]);

							// Add email
							await connection.query(
								"INSERT INTO emails (user_id, email) VALUES (?, ?)",
								[userIDBuffer, email]
							);

							// Save Passkey
							await connection.query(
								"INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?, ?)",
								[
									Buffer.from(uuidParse(uuidv4())),
									userIDBuffer,
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
			const [passkeys] = await promisePool.query(
				"SELECT * FROM passkeys WHERE user_id = ?",
				[user.id]
			);
			authenticationOptions.allowCredentials = passkeys.map((passkey) => ({
				type: "public-key",
				id: passkey.credential_id,
				transports: JSON.parse(passkey.transports),
			}));
			let { assertionResponse } = yield {
				action: "authenticate-passkey",
				WebAuthnOptions: authenticationOptions,
			};
			let success = await loginUserWithPasskey(
				promisePool,
				assertionResponse,
				verifyAuthentication
			);
			return {
				success,
			};
		} else {
			// Password only login
		}
	}
}
export { login };
