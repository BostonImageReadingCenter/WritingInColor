import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	generateRegistrationOptions,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import { rpID, rpName, origin } from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { parse as uuidParse } from "uuid-parse";
import { uint8ArrayToBase64 } from "./utils.ts";

async function* login(promisePool, options) {
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
			const WebAuthnOptions = await generateRegistrationOptions({
				rpName,
				rpID,
				userID: isoUint8Array.fromUTF8String(userID),
				userName: emailData.value,
				timeout: 60000,
				attestationType: "direct",
				excludeCredentials: [],
				authenticatorSelection: {
					residentKey: "preferred",
				},
				// Support for the two most common algorithms: ES256, and RS256
				supportedAlgorithmIDs: [-7, -257],
			});
			let passkeyRegistrationData = yield {
				action: "register-passkey",
				WebAuthnOptions,
			};
			console.log(passkeyRegistrationData);
			const verification = await verifyRegistrationResponse({
				response:
					passkeyRegistrationData.attestationResponse as RegistrationResponseJSON,
				expectedChallenge: WebAuthnOptions.challenge,
				expectedOrigin: origin,
				expectedRPID: rpID,
				requireUserVerification: true,
			});
			if (verification.verified && verification.registrationInfo) {
				const { credentialPublicKey, credentialID, counter } =
					verification.registrationInfo;
				console.log("Credential ID:", credentialID, typeof credentialID);
				const transportsString = JSON.stringify(
					passkeyRegistrationData.attestationResponse.response.transports
				);
				// Create user
				await promisePool.query("INSERT INTO users (id) VALUES (?)", [
					userIDBuffer,
				]);
				// Add email
				await promisePool.query(
					"INSERT INTO emails (user_id, email) VALUES (?, ?)",
					[userIDBuffer, emailData.value]
				);
				// Save Passkey
				await promisePool.query(
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
			} else {
				// TODO: Handle verification failure
			}
		} else {
			// Password only
			// TODO
		}

		// Continue with registration
	}
	// Continue with login
	console.log(user);
}
export { login };
