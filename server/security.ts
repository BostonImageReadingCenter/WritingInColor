import crypto from "crypto";

// Utility function to hash a password with a salt
function hashPassword(
	password: Buffer | string,
	salt: Buffer,
	iterations = 1000,
	keylen = 256
): Buffer {
	return crypto.pbkdf2Sync(password, salt, iterations, keylen, "sha512");
}
function generateSalt(bytes = 64) {
	return crypto.randomBytes(bytes);
}

export { hashPassword, generateSalt };
