import Fastify from "fastify";
import routes from "./routes.js";
import fastify_cookie from "@fastify/cookie";
import fp from "fastify-plugin";

const fastify = Fastify({
	logger: true,
});

// @ts-ignore
fastify.register(fastify_cookie, {
	parseOptions: {
		secure: false, // TODO: Change this to true.
		signed: false,
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
