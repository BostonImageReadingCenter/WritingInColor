import nunjucks from "nunjucks";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";
import { initDatabase } from "./db";
import { FastifyReply, FastifyRequest } from "fastify";
import {
	login,
	signCookie,
	unsignCookie,
	createAccessTokenIfNotRevoked,
	isLoggedIn,
} from "./login";
import { v4 as uuidv4 } from "uuid";
import { rpID, rpName, origin } from "./constants.js";
import { sign } from "jwt-falcon";
import { JWT_REGISTERED_CLAIMS, User } from "./types.js";

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

function setCookies(cookies: object, reply) {
	if (cookies) {
		for (let cookie_name in cookies) {
			let cookie = cookies[cookie_name];
			// SameSite strict
			reply.setCookie(cookie_name, cookie.value, {
				httpOnly: true,
				signed: false,
				path: "/",
				sameSite: "strict",
				secure: false, // TODO: Change this to true.
				expires: cookie.expires,
			});
		}
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
	fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
		let is_admin = false;

		let login_status = await isLoggedIn(request, promisePool);
		setCookies(login_status.setCookies, reply);

		if (login_status.valid && login_status.payload.adm) is_admin = true;

		visits++;
		let user = { admin: is_admin }; // Placeholder user.
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { visits, user }));
		return reply;
	});
	fastify.get(
		"/login",
		async (request: FastifyRequest, reply: FastifyReply) => {
			reply
				.code(200)
				.header("Content-Type", "text/html")
				.send(nunjucks.render("login/index.html"));
		}
	);
	fastify.post(
		"/api/login/init",
		async (request: FastifyRequest, reply: FastifyReply) => {
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
			return reply.send({ id, done: result.done, value: result.value });
		}
	);
	fastify.post(
		"/api/login/return",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let json: any = request.body;
			let id = json.id;
			let session = auth_sessions[id]; // Use JWTs for login sessions???
			if (!session)
				return reply
					.code(404)
					.send({ error: "The requested session no longer exists." });
			if (Date.now() > session.expires) {
				delete auth_sessions[id];
				return reply.code(410).send({ error: "Login session has expired." });
			}
			session.expires += 1000 * 60 * 1;
			let result = await session.generator.next({ request, reply, json });
			if (result.done) delete auth_sessions[id];
			setCookies(result.value.setCookies, reply);
			return reply
				.code(200)
				.send({ id, done: result.done, value: result.value });
		}
	);
}
export default routes;
