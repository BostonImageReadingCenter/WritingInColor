import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

// Database connection configuration
const config = {
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

// Utility function to convert UUID to binary
function uuidToBinary(uuid) {
	return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

async function initDatabase() {
	const pool = await mysql.createPool(config);
	const promisePool = pool.promise();
	const connection = await pool.getConnection();

	try {
		// Create users table
		await connection.execute(`
		CREATE TABLE IF NOT EXISTS users (
			id BINARY(16) PRIMARY KEY,
			salt VARCHAR(255) DEFAULT NULL,
			password VARCHAR(255) DEFAULT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
		`);

		// Create emails table
		await connection.execute(`
		CREATE TABLE IF NOT EXISTS emails (
			id BINARY(16) PRIMARY KEY,
			user_id BINARY(16),
			email VARCHAR(255) NOT NULL,
			is_primary BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(email)
		)
		`);

		// Create passkeys table
		await connection.execute(`
		CREATE TABLE IF NOT EXISTS passkeys (
			id BINARY(16) PRIMARY KEY,
			user_id BINARY(16),
			credential_id VARCHAR(255) NOT NULL,
			public_key TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			counter INT NOT NULL,
    		transports VARCHAR(255),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`);

		// Create roles table
		await connection.execute(`
		CREATE TABLE IF NOT EXISTS roles (
			id INT AUTO_INCREMENT PRIMARY KEY,
			role_name VARCHAR(50) NOT NULL UNIQUE
		)
		`);

		// Create user_roles table
		await connection.execute(`
		CREATE TABLE IF NOT EXISTS user_roles (
			user_id BINARY(16),
			role_id INT,
			PRIMARY KEY (user_id, role_id),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
		)
		`);

		// Create roles: admin, moderator, instructor, developer, student
		await connection.execute(`
		INSERT INTO roles (role_name) VALUES ("admin"), ("moderator"), ("instructor"), ("developer"), ("student")
		`);
		console.log("\x1b[32mDatabase setup completed.\x1b[0m");
	} catch {
		console.log("\x1b[31mDatabase setup failed.\x1b[0m");
	} finally {
		connection.release();
	}
	return { pool, promisePool };
}
async function createUser(pool, emails, passkeys, roles, password, salt) {
	// Password was already hashed and salted.
	const connection = pool.promise();
	let userID = uuidToBinary(uuidv4());

	await connection.execute(
		"INSERT INTO users (id, salt, password) VALUES (?, ?, ?)",
		[userID, salt, password]
	);

	for (const email of emails) {
		await connection.execute(
			"INSERT INTO emails (id, user_id, email) VALUES (?, ?, ?)",
			[uuidToBinary(uuidv4()), userID, email]
		);
	}

	for (const passkey of passkeys) {
		// TODO
	}

	for (const role of roles) {
		await connection.execute(
			"INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
			[userID, role]
		);
	}
}
export default initDatabase;
