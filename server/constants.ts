import { config } from "dotenv";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import Falcon from "falcon-crypto";
import {
	uint8ArrayToBase64,
	Uint8ArrayFromHexString,
	base64ToUint8Array,
} from "./utils";

// Load environment variables from .env file
config();

const rpID = "localhost";
const rpName = "Writing in Color";
const JWT_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 1; // 1 day

const origin: string = `http://${rpID}:3000`;
var SECRET_PRIVATE_KEY_BASE64 = process.env.SECRET_PRIVATE_KEY_BASE64;
var SECRET_PUBLIC_KEY_BASE64 = process.env.SECRET_PUBLIC_KEY_BASE64;
var TOKEN_SECRET_EXPIRATION = parseFloat(process.env.TOKEN_SECRET_EXPIRATION);
var SECRET_KEY_PAIR: {
		privateKey: Uint8Array;
		publicKey: Uint8Array;
	},
	SECRET_PRIVATE_KEY: Uint8Array,
	SECRET_PUBLIC_KEY: Uint8Array;

if (
	!SECRET_PRIVATE_KEY_BASE64 ||
	!SECRET_PUBLIC_KEY_BASE64 ||
	!TOKEN_SECRET_EXPIRATION ||
	Date.now() > TOKEN_SECRET_EXPIRATION
) {
	// @ts-ignore
	Falcon.keyPair().then((keyPair) => {
		SECRET_KEY_PAIR = keyPair;
		SECRET_PRIVATE_KEY = keyPair.privateKey;
		SECRET_PUBLIC_KEY = keyPair.publicKey;
		SECRET_PRIVATE_KEY_BASE64 = uint8ArrayToBase64(SECRET_PRIVATE_KEY);
		SECRET_PUBLIC_KEY_BASE64 = uint8ArrayToBase64(SECRET_PUBLIC_KEY);
		// Set the new expiration time (1 month from now)
		TOKEN_SECRET_EXPIRATION = Date.now() + 1000 * 60 * 60 * 24 * 30; // 1 month

		// Define the path to the .env file
		const envPath = path.resolve(__dirname, "../.env");

		// Read the current contents of the .env file
		const envContent = readFileSync(envPath, "utf8");

		const lines = envContent.split("\n");

		const filteredLines = lines.filter((line) => {
			// Match patterns TOKEN_SECRET_EXPIRATION, SECRET_PRIVATE_KEY_BASE64, or SECRET_PUBLIC_KEY_BASE64
			return !/(TOKEN_SECRET_EXPIRATION|SECRET_PRIVATE_KEY_BASE64|SECRET_PUBLIC_KEY_BASE64)=/.test(
				line
			);
		});

		// Join the filtered lines back into a single string
		const filteredContent = filteredLines.join("\n");

		const updatedEnvContent =
			filteredContent +
			`\nTOKEN_SECRET_EXPIRATION=${TOKEN_SECRET_EXPIRATION}\nSECRET_PRIVATE_KEY_BASE64=${SECRET_PRIVATE_KEY_BASE64}\nSECRET_PUBLIC_KEY_BASE64=${SECRET_PUBLIC_KEY_BASE64}`;

		// Write the updated content back to the .env file
		writeFileSync(envPath, updatedEnvContent, "utf8");
	});
} else {
	SECRET_PRIVATE_KEY = base64ToUint8Array(SECRET_PRIVATE_KEY_BASE64);
	SECRET_PUBLIC_KEY = base64ToUint8Array(SECRET_PUBLIC_KEY_BASE64);
	SECRET_KEY_PAIR = {
		privateKey: base64ToUint8Array(SECRET_PRIVATE_KEY_BASE64),
		publicKey: base64ToUint8Array(SECRET_PUBLIC_KEY_BASE64),
	};
}
const MySQLConfig = {
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

// Export the updated TOKEN_SECRET and TOKEN_SECRET_EXPIRATION
export {
	SECRET_PRIVATE_KEY,
	TOKEN_SECRET_EXPIRATION,
	SECRET_PUBLIC_KEY,
	SECRET_KEY_PAIR,
	SECRET_PRIVATE_KEY_BASE64,
	SECRET_PUBLIC_KEY_BASE64,
	MySQLConfig,
	JWT_EXPIRATION_TIME,
	rpID,
	rpName,
	origin,
};
