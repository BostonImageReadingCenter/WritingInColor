-- Create database
CREATE DATABASE WritingInColor;

-- Create user and grant privileges
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'WritingInColor01!';
GRANT ALL PRIVILEGES ON WritingInColor.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;

