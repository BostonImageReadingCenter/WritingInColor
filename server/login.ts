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

async function* login(promisePool, options) {
	let choice = yield {
		action: "collect",
		type: "choice",
		options: ["Login with Email", "Login with Passkey"],
		header: "Login",
		message: "Which method would you like to use?",
	};
	console.log(choice);
	if (choice.value === 0) {
		let emailData = yield {
			action: "collect",
			type: "email",
			header: "Please enter your email.",
			message: "We need your email to be sure its you.",
		};
		let [[user]] = await promisePool.query(
			"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
			[emailData.value]
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
					emailData.value,
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
								[userIDBuffer, emailData.value]
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
				// Password only
				// TODO
			}

			// TODO: Continue with registration, backup password, etc...
		}
		// TODO: Continue with login
		console.log(user);
	} else if (choice.value === 1) {
		// TODO: Continue with passkey
		let { options, verify } = await beginPasskeyAuthentication();
		let { assertionResponse } = yield {
			action: "authenticate-passkey",
			options: options,
		};

		const [[passkey]] = await promisePool.query(
			"SELECT * FROM passkeys WHERE credential_id = ?",
			[assertionResponse.rawId]
		);
		const verification = await verify(assertionResponse, passkey);
		if (verification.verified && verification.authenticationInfo) {
			console.log("\n\n\x1b[32;1mAuthentication Successful!\x1b[0m\n\n");
			// TODO: Continue with authentication
		} else {
			// TODO: Handle verification failure
		}
	}
}
export { login };
