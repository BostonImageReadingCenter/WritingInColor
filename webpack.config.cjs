const path = require("path");
const webpack = require("webpack"); // Import webpack

module.exports = {
	entry: {
		core: "./client/static/javascript/core.js",
		login: "./client/static/javascript/login.js",
		adminPanel: "./client/static/javascript/admin-panel.js",
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "client/static/javascript/bundle"),
	},
	module: {
		rules: [
			{
				test: /\.js$/,
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
