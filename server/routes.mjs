import nunjucks from "nunjucks";
import User from "./user.mjs";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";

// Constants
const rpId = "localhost";
const expectedOrigin = "http://localhost:3000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const client_root = join(
	__dirname,
	process.argv[2] === "production" ? "../dist" : "../client/"
); // Use dist in production.

// Configure Nunjucks to use the client_root directory.
nunjucks.configure(client_root, { autoescape: true });

// Define routes
async function routes(fastify, options) {
	console.log("\x1b[34mServing from:", client_root, "\x1b[0m");
	// Serve static files
	fastify.register(fastifyStatic, {
		root: client_root,
	});
	let visits = 0;

	// Home
	fastify.get("/", async (request, reply) => {
		visits++;
		let user = new User({ admin: true }); // Placeholder user.
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { visits, user }));
		return reply;
	});

	// Passkeys
	fastify.post("/passkeys/register/start", async (request, reply) => {});
	fastify.post("/passkeys/register/finish", async (request, reply) => {});
	fastify.post("/passkeys/login/start", async (request, reply) => {});
	fastify.post("/passkeys/login/finish", async (request, reply) => {});
}
export default routes;
