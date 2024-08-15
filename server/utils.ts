import { PasswordRequirements } from "./types";

export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string =>
	Buffer.from(uint8Array).toString("base64");

export const base64ToUint8Array = (base64: string): Uint8Array =>
	new Uint8Array(Buffer.from(base64, "base64"));

export const Uint8ArrayFromHexString = (hexString: string) =>
	Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export const Uint8ArrayToHexString = (bytes: Uint8Array) =>
	bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

/**
 * Checks if the password meets the given requirements.
 */
export function checkPassword(
	password: string,
	requirements: PasswordRequirements
): string[] {
	let errors: string[] = [];
	if (password.length < requirements.min_length) {
		errors.push(
			`Password must be at least ${requirements.min_length} characters long.`
		);
	}
	if (password.length > requirements.max_length) {
		errors.push(
			`Password must be at most ${requirements.max_length} characters long.`
		);
	}
	if (password.match(/[a-z]/).length < requirements.min_lowercase) {
		errors.push(
			`Password must contain at least ${requirements.min_lowercase} lowercase characters.`
		);
	}
	if (password.match(/[A-Z]/).length < requirements.min_uppercase) {
		errors.push(
			`Password must contain at least ${requirements.min_uppercase} uppercase characters.`
		);
	}
	if (password.match(/[0-9]/).length < requirements.min_digits) {
		errors.push(
			`Password must contain at least ${requirements.min_digits} digits.`
		);
	}
	if (
		password.match(/[^a-zA-Z0-9]/).length < requirements.min_non_alphanumeric
	) {
		errors.push(
			`Password must contain at least ${requirements.min_non_alphanumeric} non-alphanumeric characters.`
		);
	}
	return errors;
}

export function measureMemoryUsage() {
	return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
}
