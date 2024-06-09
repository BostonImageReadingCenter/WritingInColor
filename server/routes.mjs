import nunjucks from "nunjucks";

const rpId = "localhost";
const expectedOrigin = "http://localhost:3000";
nunjucks.configure("dist", { autoescape: true });
async function routes(fastify, options) {
	fastify.get("/", async (request, reply) => {
		reply
			.code(200)
			.header("Content-Type", "text/html")
			.send(nunjucks.render("index.html", { rpId, expectedOrigin }));
		return reply;
	});
	fastify.post("/passkeys/register/start", async (request, reply) => {});
	fastify.post("/passkeys/register/finish", async (request, reply) => {});
	fastify.post("/passkeys/login/start", async (request, reply) => {});
	fastify.post("/passkeys/login/finish", async (request, reply) => {});
}
export default routes;
