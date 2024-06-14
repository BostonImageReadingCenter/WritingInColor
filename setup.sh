#!/bin/bash

export $(grep -v '^#' .env | xargs)
echo "Username: $DB_USERNAME"
echo "Password: $DB_PASSWORD"
printf "Please enter your MySQL root password.\n"
mysql -u root -p -e "
-- Get @username and @password variables
SET @username = '${env:DB_USERNAME}';
SET @password = '${env:DB_PASSWORD}';

-- Create database
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
SELECT '${DB_USERNAME}' AS message;
SELECT '${DB_PASSWORD}' AS message;
-- Create user and grant privileges
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON WritingInColor.* TO '${DB_USERNAME}'@'localhost';
FLUSH PRIVILEGES;


USE WritingInColor;


CREATE TABLE IF NOT EXISTS users (
	id BINARY(16) PRIMARY KEY,
	salt VARCHAR(255) DEFAULT NULL,
	password VARCHAR(255) DEFAULT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
	id BINARY(16) PRIMARY KEY,
	user_id BINARY(16),
	email VARCHAR(255) NOT NULL,
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

CREATE TABLE IF NOT EXISTS roles (
	id INT AUTO_INCREMENT PRIMARY KEY,
	role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
	user_id BINARY(16),
	role_id INT,
	PRIMARY KEY (user_id, role_id),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT INTO roles (role_name) VALUES ('admin'), ('moderator'), ('instructor'), ('developer'), ('student');
"
