export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string =>
	Buffer.from(uint8Array).toString("base64");

export const base64ToUint8Array = (base64: string): Uint8Array =>
	new Uint8Array(Buffer.from(base64, "base64"));

export const Uint8ArrayFromHexString = (hexString) =>
	Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export const Uint8ArrayToHexString = (bytes) =>
	bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
