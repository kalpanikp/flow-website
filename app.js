/* ==========================================================================
   FLOW BREW & DINE - INTERACTION ENGINE (GSAP & SCROLLTRIGGER)
   ========================================================================== */

// Register ScrollTrigger Plugin when the CDN is available.
const hasMotionEngine = Boolean(window.gsap && window.ScrollTrigger);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (hasMotionEngine) {
  gsap.registerPlugin(ScrollTrigger);
}

// Global State for Preloader Caching Coordination
let sequenceCached = false;
let logotypeDrawn = false;
let preloaderExitPlayed = false;
window.flowFeedbackEnabled = true;
let flowTickAudioCtx = null;

function playFlowTickFeedback() {
  if (!window.flowFeedbackEnabled) return;

  try {
    if (!flowTickAudioCtx) {
      flowTickAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (flowTickAudioCtx.state === "suspended") {
      flowTickAudioCtx.resume();
    }

    const osc = flowTickAudioCtx.createOscillator();
    const gain = flowTickAudioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2600, flowTickAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, flowTickAudioCtx.currentTime + 0.018);
    gain.gain.setValueAtTime(0.16, flowTickAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, flowTickAudioCtx.currentTime + 0.018);
    osc.connect(gain);
    gain.connect(flowTickAudioCtx.destination);
    osc.start();
    osc.stop(flowTickAudioCtx.currentTime + 0.018);

    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  } catch (e) {
    // Feedback is non-critical; keep the product interaction smooth if audio is blocked.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileHeader();

  if (!hasMotionEngine) {
    initStaticFallback();
    return;
  }

  initPreloader();
  initHeroParallax();
  initHeroSequence();
  initEssenceAnimations();
  initSignaturePours();
  setupBeerDrawerControls();
  initExperienceMoods();
  initFluidMapBlob();
  initSmoothAnchors();
  initWebGLBackground();
});

function setupMobileHeader() {
  const navLinks = [
    ["Home", "index.html"],
    ["Brews", "beer.html"],
    ["Food", "food-menu.html"],
    ["Drinks", "drinks-menu.html"],
    ["Location", "location.html"],
    ["FAQ", "faq.html"],
    ["Media", "media.html"]
  ];

  document.querySelectorAll(".main-header").forEach((header) => {
    const container = header.querySelector(".header-container");
    const nav = header.querySelector(".nav-menu");
    if (!container || !nav) return;

    const list = nav.querySelector("ul");
    if (list && !nav.dataset.mobileLinksReady) {
      const isHomePage = window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/");

      list.innerHTML = "";
      navLinks.forEach(([label, href]) => {
        const item = document.createElement("li");
        item.className = "nav-menu-item";
        item.innerHTML = `<a href="${href}" class="nav-link">${label}</a>`;
        list.appendChild(item);
      });

      const bookItem = document.createElement("li");
      bookItem.className = "mobile-menu-extra";
      bookItem.innerHTML = `<a href="${isHomePage ? "#reservations" : "index.html#reservations"}" class="nav-link">Book a Table</a>`;
      list.appendChild(bookItem);
      nav.dataset.mobileLinksReady = "true";
    }

    if (header.querySelector(".mobile-menu-toggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-menu-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open site menu");
    button.innerHTML = "<span></span><span></span><span></span><em>Menu</em>";
    const cta = container.querySelector(".nav-cta");
    container.insertBefore(button, cta || nav);

    function setMenuState(isOpen) {
      header.classList.toggle("mobile-menu-open", isOpen);
      document.body.classList.toggle("mobile-menu-active", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Close site menu" : "Open site menu");
    }

    button.addEventListener("click", () => {
      setMenuState(!header.classList.contains("mobile-menu-open"));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setMenuState(false);
      });
    });
  });
}

window.addEventListener("load", () => {
  if (hasMotionEngine) {
    ScrollTrigger.refresh();
  }
});

function initStaticFallback() {
  const preloader = document.getElementById("preloader");
  if (preloader) preloader.style.display = "none";
  document.documentElement.classList.remove("preloader-active");
  document.body.classList.remove("preloader-active");
  document.body.classList.remove("age-gate-active");
  document.querySelectorAll(".hero-subtitle, .hero-title, .hero-desc, .hero-scroll-indicator").forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

/* ==========================================================================
   1. PRELOADER & LOGOTYPE REVEAL WITH CACHING TRACKER
   ========================================================================== */
function initPreloader() {
  const preloader = document.getElementById("preloader");
  const mascot = document.getElementById("mascot-octopus");
  const logoImg = document.getElementById("preloader-logo-img");
  const isMobileLoader = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion) {
    sequenceCached = true;
    logotypeDrawn = true;
    showAgeVerification();
    return;
  }
  
  gsap.set(".webgl-bg-container", { opacity: 0, zIndex: -2 });
  
  // A. Mascot Continuous Floating Animation (Simulates water floating)
  gsap.to(mascot, {
    y: "-=15",
    scaleX: 1.03,
    scaleY: 0.97,
    duration: isMobileLoader ? 2.2 : 3,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
  });
  
  // B. Elegant actual Logo Fade-in and Organic Scale Reveal
  gsap.set(logoImg, { opacity: 0, scale: 0.88 });
  
  gsap.to(logoImg, {
    opacity: 1,
    scale: 1,
    duration: isMobileLoader ? 0.8 : 2.2,
    ease: "power3.out",
    delay: isMobileLoader ? 0.08 : 0.5,
    onComplete: () => {
      logotypeDrawn = true;
      checkReadyToExit();
    }
  });
}

// Check if both cursive drawing and sequence caching are done, then show age verification
function checkReadyToExit() {
  if (sequenceCached && logotypeDrawn) {
    showAgeVerification();
  }
}

function showAgeVerification() {
  const progressWrap = document.querySelector(".loader-progress-wrap");
  const ageVerifyWrap = document.getElementById("age-verification-wrap");
  const dobInput = document.getElementById("dob-input");
  const errorMsg = document.getElementById("dob-error-msg");
  const isMobileLoader = window.matchMedia("(max-width: 768px)").matches;
  
  if (!ageVerifyWrap) {
    playPreloaderExit();
    return;
  }
  
  // Hide progress bar and fade in Age Verification elements smoothly
  gsap.to(progressWrap, {
    opacity: 0,
    y: -10,
    duration: isMobileLoader ? 0.18 : 0.4,
    ease: "power2.inOut",
    onComplete: () => {
      progressWrap.style.display = "none";
      ageVerifyWrap.style.display = "flex";
      gsap.to(ageVerifyWrap, {
        opacity: 1,
        y: 0,
        duration: isMobileLoader ? 0.28 : 0.6,
        ease: "power2.out"
      });
    }
  });

  const currentYear = new Date().getFullYear();
  dobInput.setAttribute("max", String(currentYear));

  // Bind the enter button action with birth-year age checks
  const verifyBtn = document.getElementById("btn-age-verify");
  if (verifyBtn && dobInput) {
    const verifyBirthYear = () => {
      const birthYear = Number.parseInt(dobInput.value, 10);
      const isValidYear = Number.isInteger(birthYear) && String(birthYear).length === 4 && birthYear >= 1900 && birthYear <= currentYear;

      if (!isValidYear) {
        if (errorMsg) {
          errorMsg.textContent = "Please enter a valid 4-digit birth year";
          errorMsg.style.display = "block";
        }
        return;
      }

      // Year-only gate: users must turn at least 21 during the current calendar year.
      const age = currentYear - birthYear;

      // Legal age check (21 or older)
      if (age >= 21) {
        if (errorMsg) errorMsg.style.display = "none";
        
        // Play click sound using bezel synthesizer
        try {
          if (typeof window.playWatchClick === "function") {
            window.playWatchClick();
          }
        } catch(e) {}
        
        // Hide age verification and trigger preloader exit
        gsap.to(ageVerifyWrap, {
          opacity: 0,
          y: -15,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            playPreloaderExit();
          }
        });
      } else {
        if (errorMsg) {
          errorMsg.textContent = "You must be 21 or older to enter";
          errorMsg.style.display = "block";
        }
      }
    };

    verifyBtn.addEventListener("click", verifyBirthYear);
    dobInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyBirthYear();
      }
    });
  }
}

