import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	generateRegistrationOptions,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array, isoBase64URL } from "@simplewebauthn/server/helpers";
import { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import { rpID, rpName, origin } from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import { uint8ArrayToBase64 } from "./utils";
import {
	beginPasskeyRegistration,
	beginPasskeyAuthentication,
} from "./passkeys";

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
