(function () {
  const data = window.FLOW_SITE_DATA || {};

  function byId(id) {
    return document.getElementById(id);
  }

  function money(value) {
    return value ? `<span class="menu-price">${value}</span>` : "";
  }

  function renderMenu(targetId, groups) {
    const target = byId(targetId);
    if (!target || !groups) return;

    target.innerHTML = groups.map((group) => `
      <section class="menu-category reveal-on-scroll">
        <div class="menu-category-head">
          <span class="section-tag">${group.category}</span>
          <p>Freshly listed from Flow's house menu.</p>
        </div>
        <div class="menu-item-grid">
          ${group.items.map((item) => `
            <article class="menu-item-card">
              <div>
                <h3>${item[0]}</h3>
                <p>${item[1]}</p>
              </div>
              <div class="menu-meta">
                ${money(item[2])}
                ${item[3] ? `<span class="diet-tag">${item[3]}</span>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function renderBeerGrid() {
    const target = byId("beer-page-grid");
    if (!target || !data.beers) return;

    target.innerHTML = data.beers.map((beer) => `
      <article class="beer-page-card reveal-on-scroll">
        <div class="beer-page-media">
          <img src="${beer.img}" alt="${beer.displayName} at Flow Brew & Dine" loading="lazy" decoding="async">
        </div>
        <div class="beer-page-copy">
          <span class="section-tag">${beer.name}</span>
          <h2 class="font-playfair">${beer.displayName}</h2>
          <p>${beer.desc}</p>
          <dl>
            <div><dt>Style</dt><dd>${beer.style}</dd></div>
            <div><dt>ABV</dt><dd>${beer.abv}</dd></div>
            <div><dt>IBU</dt><dd>${beer.ibu}</dd></div>
            <div><dt>Pour</dt><dd>${beer.price}</dd></div>
          </dl>
          <p class="pairing-note">Pairing cue: ${beer.pairing}</p>
        </div>
      </article>
    `).join("");
  }

  function renderCoverage() {
    const target = byId("coverage-grid");
    if (!target || !data.coverage) return;

    target.innerHTML = data.coverage.map((item) => `
      <article class="coverage-card reveal-on-scroll">
        <span class="section-tag">${item[0]}</span>
        <h2>${item[1]}</h2>
        <p>${item[2]}</p>
        <a href="${item[3]}" target="_blank" rel="noopener">Read source</a>
      </article>
    `).join("");
  }

  function renderTicker() {
    const track = document.querySelector("[data-offer-track]");
    if (!track || !data.offers) return;
    const copy = data.offers.map((offer) => `<span>${offer}</span>`).join("");
    track.innerHTML = copy + copy;
  }

  function setupReservation() {
    const form = byId("reservation-form");
    const status = byId("reservation-status");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const details = Object.fromEntries(formData.entries());
      const message = `Reservation request: ${details.name || "Guest"}, ${details.guests || "2"} guests, ${details.date || "date pending"} at ${details.time || "time pending"}. Phone: ${details.phone || "not provided"}. ${details.notes || ""}`;
      const encoded = encodeURIComponent(message);
      const mailto = `mailto:reservations@flowbrew.in?subject=Flow reservation request&body=${encoded}`;
      if (status) {
        status.textContent = "Request prepared. Your email app will open so the restaurant receives the details.";
      }
      window.location.href = mailto;
    });
  }

  function setupElevenLabsConcierge() {
    if (byId("flow-voice-agent")) return;
    let mounted = false;
    let voiceWidget = null;
    let voiceReturnButton = null;
    const engagementEvents = ["scroll", "pointerdown", "keydown", "touchstart"];

    function applyFlowConciergeBranding(widget) {
      const replacements = new Map([
        ["Need help?", "What's on tap?"],
        ["Start a call", "Find your perfect pour"]
      ]);

      function updateText(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();

        while (node) {
          const nextNode = walker.nextNode();
          replacements.forEach((replacement, source) => {
            if (node.nodeValue && node.nodeValue.includes(source)) {
              node.nodeValue = node.nodeValue.replaceAll(source, replacement);
            }
          });
          node = nextNode;
        }

        root.querySelectorAll("[aria-label]").forEach((element) => {
          const label = element.getAttribute("aria-label");
          replacements.forEach((replacement, source) => {
            if (label && label.includes(source)) {
              element.setAttribute("aria-label", label.replaceAll(source, replacement));
            }
          });
        });
      }

      function brandShadowRoot() {
        if (!widget.shadowRoot) {
          window.setTimeout(brandShadowRoot, 200);
          return;
        }

        updateText(widget.shadowRoot);
        const observer = new MutationObserver(() => updateText(widget.shadowRoot));
        observer.observe(widget.shadowRoot, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["aria-label"]
        });
      }

      brandShadowRoot();
    }

    function loadWidgetScript() {
      if (document.querySelector('script[data-flow-elevenlabs-widget="true"]')) return;
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      script.dataset.flowElevenlabsWidget = "true";
      document.body.appendChild(script);
    }

    function hasEnteredSite() {
      return !document.documentElement.classList.contains("preloader-active") && !document.body.classList.contains("preloader-active");
    }

    function canUseVoiceConcierge() {
      return Boolean(
        window.isSecureContext &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      );
    }

    function removeEngagementListeners() {
      engagementEvents.forEach((eventName) => {
        window.removeEventListener(eventName, requestMount);
      });
    }

    function hideVoiceReturnControl() {
      document.body.classList.remove("flow-voice-expanded");
    }

    function resetVoiceConcierge() {
      hideVoiceReturnControl();
      document.body.classList.remove("flow-voice-ready");

      if (voiceWidget) {
        voiceWidget.remove();
        voiceWidget = null;
      }

      if (voiceReturnButton) {
        voiceReturnButton.remove();
        voiceReturnButton = null;
      }

      mounted = false;
      window.setTimeout(mountConcierge, 650);
    }

    function setupVoiceReturnControl(widget) {
      voiceReturnButton = document.createElement("button");
      voiceReturnButton.type = "button";
      voiceReturnButton.className = "flow-voice-return";
      voiceReturnButton.textContent = "Back to site";
      voiceReturnButton.setAttribute("aria-label", "Close Flow Concierge and return to the website");
      voiceReturnButton.addEventListener("click", resetVoiceConcierge);
      document.body.appendChild(voiceReturnButton);

      widget.addEventListener("pointerdown", () => {
        if (window.innerWidth <= 900) {
          window.setTimeout(() => {
            document.body.classList.add("flow-voice-expanded");
          }, 300);
        }
      });
    }

    function mountConcierge() {
      if (mounted || !hasEnteredSite()) return;
      mounted = true;

      if (!canUseVoiceConcierge()) {
        removeEngagementListeners();
        document.body.classList.add("flow-voice-unavailable");
        return;
      }

      const widget = document.createElement("elevenlabs-convai");
      widget.className = "flow-voice-agent";
      widget.id = "flow-voice-agent";
      widget.setAttribute("aria-label", "Flow Concierge voice agent");
      widget.setAttribute("agent-id", "agent_0401kt1jdzr0epdryce575wve93t");
      widget.setAttribute("action-text", "What's on tap?");
      widget.setAttribute("expand-text", "Talk to Flow Concierge");
      widget.setAttribute("start-call-text", "Find your perfect pour");
      widget.setAttribute("end-call-text", "End call");
      widget.setAttribute("listening-text", "Flow Concierge is listening...");
      widget.setAttribute("speaking-text", "Flow Concierge is speaking...");

      document.body.appendChild(widget);
      voiceWidget = widget;
      applyFlowConciergeBranding(widget);
      setupVoiceReturnControl(widget);
      loadWidgetScript();
      removeEngagementListeners();
      window.requestAnimationFrame(() => {
        document.body.classList.add("flow-voice-ready");
      });
    }

    function requestMount() {
      if (hasEnteredSite()) {
        window.setTimeout(mountConcierge, 700);
      }
    }

    engagementEvents.forEach((eventName) => {
      window.addEventListener(eventName, requestMount, { passive: true });
    });
  }

  function setupReveals() {
    const items = document.querySelectorAll(".reveal-on-scroll");
    if (!items.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    items.forEach((item) => observer.observe(item));
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupMobileHeader();
    renderTicker();
    renderMenu("food-menu-grid", data.food);
    renderMenu("drinks-menu-grid", data.drinks);
    renderBeerGrid();
    renderCoverage();
    setupReservation();
    setupElevenLabsConcierge();
    setupReveals();
  });

  function setupMobileHeader() {
    const mobileLinks = [
      ["Home", "index.html"],
      ["Brews", "beer.html"],
      ["Food", "food-menu.html"],
      ["Drinks", "drinks-menu.html"],
      ["Location", "location.html"],
      ["FAQ", "faq.html"],
      ["Media", "media.html"],
      ["Book a Table", "index.html#reservations"]
    ];

    document.querySelectorAll(".main-header").forEach((header) => {
      const container = header.querySelector(".header-container");
      const nav = header.querySelector(".nav-menu");
      if (!container || !nav) return;

      const list = nav.querySelector("ul");
      if (list && !nav.dataset.mobileLinksReady) {
        const isHomePage = window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/");
        const links = mobileLinks.map(([label, href]) => [
          label,
          label === "Book a Table" && isHomePage ? "#reservations" : href
        ]);

        list.innerHTML = "";
        links.forEach(([label, href]) => {
          const item = document.createElement("li");
          item.className = "mobile-menu-item";
          item.innerHTML = `<a href="${href}" class="nav-link">${label}</a>`;
          list.appendChild(item);
        });
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
})();
