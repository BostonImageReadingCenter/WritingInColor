import { isoUint8Array, isoBase64URL } from "@simplewebauthn/server/helpers";
import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	generateRegistrationOptions,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import { rpID, rpName, origin } from "./constants";
import {
	VerifiedAuthenticationResponse,
	VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server/esm";
import { base64ToUint8Array, uint8ArrayToBase64 } from "./utils";

async function beginPasskeyRegistration(userName, userID) {
	console.log(isoUint8Array.fromUTF8String(userID), userName);
	const WebAuthnOptions = await generateRegistrationOptions({
		rpName,
		rpID,
		userID: isoUint8Array.fromUTF8String(userID),
		userName: userName,
		timeout: 60000,
		attestationType: "direct",
		excludeCredentials: [],
		authenticatorSelection: {
			residentKey: "preferred",
		},
		// Support for the two most common algorithms: ES256, and RS256
		supportedAlgorithmIDs: [-7, -257],
	});
	async function verify(attestationResponse) {
		const verification = await verifyRegistrationResponse({
			response: attestationResponse as RegistrationResponseJSON,
			expectedChallenge: WebAuthnOptions.challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			requireUserVerification: true,
		});
		return verification;
	}
	return { WebAuthnOptions, verify };
}

async function beginPasskeyAuthentication() {
	const options = await generateAuthenticationOptions({
		timeout: 60000,
		allowCredentials: [],
		userVerification: "required",
		rpID,
	});
	console.log(options);

	async function verify(assertionResponse, passkey) {
		if (!passkey)
			return {
				verified: false,
				authenticationInfo: null,
			} as VerifiedAuthenticationResponse;
		const opts: VerifyAuthenticationResponseOpts = {
			response: assertionResponse,
			expectedChallenge: options.challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			authenticator: {
				credentialID: passkey.credential_id,
				credentialPublicKey: base64ToUint8Array(passkey.public_key),
				counter: passkey.counter,
				transports: passkey.transports,
			},
		};
		let verification: VerifiedAuthenticationResponse =
			await verifyAuthenticationResponse(opts);
		return verification;
	}

	return { options, verify };
}

export { beginPasskeyRegistration, beginPasskeyAuthentication };