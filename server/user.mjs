class User {
	constructor(options = {}) {
		this.admin = options.admin || false;
	}
}

export default User;