function playPreloaderExit() {
  if (preloaderExitPlayed) return;
  preloaderExitPlayed = true;
  
  const preloader = document.getElementById("preloader");
  const mascot = document.getElementById("mascot-octopus");
  const isMobileLoader = window.matchMedia("(max-width: 768px)").matches;
  
  const exitTimeline = gsap.timeline({
    onComplete: () => {
      preloader.style.display = "none";
      document.documentElement.classList.remove("preloader-active");
      document.body.classList.remove("preloader-active");
      document.body.classList.remove("age-gate-active");
    }
  });

  exitTimeline
    // 1. Mascot scales up and fades out elegantly
    .to(mascot, {
      scale: 1.25,
      opacity: 0,
      duration: isMobileLoader ? 0.34 : 0.7,
      ease: "power3.in"
    })
    .to(".logotype-container, .loader-progress-wrap", {
      opacity: 0,
      y: -15,
      duration: isMobileLoader ? 0.26 : 0.5,
      ease: "power3.in"
    }, "-=0.5")
    // Fade out the WebGL background container as preloader exits
    .to(".webgl-bg-container", {
      opacity: 0,
      duration: isMobileLoader ? 0.4 : 1.0,
      ease: "power2.inOut",
      onComplete: () => {
        const container = document.querySelector(".webgl-bg-container");
        if (container) container.style.zIndex = "-2";
      }
    }, "-=0.5")
    // 2. Rich navy overlay slides up to reveal Hero under (STRICT BRIEF: Expo.easeInOut)
    .to(preloader, {
      yPercent: -100,
      duration: isMobileLoader ? 0.62 : 1.2,
      ease: "expo.easeInOut"
    }, "-=0.6");
}

/* ==========================================================================
   2. ANTIGRAVITY 2.0 HERO VORTEX & IDLE FLOAT (DOUBLE-LAYERED PARALLAX)
   ========================================================================== */
function initHeroParallax() {
  if (prefersReducedMotion) return;

  const heroWrapper = document.getElementById("hero-wrapper");
  const glassContainer = document.querySelector(".glass-container");
  const ingredients = document.querySelectorAll(".floating-ingredient");

  // A. ScrollTrigger Timeline for Swirling Zero-Gravity Parallax Scene
  const driftTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroWrapper,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5
    }
  });

  // Floating ingredients drift up, rotate in 3D (X, Y, Z), and swirl outward
  ingredients.forEach((ing) => {
    const speed = parseFloat(ing.getAttribute("data-speed")) || 1.5;
    const baseRot = parseFloat(ing.getAttribute("data-rotation")) || 0;
    
    driftTimeline.to(ing, {
      y: -280 * speed,
      x: (Math.random() - 0.5) * 120, // Circular vortex swirl
      rotationZ: baseRot + (90 * speed),
      rotationX: 45 * speed,
      rotationY: -35 * speed,
      ease: "none"
    }, 0);
  });

  // B. ScrollTrigger-bound sequential reveal and exit for hero typography
  // STRICT BRIEF: Fade them in sequentially as the user scrolls the first few hundred pixels.
  // Choreographed across the master scroll: fades in (0%-30%), holds, and fades out cleanly (70%-100%) to clear the viewport for the next section.
  
  // Set initial hidden states
  gsap.set([".hero-subtitle", ".hero-title", ".hero-desc", ".hero-scroll-indicator"], {
    opacity: 0,
    y: 35
  });

  // Fade-in Sequence (0% to 30% progress of the scrub)
  driftTimeline
    .to(".hero-subtitle", { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, 0)
    .to(".hero-title", { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, 0.03)
    .to(".hero-desc", { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, 0.06)
    .to(".hero-scroll-indicator", { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.09);

  // Fade-out Exit Sequence (70% to 100% progress of the scrub)
  driftTimeline
    .to(".hero-subtitle", { opacity: 0, y: -25, duration: 0.15, ease: "power2.in" }, 0.7)
    .to(".hero-title", { opacity: 0, y: -40, duration: 0.2, ease: "power2.in" }, 0.73)
    .to(".hero-desc", { opacity: 0, y: -25, duration: 0.2, ease: "power2.in" }, 0.76)
    .to(".hero-scroll-indicator", { opacity: 0, y: -15, duration: 0.12, ease: "power2.in" }, 0.79);

  // C. Subtle Idle Floating loop (keeps ingredients gently drifting when stationary)
  ingredients.forEach((ing, i) => {
    gsap.to(ing, {
      y: "+=12",
      x: "-=8",
      rotationZ: "+=5",
      duration: 3 + (i * 0.5),
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
  });
}

/* ==========================================================================
   3. ESSENCE OF FLOW REVEALS & MAGNETIC BUTTONS
   ========================================================================== */
function initEssenceAnimations() {
  if (prefersReducedMotion) return;

  // A. Staggered reveal of ingredient cards
  if (document.querySelector(".ingredients-grid") && document.querySelector(".ingredient-card")) {
    gsap.from(".ingredient-card", {
      scrollTrigger: {
        trigger: ".ingredients-grid",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 0,
      y: 60,
      duration: 1.0,
      stagger: 0.2,
      ease: "power3.out"
    });
  }

  // B. Magnetic Hover Effect on the minimal plus "+" buttons
  const magneticButtons = document.querySelectorAll(".btn-magnetic-add");

  magneticButtons.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(btn, {
        x: x * 0.45,
        y: y * 0.45,
        scale: 1.15,
        duration: 0.3,
        ease: "power2.out"
      });
      
      gsap.to(btn.querySelector(".plus-symbol"), {
        x: x * 0.2,
        y: y * 0.2,
        duration: 0.3,
        ease: "power2.out"
      });
    });

    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.4)"
      });
      
      gsap.to(btn.querySelector(".plus-symbol"), {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.4)"
      });
    });
  });
}

/* ==========================================================================
   3.5. SIGNATURE POURS PINNED PRODUCT REVEAL
   ========================================================================== */
