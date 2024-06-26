import nunjucks from "nunjucks";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";
import { initDatabase } from "./db";
import { login } from "./login";
import { v4 as uuidv4 } from "uuid";
import { rpID, rpName, origin } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const client_root = join(
	__dirname,
	process.argv[2] === "production" ? "../dist" : "../client/"
); // Use dist in production.
let auth_sessions = {};

// Configure Nunjucks to use the client_root directory.
nunjucks.configure(client_root, { autoescape: true });

function cleanSessions() {
	let now = Date.now() + 10;
	for (let id in auth_sessions) {
		if (Date.now() > auth_sessions[id].expires) delete auth_sessions[id];
	}
}

// Define routes
async function routes(fastify, options) {
	console.log("\x1b[34mServing from:", client_root, "\x1b[0m");

	// Serve static files
	fastify.register(fastifyStatic, {
		root: client_root,
	});
	let visits = 0;
	const { pool, promisePool } = await initDatabase();

	// Home
	fastify.get("/", async (request, reply) => {
		visits++;
		let user = { admin: true }; // Placeholder user.
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { visits, user }));
		return reply;
	});
	fastify.get("/login", async (request, reply) => {
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("login/index.html"));
	});
	fastify.post("/api/login/init", async (request, reply) => {
		console.log("Login session has begun.");
		let id = uuidv4();
		let generator = login(promisePool, request.body);
		auth_sessions[id] = {
			id,
			expires: Date.now() + 1000 * 60 * 1,
			generator,
		};
		cleanSessions();
		let result = await generator.next();
		if (result.done) delete auth_sessions[id];
		return reply.send({ id, done: result.done, ...result.value });
	});
	fastify.post("/api/login/return", async (request, reply) => {
		let json = request.body;
		let id = json.id;
		let session = auth_sessions[id];
		if (!session)
			return reply
				.code(404)
				.send({ error: "The requested session no longer exists." });
		if (Date.now() > session.expires) {
			delete auth_sessions[id];
			return reply.code(410).send({ error: "Login session has expired." });
		}
		session.expires += 1000 * 60 * 1;
		let result = await session.generator.next(json);
		if (result.done) delete auth_sessions[id];
		return reply.code(200).send({ id, done: result.done, ...result.value });
	});
	// Passkeys
	// https://github.com/corbado/passkey-tutorial/blob/main/src/controllers/registration.ts
	// https://github.com/corbado/passkey-tutorial/blob/main/src/controllers/authentication.ts
}
export default routes;
