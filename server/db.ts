import mysql from "mysql2";
import { Pool as PromisePool } from "mysql2/promise";
import { MySQLConfig } from "./constants";
import { parse as uuidParse } from "uuid-parse";
import { SelectUserOptions, User } from "./types";
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
		console.log(rows);
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
		console.log("USER:", user);
		return user[0][0];
	},
};
const EmailService = {};
const RoleService = {
	getUserRoles: async (userID: Buffer, promisePool: PromisePool) => {
		const roles = await promisePool.query(
			`SELECT ur.*, r.role_name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = ?`,
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
export { initDatabase, test, UserService, EmailService, RoleService };
// let { pool, promisePool } = await initDatabase();
// let user = await UserService.getByEmail("a@b", promisePool);
// console.log(user);
// let roles = await RoleService.getUserRoles(user.id, promisePool);
// console.log(roles);
