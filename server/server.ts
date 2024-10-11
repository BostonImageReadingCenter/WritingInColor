import Fastify from "fastify";
import routes from "./routes.js";
import fastify_cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import { spawn } from "child_process";
import path from "path";
import fastify_multipart from "@fastify/multipart";
import { rpID, USE_HTTPS } from "./constants.js";
import fs from "fs";

const fastify = Fastify({
	logger: false,
	https: USE_HTTPS
		? {
				key: fs.readFileSync(path.resolve(__dirname, `../${rpID}/private.key`)),
				cert: fs.readFileSync(
					path.resolve(__dirname, `../${rpID}/certificate.crt`)
				),
		  }
		: undefined,
	http2: false,
});
fastify.addHook("preParsing", async (request, reply) => {
	console.log(
		"\x1b[34m" + "preParsing" + request.method + "\x1b[0m",
		request.url
	);
});
fastify.addHook("onResponse", async (request, reply) => {
	console.log(
		"\x1b[34m" + request.method + "\x1b[0m",
		request.url,
		reply.statusCode
	);
});
fastify.addHook("onError", async (request, reply, error) => {
	console.log("\x1b[31m" + error.stack + "\x1b[0m");
});
fastify.register(fastify_multipart, {
	limits: {
		fileSize: 50 * 1024 * 1024, // 50 MB limit ,
	},
});
fastify.register(fastify_cookie, {
	parseOptions: {
		secure: true,
		signed: false,
	}, // options for parsing cookies
});

fastify.register(routes, {});

function restart() {
	const newProcess = spawn("bun", [path.resolve(__dirname, "server.ts")], {
		stdio: "inherit",
		detached: true,
	});

	newProcess.unref();
	process.exit();
}
/**
 * Run the server!
 */
const start = async () => {
	try {
		await fastify.listen({ host: "0.0.0.0", port: USE_HTTPS ? 443 : 80 }); // TODO: allow customization in .env
		console.log(`rpID: ${rpID}`);
		console.log("\x1b[32mServer running!\x1b[0m");
	} catch (err) {
		console.error(err);
		fastify.log.error(err);
		// restart(); // restart the server
	}
};
start();

/*

Security: https://medium.com/@ferrosful/nodejs-security-unleashed-exploring-dos-ddos-attacks-cf089d5caff4

*/
