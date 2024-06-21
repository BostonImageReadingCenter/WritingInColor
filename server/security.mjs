import crypto from "crypto";
import * as jose from "jose";

// Utility function to hash a password with a salt
function hashPassword(password, salt, iterations = 1000, keylen = 256) {
	return crypto
		.pbkdf2Sync(password, salt, iterations, keylen, "sha512")
		.toString("hex");
}
function generateSalt(bytes = 32) {
	return crypto.randomBytes(bytes).toString("hex");
}

export { hashPassword, generateSalt };
