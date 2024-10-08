const path = require("path");
const webpack = require("webpack"); // Import webpack

module.exports = {
	entry: {
		core: "./client/static/javascript/core.ts",
		login: "./client/static/javascript/login.ts",
		adminPanel: "./client/static/javascript/admin-panel.ts",
		test: "./client/static/javascript/test.ts",
		"passive-authentication":
			"./client/static/javascript/passive-authentication.ts",
		"database-management": "./client/static/javascript/database-management.ts",
		userProfile: "./client/static/javascript/user-profile.ts",
		home: "./client/static/javascript/home.ts",
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "client/static/javascript/bundle"),
	},
	module: {
		rules: [
			{
				test: /\.(ts|js)x?$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
				},
			},
		],
	},
	experiments: {
		asyncWebAssembly: true,
	},
};
