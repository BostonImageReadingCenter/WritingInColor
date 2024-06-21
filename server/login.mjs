async function* login(promisePool, options) {
	let emailData = yield {
		action: "collect",
		type: "email",
		header: "Please enter your email.",
		message: "We need your email to be sure its you.",
	};
	let [[user]] = await promisePool.query(
		"SELECT users.* FROM users JOIN emails ON users.id = emails.user_id WHERE emails.email = ?",
		[emailData.value]
	);
	if (!user) {
		// User does not exist
		let consent = yield {
			action: "collect",
			type: "binary",
			header: "Create an Account?",
			message: "You don't have an account yet. Would you like to create one?",
		};
		if (!consent.value)
			return {
				action: "exit",
			};

		// Continue with registration
	}
	// Continue with login
	console.log(user);
}
export { login };
