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

  function setupConcierge() {
    ensureFloctopusWidget();

    const panel = byId("flow-concierge-panel");
    const trigger = byId("flow-concierge-trigger");
    const input = byId("concierge-input");
    const answer = byId("concierge-answer");
    if (!panel || !trigger || !input || !answer) return;

    function respond() {
      const query = input.value.trim().toLowerCase();
      if (!query) return;
      answer.textContent = answerFloctopus(query);
    }

    trigger.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) input.focus();
    });

    byId("concierge-ask")?.addEventListener("click", respond);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") respond();
    });
  }

  function setupElevenLabsConcierge() {
    if (byId("flow-voice-agent")) return;

    const widget = document.createElement("elevenlabs-convai");
    widget.className = "flow-voice-agent";
    widget.id = "flow-voice-agent";
    widget.setAttribute("aria-label", "Flow Concierge voice agent");
    widget.setAttribute("agent-id", "agent_0401kt1jdzr0epdryce575wve93t");
    widget.setAttribute("action-text", "Flow Concierge");
    widget.setAttribute("expand-text", "Flow Concierge");
    widget.setAttribute("start-call-text", "Start Flow Concierge");
    widget.setAttribute("end-call-text", "End call");
    widget.setAttribute("listening-text", "Flow Concierge is listening...");
    widget.setAttribute("speaking-text", "Flow Concierge is speaking...");
    widget.setAttribute("override-first-message", "Looking to reserve a table, discover our craft beers, plan an event, or learn more about Flow?");
    widget.setAttribute("avatar-orb-color-1", "#C89D4B");
    widget.setAttribute("avatar-orb-color-2", "#F6F4F0");

    document.body.appendChild(widget);

    const loadWidgetScript = () => {
      if (document.querySelector('script[data-flow-elevenlabs-widget="true"]')) return;
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      script.dataset.flowElevenlabsWidget = "true";
      document.body.appendChild(script);
    };

    const scheduleScriptLoad = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadWidgetScript, { timeout: 600 });
      } else {
        window.setTimeout(loadWidgetScript, 250);
      }
    };

    if (document.readyState === "complete") {
      scheduleScriptLoad();
    } else {
      window.addEventListener("load", scheduleScriptLoad, { once: true });
    }
  }

  function ensureFloctopusWidget() {
    if (byId("flow-concierge-panel")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="flow-concierge" aria-label="Floctopus">
        <div class="flow-concierge-panel" id="flow-concierge-panel">
          <h3>Floctopus</h3>
          <p>Your Flow concierge. Ask about beers, menus, happy hours, dietary preferences, reservations or location.</p>
          <input id="concierge-input" placeholder="Ask Floctopus">
          <button id="concierge-ask" class="btn-book-table" type="button">Ask</button>
          <p id="concierge-answer" class="concierge-answer">Try: "What should I order if I like citrus beer?"</p>
        </div>
        <button id="flow-concierge-trigger" class="flow-concierge-trigger" type="button" aria-label="Open Floctopus">
          <img src="Public/Mascot/Mascot-03 (1).png" alt="">
        </button>
      </div>
    `);
  }

  function answerFloctopus(query) {
    const beers = data.beers || [];
    const foodGroups = data.food || [];
    const drinksGroups = data.drinks || [];
    const allFood = foodGroups.flatMap((group) => group.items.map((item) => ({ category: group.category, item })));
    const allDrinks = drinksGroups.flatMap((group) => group.items.map((item) => ({ category: group.category, item })));
    const beerList = beers.map((beer) => `${beer.displayName} (${beer.style}, ABV ${beer.abv})`).join(", ");

    const includesAny = (...words) => words.some((word) => query.includes(word));
    const findFrom = (collection, fields) => collection.filter((entry) => fields(entry).some((value) => value && query.includes(String(value).toLowerCase())));

    const matchedBeers = findFrom(beers, (beer) => [beer.name, beer.displayName, beer.style, beer.desc, beer.pairing]);
    if (matchedBeers.length) {
      const beer = matchedBeers[0];
      return `${beer.displayName} is ${beer.style} with ABV ${beer.abv} and IBU ${beer.ibu}. ${beer.desc} Pairing cue: ${beer.pairing}`;
    }

    const matchedFood = findFrom(allFood, (entry) => [entry.category, entry.item[0], entry.item[1], entry.item[3]]);
    if (matchedFood.length && includesAny("food", "eat", "dish", "veg", "vegan", "gluten", "paneer", "chicken", "prawn", "pizza", "dessert", "salad", "bao")) {
      return matchedFood.slice(0, 4).map((entry) => `${entry.item[0]}: ${entry.item[1]}${entry.item[2] ? ` (${entry.item[2]})` : ""}`).join(" ");
    }

    const matchedDrinks = findFrom(allDrinks, (entry) => [entry.category, entry.item[0], entry.item[1]]);
    if (matchedDrinks.length && includesAny("drink", "cocktail", "bar", "sangria", "liit", "gin", "tequila", "whiskey", "rum", "vodka")) {
      return matchedDrinks.slice(0, 4).map((entry) => `${entry.item[0]}: ${entry.item[1]}${entry.item[2] ? ` (${entry.item[2]})` : ""}`).join(" ");
    }

    if (includesAny("happy", "offer", "discount", "1+1", "one plus one", "aggregator", "zomato", "swiggy", "dineout", "magicpin", "eazydiner")) {
      return "Flow happy hours: 1+1 on all craft beers Monday to Sunday from 12 PM to 7 PM. Late night Happy Hours: 1+1 craft beers Monday to Thursday from 11 PM till closing. Aggregator discounts can vary across Zomato, Swiggy Dineout, Magicpin and EazyDiner.";
    }

    if (includesAny("time", "timing", "open", "close", "closing", "hours")) {
      return "Flow is listed as open every day from 12 PM to 1 AM. Offer timings and special event timings should be confirmed with the restaurant for the day you plan to visit.";
    }

    if (includesAny("reserve", "reservation", "book", "table", "party", "birthday", "group")) {
      return "You can request a table through the reservation widget on the website. For urgent bookings, larger groups or events, call Flow directly at +91 98991 99138 or 011-41092685.";
    }

    if (includesAny("location", "address", "where", "map", "parking", "direction")) {
      return "Flow Brew & Dine is at Commons, 2nd Floor, DLF Avenue Mall, 312 B & C, A4, South, Saket District Centre, New Delhi 110017. Use the Location page for map and directions.";
    }

    if (includesAny("beer", "brew", "craft", "tap", "abv", "ibu")) {
      return `Flow's house brews include ${beerList}. Ask me about any beer by name, style, ABV, pairing or flavour.`;
    }

    if (includesAny("vegetarian", "veg")) {
      return "Vegetarian options include Rose Harissa Paneer Tikka, Baby Potatoes with Saffron Yogurt, Avo & Beet, Eat Your Greens, vegetarian baos, Margherita, Italian Farm and more.";
    }

    if (includesAny("vegan")) {
      return "Vegan-friendly options appear on the menu, including plant-forward baos and salads. Please confirm with the team for strict vegan preparation and cross-contact handling.";
    }

    if (includesAny("gluten", "allergy", "allergic", "nuts")) {
      return "Some menu items indicate gluten-free or nut-related preferences, but allergies should be confirmed with the restaurant team before ordering because kitchen handling can vary.";
    }

    if (includesAny("media", "press", "coverage", "featured")) {
      return "Flow has external coverage/listings on NDTV Food, DLF Avenue, Zomato, Swiggy Dineout, Magicpin, EazyDiner, LBB and GlobalSpa. Visit the Media page for backlinks.";
    }

    return "Floctopus can help with Flow's beers, food, drinks, happy hours, aggregator discounts, reservations, location, dietary preferences and media coverage. Try asking for a flavour, dish, drink, offer or booking need.";
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
    setupConcierge();
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
        const existingHrefs = Array.from(list.querySelectorAll("a")).map((link) => link.getAttribute("href"));
        mobileLinks.forEach(([label, href]) => {
          if (existingHrefs.includes(href)) return;
          const item = document.createElement("li");
          item.className = "mobile-menu-extra";
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

      button.addEventListener("click", () => {
        const isOpen = header.classList.toggle("mobile-menu-open");
        button.setAttribute("aria-expanded", String(isOpen));
        button.setAttribute("aria-label", isOpen ? "Close site menu" : "Open site menu");
      });

      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          header.classList.remove("mobile-menu-open");
          button.setAttribute("aria-expanded", "false");
          button.setAttribute("aria-label", "Open site menu");
        });
      });
    });
  }
})();
