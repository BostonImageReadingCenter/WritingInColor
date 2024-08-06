# WritingInColor

Everything is top-notch in terms of security: biometric authentication, post quantum encryption, hashed and salted pbkdf2, SHA-512.

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
To start in development mode (easier client-side debugging), run `bun run dev` or `npm run dev`.

## Navigating the code.

My code is messy sometimes. It can get hard to navigate once things get bigger. The key is to continually refactor the design and re-organize things.

- The server code can be found in the `server` directory.
- The `server/types.ts` file is used on both the client side and the server side. Maybe I should move it to a different directory.
- `client` is the frontend.
- `client/static/javascript` contains the frontend JavaScript.
- `client/static/javascript/bundle` contains the compiled JavaScript code. When you link JavaScript files to the HTML files, always link to the bundled versions.
- `client/static/scss` contains the frontend SCSS code.
- `client/static/css` contains the compiled CSS code. Do NOT edit this, YOUR CHANGES WILL NOT BE SAVED.

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

- <https://github.com/corbado/passkey-tutorial/tree/main>
- <https://www.corbado.com/blog/passkey-tutorial-how-to-implement-passkeys>
- <https://medium.com/@ferrosful/-nodejs-security-unleashed-exploring-dos-ddos-attacks-cf089d5caff4>

## Security Status:

- **DDoS:**

  - **Meaning:** Distributed Denial of Service
  - **Our Solution:** Rate Limiting system
  - **Protection Implemented:** Not Yet

- **XSS:**

  - **Meaning:** Cross-Site Scripting
  - **Our Solution:** Strict Same Site Cookies
  - **Protection Implemented:** Yes

- **CSRF:**

  - **Meaning:** Cross-Site Request Forgery
  - **Our Solution:** Strict Same Site Cookies
  - **Protection Implemented:** Yes

- **SSRF:**

  - **Meaning:** Server-Side Request Forgery
  - **Our Solution:** Strict Same Site Cookies
  - **Protection Implemented:** Yes

- **Injection:**
  - **Meaning:** Injection of code or values that may be malicious
  - **Our Solution:** We don't run any user-provided code and we make sure to validate all input.
    **Protection Implemented:** Yes
