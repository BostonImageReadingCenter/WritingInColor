// Koa vs Fastify vs Express
// Koa: https://github.com/koajs/koa
// Fastify: https://github.com/fastify/fastify
// Express: https://github.com/expressjs/express

// Fastify is the fastest, Koa is second, and Express is by far the slowest.
// Koa is the most customizable.
// Express is the one I have the most experience with.
// Fastify is fast.

import Fastify from "fastify";
import routes from "./routes.mjs";

const fastify = Fastify({
	logger: true,
});

fastify.register(routes);

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
