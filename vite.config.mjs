// vite.config.mjs
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	root: "./client",
	build: {
		outDir: "../dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, "client/index.html"),
				layout: resolve(__dirname, "client/layout.html"),
				admin_panel: resolve(__dirname, "client/admin-panel.html"),
				// ...
				// List all files you want in your build
			},
		},
	},
	// server: {
	// 	port: 3000,
	// },
});
