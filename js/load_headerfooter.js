function loadHTML(id, file, onLoad) {
  fetch(file)
    .then(res => res.text())
    .then(data => {
      const root = document.getElementById(id);
      if (!root) {
        return;
      }
      root.innerHTML = data;
      if (typeof onLoad === "function") {
        onLoad(root);
      }
    });
}

function initProfileMenu(root) {
  const container = root.querySelector(".nav-profile");
  if (!container) {
    return;
  }
  const button = container.querySelector(".profile-toggle");
  const menu = container.querySelector(".profile-menu");
  if (!button || !menu) {
    return;
  }

  const updateAuthState = () => {
    let signedIn = false;
    if (window.WebEndpoints && typeof window.WebEndpoints.getCurrentUser === "function") {
      signedIn = Boolean(window.WebEndpoints.getCurrentUser());
    } else {
      signedIn = Boolean(localStorage.getItem("bb_account_id"));
    }
    menu.querySelectorAll("[data-auth]").forEach((item) => {
      const mode = item.getAttribute("data-auth");
      item.style.display = mode === "signed-in" ? (signedIn ? "block" : "none") : (signedIn ? "none" : "block");
    });
  };

  const setOpen = (open) => {
    container.classList.toggle("open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!container.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  if (window.WebEndpoints && typeof window.WebEndpoints.onAuthStateChanged === "function") {
    try {
      window.WebEndpoints.onAuthStateChanged(updateAuthState);
    } catch (error) {
      updateAuthState();
    }
  } else {
    updateAuthState();
  }
}

loadHTML("header", "header.html", initProfileMenu);
loadHTML("footer", "footer.html");
  
