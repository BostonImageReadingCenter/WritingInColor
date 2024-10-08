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
	let total = password.length;
	let lowercase = password.match(/[a-z]/g)?.length || 0;
	let uppercase = password.match(/[A-Z]/g)?.length || 0;
	let digits = password.match(/[0-9]/g)?.length || 0;
	let nonAlphanumeric = password.match(/[^a-zA-Z0-9]/g)?.length || 0;
	if (total < requirements.min_length) {
		errors.push(
			`Password must be at least ${requirements.min_length} characters long.`
		);
	}
	if (total > requirements.max_length) {
		errors.push(
			`Password must be at most ${requirements.max_length} characters long.`
		);
	}
	if (lowercase < requirements.min_lowercase) {
		errors.push(
			`Password must contain at least ${requirements.min_lowercase} lowercase characters.`
		);
	}
	if (uppercase < requirements.min_uppercase) {
		errors.push(
			`Password must contain at least ${requirements.min_uppercase} uppercase characters.`
		);
	}
	if (digits < requirements.min_digits) {
		errors.push(
			`Password must contain at least ${requirements.min_digits} digits.`
		);
	}
	if (nonAlphanumeric < requirements.min_non_alphanumeric) {
		errors.push(
			`Password must contain at least ${requirements.min_non_alphanumeric} non-alphanumeric characters.`
		);
	}
	return errors;
}

export function measureMemoryUsage() {
	return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
}
export const FILETYPES = [
	"image",
	"video",
	"audio",
	"document",
	"spreadsheet",
	"presentation",
	"compressed",
	"other",
] as const;
type FileType = (typeof FILETYPES)[number];
export let uploadTags = {
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
		other: "/other/",
	},
};
export const MIMETYPES = {
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

export function getFileTypeByMimetype(mimetype: string): FileType {
	for (let key in MIMETYPES)
		if (MIMETYPES[key].some((regex: RegExp) => regex.test(mimetype)))
			return key as FileType;
	return "other";
}

export const EXTENSIONS = {
	image: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"],
	video: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"],
	audio: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "cda"],
	document: ["pdf", "doc", "docx", "ebook"],
	spreadsheet: ["xls", "xlsx", "csv", "numbers", "ods"],
	presentation: ["ppt", "pptx", "key", "odp"],
	compressed: ["zip", "7z", "rar", "gz", "tar", "bz2", "xz"],
};

export function getFileTypeByFilename(filename: string): FileType {
	const extension = filename.split(".").pop()?.toLowerCase();
	if (!extension) return "other";

	for (let key in EXTENSIONS)
		if (EXTENSIONS[key].includes(extension)) return key as FileType;

	return "other";
}
