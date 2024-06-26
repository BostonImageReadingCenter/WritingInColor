# WritingInColor
I'm making sure that everything is top-notch in terms of security: biometric authentication, post quantum encryption, hashed and salted pbkdf2, SHA-512.


## Setup
First, ensure that you have [Bun](https://bun.sh/) installed.

While in this directory, enter `bun install` or `npm install` to install the dependencies.

Make sure you have SCSS (Sass) installed. It can be found [here](https://github.com/sass/dart-sass/releases/latest).

#### Database
Ensure that you have MySQL installed and the server is running. 
I ran into an issue with file access when setting up the server, but my solution is [here](https://stackoverflow.com/questions/53242775/mysql-server-instance-8-0-13-automatically-turned-off-and-on-randomly/78618450#78618450).

Next, copy the template in `.env.example` to `.env` and set your username and password.

Finally, run `./setup.sh` to setup the database for this project.

## Usage
To start the server, run `bun run start` or `npm run start` to start.

## Navigating the code.
- The server code can be found in the `server` directory.
- `client` is the frontend.
- `client/static/javascript` contains the frontend JavaScript.
- `client/static/javascript/bundle` contains the compiled JavaScript code. When you link JavaScript files to the HTML files, always link to the bundled versions.

## During Development
Edits require a server restart.
If you add a new JavaScript file that is used ON ITS OWN, then you will need to add it to the list in `webpack.config.js`. Then you can import it from `/static/javascript/bundle`.


### User Roles
- Admin: All permissions.
- Moderator: Can delete comments, reviews, and community posts. 
- Instructor: Can manage courses and create blog posts.
- Developer: Can edit the website content.
- Student: Can create comments, reviews, and community posts.
- Security Specialist: Can access and manage the security panel.
Perhaps we should swap the role-base system out for a individual permission-based one?



### Notes to myself:
- https://github.com/corbado/passkey-tutorial/tree/main
- https://www.corbado.com/blog/passkey-tutorial-how-to-implement-passkeys
- https://medium.com/@ferrosful/- nodejs-security-unleashed-exploring-dos-ddos-attacks-cf089d5caff4