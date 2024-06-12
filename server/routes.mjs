import nunjucks from "nunjucks";
import User from "./user.mjs";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";

const rpId = "localhost";
const expectedOrigin = "http://localhost:3000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const client_root = join(__dirname, "../client/");

nunjucks.configure(client_root, { autoescape: true }); // Use dist in production.
async function routes(fastify, options) {
	console.log("client root: " + client_root);
	fastify.register(fastifyStatic, {
		root: client_root,
		// prefix: "/",
	});
	let visits = 0;
	fastify.get("/", async (request, reply) => {
		visits++;
		let user = new User({ admin: true }); // Placeholder user.
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { visits, user }));
		return reply;
	});
	fastify.post("/passkeys/register/start", async (request, reply) => {});
	fastify.post("/passkeys/register/finish", async (request, reply) => {});
	fastify.post("/passkeys/login/start", async (request, reply) => {});
	fastify.post("/passkeys/login/finish", async (request, reply) => {});
}
export default routes;
