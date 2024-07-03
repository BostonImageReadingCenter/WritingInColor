import mysql from "mysql2";
import { Pool as PromisePool } from "mysql2/promise";
import { MySQLConfig } from "./constants";
import { parse as uuidParse } from "uuid-parse";
import { Passkey, User } from "./types";
import { Uint8ArrayFromHexString } from "./utils";

async function initDatabase(): Promise<{
	pool: mysql.Pool;
	promisePool: PromisePool;
}> {
	const pool = mysql.createPool(MySQLConfig);
	const promisePool = pool.promise();
	return { pool, promisePool };
}

async function test() {
	let { pool, promisePool } = await initDatabase();
	try {
		const [rows] = await promisePool.query("SELECT * FROM roles");
	} catch (err) {
		console.error(err);
	} finally {
		// Close the pool to end the program
		pool.end();
	}
}

const UserService = {
	getById: async (userID: Buffer, promisePool: PromisePool) => {
		// @ts-ignore
		const user: User = await promisePool.query(
			"SELECT * FROM users WHERE id = ?",
			[userID]
		);
		return user[0][0];
	},
	getByEmail: async (email: string, promisePool: PromisePool) => {
		// @ts-ignore
		let user: User = await promisePool.query(
			"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
			[email]
		);
		return user[0][0];
	},
};
class DB {
	pool: mysql.Pool;
	promisePool: PromisePool;
	constructor() {
		this.pool = mysql.createPool(MySQLConfig);
		this.promisePool = this.pool.promise();
	}
	multiQuery() {
		// TODO: group multiple queries together.
		// await promisePool.getConnection().then(async (connection) => {
	}
	// TODO: move all the services here.
}
const EmailService = {};
const PasskeyService = {
	getPasskeysByUserID: async (
		userID: Buffer,
		promisePool: PromisePool
	): Promise<Passkey[]> => {
		return (
			await promisePool.query("SELECT * FROM passkeys WHERE user_id = ?", [
				userID,
			])
		)[0] as Passkey[];
	},
};
const RevokedRefreshTokensService = {};
const RoleService = {
	getUserRoles: async (userID: Buffer, promisePool: PromisePool) => {
		const roles = await promisePool.query(
			`SELECT * FROM user_roles WHERE user_id = ?`,
			[userID]
		);
		return roles[0];
	},
	addUserRole: async (
		userID: Buffer,
		role_name: string,
		promisePool: PromisePool
	) => {
		// TODO
	},
};
export {
	initDatabase,
	test,
	UserService,
	EmailService,
	RoleService,
	PasskeyService,
};
