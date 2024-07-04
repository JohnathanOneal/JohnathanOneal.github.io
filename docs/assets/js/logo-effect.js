document.addEventListener('DOMContentLoaded', function() {
    const logo = document.querySelector('.logo');
    const xrayLogo = document.createElement('img');
    xrayLogo.src = logo.src;
    xrayLogo.alt = 'X-ray Logo';
    xrayLogo.classList.add('logo-xray');
    logo.parentNode.appendChild(xrayLogo);

    const navLinks = document.querySelectorAll('nav a');

    function flashXray(times, callback) {
        if (times > 0) {
            xrayLogo.style.opacity = '1';
            setTimeout(() => {
                xrayLogo.style.opacity = '0';
                setTimeout(() => flashXray(times - 1, callback), 100);
            }, 100);
        } else {
            callback();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Apply triple x-ray effect
            flashXray(3, () => {
                // Navigate to the link after the effect
                window.location = this.href;
            });
        });
    });
});