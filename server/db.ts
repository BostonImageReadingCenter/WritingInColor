import mysql, { Pool, PoolConnection } from "mysql2/promise";

import { MySQLConfig } from "./constants";
import { parse as uuidParse } from "uuid-parse";
import { Email, Passkey, User } from "./types";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";

async function testConnection(pool: Pool, tries = 0) {
	if (tries > 5) {
		throw new Error("Too many tries, aborting");
	}
	tries++;
	try {
		// Test the connection
		await pool.query("SELECT * FROM users");
		console.log("\x1b[32mMySQL server running!\x1b[0m");
	} catch (err) {
		if (err.code === "ECONNREFUSED") {
			console.log(
				"\x1b[31mMySQL server not running!\x1b[0m Starting MySQL server..."
			);
			spawn("mysqld"); // Start the MySQL server
			await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for the server to start
			testConnection(pool, tries); // Try again
		} else {
			throw err;
		}
	}
}
async function initDatabase(): Promise<Pool> {
	const pool = mysql.createPool(MySQLConfig);
	testConnection(pool);
	return pool;
}

type Queryable = Pool | PoolConnection;
class Database {
	pool: mysql.Pool;
	constructor() {
		initDatabase().then((pool) => {
			this.pool = pool;
		});
	}
	getConnection() {
		return this.pool.getConnection();
	}
	async query(sql: string, values: any) {
		return await this.pool.query(sql, values);
	}
	async getUserById(userID: Buffer, connection: Queryable = this.pool) {
		const user: User = new User({
			...(
				await connection.query("SELECT * FROM users WHERE id = ?", [userID])
			)[0][0],
		});
		return user;
	}
	async getUserByEmail(email: string, connection: Queryable = this.pool) {
		let user: User = (
			await connection.query(
				"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
				[email]
			)
		)[0][0];
		return user;
	}
	async getEmailsByUserID(
		userID: Buffer,
		connection: Queryable = this.pool
	): Promise<Email[]> {
		return (
			await connection.query("SELECT * FROM emails WHERE user_id = ?", [userID])
		)[0] as Email[];
	}
	async addEmailToUser(
		userID: Buffer,
		email: string,
		connection: Queryable = this.pool
	) {
		await connection.query(
			"INSERT INTO emails (user_id, email) VALUES (?, ?)",
			[userID, email]
		);
	}
	async getPasskeysByUserID(
		userID: Buffer,
		connection: Queryable = this.pool
	): Promise<Passkey[]> {
		return (
			await connection.query("SELECT * FROM passkeys WHERE user_id = ?", [
				userID,
			])
		)[0] as Passkey[];
	}
	async getUserRoles(userID: Buffer, connection: Queryable = this.pool) {
		return (
			await connection.query(`SELECT * FROM user_roles WHERE user_id = ?`, [
				userID,
			])
		)[0];
	}
	async addUserRole(
		userID: Buffer,
		roleID: number,
		connection: Queryable = this.pool
	) {
		await connection.query(
			"INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
			[userID, roleID]
		);
	}
	async addPasskeyToUser(
		userID: Buffer,
		passkey: Passkey,
		connection: Queryable = this.pool
	) {
		await connection.query(
			"INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?, ?)",
			[
				passkey.id ?? Buffer.from(uuidParse(uuidv4())),
				userID,
				passkey.credential_id,
				passkey.public_key,
				passkey.counter,
				passkey.transports,
			]
		);
	}
	async createUser(
		{
			user,
			emails,
			passkeys,
		}: {
			user: User;
			emails: string[];
			passkeys: Passkey[];
		},
		connection?: PoolConnection
	) {
		connection ??= await this.getConnection();
		try {
			await connection.beginTransaction();
			// Create user
			await connection.query(
				"INSERT INTO users (id, salt, password, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
				[
					user.id,
					user.salt ?? null,
					user.password ?? null,
					user.first_name ?? null,
					user.last_name ?? null,
				]
			);

			// Add emails
			for (const email of emails) {
				this.addEmailToUser(user.id, email, connection);
			}

			// Add passkeys
			for (const passkey of passkeys) {
				this.addPasskeyToUser(user.id, passkey, connection);
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback(); // Undo the changes in case of an error.
			throw error;
		} finally {
			connection.release();
		}
	}

	async deleteUser(userID: Buffer, connection: Queryable = this.pool) {
		await connection.query("DELETE FROM users WHERE id = ?", [userID]);
	}
}

export { initDatabase, Database };