function initSignaturePours() {
  const section = document.getElementById("signature-pours");
  const stage = document.querySelector(".signature-pours-stage");
  const productVisual = document.getElementById("signature-product-visual");
  const bottleImg = document.getElementById("signature-bottle-img");
  const bottleGlow = document.querySelector(".signature-glow");
  const bottleShadow = document.querySelector(".signature-shadow");
  const cards = document.querySelectorAll(".signature-info-card");
  const dots = document.querySelectorAll(".signature-dot");

  if (!section || !stage || !bottleImg || !cards.length) return;
  const isDesktopShowcase = window.innerWidth > 980;
  const isMobileShowcase = !isDesktopShowcase;
  const shouldUseScrollShowcase = hasMotionEngine && !prefersReducedMotion;

  const pourKeys = ["belgian", "german", "mango", "joey", "neipa", "stout", "cider", "mead"];
  const pourTheme = {
    belgian: { accent: "#DDBA75", base: "#F4EFE3" },
    german: { accent: "#D7A84E", base: "#F5E8CA" },
    mango: { accent: "#F0A93A", base: "#FFF1CF" },
    joey: { accent: "#D96A3B", base: "#F5E2D6" },
    neipa: { accent: "#E79544", base: "#F7E4C6" },
    stout: { accent: "#8C6044", base: "#E7DDD4" },
    cider: { accent: "#C5A84C", base: "#F4EFD4" },
    mead: { accent: "#B98234", base: "#F0E1C8" }
  };

  let activeIndex = 0;
  let hasMovedSignature = false;
  let suppressOpenUntil = 0;
  let signatureScrollTrigger = null;
  let mobileLastScrollIndex = -1;
  let activeBottleLayer = bottleImg;
  const bottleLayers = new Map();

  function getSignatureImageSrc(key) {
    const data = BEER_DATA[key];
    if (!data || !data.img) return "";
    const width = window.innerWidth <= 768 ? 480 : 800;
    return data.img.replace("Public/Beer Image/", "Public/Beer Image/homepage/").replace(".webp", `-${width}.webp`);
  }

  function setupSignatureImageLayers() {
    pourKeys.forEach((key, index) => {
      const image = index === 0 ? bottleImg : document.createElement("img");
      image.src = getSignatureImageSrc(key);
      image.alt = "";
      image.decoding = "async";
      image.loading = "eager";
      image.classList.add("signature-bottle-img", "signature-beer-layer");
      image.classList.toggle("active", index === 0);
      image.dataset.pourImage = key;

      if (index > 0) {
        image.setAttribute("aria-hidden", "true");
        productVisual.insertBefore(image, bottleShadow || null);
      }

      bottleLayers.set(key, image);
    });
  }

  function setActivePour(index, instant = false, withFeedback = true) {
    const clampedIndex = ((index % pourKeys.length) + pourKeys.length) % pourKeys.length;
    if (clampedIndex === activeIndex && !instant) return;

    activeIndex = clampedIndex;
    const key = pourKeys[activeIndex];
    const data = BEER_DATA[key];
    const theme = pourTheme[key] || pourTheme.belgian;
    const nextLayer = bottleLayers.get(key) || bottleImg;
    activeBottleLayer = nextLayer;

    section.style.setProperty("--signature-accent", theme.accent);
    if (isDesktopShowcase) {
      section.style.setProperty("--signature-base", theme.base);
    }
    if (productVisual && data) {
      productVisual.setAttribute("aria-label", `Open ${data.name} details`);
    }

    cards.forEach((card) => {
      card.classList.toggle("active", card.getAttribute("data-pour") === key);
    });

    dots.forEach((dot) => {
      dot.classList.toggle("active", dot.getAttribute("data-pour-dot") === key);
    });

    bottleLayers.forEach((image, imageKey) => {
      const isActiveLayer = imageKey === key;
      gsap.killTweensOf(image);
      image.classList.toggle("active", isActiveLayer);
      image.setAttribute("aria-hidden", String(!isActiveLayer));

      if (isActiveLayer) {
        if (instant || !isMobileShowcase) {
          gsap.set(image, {
            opacity: 1,
            y: isMobileShowcase ? 8 : 22,
            scale: isMobileShowcase ? 0.92 : 0.94,
            rotate: -1
          });
        }
      } else {
        gsap.set(image, {
          opacity: 0,
          y: isMobileShowcase ? 26 : 34,
          scale: 0.9,
          rotate: 2
        });
      }
    });

    if (withFeedback && !instant) {
      playFlowTickFeedback();
    }

    if (isMobileShowcase && hasMotionEngine) {
      if (instant) {
        gsap.set(nextLayer, { opacity: 1, y: 8, scale: 0.92, rotate: -1 });
        return;
      }

      gsap.fromTo(nextLayer,
        { opacity: 0, y: 56, scale: 0.84, rotate: 4 },
        {
          opacity: 1,
          y: 8,
          scale: 0.92,
          rotate: -1,
          duration: 0.58,
          ease: "power3.out",
          overwrite: "auto"
        }
      );

      if (bottleShadow) {
        gsap.fromTo(bottleShadow,
          { opacity: 0.18, scaleX: 0.72 },
          { opacity: 1, scaleX: 1, duration: 0.58, ease: "power3.out", overwrite: "auto" }
        );
      }

      return;
    }
  }

  function openActivePour() {
    if (hasMovedSignature || performance.now() < suppressOpenUntil) return;
    openBeerDrawerByKey(pourKeys[activeIndex]);
  }

  function movePour(direction) {
    setActivePour(activeIndex + direction);
  }

  function preloadPourImages() {
    return Promise.all(Array.from(bottleLayers.values()).map((image) => {
      if (typeof image.decode === "function") {
        return image.decode().catch(() => undefined);
      }

      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  setupSignatureImageLayers();
  const signatureImagePreload = preloadPourImages();
  signatureImagePreload.then(() => section.classList.add("signature-images-ready"));

  setActivePour(0, true, false);

  cards.forEach((card) => {
    const key = card.getAttribute("data-pour");
    const data = BEER_DATA[key];
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", data ? `Open ${data.name} details` : "Open beer details");
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      setActivePour(index);

      if (!prefersReducedMotion) {
        const sectionTop = signatureScrollTrigger ? signatureScrollTrigger.start : section.getBoundingClientRect().top + window.pageYOffset;
        const sectionEnd = signatureScrollTrigger ? signatureScrollTrigger.end : sectionTop + Math.max(1, section.offsetHeight - window.innerHeight);
        const target = sectionTop + (sectionEnd - sectionTop) * (index / (pourKeys.length - 1));

        window.scrollTo({
          top: target,
          behavior: "smooth"
        });
      }
    });
  });

  [productVisual, ...cards].forEach((target) => {
    if (!target) return;

    target.addEventListener("click", openActivePour);
  });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      movePour(1);
    } else if (e.key === "ArrowLeft") {
      movePour(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openActivePour();
    }
  });

  function startMobileRevealMotion() {
    gsap.set(".signature-copy", { opacity: 1, y: 0 });
    gsap.set(".signature-beer-layer.active", { y: 8, scale: 0.92, rotate: -1, opacity: 1 });

    gsap.to(productVisual, {
      y: -14,
      rotate: 0.8,
      duration: 2.4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    if (bottleGlow) {
      gsap.to(bottleGlow, {
        scale: 1.08,
        opacity: 0.86,
        duration: 2.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    }

    if (bottleShadow) {
      gsap.to(bottleShadow, {
        scaleX: 0.82,
        opacity: 0.62,
        duration: 2.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    }
  }

  if (!shouldUseScrollShowcase) return;

  if (isDesktopShowcase) {
    gsap.fromTo(".signature-copy",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reverse"
        }
      }
    );

    gsap.fromTo(".signature-beer-layer.active",
      { y: 120, scale: 0.78, rotate: -7, opacity: 1 },
      {
        y: 22,
        scale: 0.94,
        rotate: -1,
        opacity: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          end: "top top",
          scrub: 1
        }
      }
    );

    gsap.to(".signature-bg-orbit", {
      rotate: 12,
      scale: 1.08,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.6
      }
    });
  } else {
    startMobileRevealMotion();
  }

  if (isMobileShowcase) {
    signatureScrollTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerHeight * (pourKeys.length + 0.35)}`,
      pin: stage,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: false,
      invalidateOnRefresh: true,
      snap: {
        snapTo: 1 / (pourKeys.length - 1),
        duration: { min: 0.22, max: 0.42 },
        delay: 0.035,
        ease: "power2.out"
      },
      onEnter: () => {
        mobileLastScrollIndex = -1;
        setActivePour(0, true, false);
      },
      onLeaveBack: () => {
        mobileLastScrollIndex = -1;
        setActivePour(0, true, false);
      },
      onUpdate: (self) => {
        const index = Math.round(self.progress * (pourKeys.length - 1));
        if (index === mobileLastScrollIndex) return;
        mobileLastScrollIndex = index;
        setActivePour(index);
      }
    });
    return;
  }

  signatureScrollTrigger = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => `+=${window.innerHeight * (isDesktopShowcase ? pourKeys.length + 4 : pourKeys.length - 1)}`,
    pin: stage,
    pinSpacing: true,
    anticipatePin: isDesktopShowcase ? 1 : 0.85,
    scrub: isDesktopShowcase ? 0.18 : true,
    invalidateOnRefresh: true,
    onEnter: () => setActivePour(0, true, false),
    onLeaveBack: () => setActivePour(0, true, false),
    onUpdate: (self) => {
      const index = Math.round(self.progress * (pourKeys.length - 1));
      setActivePour(index);

      if (isMobileShowcase) return;

      const phase = self.progress * Math.PI * 2;
      gsap.to(activeBottleLayer, {
        y: 18 + Math.sin(phase) * 16,
        rotate: -1 + Math.sin(phase * 0.7) * 2.5,
        duration: 0.35,
        overwrite: "auto",
        ease: "sine.out"
      });
    }
  });
}

/* ==========================================================================
   4. OUR BREWS CIRCULAR PEDESTALS & DRAWER DETAILS
   ========================================================================== */
const BEER_DATA = {
  belgian: {
    name: "Belgian Wheat",
    style: "Traditional Witbier",
    abv: "4.8%",
    ibu: "12",
    temp: "4-6°C",
    desc: "A timeless, ultra-refreshing classic witbier. Brewed with premium unmalted wheat and spiced elegantly with crushed coriander seeds and organic Sweet orange peel. Crisp, slightly hazy, with a smooth velvet finish.",
    pairings: "Fresh garden salads, citrus-glazed chicken plates, grilled prawns, and soft goat cheese.",
    img: "Public/Beer Image/Belgian Wheat.webp"
  },
  german: {
    name: "German Wheat",
    style: "Hefeweizen",
    abv: "5.0%",
    ibu: "14",
    temp: "5-7°C",
    desc: "Authentic Bavarian-style wheat beer. Highlighting rich esters of ripe banana and aromatic clove synthesized by our custom German yeast strains. Hazy, full-bodied, and highly carbonated for an immaculate head.",
    pairings: "Classic German sausages, warm soft pretzels, roasted pork loin, and fresh apple tarts.",
    img: "Public/Beer Image/German Wheat.webp"
  },
  mango: {
    name: "Mango Lager",
    style: "Fruited Lager",
    abv: "4.5%",
    ibu: "10",
    temp: "3-5°C",
    desc: "A glorious summer special lager. Infused with sweet, sun-ripened local Alphonso mango pulp during late stages of maturation. Crisp clean lager backbone balanced with delicious tropical fruit notes.",
    pairings: "Spicy Asian curries, sweet mango habanero wings, grilled salmon, and vanilla panna cotta.",
    img: "Public/Beer Image/Mango Lager.webp"
  },
  joey: {
    name: "Flowy Joey",
    style: "Session IPA",
    abv: "4.2%",
    ibu: "25",
    temp: "6-8°C",
    desc: "Our signature sessionable IPA. Packed with robust dry-hopping cycles of Citra and Mosaic, delivering massive aromas of passionfruit, grapefruit, and pine without overwhelming bitterness. Crisp and highly approachable.",
    pairings: "Gourmet burgers, sharp cheddar sliders, spicy nachos, and thin-crust pepperoni pizzas.",
    img: "Public/Beer Image/Flowy Joey.webp"
  },
  neipa: {
    name: "Neipa",
    style: "New England IPA",
    abv: "6.2%",
    ibu: "35",
    temp: "7-9°C",
    desc: "A hazy, juicy, double dry-hopped powerhouse. Intense tropical fruit juice explosion with a soft pillowy mouthfeel from heavy oat flakes, showing exceptionally low bitterness and a smooth, aromatic hop finish.",
    pairings: "Glazed ribs, spicy fish tacos, pepper-jack grilled sandwiches, and mature blue cheese.",
    img: "Public/Beer Image/Neipa.webp"
  },
  stout: {
    name: "Oatmeal Stout",
    style: "Creamy Dark Stout",
    abv: "5.5%",
    ibu: "20",
    temp: "10-12°C",
    desc: "Deep, dark, and complex. Brewed with heavily roasted malts and loaded with flaked oats, resulting in a rich, creamy head and luxurious notes of dark chocolate, freshly roasted espresso, and caramelized sugar.",
    pairings: "Slow-cooked beef stews, dry-rubbed steaks, chocolate lava cake, and roasted espresso gelatos.",
    img: "Public/Beer Image/Oatmeal Stout.webp"
  },
  cider: {
    name: "Apple Cider",
    style: "Craft Fruit Cider",
    abv: "4.5%",
    ibu: "0",
    temp: "4-5°C",
    desc: "Crisp and bubbly cider fermented from fresh, cold-pressed Himachal apples. Perfectly balanced sweetness with a lively effervescence and a remarkably clean, dry apple-peel finish.",
    pairings: "Glazed pork ribs, creamy pasta, brie cheese, and warm cinnamon crumbles.",
    img: "Public/Beer Image/Apple Cider.webp"
  },
  mead: {
    name: "Honey Mead",
    style: "Artisan Sweet Mead",
    abv: "7.0%",
    ibu: "0",
    temp: "6-8°C",
    desc: "A luxurious nectar fermented with pure, raw forest honey sourced from local hives. Full-bodied, fragrant, with rich floral sweet honey notes and a warming, smooth alcoholic finish.",
    pairings: "Spicy tandoori platter, dry-fruit desserts, artisanal charcuterie boards, and roasted nuts.",
    img: "Public/Beer Image/Honey Mead.webp"
  }
};

function openBeerDrawerByKey(beerKey) {
  const data = BEER_DATA[beerKey];
  const drawer = document.getElementById("beer-drawer");
  const closeBtn = document.getElementById("drawer-close-btn");
  if (!data || !drawer) return;

  document.getElementById("drawer-beer-img").src = data.img;
  document.getElementById("drawer-beer-img").alt = `${data.name} at Flow Brew & Dine`;
  document.getElementById("drawer-beer-style").textContent = data.style;
  document.getElementById("drawer-beer-name").textContent = data.name;
  document.getElementById("drawer-beer-abv").textContent = data.abv;
  document.getElementById("drawer-beer-ibu").textContent = data.ibu;
  document.getElementById("drawer-beer-temp").textContent = data.temp;
  document.getElementById("drawer-beer-desc").textContent = data.desc;
  document.getElementById("drawer-beer-pairings").textContent = data.pairings;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  if (closeBtn) closeBtn.focus();
}

function setupBeerDrawerControls() {
  if (window.__flowDrawerControlsReady) return;
  window.__flowDrawerControlsReady = true;

  const drawer = document.getElementById("beer-drawer");
  const closeBtn = document.getElementById("drawer-close-btn");
  if (!drawer) return;

  const closeDrawer = () => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", closeDrawer);
  }

  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) {
      closeDrawer();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });
}

function initBrewsPedestals() {
  const cards = document.querySelectorAll(".beer-dial-card");
  const viewport = document.querySelector(".brews-dial-viewport");
  const track = document.getElementById("dial-track");
  
  if (!cards.length || !viewport || !track) return;

  if (!prefersReducedMotion) {
    // A. Header Reveal Scroll Trigger
    gsap.fromTo(".brews-header", 
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        scrollTrigger: {
          trigger: ".brews-header",
          start: "top 95%",
          end: "top 60%",
          scrub: true
        }
      }
    );

    // B. Watermark Parallax Scroll Trigger
    gsap.fromTo(".brews-parallax-bg-text", 
      { y: 0, opacity: 0.08 },
      {
        y: -80,
        opacity: 0.15,
        scrollTrigger: {
          trigger: ".brews-section",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );

    // B2. Elevating 3D Floating Panel Entrance Animation
    gsap.fromTo(".brews-section .container-fluid", 
      { 
        transform: "perspective(1200px) rotateX(10deg) translateY(70px) scale(0.96)",
        opacity: 0.82
      },
      {
        transform: "perspective(1200px) rotateX(0deg) translateY(0px) scale(1)",
        opacity: 1,
        scrollTrigger: {
          trigger: ".brews-section",
          start: "top 85%",
          end: "top 35%",
          scrub: 1.2
        }
      }
    );
  }

  // C. Interactive State Variables
  let progress = 0;
  let targetProgress = 0;
  let isDragging = false;
  let startX = 0;
  let startProgress = 0;
  
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  
  let lastClickSnap = 0;
  let animationFrameId = null;
  let lastProgress = 0;
  let smoothSway = 0;

  // D. Mobile Sound Unlock & Click Synthesizer
  let audioCtx = null;
  let hapticsEnabled = true; // User preference toggle state
  window.flowFeedbackEnabled = hapticsEnabled;
  
  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Pre-emptively unlock AudioContext on user interaction
  function unlockMobileAudio() {
    initAudioContext();
    // Play a silent short pulse to verify context state
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.005);
    }
    // Clean up unlocking listeners
    window.removeEventListener("touchstart", unlockMobileAudio);
    window.removeEventListener("click", unlockMobileAudio);
  }
  window.addEventListener("touchstart", unlockMobileAudio, { passive: true });
  window.addEventListener("click", unlockMobileAudio);

  function playWatchClick() {
    if (!hapticsEnabled) return; // Silent if disabled
    try {
      initAudioContext();
      if (!audioCtx) return;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(5800, audioCtx.currentTime); // High pitch watch bezel click
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.015);
      
      gain.gain.setValueAtTime(0.24, audioCtx.currentTime); // Clear audible volume feedback
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.015);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.015);
      
      // Trigger subtle haptic vibration (12ms) on supported mobile devices
      if (navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (e) {
      console.warn("Watch click audio failed", e);
    }
  }

  // Expose click synthesizer globally so the age verification enter button can trigger it
  window.playWatchClick = playWatchClick;

  // Sound & Haptic user controls toggle handler
  const toggleBtn = document.getElementById("feedback-toggle-btn");
  const toggleKnob = document.getElementById("feedback-toggle-knob");
  
  if (toggleBtn && toggleKnob) {
    toggleBtn.addEventListener("click", () => {
      hapticsEnabled = !hapticsEnabled;
      window.flowFeedbackEnabled = hapticsEnabled;
      toggleBtn.setAttribute("aria-pressed", String(hapticsEnabled));
      
      // Update UI toggle switch state
      if (hapticsEnabled) {
        toggleBtn.style.background = "#EBC486";
        toggleKnob.style.transform = "translateX(22px)";
        // Play quick feedback click
        playWatchClick();
      } else {
        toggleBtn.style.background = "rgba(255, 255, 255, 0.2)";
        toggleKnob.style.transform = "translateX(0px)";
      }
    });
  }


  // E. Parametric 3D Glass Arc Positioning Engine (Device Responsive)
  function render() {
    const viewportWidth = viewport.offsetWidth || window.innerWidth;
    const isMobile = window.innerWidth <= 600;
    
    // Calculate smooth sway based on progress delta per frame
    let delta = progress - lastProgress;
    // Bounds wrap filter to prevent jump spikes on wraps
    if (Math.abs(delta) > 1.5) delta = 0;
    smoothSway = smoothSway * 0.82 + delta * 0.18;
    let swayZ = smoothSway * -15; // Sideways glass sway
    let swayX = Math.min(10, Math.abs(smoothSway) * 8); // Forward glass tilt
    
    cards.forEach((card, idx) => {
      let offset = idx - progress;
      // Circular wrapped distance mapping between -4 and 4
      let wrapped = ((offset + 4) % 8 + 8) % 8 - 4;
      let t = wrapped / 4; // Normalized relative distance (-1.0 to 1.0)
      
      let x = 0;
      let scale = 1;
      let z = 0;
      let rotationY = 0;
      let opacity = 1;
      
      if (isMobile) {
        // Mobile Layout: Wide spacing, single-glass visibility focus
        x = Math.sin(t * Math.PI * 0.45) * viewportWidth * 0.32;
        scale = Math.cos(t * Math.PI * 0.45) * 0.2 + 0.8;
        z = (Math.cos(t * Math.PI * 0.45) - 1) * 200;
        rotationY = -t * 30;
        
        // Steep opacity fade: adjacent glasses are instantly hidden
        opacity = Math.max(0, 1 - Math.abs(wrapped) * 1.8);
      } else {
        // Desktop Layout: Volumetric wide curved layout
        x = Math.sin(t * Math.PI * 0.44) * viewportWidth * 0.42;
        scale = Math.cos(t * Math.PI * 0.44) * 0.28 + 0.72;
        z = (Math.cos(t * Math.PI * 0.44) - 1) * 350;
        rotationY = -t * 42;
        
        // Deep depth-of-field focus: adjacent cards blend softly into the background
        opacity = Math.pow(Math.cos(t * Math.PI * 0.44), 8.5);
      }
      
      // Z-indexing sorting
      let zIndex = Math.round(scale * 100);
      
      // Integrate interactive dynamic physics Z-sway and X-sway!
      let cardSwayZ = swayZ * (scale * 0.85);
      let cardSwayX = swayX * scale;
      
      card.style.transform = `translate3d(${x}px, 0px, ${z}px) scale(${scale}) rotateY(${rotationY}deg) rotateZ(${cardSwayZ}deg) rotateX(${cardSwayX}deg)`;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
      
      // Prevent background cards from intercepting mobile touch sweeps
      if (isMobile && Math.abs(wrapped) > 0.45) {
        card.style.pointerEvents = "none";
      } else {
        card.style.pointerEvents = "auto";
      }
      
      // Apply active visual tags
      if (Math.abs(wrapped) < 0.15) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });
    
    lastProgress = progress;
  }

  // F. Physics Spring & Snap Decay Loop
  function updatePhysics() {
    if (!isDragging) {
      let diff = targetProgress - progress;
      if (Math.abs(diff) > 0.0005) {
        progress += diff * 0.095;
        
        // Loop wrapping bounds safety
        if (Math.abs(progress) > 1000) {
          const wrapOffset = Math.round(progress / 8) * 8;
          progress -= wrapOffset;
          targetProgress -= wrapOffset;
        }
        
        render();
        
        let rounded = Math.round(progress);
        if (rounded !== lastClickSnap) {
          playWatchClick();
          lastClickSnap = rounded;
        }
      } else {
        progress = targetProgress;
        render();
        
        let rounded = Math.round(progress);
        if (rounded !== lastClickSnap) {
          playWatchClick();
          lastClickSnap = rounded;
        }
      }
    }
    animationFrameId = requestAnimationFrame(updatePhysics);
  }

  // G. Drag Interaction Handlers
  function getDragScale() {
    const viewportWidth = viewport.offsetWidth || window.innerWidth;
    const isMobile = window.innerWidth <= 600;
    // Mobile dragging requires slightly faster swipe ratio for high fluid reactivity
    return isMobile ? 1.6 / viewportWidth : 2.2 / viewportWidth;
  }

  function handleDragStart(clientX) {
    isDragging = true;
    startX = clientX;
    startProgress = progress;
    lastX = clientX;
    lastTime = performance.now();
    velocity = 0;
    
    // Resume audio context immediately on touch swipe
    initAudioContext();
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }

  function handleDragMove(clientX) {
    if (!isDragging) return;
    
    const dragScale = getDragScale();
    const dx = clientX - startX;
    
    progress = startProgress - dx * dragScale;
    render();
    
    let rounded = Math.round(progress);
    if (rounded !== lastClickSnap) {
      playWatchClick();
      lastClickSnap = rounded;
    }
    
    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) {
      const speed = (clientX - lastX) * dragScale;
      velocity = velocity * 0.4 + (speed / dt) * 0.6;
    }
    lastX = clientX;
    lastTime = now;
  }

  function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    const inertiaTarget = progress - velocity * 135;
    targetProgress = Math.round(inertiaTarget);
    
    animationFrameId = requestAnimationFrame(updatePhysics);
  }

  // Desktop Mouse Events
  viewport.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    handleDragStart(e.clientX);
  });

  window.addEventListener("mousemove", (e) => {
    handleDragMove(e.clientX);
  });

  window.addEventListener("mouseup", () => {
    handleDragEnd();
  });

  // Mobile Touch Events
  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    handleDragEnd();
  });

  // H. Card Direct Clicks and Detail Drawer Binding
  const drawer = document.getElementById("beer-drawer");
  const closeBtn = document.getElementById("drawer-close-btn");
  let lastFocusedElement = null;

  function openDrawer(data) {
    lastFocusedElement = document.activeElement;
    document.getElementById("drawer-beer-img").src = data.img;
    document.getElementById("drawer-beer-img").alt = `${data.name} at Flow Brew & Dine`;
    document.getElementById("drawer-beer-style").textContent = data.style;
    document.getElementById("drawer-beer-name").textContent = data.name;
    document.getElementById("drawer-beer-abv").textContent = data.abv;
    document.getElementById("drawer-beer-ibu").textContent = data.ibu;
    document.getElementById("drawer-beer-temp").textContent = data.temp;
    document.getElementById("drawer-beer-desc").textContent = data.desc;
    document.getElementById("drawer-beer-pairings").textContent = data.pairings;

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }
  
  cards.forEach((card, idx) => {
    let clickStartX = 0;
    let clickStartY = 0;
    const beerKey = card.getAttribute("data-beer");
    const data = BEER_DATA[beerKey];

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", data ? `View ${data.name} tasting profile` : "View beer tasting profile");
    
    card.addEventListener("mousedown", (e) => {
      clickStartX = e.clientX;
      clickStartY = e.clientY;
    });
    
    card.addEventListener("click", (e) => {
      if (e.clientX !== undefined) {
        let dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
        if (dist > 8) return;
      }
      
      let currentProgress = progress;
      let diff = idx - (currentProgress % 8);
      diff = ((diff + 4) % 8 + 8) % 8 - 4;
      let newTarget = currentProgress + diff;
      
      if (Math.abs(progress - newTarget) < 0.15) {
        const beerKey = card.getAttribute("data-beer");
        const data = BEER_DATA[beerKey];
        if (!data) return;
        openDrawer(data);
      } else {
        targetProgress = newTarget;
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      card.click();
    });
  });

  closeBtn.addEventListener("click", () => {
    closeDrawer();
  });

  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) {
      closeDrawer();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  // I. Initial Rendering & Physics Startup
  render();
  animationFrameId = requestAnimationFrame(updatePhysics);
  
  window.addEventListener("resize", render);
}

/* ==========================================================================
   5. EXPERIENCE MOOD CARD COLLAPSE/EXPAND
   ========================================================================== */
function initExperienceMoods() {
  const columns = document.querySelectorAll(".experience-column");

  columns.forEach((col) => {
    col.addEventListener("mouseenter", () => {
      columns.forEach((c) => c.classList.remove("active-mood"));
      col.classList.add("active-mood");
    });
  });
}

/* ==========================================================================
   6. FLUID MAP BLOB AND MAGNETIC LAUNCHER
   ========================================================================== */
function initFluidMapBlob() {
  const container = document.getElementById("magnetic-map-container");
  const trigger = document.getElementById("google-maps-trigger");

  if (!container || !trigger) return;

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(container, {
      x: x * 0.35,
      y: y * 0.35,
      duration: 0.4,
      ease: "power2.out"
    });

    gsap.to(container.querySelector(".map-blob-content"), {
      x: x * 0.15,
      y: y * 0.15,
      duration: 0.4,
      ease: "power2.out"
    });
  });

  container.addEventListener("mouseleave", () => {
    gsap.to(container, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.4)"
    });

    gsap.to(container.querySelector(".map-blob-content"), {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.4)"
    });
  });
}

/* ==========================================================================
   7. SMOOTH ANCHORS SCROLLING
   ========================================================================== */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const drawer = document.getElementById("beer-drawer");
        if (drawer) drawer.classList.remove("open");

        const headerOffset = 90;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    });
  });
}

/* ==========================================================================
   8. SCROLL TRIGGER HIGH-FIDELITY USER CANVAS POUR SEQUENCE (VSYNC-DRIVEN)
   ========================================================================== */
function initHeroSequence() {
  const canvas = document.getElementById("hero-sequence-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");

  // 1. Detect Viewport & Set Dynamic Variables (STRICT USER SPECIFICATION)
  const isMobile = window.innerWidth <= 768;
  const startFrame = 1; // High-res sequence starts at frame_001.webp
  const endFrame = 79;  // High-res sequence ends at frame_079.webp
  const totalFramesLoaded = (endFrame - startFrame) + 1; // 79 frames total

  // Set Canvas Dimensions to exact high-resolution image sizes for pixel-perfection
  canvas.width = isMobile ? 1080 : 1280; 
  canvas.height = isMobile ? 1920 : 720;

  // Dynamic Path prefix resolver (auto-detects if "Public/" is needed in paths)
  let pathPrefix = "Public/";
  const images = [];
  const sequenceState = { frame: 0 }; 

  // Dynamic Path Generator (high-res sequence)
  const currentFrame = index => {
    const paddedNumber = String(index).padStart(3, '0');
    const folder = isMobile ? 'sequence/mobile' : 'sequence/desktop';
    return `${pathPrefix}${folder}/frame_${paddedNumber}.webp`; 
  };

  if (prefersReducedMotion) {
    const firstImg = new Image();
    firstImg.src = currentFrame(startFrame);
    firstImg.onload = () => {
      images[0] = firstImg;
      render();
      sequenceCached = true;
      checkReadyToExit();
    };
    firstImg.onerror = () => {
      sequenceCached = true;
      checkReadyToExit();
    };
    images[0] = firstImg;
    return;
  }

  // Preloading image coordinator with percentage loader updates
  let loadedCount = 0;
  
  function trackProgress() {
    loadedCount++;
    const pct = Math.round((loadedCount / totalFramesLoaded) * 100);
    
    // Update preloader percentages and loading bars
    const barFill = document.getElementById("loader-bar-fill");
    const barText = document.getElementById("loader-pct");
    if (barFill) barFill.style.width = `${pct}%`;
    if (barText) barText.textContent = `${pct}%`;

    const readyThreshold = isMobile ? 8 : totalFramesLoaded;

    // On mobile, unblock the age gate once the first essential frames are ready.
    if (!sequenceCached && loadedCount >= readyThreshold) {
      sequenceCached = true;
      checkReadyToExit();
    }
  }

  function startPreloadingSequence() {
    // 2. Preload First Frame instantly for immediate render (STRICT BRIEF)
    const firstImg = new Image();
    firstImg.src = currentFrame(startFrame);
    firstImg.onload = () => {
      images[0] = firstImg;
      render();
      trackProgress();
    };
    firstImg.onerror = () => {
      trackProgress();
    };
    images[0] = firstImg; // Store at index 0 (frame index 0 corresponds to startFrame)

    function loadFrame(i) {
      const arrayIndex = i - startFrame;
      const img = new Image();
      img.decoding = "async";
      img.src = currentFrame(i);
      img.onload = () => {
        trackProgress();
      };
      img.onerror = () => {
        trackProgress();
      };
      images[arrayIndex] = img;
    }

    if (isMobile) {
      const essentialFrameCount = 12;
      const essentialEnd = Math.min(endFrame, startFrame + essentialFrameCount - 1);

      for (let i = startFrame + 1; i <= essentialEnd; i++) {
        loadFrame(i);
      }

      let nextFrame = essentialEnd + 1;
      const loadNextIdleFrame = () => {
        if (nextFrame > endFrame) return;
        loadFrame(nextFrame);
        nextFrame++;
        window.setTimeout(loadNextIdleFrame, 70);
      };

      window.setTimeout(loadNextIdleFrame, 500);
    } else {
      // Desktop can afford the richer parallel preload without hurting touch response.
      for (let i = startFrame + 1; i <= endFrame; i++) {
        loadFrame(i);
      }
    }

    // 4. GSAP ScrollTrigger Logic with Bulletproof Programmatic Pinning (STRICT USER SPECIFICATION)
    gsap.to(sequenceState, {
      frame: totalFramesLoaded - 1, // GSAP animates through the array index (0 to 78)
      snap: "frame",
      ease: "none",
      scrollTrigger: {
        trigger: "#hero-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        pin: ".hero-sticky",
        pinSpacing: false,
        onUpdate: () => requestAnimationFrame(render)
      }
    });
  }

  function tryLoadingPrefix() {
    const testImg = new Image();
    const folder = isMobile ? 'sequence/mobile' : 'sequence/desktop';
    testImg.src = `${pathPrefix}${folder}/frame_001.webp`;
    
    testImg.onload = () => {
      // Prefix is correct, start loading all frames
      startPreloadingSequence();
    };
    
    testImg.onerror = () => {
      if (pathPrefix === "Public/") {
        // Fallback: try loading without prefix (served from subfolder)
        pathPrefix = "";
        tryLoadingPrefix();
      } else {
        console.error("Failed to load sequence frames from both Public/ and root paths. Defaulting to Public/ relative prefix.");
        // Safety bypass fallback: set prefix back to Public/ and start preloading anyway
        pathPrefix = "Public/";
        startPreloadingSequence();
      }
    };
  }

  // Start prefix auto-detection
  tryLoadingPrefix();

  // 5. Draw to Canvas (STRICT USER SPECIFICATION with safety state check & integer rounding)
  function render() {
    const activeFrame = Math.round(sequenceState.frame);
    const img = images[activeFrame];
    if (img && img.complete && img.naturalWidth > 0) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }
}

/* ==========================================================================
   9. FIXED WEBGL AMBIENT LIQUID BACKGROUND ENGINE
   ========================================================================== */
function initWebGLBackground() {
  if (prefersReducedMotion) return;
  if (window.innerWidth <= 768) return;

  const canvas = document.getElementById("webgl-bg-canvas");
  const container = document.querySelector(".webgl-bg-container");
  if (!canvas || !container) return;

  // Set canvas scale based on bounding box
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let gl = canvas.getContext("webgl2");
  let isWebGL2 = true;
  if (!gl) {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    isWebGL2 = false;
  }
  if (!gl) {
    console.warn("WebGL not supported. Falling back to CSS backgrounds.");
    return;
  }

  // A. Shader Sources
  const baseVertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const splatShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uSource;
    uniform vec2 uPoint;
    uniform vec3 uColor;
    uniform float uRadius;
    void main() {
      float d = length(vUv - uPoint);
      float factor = exp(-d * d / uRadius);
      vec4 base = texture2D(uSource, vUv);
      gl_FragColor = base + vec4(uColor, 1.0) * factor;
    }
  `;

  const advectShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 uTexelSize;
    uniform float uDt;
    uniform float uDissipation;
    void main() {
      vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
      gl_FragColor = uDissipation * texture2D(uSource, coord);
    }
  `;

  const divergenceShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    void main() {
      float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
      float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `;

  const pressureShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    uniform vec2 uTexelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).y;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).y;
      float div = texture2D(uDivergence, vUv).x;
      float p = 0.25 * (L + R + B + T - div);
      gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
    }
  `;

  const gradSubShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uPressure;
    uniform vec2 uTexelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).y;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).y;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      vel -= 0.5 * vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `;

  const renderShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uDye;
    uniform vec3 uBaseColor;
    uniform vec3 uColorDark;
    uniform vec3 uColorLight;
    void main() {
      vec4 dye = texture2D(uDye, vUv);
      float d = clamp(dye.r, 0.0, 1.0);
      vec3 color = mix(uColorDark, uBaseColor, d);
      color = mix(color, uColorLight, clamp(dye.g * 1.15, 0.0, 1.0));
      color = mix(color, uBaseColor, clamp(dye.b * 1.35, 0.0, 1.0));
      color = pow(color, vec3(1.15)) * 1.25;
      float vignette = vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y);
      vignette = clamp(pow(16.0 * vignette, 0.28), 0.0, 1.0);
      color *= mix(0.70, 1.0, vignette);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Helper: Compile Shader
  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Helper: Link & Cache Uniform Locations dynamically
  function createProgram(vsSource, fsSource) {
    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return null;
    }

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    program.uniforms = {};
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      program.uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }

    return program;
  }

  // B. Program Instantiations
  const splatProgram = createProgram(baseVertexShader, splatShader);
  const advectProgram = createProgram(baseVertexShader, advectShader);
  const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
  const pressureProgram = createProgram(baseVertexShader, pressureShader);
  const gradSubProgram = createProgram(baseVertexShader, gradSubShader);
  const renderProgram = createProgram(baseVertexShader, renderShader);

  // Buffer setups
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  function bindQuad(program) {
    const positionAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
  }

  // C. Double-Buffered Grid Settings for stable fluids solver
  const simWidth = 128;
  const simHeight = 128;

  function createFrameBuffer(width, height) {
    let textureType = gl.UNSIGNED_BYTE;
    let internalFormat = gl.RGBA;
    let format = gl.RGBA;
    let filter = gl.LINEAR;

    if (isWebGL2) {
      // In WebGL 2, RGBA16F with HALF_FLOAT is native and highly performant
      gl.getExtension('EXT_color_buffer_float');
      textureType = gl.HALF_FLOAT;
      internalFormat = gl.RGBA16F;
    } else {
      // In WebGL 1, check OES texture extensions
      const ext = gl.getExtension('OES_texture_half_float');
      const extLinear = gl.getExtension('OES_texture_half_float_linear');
      if (ext && extLinear) {
        textureType = ext.HALF_FLOAT_OES;
      } else {
        const extFloat = gl.getExtension('OES_texture_float');
        const extFloatLinear = gl.getExtension('OES_texture_float_linear');
        if (extFloat && extFloatLinear) {
          textureType = gl.FLOAT;
        }
      }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, textureType, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // Dynamic Fallback on Framebuffer Failure
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    return { texture, fbo, width, height };
  }

  function createDoubleBuffer(width, height) {
    let fbo1 = createFrameBuffer(width, height);
    let fbo2 = createFrameBuffer(width, height);
    return {
      get read() { return fbo1; },
      get write() { return fbo2; },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  const velocity = createDoubleBuffer(simWidth, simHeight);
  const dye = createDoubleBuffer(simWidth, simHeight);
  const divergence = createFrameBuffer(simWidth, simHeight);
  const pressure = createDoubleBuffer(simWidth, simHeight);

  // D. Master Beer Color States
  const currentColors = {
    base: [0.85, 0.56, 0.18],  // Warm amber gold
    light: [0.99, 0.95, 0.88], // Creamy light foam gold
    dark: [0.24, 0.10, 0.02]   // Deep roasted malt bronze
  };

  // Retain hexToRgb and transitionColors for safety compatibility
  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    const bigint = parseInt(hex, 16);
    return [
      (bigint >> 16 & 255) / 255.0,
      (bigint >> 8 & 255) / 255.0,
      (bigint & 255) / 255.0
    ];
  }

  function transitionColors(baseHex, lightHex, darkHex) {
    const baseRGB = hexToRgb(baseHex);
    const lightRGB = hexToRgb(lightHex);
    const darkRGB = hexToRgb(darkHex);
    gsap.to(currentColors.base, { 0: baseRGB[0], 1: baseRGB[1], 2: baseRGB[2], duration: 2.0, ease: "power2.out", overwrite: "auto" });
    gsap.to(currentColors.light, { 0: lightRGB[0], 1: lightRGB[1], 2: lightRGB[2], duration: 2.0, ease: "power2.out", overwrite: "auto" });
    gsap.to(currentColors.dark, { 0: darkRGB[0], 1: darkRGB[1], 2: darkRGB[2], duration: 2.0, ease: "power2.out", overwrite: "auto" });
  }

  // E. Dynamic Splat Core
  function splat(x, y, dx, dy, color) {
    gl.viewport(0, 0, simWidth, simHeight);

    // 1. Splat velocity
    gl.useProgram(splatProgram);
    bindQuad(splatProgram);
    gl.uniform2f(splatProgram.uniforms.uPoint, x, y);
    gl.uniform3f(splatProgram.uniforms.uColor, dx * 6.5, dy * 6.5, 0.0);
    gl.uniform1f(splatProgram.uniforms.uRadius, 0.002);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(splatProgram.uniforms.uSource, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    velocity.swap();

    // 2. Splat dye color density
    gl.uniform3f(splatProgram.uniforms.uColor, color[0] * 0.45, color[1] * 0.45, color[2] * 0.45);
    gl.uniform1f(splatProgram.uniforms.uRadius, 0.0035);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    dye.swap();
  }

  // F. Ambient Convective currents generator (Simulates organic beer bubble currents)
  function injectAmbientSplats(time) {
    // Left rising current
    const x1 = 0.5 + 0.25 * Math.sin(time * 0.0005);
    const y1 = 0.12 + 0.08 * Math.cos(time * 0.0007);
    const dx1 = 0.015 * Math.sin(time * 0.001);
    const dy1 = 0.065 + 0.02 * Math.cos(time * 0.0015);
    splat(x1, y1, dx1, dy1, currentColors.base);

    // Right dark malt eddy
    const x2 = 0.5 + 0.25 * Math.cos(time * 0.0006);
    const y2 = 0.12 + 0.08 * Math.sin(time * 0.0004);
    splat(x2, y2, -dx1 * 0.8, dy1 * 0.55, currentColors.dark);
  }

  // G. Interactive Mouse Drag and Touch Vector Captures
  let lastMouse = { x: 0.5, y: 0.5 };
  let currentMouse = { x: 0.5, y: 0.5 };

  window.addEventListener("mousemove", (e) => {
    currentMouse.x = e.clientX / window.innerWidth;
    currentMouse.y = 1.0 - (e.clientY / window.innerHeight);

    const dx = currentMouse.x - lastMouse.x;
    const dy = currentMouse.y - lastMouse.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed > 0.0005) {
      splat(currentMouse.x, currentMouse.y, dx * 0.8, dy * 0.8, currentColors.base);
    }

    lastMouse.x = currentMouse.x;
    lastMouse.y = currentMouse.y;
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    currentMouse.x = t.clientX / window.innerWidth;
    currentMouse.y = 1.0 - (t.clientY / window.innerHeight);

    const dx = currentMouse.x - lastMouse.x;
    const dy = currentMouse.y - lastMouse.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed > 0.0005) {
      splat(currentMouse.x, currentMouse.y, dx * 0.8, dy * 0.8, currentColors.base);
    }

    lastMouse.x = currentMouse.x;
    lastMouse.y = currentMouse.y;
  });

  // H. Staggered ScrollTrigger for Beer Showcase visibility & depth control
  if (document.querySelector("#brews")) {
    ScrollTrigger.create({
      trigger: "#brews",
      start: "top 85%",
      end: "bottom 15%",
      onEnter: () => {
        gsap.to(".webgl-bg-container", { opacity: 0.95, duration: 1.2, ease: "power2.out" });
        container.style.zIndex = "-2";
      },
      onLeave: () => {
        gsap.to(".webgl-bg-container", { opacity: 0, duration: 1.0, ease: "power2.inOut" });
      },
      onEnterBack: () => {
        gsap.to(".webgl-bg-container", { opacity: 0.95, duration: 1.2, ease: "power2.out" });
        container.style.zIndex = "-2";
      },
      onLeaveBack: () => {
        gsap.to(".webgl-bg-container", { opacity: 0, duration: 1.0, ease: "power2.inOut" });
      }
    });
  }

  // I. Render Ticker
  let lastTime = 0;

  function render(time) {
    if (!time) time = 0;
    const dt = Math.min((time - lastTime) * 0.001, 0.025);
    lastTime = time;

    // Inject automated rising bubbles/currents
    injectAmbientSplats(time);

    // Dynamic Physics Calculations on low-resolution grids
    gl.viewport(0, 0, simWidth, simHeight);

    // 1. Advect velocity field
    gl.useProgram(advectProgram);
    bindQuad(advectProgram);
    gl.uniform1f(advectProgram.uniforms.uDt, dt);
    gl.uniform1f(advectProgram.uniforms.uDissipation, 0.98);
    gl.uniform2f(advectProgram.uniforms.uTexelSize, 1.0 / simWidth, 1.0 / simHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(advectProgram.uniforms.uVelocity, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(advectProgram.uniforms.uSource, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    velocity.swap();

    // 2. Advect dye density field
    gl.uniform1f(advectProgram.uniforms.uDissipation, 0.995);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(advectProgram.uniforms.uVelocity, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1i(advectProgram.uniforms.uSource, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    dye.swap();

    // 3. Compute divergence
    gl.useProgram(divergenceProgram);
    bindQuad(divergenceProgram);
    gl.uniform2f(divergenceProgram.uniforms.uTexelSize, 1.0 / simWidth, 1.0 / simHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 4. Jacobi Pressure relaxation
    gl.useProgram(pressureProgram);
    bindQuad(pressureProgram);
    gl.uniform2f(pressureProgram.uniforms.uTexelSize, 1.0 / simWidth, 1.0 / simHeight);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, divergence.texture);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < 6; i++) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
      gl.uniform1i(pressureProgram.uniforms.uPressure, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      pressure.swap();
    }

    // 5. Subtract pressure gradient to enforce incompressibility
    gl.useProgram(gradSubProgram);
    bindQuad(gradSubProgram);
    gl.uniform2f(gradSubProgram.uniforms.uTexelSize, 1.0 / simWidth, 1.0 / simHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gradSubProgram.uniforms.uVelocity, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    gl.uniform1i(gradSubProgram.uniforms.uPressure, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    velocity.swap();

    // 6. Draw density field to screen viewport with full beer colors mapping
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(renderProgram);
    bindQuad(renderProgram);
    gl.uniform3fv(renderProgram.uniforms.uBaseColor, currentColors.base);
    gl.uniform3fv(renderProgram.uniforms.uColorDark, currentColors.dark);
    gl.uniform3fv(renderProgram.uniforms.uColorLight, currentColors.light);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1i(renderProgram.uniforms.uDye, 0);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  // Start background ticker
  requestAnimationFrame(render);

  // Fade-in container smoothly once WebGL context is initialized
  container.classList.add("loaded");

  // Set preloader background to transparent so WebGL is visible behind it
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.style.backgroundColor = "transparent";
  }
}
