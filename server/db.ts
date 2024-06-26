import mysql from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";
import { parse as uuidParse } from "uuid-parse";

// Load environment variables
config();

// Database connection configuration
const MySQL_config = {
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

async function initDatabase() {
	const pool = mysql.createPool(MySQL_config);
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
export { initDatabase, test };
