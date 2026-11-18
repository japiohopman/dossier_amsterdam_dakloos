(() => {
  "use strict";

  const DB_NAME = "dossier-amsterdam-local";
  const DB_VERSION = 1;
  const DB_KEY = "main";
  let db;
  let dossier;
  let slides = [];
  let currentSlide = 0;
  const activeObjectUrls = [];

  const $ = selector => document.querySelector(selector);

  function requestValue(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Lokale gegevens konden niet worden gelezen."));
    });
  }

  async function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Lokale opslag is niet bereikbaar."));
    });
  }

  async function loadDossier() {
    const tx = db.transaction("state", "readonly");
    return (await requestValue(tx.objectStore("state").get(DB_KEY))) || {
      profile: {}, timeline: [], evidence: [], witnesses: [], contacts: []
    };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatDate(value) {
    if (!value) return "Datum niet ingevuld";
    const parsed = new Date(value.length === 10 ? value + "T12:00:00" : value);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(parsed);
  }

  function showToast(message) {
    const toast = $("#presentation-toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function slide(title, kicker, number, dark = false) {
    const node = el("section", "slide" + (dark ? " dark" : ""));
    node.append(el("div", "slide-number", String(number).padStart(2, "0")));
    node.append(el("p", "kicker", kicker));
    if (title) node.append(el("h2", "", title));
    return node;
  }

  function addEmpty(parent, text) {
    parent.append(el("div", "empty-message", text));
  }

  function addInfoCard(parent, label, value, detail) {
    const card = el("article", "info-card");
    card.append(el("span", "label", label));
    card.append(el("strong", "", value || "Nog niet ingevuld"));
    if (detail) card.append(el("p", "", detail));
    parent.append(card);
  }

  function addTimelineRow(parent, item) {
    const row = el("article", "timeline-row");
    row.append(el("div", "timeline-date", formatDate(item.date)));
    const main = document.createElement("div");
    main.append(el("div", "row-title", item.title || "Gebeurtenis"));
    main.append(el("div", "row-sub", [item.kind, item.place].filter(Boolean).join(" · ")));
    if (item.detail) main.append(el("p", "row-detail", item.detail));
    row.append(main);
    row.append(el("span", "status", item.kind || "Tijdlijn"));
    parent.append(row);
  }

  function openLocalAttachment(id) {
    return async () => {
      try {
        const tx = db.transaction("attachments", "readonly");
        const item = await requestValue(tx.objectStore("attachments").get(id));
        if (!item || !item.blob) return showToast("Dit bestand is niet meer in de lokale browseropslag aanwezig.");
        const url = URL.createObjectURL(item.blob);
        activeObjectUrls.push(url);
        const tab = window.open(url, "_blank", "noopener");
        if (!tab) showToast("Je browser blokkeerde het nieuwe tabblad. Sta pop-ups voor deze lokale pagina toe.");
      } catch (error) {
        showToast(error.message || "Bestand openen is niet gelukt.");
      }
    };
  }

  function addEvidenceRow(parent, item) {
    const row = el("article", "evidence-row");
    row.append(el("div", "timeline-date", item.date || item.period || "Periode onbekend"));
    const main = document.createElement("div");
    main.append(el("div", "row-title", item.title || "Bewijsstuk"));
    main.append(el("div", "row-sub", [item.category, item.period].filter(Boolean).join(" · ")));
    if (item.detail) main.append(el("p", "row-detail", item.detail));
    if (item.attachments?.length) {
      const fileWrap = el("div", "file-links");
      item.attachments.forEach(file => {
        const button = el("button", "open-file", "Open lokaal: " + file.name);
        button.type = "button";
        button.addEventListener("click", openLocalAttachment(file.id));
        fileWrap.append(button);
      });
      main.append(fileWrap);
    }
    row.append(main);
    const status = el("span", "status" + (["Opvragen", "Nog verzamelen"].includes(item.status) ? " pending" : ""), item.status || "Geregistreerd");
    row.append(status);
    parent.append(row);
  }

  function addPersonRow(parent, item) {
    const row = el("article", "person-row");
    row.append(el("div", "timeline-date", item.period || "Periode onbekend"));
    const main = document.createElement("div");
    main.append(el("div", "row-title", item.name || "Contactpersoon"));
    main.append(el("div", "row-sub", [item.relationship, item.contact].filter(Boolean).join(" · ")));
    if (item.basis) main.append(el("p", "row-detail", item.basis));
    row.append(main);
    row.append(el("span", "status" + (["Moet nog gevraagd worden", "Gevraagd"].includes(item.status) ? " pending" : ""), item.status || "Status onbekend"));
    parent.append(row);
  }

  function addContactRow(parent, item) {
    const row = el("article", "timeline-row");
    row.append(el("div", "timeline-date", formatDate(item.date)));
    const main = document.createElement("div");
    main.append(el("div", "row-title", item.organization || "Organisatie"));
    main.append(el("div", "row-sub", [item.person, item.subject].filter(Boolean).join(" · ")));
    if (item.outcome) main.append(el("p", "row-detail", item.outcome));
    if (item.followup) main.append(el("p", "row-detail", "Vervolg: " + formatDate(item.followup)));
    row.append(main);
    row.append(el("span", "status" + (item.status === "Wacht op reactie" || item.status === "Vervolg nodig" ? " pending" : ""), item.status || "Contact"));
    parent.append(row);
  }

  function buildSlides() {
    const p = dossier.profile || {};
    const timeline = [...(dossier.timeline || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const evidence = dossier.evidence || [];
    const witnesses = dossier.witnesses || [];
    const contacts = [...(dossier.contacts || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const result = [];

    // Slide 1 — cover.
    {
      const node = el("section", "slide dark cover-slide");
      node.append(el("div", "slide-number", "01"));
      node.append(el("p", "kicker", "PERSOONLIJK BEWIJSDOSSIER"));
      const heading = el("h1", "", "Feitelijk verblijf");
      heading.append(el("span", "", "in Amsterdam"));
      node.append(heading);
      node.append(el("div", "accent-rule"));
      node.append(el("p", "lead", "Een chronologisch overzicht van woonperiodes, bewijsstukken en pogingen om de woonsituatie officieel te regelen."));
      const meta = el("div", "cover-meta");
      const period = [p.periodStart ? formatDate(p.periodStart) : "", p.periodEnd ? formatDate(p.periodEnd) : ""].filter(Boolean).join(" — ");
      const name = p.name || "Naam niet ingevuld";
      const address = p.mainAddress || "Adres nog niet ingevuld";
      [["DOSSIER BETREFT", name], ["PERIODE", period || "Nog niet ingevuld"], ["ADRES OP BEWIJS", address]].forEach(([label, value]) => {
        const item = el("span", "");
        item.append(el("b", "", label), document.createTextNode(value));
        meta.append(item);
      });
      node.append(meta);
      node.append(el("p", "slide-note", "Bespreekversie · gegevens en originele bewijsstukken blijven op deze laptop"));
      result.push({ title: "Feitelijk verblijf", node });
    }

    // Slide 2 — factual summary and statement.
    {
      const node = slide("De woonsituatie in hoofdlijnen", "SAMENVATTING", 2);
      const grid = el("div", "content-grid");
      addInfoCard(grid, "Begin van de periode", p.periodStart ? formatDate(p.periodStart) : "", "Datum volgens de persoonlijke tijdlijn");
      addInfoCard(grid, "Einde van de periode", p.periodEnd ? formatDate(p.periodEnd) : "", "Laatste datum waarvoor verblijf wordt onderbouwd");
      addInfoCard(grid, "Adres vermeld op bankafschrift", p.mainAddress || "", "Controleer dat de schrijfwijze overeenkomt met het originele afschrift");
      addInfoCard(grid, "Bewijsregister", String(evidence.length), "Bewijsstukken geregistreerd in deze lokale werkplek");
      node.append(grid);
      if (p.statement) node.append(el("div", "statement-box", p.statement));
      else addEmpty(node, "De persoonlijke verklaring is nog niet ingevuld. Vul deze aan in het dossier en open daarna de presentatie opnieuw.");
      node.append(el("p", "slide-note", "Controleer data, adressen en formuleringen aan de hand van de originele documenten."));
      result.push({ title: "Samenvatting", node });
    }

    // Slide 3 — residences / move entries.
    {
      const relevant = timeline.filter(item => /woonperiode|verhuizing/i.test([item.kind, item.title].join(" ")));
      const node = slide("Woonperiodes en verhuizingen", "FEITELIJKE WOONSITUATIE", 3);
      if (!relevant.length) addEmpty(node, "Nog geen woonperiodes geregistreerd. Voeg in het dossier per adres een tijdlijnitem toe met begindatum, einddatum in de toelichting, adres en wie de woonsituatie uit eigen waarneming kan bevestigen.");
      else {
        const list = el("div", "timeline-list");
        relevant.forEach(item => addTimelineRow(list, item));
        node.append(list);
      }
      node.append(el("p", "slide-note", "Maak de overgang tussen adressen en eventuele tussenperiodes expliciet. Gebruik geen overlappende of geschatte datums zonder ze als schatting te benoemen."));
      result.push({ title: "Woonperiodes", node });
    }

    // Slides 4+ — all timeline entries, five per slide.
    const timelinePages = Math.max(1, Math.ceil(timeline.length / 5));
    for (let page = 0; page < timelinePages; page++) {
      const slice = timeline.slice(page * 5, page * 5 + 5);
      const node = slide(page ? "Tijdlijn — vervolg" : "Belangrijke gebeurtenissen", "CHRONOLOGISCH OVERZICHT", result.length + 1);
      if (!timeline.length) addEmpty(node, "De tijdlijn is nog leeg. Leg onder meer de eerste verhuisdatum, gesprekken met het buurtteam, aanvragen van een briefadres, verhuizingen en afspraken met de gemeente vast.");
      else {
        const list = el("div", "timeline-list");
        slice.forEach(item => addTimelineRow(list, item));
        node.append(list);
      }
      node.append(el("p", "slide-note", "Chronologie opgebouwd uit de gebeurtenissen die lokaal zijn geregistreerd."));
      result.push({ title: page ? "Tijdlijn vervolg" : "Gebeurtenissen", node });
    }

    // Bank statement and transaction records.
    {
      const bankItems = evidence.filter(item => /bank|pin|transactie|rekeningafschrift/i.test([item.category, item.title].join(" ")));
      const node = slide("Bankafschriften en pintransacties", "DOCUMENTAIR BEWIJS", result.length + 1);
      if (!bankItems.length) addEmpty(node, "Nog geen bankafschriften in het lokale bewijsregister gezet. Voeg de relevante PDF's toe bij Bewijsstukken met categorie Bank / pintransactie.");
      else {
        const list = el("div", "evidence-list");
        bankItems.forEach(item => addEvidenceRow(list, item));
        node.append(list);
      }
      const caution = el("div", "callout", "Bankafschriften kunnen het vermelde correspondentieadres en een patroon van transacties in Amsterdam ondersteunen. Transacties zijn sterke aanvullende aanwijzingen, maar bewijzen op zichzelf niet dat iemand iedere dag fysiek op één adres verbleef. Bespreek het patroon samen met de overige documenten en verklaringen.");
      node.append(caution);
      result.push({ title: "Bankafschriften", node });
    }

    // Help, municipality and registration efforts.
    {
      const relevantTimeline = timeline.filter(item => /inschrijving|briefadres|buurtteam|gemeente|hulpverlening/i.test([item.kind, item.title, item.place, item.detail].join(" ")));
      const node = slide("Pogingen om de situatie te regelen", "GEMEENTE EN HULPVERLENING", result.length + 1);
      if (!contacts.length && !relevantTimeline.length) addEmpty(node, "Registreer contactmomenten met gemeente en Buurtteam, aanvragen van een briefadres en terugbelverzoeken. Noteer datum, contactpersoon, wat is besproken en welke documenten bestaan.");
      else {
        const list = el("div", "timeline-list");
        contacts.forEach(item => addContactRow(list, item));
        relevantTimeline.forEach(item => addTimelineRow(list, item));
        node.append(list);
      }
      node.append(el("p", "slide-note", "Vraag waar mogelijk om dossiernotities, ontvangstbevestigingen en schriftelijke bevestiging van afspraken."));
      result.push({ title: "Pogingen tot inschrijving", node });
    }

    // Witnesses.
    {
      const node = slide("Mensen die kunnen verklaren", "GETUIGEN EN ONDERSTEUNING", result.length + 1);
      if (!witnesses.length) addEmpty(node, "Nog geen getuigen toegevoegd. Noteer per persoon welke periode diegene uit eigen waarneming kan bevestigen. Een getuige hoeft geen aannames te doen over dagen waarop diegene je niet heeft gezien.");
      else {
        const list = el("div", "people-list");
        witnesses.forEach(item => addPersonRow(list, item));
        node.append(list);
      }
      node.append(el("p", "slide-note", "Laat iedere getuige de eigen verklaring controleren, dateren en ondertekenen."));
      result.push({ title: "Getuigen", node });
    }

    // Remaining non-bank proof and open items.
    {
      const other = evidence.filter(item => !/bank|pin|transactie|rekeningafschrift/i.test([item.category, item.title].join(" ")));
      const open = evidence.filter(item => ["Opvragen", "Nog verzamelen"].includes(item.status));
      const node = slide("Overige bewijsstukken en vervolgstappen", "COMPLEETHEID VAN HET DOSSIER", result.length + 1);
      if (other.length) {
        const list = el("div", "evidence-list");
        other.forEach(item => addEvidenceRow(list, item));
        node.append(list);
      } else addEmpty(node, "Registreer hier WhatsApp-berichten, post, foto's, betalingen aan hoofdbewoners, verklaringen en stukken van het Buurtteam.");
      if (open.length) {
        node.append(el("h3", "", "Nog op te vragen of te verzamelen"));
        const list = el("div", "evidence-list");
        open.forEach(item => addEvidenceRow(list, item));
        node.append(list);
      }
      node.append(el("p", "slide-note", "Controleer vóór het gesprek of de originele PDF's, berichten en verklaringen op de laptop beschikbaar zijn."));
      result.push({ title: "Overig bewijs", node });
    }

    // Closing slide.
    {
      const node = el("section", "slide dark");
      node.append(el("div", "slide-number", String(result.length + 1).padStart(2, "0")));
      node.append(el("p", "kicker", "VERZOEK TOT BEOORDELING"));
      node.append(el("h2", "", "Feiten in samenhang beoordelen"));
      node.append(el("div", "accent-rule"));
      node.append(el("p", "lead", "Ik verzoek de gemeente mijn feitelijke verblijf en mijn pogingen om mijn registratie te regelen te beoordelen aan de hand van het geheel van de beschikbare bewijsstukken, de tijdlijn en verklaringen van mensen die mijn woonsituatie uit eigen waarneming kennen."));
      node.append(el("div", "callout", "Bespreek welke bewijsstukken nog ontbreken, welke vorm de gemeente accepteert en of aanvullende stukken na het gesprek mogen worden nageleverd."));
      node.append(el("p", "slide-note", "Presentatie samengesteld uit de gegevens die in deze lokale dossierwerkplek zijn vastgelegd."));
      result.push({ title: "Verzoek", node });
    }

    return result;
  }

  function showSlide(index) {
    if (!slides.length) return;
    currentSlide = Math.max(0, Math.min(index, slides.length - 1));
    const stage = $("#stage");
    stage.replaceChildren(slides[currentSlide].node);
    $("#slide-title").textContent = slides[currentSlide].title;
    $("#slide-count").textContent = (currentSlide + 1) + " / " + slides.length;
    $("#progress-fill").style.width = (((currentSlide + 1) / slides.length) * 100) + "%";
    $("#previous-button").disabled = currentSlide === 0;
    $("#next-button").disabled = currentSlide === slides.length - 1;
    const dots = $("#dot-nav");
    dots.replaceChildren();
    slides.forEach((item, index) => {
      const dot = el("button", index === currentSlide ? "active" : "");
      dot.type = "button";
      dot.title = item.title;
      dot.setAttribute("aria-label", "Ga naar dia " + (index + 1) + ": " + item.title);
      dot.addEventListener("click", () => showSlide(index));
      dots.append(dot);
    });
  }

  async function start() {
    try {
      db = await openDatabase();
      dossier = await loadDossier();
      slides = buildSlides();
      showSlide(0);
    } catch (error) {
      const stage = $("#stage");
      stage.replaceChildren(el("div", "empty-message", "De lokale dossiergegevens konden niet worden geopend. Open eerst Start-lokaal.bat en gebruik daarna dezelfde browser als waarin je het dossier hebt ingevuld. Details: " + (error.message || "onbekende fout")));
      $("#previous-button").disabled = true;
      $("#next-button").disabled = true;
      showToast("Lokale gegevens niet bereikbaar.");
    }
  }

  $("#previous-button").addEventListener("click", () => showSlide(currentSlide - 1));
  $("#next-button").addEventListener("click", () => showSlide(currentSlide + 1));
  $("#fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { showToast("Volledig scherm is niet beschikbaar in deze browser."); }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      showSlide(currentSlide + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      showSlide(currentSlide - 1);
    } else if (event.key === "Home") showSlide(0);
    else if (event.key === "End") showSlide(slides.length - 1);
    else if (event.key.toLowerCase() === "f") $("#fullscreen-button").click();
  });

  window.addEventListener("pagehide", () => activeObjectUrls.forEach(url => URL.revokeObjectURL(url)));
  document.addEventListener("DOMContentLoaded", start);
})();