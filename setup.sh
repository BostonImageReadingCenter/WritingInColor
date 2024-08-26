#!/bin/bash

export $(grep -v '^#' .env | xargs)
printf "Creating MySQL database and user as defined in .env\n"
echo "Database:   $DB_NAME"
echo "Host:       $DB_HOST"
echo "Username:   $DB_USERNAME"
echo "Password:   $DB_PASSWORD"
printf "\n\x1b[34;1mPlease enter your MySQL root password.\x1b[0m\n"
mysql -u root -p -e "
-- Get @username and @password variables
SET @username = '${env:DB_USERNAME}';
SET @password = '${env:DB_PASSWORD}';

-- Drop database if exists
DROP DATABASE IF EXISTS ${DB_NAME};

-- Create database
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
-- Create user and grant privileges
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USERNAME}'@'localhost';
FLUSH PRIVILEGES;


USE ${DB_NAME};


CREATE TABLE IF NOT EXISTS users (
    id BINARY(16) PRIMARY KEY,
    salt BINARY(64) DEFAULT NULL,
    password VARBINARY(512) DEFAULT NULL, -- 512 bits = 64 bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	first_name VARCHAR(255) DEFAULT NULL,
	last_name VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS emails (
	user_id BINARY(16),
	email VARCHAR(255) NOT NULL PRIMARY KEY,
	is_primary BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS passkeys (
	id BINARY(16) PRIMARY KEY,
	user_id BINARY(16),
	credential_id VARCHAR(255) NOT NULL,
	public_key TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	counter INT NOT NULL,
	transports VARCHAR(255),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS user_roles (
	user_id BINARY(16),
	role_id INT,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS revoked_refresh_tokens (
	token_id BINARY(16) PRIMARY KEY UNIQUE,
	expires_at DATETIME
);
"
chmod 777 build.sh