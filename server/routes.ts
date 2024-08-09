import nunjucks from "nunjucks";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";
import { Database } from "./db";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parse as uuidParse } from "uuid-parse";
import { pipeline } from "stream";
import path from "path";
import { promisify } from "util";
import fs from "fs";

import {
	login,
	isLoggedIn,
	revokeRefreshToken,
	VerifyJWT,
	DecodeJWT,
	loginUser,
} from "./login";
import { v4 as uuidv4 } from "uuid";
import {
	getFileType,
	origin,
	ROLES,
	SVG,
	JSON_DATA as JSON_DATA_CONST,
	uploadTags,
} from "./constants.js";
import {
	LoginData,
	LoginInitializationOptions,
	SetCookieOptions,
	User,
	FileFields,
} from "./types.js";
import { Multipart, MultipartFields } from "@fastify/multipart";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const client_root = join(__dirname, "../client/");
let auth_sessions = new Map();
let pipelineAsync = promisify(pipeline);
let JSON_DATA = JSON_DATA_CONST;

// Configure Nunjucks to use the client_root directory.
let nunjucks_env = new nunjucks.Environment(
	[new nunjucks.FileSystemLoader(client_root)],
	{
		autoescape: true,
	}
);

nunjucks_env.addFilter("keys", function (obj: any) {
	return Object.keys(obj);
});

nunjucks_env.addFilter("values", function (obj: any) {
	return Object.values(obj);
});

nunjucks_env.addFilter("stringify", function (obj: any) {
	return JSON.stringify(obj);
});

