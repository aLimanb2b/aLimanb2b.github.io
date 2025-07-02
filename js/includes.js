function loadHTML(selector, url) {
    fetch(url)
      .then(response => response.text())
      .then(data => {
        document.querySelector(selector).innerHTML = data;
  
        // If this is the footer, update the year
        if (selector === '#footer-placeholder') {
          const yearSpan = document.getElementById('year');
          if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
          }
        }
      })
      .catch(error => console.error('Error loading ' + url + ':', error));
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    loadHTML('#header-placeholder', 'header.html');
    loadHTML('#footer-placeholder', 'footer.html');
  });
  