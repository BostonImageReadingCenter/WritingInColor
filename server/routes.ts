import nunjucks from "nunjucks";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";
import { Database, initDatabase } from "./db";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parse as uuidParse } from "uuid-parse";

import {
	login,
	signCookie,
	unsignCookie,
	createAccessTokenIfNotRevoked,
	isLoggedIn,
	revokeRefreshToken,
	VerifyJWT,
	DecodeJWT,
} from "./login";
import { v4 as uuidv4 } from "uuid";
import { rpID, rpName, origin, ROLES } from "./constants.js";
import { sign } from "jwt-falcon";
import {
	JWT_REGISTERED_CLAIMS,
	LoginData,
	LoginInitializationOptions,
	SetCookieOptions,
	User,
} from "./types.js";

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

function setCookies(cookies: SetCookieOptions[], reply: FastifyReply) {
	for (let cookie of cookies) {
		// SameSite strict
		reply.setCookie(cookie.name, cookie.value, {
			httpOnly: cookie.httpOnly ?? true,
			signed: cookie.signed ?? false,
			path: cookie.path ?? "/",
			sameSite: cookie.sameSite ?? "strict",
			secure: cookie.secure ?? false,
			expires:
				cookie.expires ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
		});
	}
}

// Define routes
async function routes(fastify: FastifyInstance, options) {
	console.log("\x1b[34mServing from:", client_root, "\x1b[0m");

	// Serve static files
	fastify.register(fastifyStatic, {
		root: client_root,
	});
	let visits = 0;
	const database = new Database();

	// Home
	fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
		let is_admin = false;

		let login_status = await isLoggedIn(request, database);
		setCookies(login_status.setCookies, reply);
		let user: User;
		if (login_status.valid) {
			let user_data = login_status.payload;
			user = {
				roles: user_data.rls.map((r) => ROLES[r]),
				id: user_data.sub as Buffer,
			};
		} else {
			user = null;
		}
		visits++;
		reply.code(200).header("Content-Type", "text/html").send(
			nunjucks.render("index.html", {
				visits,
				user,
			})
		);
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

	fastify.get(
		"/logout",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let refreshToken = request.cookies.refreshToken;
			if (!refreshToken) return reply.code(401).send("No refresh token");

			let verified = await VerifyJWT(refreshToken);
			if (!verified) return reply.code(401).send("Fraudulent refresh token");

			let payload = await DecodeJWT(refreshToken);
			if (!payload) return reply.code(401).send("Refresh token malformed");

			revokeRefreshToken(
				Buffer.from(uuidParse(payload.jti)),
				new Date(payload.exp),
				database
			);
			let _1970 = new Date(0);
			return reply
				.setCookie("accessToken", "", {
					expires: _1970,
				})
				.setCookie("refreshToken", "", {
					expires: _1970,
				})
				.redirect(origin + "/");
		}
	);
	// API
	fastify.post(
		"/api/login/init",
		async (request: FastifyRequest, reply: FastifyReply) => {
			console.log("Login session has begun.");
			let id = uuidv4();
			let generator = login(
				database,
				request.body as LoginInitializationOptions
			);
			auth_sessions[id] = {
				id,
				expires: Date.now() + 1000 * 60 * 1,
				generator,
			};
			cleanSessions();
			let result = await generator.next();
			setCookies((result.value as LoginData).setCookies || [], reply);
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
			console.log(result);
			if (result.done) delete auth_sessions[id];
			setCookies(result.value.setCookies || [], reply);
			return reply
				.code(200)
				.send({ id, done: result.done, value: result.value });
		}
	);
}
export default routes;
