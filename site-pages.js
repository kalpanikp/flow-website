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

  function getReservationEndpoint() {
    const metaEndpoint = document.querySelector('meta[name="flow-reservation-endpoint"]');
    return (
      window.FLOW_RESERVATION_ENDPOINT ||
      (metaEndpoint && metaEndpoint.getAttribute("content")) ||
      ""
    ).trim();
  }

  function getReservationAuthHeaders() {
    const metaAnonKey = document.querySelector('meta[name="flow-supabase-anon-key"]');
    const anonKey = (
      window.FLOW_SUPABASE_ANON_KEY ||
      (metaAnonKey && metaAnonKey.getAttribute("content")) ||
      ""
    ).trim();

    return anonKey
      ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      : {};
  }

  function buildReservationPayload(form) {
    const formData = new FormData(form);
    const details = Object.fromEntries(formData.entries());

    return {
      name: String(details.name || "").trim(),
      phone: String(details.phone || "").trim(),
      guests: Number(details.guests || 0),
      reservation_date: String(details.reservation_date || details.date || "").trim(),
      reservation_time: String(details.reservation_time || details.time || "").trim(),
      special_notes: String(details.special_notes || details.notes || "").trim(),
    };
  }

  function validateReservationPayload(payload) {
    if (!payload.name) return "Please enter your name.";
    if (!payload.phone) return "Please enter your phone number.";
    if (!Number.isInteger(payload.guests) || payload.guests < 1) return "Please enter the number of guests.";
    if (!payload.reservation_date) return "Please select a reservation date.";
    if (!payload.reservation_time) return "Please select a reservation time.";
    return "";
  }

  function setupReservation() {
    const form = byId("reservation-form");
    const status = byId("reservation-status");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const endpoint = getReservationEndpoint();
      const payload = buildReservationPayload(form);
      const validationError = validateReservationPayload(payload);
      const submitButton = form.querySelector('button[type="submit"]');

      if (status) {
        status.textContent = "";
      }

      if (validationError) {
        if (status) status.textContent = validationError;
        return;
      }

      if (!endpoint) {
        if (status) {
          status.textContent = "Online reservations are being connected. Please call Flow directly for now: +91 98991 99138.";
        }
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getReservationAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(result.error || "Reservation request failed");
        }

        form.reset();
        if (status) {
          status.textContent = "Reservation request sent. The Flow team will confirm your table shortly.";
        }
      } catch (error) {
        if (status) {
          status.textContent = error instanceof Error
            ? `Could not send reservation: ${error.message}`
            : "Could not send reservation. Please call Flow directly.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Send Request";
        }
      }
    });
  }

  function setupElevenLabsConcierge() {
    if (byId("flow-concierge-launcher")) return;
    let mounted = false;
    let voiceWidget = null;
    let voiceReturnButton = null;
    let launcher = null;

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
      if (launcher) {
        launcher.hidden = false;
        window.requestAnimationFrame(() => launcher.classList.add("visible"));
      }
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
        window.setTimeout(() => {
          document.body.classList.add("flow-voice-expanded");
        }, 300);
      });
    }

    function mountConcierge() {
      if (mounted || !hasEnteredSite()) return;
      mounted = true;

      if (!canUseVoiceConcierge()) {
        document.body.classList.add("flow-voice-unavailable");
        mounted = false;
        return;
      }

      if (launcher) {
        launcher.classList.remove("visible");
        launcher.hidden = true;
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
      window.requestAnimationFrame(() => {
        document.body.classList.add("flow-voice-ready");
        window.setTimeout(() => {
          document.body.classList.add("flow-voice-expanded");
        }, 450);
      });
    }

    function createLauncher() {
      if (launcher || !hasEnteredSite()) return;

      launcher = document.createElement("button");
      launcher.type = "button";
      launcher.id = "flow-concierge-launcher";
      launcher.className = "flow-concierge-launcher";
      launcher.setAttribute("aria-label", "Open Flow Concierge");
      launcher.innerHTML = '<span class="concierge-mark" aria-hidden="true">FC</span><span class="concierge-copy">Flow Concierge</span>';
      launcher.style.position = "fixed";
      launcher.style.right = "0.85rem";
      launcher.style.bottom = "0.85rem";
      launcher.style.zIndex = "2147483644";
      launcher.addEventListener("click", mountConcierge);
      document.body.appendChild(launcher);
      window.requestAnimationFrame(() => launcher.classList.add("visible"));
    }

    if (hasEnteredSite()) {
      createLauncher();
    } else {
      const observer = new MutationObserver(() => {
        if (hasEnteredSite()) {
          observer.disconnect();
          window.setTimeout(createLauncher, 500);
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      if (document.body) {
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }
    }
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
})();
