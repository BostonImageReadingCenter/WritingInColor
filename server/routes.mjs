import nunjucks from "nunjucks";

const rpId = "localhost";
const expectedOrigin = "http://localhost:3000";
nunjucks.configure("dist", { autoescape: true });
async function routes(fastify, options) {
	let visits = 0;
	fastify.get("/", async (request, reply) => {
		visits++;
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { visits }));
		return reply;
	});
	fastify.post("/passkeys/register/start", async (request, reply) => {});
	fastify.post("/passkeys/register/finish", async (request, reply) => {});
	fastify.post("/passkeys/login/start", async (request, reply) => {});
	fastify.post("/passkeys/login/finish", async (request, reply) => {});
}
export default routes;
