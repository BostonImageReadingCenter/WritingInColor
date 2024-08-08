document.addEventListener("DOMContentLoaded", function() {
    const menuButton = document.getElementById("menu-button");
    const menuIcon = document.getElementById("menu-icon");
    const menuLines = document.getElementById("menu-lines");
    const subMenus = document.querySelectorAll('.main-menu p, .account-settings p');

    menuIcon.addEventListener("click", function() {
        menuButton.classList.toggle("show");
    });

    menuLines.addEventListener("click", function() {
        menuButton.classList.toggle("show");
    });

    subMenus.forEach(menu => {
        menu.addEventListener("click", function() {
            this.classList.toggle("active");
        });
    });
});
