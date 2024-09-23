window.addEventListener("load", () => {
	Array.from(document.getElementsByClassName("donate-button")).forEach(
		(element) => {
			element.addEventListener("click", () => {
				window.location.href = "https://givebutter.com/l6Qr7d";
			});
		}
	);
	document.getElementById("social-fb").addEventListener("click", () => {
		window.location.href = "https://www.facebook.com/squarespace";
	});
	document.getElementById("social-X").addEventListener("click", () => {
		window.location.href = "https://x.com/WICnonprofit";
	});
	document.getElementById("social-insta").addEventListener("click", () => {
		window.location.href =
			"'https://www.instagram.com/writingincolorboston/?igsh=MWxzZ3A1OTF1aGxsOA%3D%3D'";
	});
	document.getElementById("login-icon").addEventListener("click", () => {
		window.location.href = "/login";
	});
	document.getElementById("contact-us-button").addEventListener("click", () => {
		window.location.href = "https://forms.gle/rS6dqRQDqKGDYNRH6";
	});
	document.getElementById("phrase").addEventListener("click", () => {
		window.location.href = "https://forms.gle/rS6dqRQDqKGDYNRH6";
	});
});

document.addEventListener("DOMContentLoaded", function () {
	const menuButton = document.getElementById("menu-button");
	const menuBar = document.getElementById("menu-bar");
	const subMenus = document.querySelectorAll(
		".main-menu p, .account-settings p"
	);

	menuButton.addEventListener("click", function () {
		menuBar.classList.toggle("show");
	});

	subMenus.forEach((menu) => {
		menu.addEventListener("click", function () {
			this.classList.toggle("active");
		});
	});
	// Function to scroll smoothly to a target element
	function scrollToSection(target) {
		if (target) {
			window.scrollTo({
				top: target.offsetTop,
				behavior: "smooth",
			});
		}
	}

	// Set event listeners for menu items
	document.getElementById("course").addEventListener("click", function (e) {
		e.preventDefault();
		const courseSection = document.querySelector(".courses");
		scrollToSection(courseSection);
	});

	document
		.getElementById("testimonials")
		.addEventListener("click", function (e) {
			e.preventDefault();
			const testimonialsSection = document.getElementById(
				"testimonial-section"
			);
			scrollToSection(testimonialsSection);
		});

	document.getElementById("mission").addEventListener("click", function (e) {
		e.preventDefault();
		const missionSection = document.querySelector(".mission");
		scrollToSection(missionSection);
	});

	document.getElementById("founders").addEventListener("click", function (e) {
		e.preventDefault();
		const foundersSection = document.querySelector(".founders");
		scrollToSection(foundersSection);
	});
	/*
				document
					.getElementById("icons")
					.addEventListener("click", function (e) {
						e.preventDefault();
						const contactUs = document.querySelector(".icons");
						scrollToSection(contactUs);
					});
				*/
	document.getElementById("sign-out").addEventListener("click", function () {
		window.location.href = "/logout";
	});
	document.getElementById("settings").addEventListener("click", function () {
		window.location.href = "/my-profile";
	});
});
