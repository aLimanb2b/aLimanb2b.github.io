document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector('[data-slider="hero"]');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll("[data-slide]"));
    const dotsContainer = slider.querySelector("[data-dots]");
    if (!slides.length) return;

    let activeIndex = 0;
    let intervalId;

    const setActive = (index) => {
        activeIndex = index;
        slides.forEach((slide, idx) => {
            slide.classList.toggle("active", idx === index);
        });

        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll(".slider-dot");
            dots.forEach((dot, idx) => {
                const isActive = idx === index;
                dot.classList.toggle("active", isActive);
                dot.setAttribute("aria-current", isActive ? "true" : "false");
            });
        }
    };

    const nextSlide = () => {
        const nextIndex = (activeIndex + 1) % slides.length;
        setActive(nextIndex);
    };

    const restartInterval = () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = window.setInterval(nextSlide, 3500);
    };

    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        slides.forEach((_, idx) => {
            const dot = document.createElement("button");
            dot.className = "slider-dot";
            dot.type = "button";
            dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
            dot.addEventListener("click", () => {
                setActive(idx);
                restartInterval();
            });
            dotsContainer.appendChild(dot);
        });
    }

    setActive(0);
    restartInterval();

    slider.addEventListener("mouseenter", () => {
        if (intervalId) clearInterval(intervalId);
    });

    slider.addEventListener("mouseleave", restartInterval);
});
