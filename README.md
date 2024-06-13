# WritingInColor

## Setup
First, ensure that you have either [Bun](https://bun.run/) or [Node](https://nodejs.org/) installed. 

While in this directory, enter `bun install` or `npm install` to install the dependencies.


### Database
Make sure you have MySQL installed and the server is running. 
I ran into an issue with file access when setting up the server, but my solution is [here](https://stackoverflow.com/questions/53242775/mysql-server-instance-8-0-13-automatically-turned-off-and-on-randomly/78618450#78618450).

Next, run the `setup.sql` file to setup the database for this project. (This is unfinished)

## Usage
To start the server, run `bun run start` or `npm run start` to start in development mode (i.e. without `vite`)

To start in production mode, run `bun run production` or `npm run production`

## Navigating the code.
The server code can be found in the `server` directory. The database is not yet setup. 

## During Development
Edits require a server restart.

# TODO: finish this readme.