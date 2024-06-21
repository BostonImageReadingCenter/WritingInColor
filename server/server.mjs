import Fastify from "fastify";
import routes from "./routes.mjs";
import fastify_cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

const fastify = Fastify({
	logger: true,
});

fastify.register(fastify_cookie, {
	secret: "my-secret", // for cookies signature
	parseOptions: {
		secure: true,
	}, // options for parsing cookies
});
fastify.register(
	fp(async function (fastify, opts) {
		fastify.register(fastifyJwt, {
			secret: "supersecret",
		});

		fastify.decorate("authenticate", async function (request, reply) {
			try {
				await request.jwtVerify();
			} catch (err) {
				reply.send(err);
			}
		});
	})
);
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
