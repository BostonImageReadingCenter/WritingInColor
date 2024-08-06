import { config } from "dotenv";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { falcon } from "falcon-crypto";
import {
	uint8ArrayToBase64,
	Uint8ArrayFromHexString,
	base64ToUint8Array,
} from "./utils";
import { PasswordRequirements } from "./types";
// Load environment variables from .env file
config();

const ROLES = ["admin", "moderator", "instructor", "developer"];
const rpID = "localhost";
const rpName = "Writing in Color";
const AVERAGE_MONTH_LENGTH = 30.4368645;
const ACCESS_TOKEN_EXPIRATION_TIME = 1000 * 60 * 60 * 30; // 30 minutes
const REFRESH_TOKEN_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30; // 30 days
const KEY_PAIR_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * AVERAGE_MONTH_LENGTH * 6; // 6 months

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
	falcon.keyPair().then((keyPair) => {
		SECRET_KEY_PAIR = keyPair;
		SECRET_PRIVATE_KEY = keyPair.privateKey;
		SECRET_PUBLIC_KEY = keyPair.publicKey;
		SECRET_PRIVATE_KEY_BASE64 = uint8ArrayToBase64(SECRET_PRIVATE_KEY);
		SECRET_PUBLIC_KEY_BASE64 = uint8ArrayToBase64(SECRET_PUBLIC_KEY);
		// Set the new expiration time (1 month from now)
		TOKEN_SECRET_EXPIRATION = Date.now() + KEY_PAIR_EXPIRATION_TIME;

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
const ToS = readFileSync(
	path.resolve(__dirname, "../documents/tos.html"),
	"utf8"
);

const passwordRequirements: PasswordRequirements = {
	min_length: 10,
	max_length: 100,
	min_uppercase: 1,
	min_lowercase: 1,
	min_digits: 1,
	min_non_alphanumeric: 1,
};
let JSON_DATA = JSON.parse(
	readFileSync(path.resolve(__dirname, "../documents/db.json"), "utf8")
);

let SVG = {
	star: readFileSync(
		path.resolve(__dirname, "../client/static/media/image/icon/star.svg"),
		"utf8"
	),
};
let uploadTags = {
	image: {
		person: "/media/image/people/",
		icon: "/media/image/icon/",
		course: "/media/image/course/",
		branding: "/media/image/branding/",
		logotype: "/media/image/branding/logotype/",
		background: "/media/image/background/",
		other: "/media/image/other",
	},
	video: {
		background: "/media/video/background/",
		effects: "/media/video/effects/",
		other: "/media/video/other/",
	},
	audio: {
		effects: "/media/audio/effects/",
		music: "/media/audio/music/",
		speech: "/media/audio/speech/",
		other: "/media/audio/other/",
	},
	document: {
		other: "/document/text/",
	},
	spreadsheet: {
		other: "/document/spreadsheet/",
	},
	presentation: {
		other: "/document/presentation/",
	},
	compressed: {
		other: "/compressed/",
	},
	other: {
		other: "/media/other/",
	},
};
// Helper function to determine file type
const MIMETYPES = {
	image: [/^image\/.*/],
	video: [/^video\/.*/],
	audio: [/^audio\/.*/, /application\/x-cdf/],
	document: [
		/application\/pdf/,
		/application\/msword/,
		/application\/vnd.openxmlformats-officedocument.wordprocessingml.document/,
		/application\/vnd.amazon.ebook/,
	],
	spreadsheet: [
		/application\/vnd.ms-excel/,
		/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/,
		/application\/vnd.google-apps.spreadsheet/,
		/application\/vnd.apple.numbers/,
	],
	presentation: [
		/application\/vnd.google-apps.presentation/,
		/application\/vnd.apple.keynote/,
		/application\/vnd.ms-powerpoint/,
		/application\/vnd.openxmlformats-officedocument.presentationml.presentation/,
		/application\/vnd.oasis.opendocument.presentation/,
	],
	compressed: [
		/application\/x-freearc/,
		/application\/x-bzip/,
		/application\/x-bzip2/,
		/application\/x-7z-compressed/,
		/application\/gzip/,
		/application\/x-gzip/,
		/application\/vnd.rar/,
		/application\/x-tar/,
		/application\/zip/,
		/x-zip-compressed/,
		/application\/x-zip-compressed/,
	],
};

function getFileType(mimetype: string): string {
	for (let key in MIMETYPES) {
		if (MIMETYPES[key].some((regex: RegExp) => regex.test(mimetype))) {
			return key;
		}
	}
	return "other";
}

// Export the updated TOKEN_SECRET and TOKEN_SECRET_EXPIRATION
export {
	SECRET_PRIVATE_KEY,
	TOKEN_SECRET_EXPIRATION,
	SECRET_PUBLIC_KEY,
	SECRET_KEY_PAIR,
	SECRET_PRIVATE_KEY_BASE64,
	SECRET_PUBLIC_KEY_BASE64,
	MySQLConfig,
	ACCESS_TOKEN_EXPIRATION_TIME,
	REFRESH_TOKEN_EXPIRATION_TIME,
	rpID,
	rpName,
	origin,
	ROLES,
	ToS,
	passwordRequirements,
	JSON_DATA,
	SVG,
	uploadTags,
	getFileType,
	MIMETYPES,
};
