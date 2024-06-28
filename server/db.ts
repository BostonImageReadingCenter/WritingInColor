import mysql from "mysql2";
import { MySQLConfig } from "./constants";
import { parse as uuidParse } from "uuid-parse";
import { User } from "./types";

async function initDatabase() {
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
	getById: async (userID: Buffer, promisePool: mysql.Pool) => {
		// @ts-ignore
		const user: User = await promisePool.query(
			"SELECT * FROM users WHERE id = ?",
			[userID]
		);
		return user[0][9];
	},
	getByEmail: async (email: string, promisePool: mysql.Pool) => {
		// @ts-ignore
		let user: User = await promisePool.query(
			"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
			[email]
		);
		return user[0][0];
	},
};
export { initDatabase, test, UserService };