function cleanSessions() {
	let now = Date.now() + 10;
	for (let id in auth_sessions) {
		if (now > auth_sessions[id].expires) delete auth_sessions[id];
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
			secure: cookie.secure ?? true,
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

	// Initialize the database
	const database = new Database();

	/**
	 * Get the user from the request
	 */
	async function getUser(request: FastifyRequest, reply: FastifyReply) {
		let login_status = await isLoggedIn(request, database);
		setCookies(login_status.setCookies, reply);
		let user: User;
		if (login_status.valid) user = User.fromJWT(login_status.payload);
		else user = null;
		return user;
	}

	// Home
	fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
		let user = await getUser(request, reply);
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(
				nunjucks_env.render("index.html", {
					user,
					COURSES: JSON_DATA.courses,
					SVG,
					TESTIMONIALS: JSON_DATA.testimonials,
					FOUNDERS: JSON_DATA.founders,
				})
			);
		return reply;
	});

	// Test page. Just used for random stuff.
	fastify.get("/test", async (request: FastifyRequest, reply: FastifyReply) => {
		let user = await getUser(request, reply);
		reply.code(200).header("Content-Type", "text/html").send(
			nunjucks_env.render("test.html", {
				user,
			})
		);
		return reply;
	});

	// The login page
	fastify.get(
		"/login",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let user = await getUser(request, reply);
			if (user) return reply.redirect("/my-profile");
			reply
				.code(200)
				.header("Content-Type", "text/html")
				.send(nunjucks_env.render("login.html"));
		}
	);

	// User profile page
	fastify.get(
		"/my-profile",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let user = await getUser(request, reply);
			if (!user) return reply.redirect("/login");
			let emails = await database.getEmailsByUserID(user.id);
			user.emails = emails;
			let passkeys = await database.getPasskeysByUserID(user.id);
			user.passkeys = passkeys;
			console.log(passkeys);
			reply
				.code(200)
				.header("Content-Type", "text/html")
				.send(nunjucks_env.render("my-profile.html", { user }));
		}
	);

	// Loading this page will automatically logout the user
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

	fastify.get("/admin/manage-db", async (request, reply) => {
		let user = await getUser(request, reply);
		if (!(user && user.roles.includes("admin")))
			return reply.code(401).send("Unauthorized");
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(
				nunjucks_env.render("database-management.html", { user, JSON_DATA })
			);
	});

	/*
		API ENDPOINTS
	*/

	// Login initialization
	fastify.post(
		"/api/login/init",
		async (request: FastifyRequest, reply: FastifyReply) => {
			console.log("Login session has begun.");
			let id = uuidv4();
			let generator = login(
				database,
				request.body as LoginInitializationOptions
			);
			auth_sessions.set(id, {
				id,
				expires: Date.now() + 1000 * 60 * 1, // Give the user 1 minute to interact with the login page before it expires
				generator,
			});
			cleanSessions();
			let result = await generator.next();
			setCookies((result.value as LoginData).setCookies || [], reply);
			if (result.done) delete auth_sessions[id];
			return reply.send({ id, done: result.done, value: result.value });
		}
	);

	// This one is for when the client returns data back to the server.
	fastify.post(
		"/api/login/return",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let json: any = request.body;
			let id = json.id;
			let session = auth_sessions.get(id);

			if (!session)
				return reply
					.code(404)
					.send({ error: "The requested session no longer exists." });

			if (Date.now() > session.expires) {
				delete auth_sessions[id];
				return reply.code(410).send({ error: "Login session has expired." });
			}

			session.expires += 1000 * 60 * 1; // Since the user has interacted with the page, give them another minute
			// console.log(json);
			let result = await session.generator.next({
				request,
				reply,
				return: json.return,
			});
			if (result.done) delete auth_sessions[id];
			setCookies(result.value.setCookies || [], reply);
			return reply
				.code(200)
				.send({ id, done: result.done, value: result.value });
		}
	);
	fastify.post(
		"/api/upload",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let user = await getUser(request, reply);
			if (!(user && user.roles.includes("admin")))
				return reply.code(401).send("Unauthorized");
			let json: any = request.body;
			const parts = request.parts();
			const results: Array<{
				status: string;
				filename: string;
				error?: string;
			}> = [];
			const fileFields: FileFields = {};

			for await (const part of parts) {
				if (part.type === "file") {
					const customFilename =
						fileFields[part.fieldname]?.filename || part.filename;
					const uploadPath = path.join(
						__dirname,
						"../client/static",
						uploadTags[getFileType(part.mimetype)][
							fileFields[part.fieldname]?.tag ?? "other"
						],
						customFilename
					);

					try {
						await pipelineAsync(part.file, fs.createWriteStream(uploadPath));
						results.push({
							status: "File uploaded successfully",
							filename: customFilename,
						});
					} catch (err) {
						results.push({
							status: "Upload failed",
							filename: customFilename,
							error: err.message,
						});
					}
				} else {
					// Collect form fields
					if (
						part.fieldname.startsWith("filename_") ||
						part.fieldname.startsWith("tag_")
					) {
						const [type, fieldname] = part.fieldname.split("_");
						if (!fileFields[fieldname]) {
							fileFields[fieldname] = { filename: "", tag: "" };
						}
						fileFields[fieldname][type] = part.value;
					}
				}
			}

			return reply.send(results);
		}
	);
	fastify.post(
		"/api/save-db",
		async (request: FastifyRequest, reply: FastifyReply) => {
			let user = await getUser(request, reply);
			if (!(user && user.roles.includes("admin")))
				return reply.code(401).send("Unauthorized");
			let json: any = request.body;
			JSON_DATA = json;
			fs.writeFileSync(
				path.resolve(__dirname, "../documents/db.json"),
				JSON.stringify(json)
			);
		}
	);
	fastify.post("/api/update-user-information", async (request, reply) => {
		let user = await getUser(request, reply);
		if (!user) return reply.redirect("/login");

		let json: any = request.body;
		for (const [key, value] of Object.entries(json)) {
			if (key === "first-name") {
				database.query("UPDATE users SET first_name = ? WHERE id = ?", [
					value,
					user.id,
				]);
			} else if (key === "last-name") {
				database.query("UPDATE users SET last_name = ? WHERE id = ?", [
					value,
					user.id,
				]);
			}
		}
		setCookies(await loginUser(user.id, database), reply);
	});
}
export default routes;
