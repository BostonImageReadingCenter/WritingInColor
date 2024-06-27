import Fastify from "fastify";
import routes from "./routes.js";
import fastify_cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { rpID, rpName, origin, JWT_EXPIRATION_TIME } from "./constants.js";
import { uint8ArrayToBase64, Uint8ArrayFromHexString } from "./utils";
const fastify = Fastify({
	logger: true,
});

fastify.register(fastify_cookie, {
	secret: "secret", // for cookies signature TODO: Move to .env
	parseOptions: {
		secure: true,
		signed: true,
	}, // options for parsing cookies
});

fastify.register(routes, {});

/*

Security: https://medium.com/@ferrosful/nodejs-security-unleashed-exploring-dos-ddos-attacks-cf089d5caff4

*/

/**
 * Run the server!
 */
const start = async () => {
	try {
		await fastify.listen({ port: 3000 });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
		// TODO: Enable proper error handling for production environment.
	}
};
start();
