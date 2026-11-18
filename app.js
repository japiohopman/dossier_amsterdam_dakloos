(() => {
  "use strict";

  const DB_NAME = "dossier-amsterdam-local";
  const DB_VERSION = 1;
  const STATE_KEY = "main";
  const BACKUP_ITERATIONS = 310000;
  let db;
  let state;
  let toastTimer;

  const emptyState = () => ({
    id: STATE_KEY,
    profile: { name: "", purpose: "", mainAddress: "", periodStart: "", periodEnd: "", statement: "" },
    timeline: [],
    evidence: [],
    witnesses: [],
    contacts: [],
    updatedAt: new Date().toISOString()
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const makeId = () => crypto.randomUUID();

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("state")) database.createObjectStore("state", { keyPath: "id" });
        if (!database.objectStoreNames.contains("attachments")) database.createObjectStore("attachments", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Database kon niet worden geopend."));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Lokale opslag is mislukt."));
    });
  }

  async function readState() {
    const tx = db.transaction("state", "readonly");
    const record = await requestResult(tx.objectStore("state").get(STATE_KEY));
    return record || emptyState();
  }

  async function saveState() {
    state.updatedAt = new Date().toISOString();
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(state);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Opslaan is mislukt."));
      tx.onabort = () => reject(tx.error || new Error("Opslaan is afgebroken."));
    });
    const status = $("#save-status");
    if (status) status.textContent = "Opgeslagen · " + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  }

  async function putAttachment(item) {
    const tx = db.transaction("attachments", "readwrite");
    tx.objectStore("attachments").put(item);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Bestand kon niet lokaal worden opgeslagen."));
      tx.onabort = () => reject(tx.error || new Error("Opslaan van bestand is afgebroken."));
    });
  }

  async function getAttachment(id) {
    const tx = db.transaction("attachments", "readonly");
    return requestResult(tx.objectStore("attachments").get(id));
  }

  async function getAllAttachments() {
    const tx = db.transaction("attachments", "readonly");
    return requestResult(tx.objectStore("attachments").getAll());
  }

  async function removeAttachment(id) {
    const tx = db.transaction("attachments", "readwrite");
    tx.objectStore("attachments").delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Bestand kon niet worden verwijderd."));
    });
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function formatDate(value) {
    if (!value) return "Datum niet ingevuld";
    const date = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(date);
  }

  function textNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function statusClass(status) {
    if (["Aanwezig", "Ontvangen", "Toegezegd", "Afgerond"].includes(status)) return "inline-status done";
    if (["Opvragen", "Nog verzamelen", "Moet nog gevraagd worden", "Wacht op reactie", "Vervolg nodig", "Gevraagd"].includes(status)) return "inline-status pending";
    return "inline-status";
  }

  function actionButton(label, className, handler) {
    const button = textNode("button", "small-action " + (className || ""), label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  async function deleteRecord(collection, id) {
    const record = state[collection].find(item => item.id === id);
    if (!record) return;
    if (!window.confirm("Dit onderdeel definitief verwijderen?")) return;
    if (collection === "evidence" && Array.isArray(record.attachments)) {
      for (const file of record.attachments) await removeAttachment(file.id);
    }
    state[collection] = state[collection].filter(item => item.id !== id);
    await saveState();
    renderAll();
    showToast("Onderdeel verwijderd.");
  }

  function createRecordCard({ date, title, meta, detail, status, collection, id, files }) {
    const card = textNode("article", "record-card");
    const top = textNode("div", "record-top");
    const left = document.createElement("div");
    left.append(textNode("div", "record-date", date || ""));
    left.append(textNode("div", "record-title", title || "Zonder titel"));
    if (meta) left.append(textNode("div", "record-meta", meta));
    top.append(left);
    if (status) top.append(textNode("span", statusClass(status), status));
    card.append(top);
    if (detail) card.append(textNode("p", "record-detail", detail));
    if (files && files.length) {
      const links = textNode("div", "file-links");
      files.forEach(file => {
        const button = textNode("button", "file-link", "↓ " + file.name);
        button.type = "button";
        button.addEventListener("click", async () => {
          const stored = await getAttachment(file.id);
          if (!stored || !stored.blob) return showToast("Bestand niet gevonden in lokale opslag.");
          const url = URL.createObjectURL(stored.blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = stored.name;
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        });
        links.append(button);
      });
      card.append(links);
    }
    const actions = textNode("div", "record-actions");
    actions.append(actionButton("Bewerken", "", () => editRecord(collection, id)));
    actions.append(actionButton("Verwijderen", "danger", () => deleteRecord(collection, id)));
    card.append(actions);
    return card;
  }

  function clearEditingForm(form) {
    form.reset();
    delete form.dataset.editingId;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = form.dataset.defaultSubmitLabel || "Toevoegen";
  }

  function editRecord(collection, id) {
    const item = state[collection].find(record => record.id === id);
    if (!item) return;
    const map = {
      timeline: { form: "timeline-form", fields: ["date", "kind", "title", "place", "detail"] },
      evidence: { form: "evidence-form", fields: ["date", "category", "title", "status", "period", "detail"] },
      witnesses: { form: "witness-form", fields: ["name", "relationship", "period", "contact", "basis", "status"] },
      contacts: { form: "contact-form", fields: ["date", "organization", "person", "subject", "outcome", "followup", "status"] }
    };
    const config = map[collection];
    if (!config) return;
    const form = $("#" + config.form);
    config.fields.forEach(key => {
      if (form.elements[key]) form.elements[key].value = item[key] || "";
    });
    form.dataset.editingId = id;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "Wijzigingen opslaan";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Je bewerkt nu dit onderdeel. Sla de wijzigingen op in het formulier.");
  }

  function renderTimeline() {
    const list = $("#timeline-list");
    list.replaceChildren();
    const sorted = [...state.timeline].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("#timeline-count").textContent = sorted.length + (sorted.length === 1 ? " item" : " items");
    if (!sorted.length) {
      list.append(textNode("div", "empty-state", "Nog geen gebeurtenissen. Voeg hierboven je eerste datum toe."));
      return;
    }
    sorted.forEach(item => list.append(createRecordCard({
      date: formatDate(item.date), title: item.title, meta: [item.kind, item.place].filter(Boolean).join(" · "),
      detail: item.detail, collection: "timeline", id: item.id
    })));
  }

  function renderEvidence() {
    const list = $("#evidence-list");
    list.replaceChildren();
    const sorted = [...state.evidence].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("#evidence-count").textContent = sorted.length + (sorted.length === 1 ? " item" : " items");
    if (!sorted.length) {
      list.append(textNode("div", "empty-state", "Nog geen bewijsstukken geregistreerd. Voeg een document toe of noteer wat je nog moet opvragen."));
      return;
    }
    sorted.forEach(item => list.append(createRecordCard({
      date: item.date || "Periode niet ingevuld", title: item.title,
      meta: [item.category, item.period].filter(Boolean).join(" · "),
      detail: item.detail, status: item.status, collection: "evidence", id: item.id, files: item.attachments
    })));
  }

  function renderWitnesses() {
    const list = $("#witness-list");
    list.replaceChildren();
    $("#witness-count").textContent = state.witnesses.length + (state.witnesses.length === 1 ? " persoon" : " personen");
    if (!state.witnesses.length) {
      list.append(textNode("div", "empty-state", "Nog geen personen geregistreerd."));
      return;
    }
    [...state.witnesses].forEach(item => list.append(createRecordCard({
      date: item.period || "Periode niet ingevuld", title: item.name,
      meta: [item.relationship, item.contact].filter(Boolean).join(" · "),
      detail: item.basis, status: item.status, collection: "witnesses", id: item.id
    })));
  }

  function renderContacts() {
    const list = $("#contact-list");
    list.replaceChildren();
    const sorted = [...state.contacts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("#contact-count").textContent = sorted.length + (sorted.length === 1 ? " moment" : " momenten");
    if (!sorted.length) {
      list.append(textNode("div", "empty-state", "Nog geen contactmomenten geregistreerd."));
      return;
    }
    sorted.forEach(item => list.append(createRecordCard({
      date: formatDate(item.date), title: item.organization,
      meta: [item.person, item.subject, item.followup ? "Vervolg: " + formatDate(item.followup) : ""].filter(Boolean).join(" · "),
      detail: item.outcome, status: item.status, collection: "contacts", id: item.id
    })));
  }

  function renderOverview() {
    $("#stat-timeline").textContent = state.timeline.length;
    $("#stat-evidence").textContent = state.evidence.length;
    $("#stat-witnesses").textContent = state.witnesses.length;
    $("#stat-contacts").textContent = state.contacts.length;

    const miniTimeline = $("#overview-timeline");
    miniTimeline.replaceChildren();
    const recent = [...state.timeline].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4);
    if (!recent.length) miniTimeline.append(textNode("div", "empty-state", "Nog geen gebeurtenissen toegevoegd."));
    else {
      const wrap = textNode("div", "timeline-mini");
      recent.forEach(item => {
        const row = textNode("div", "timeline-mini-item");
        row.append(textNode("strong", "", item.title));
        row.append(textNode("small", "", formatDate(item.date) + (item.kind ? " · " + item.kind : "")));
        wrap.append(row);
      });
      miniTimeline.append(wrap);
    }

    const miniEvidence = $("#overview-evidence");
    miniEvidence.replaceChildren();
    const needsAttention = state.evidence.filter(item => !["Aanwezig", "Ontvangen"].includes(item.status)).slice(0, 4);
    if (!state.evidence.length) miniEvidence.append(textNode("div", "empty-state", "Nog geen bewijsstukken geregistreerd."));
    else if (!needsAttention.length) miniEvidence.append(textNode("div", "empty-state", "Alle geregistreerde bewijsstukken zijn gemarkeerd als aanwezig of ontvangen."));
    else {
      const wrap = textNode("div", "timeline-mini");
      needsAttention.forEach(item => {
        const row = textNode("div", "timeline-mini-item");
        row.append(textNode("strong", "", item.title));
        row.append(textNode("small", "", item.status + (item.date ? " · " + item.date : "")));
        wrap.append(row);
      });
      miniEvidence.append(wrap);
    }
  }

  function renderProfile() {
    const form = $("#profile-form");
    const p = state.profile || {};
    ["name", "purpose", "mainAddress", "periodStart", "periodEnd", "statement"].forEach(key => {
      if (form.elements[key]) form.elements[key].value = p[key] || "";
    });
  }

  function renderPrint() {
    const root = $("#print-report");
    root.replaceChildren();
    root.append(textNode("h1", "", "Bewijsdossier feitelijk verblijf"));
    const p = state.profile || {};
    root.append(textNode("p", "print-meta", [
      p.name ? "Naam: " + p.name : "",
      p.mainAddress ? "Woonadres in dossier: " + p.mainAddress : "",
      p.purpose ? "Onderwerp: " + p.purpose : "",
      p.periodStart || p.periodEnd ? "Periode: " + (p.periodStart || "—") + " t/m " + (p.periodEnd || "—") : ""
    ].filter(Boolean).join(" · ") || "Persoonlijk dossieroverzicht"));
    root.append(textNode("p", "print-note", "Dit overzicht bevat de geregistreerde informatie. Originele bewijsbestanden moeten zo nodig afzonderlijk worden meegestuurd."));

    const statementTitle = textNode("h2", "", "Persoonlijke verklaring");
    root.append(statementTitle);
    root.append(textNode("p", "", p.statement || "Nog geen persoonlijke verklaring ingevuld."));

    const sections = [
      { title: "Tijdlijn", items: state.timeline, describe: item => [formatDate(item.date), item.kind, item.place].filter(Boolean).join(" · "), detail: item => item.detail },
      { title: "Bewijsstukken", items: state.evidence, describe: item => [item.date, item.category, item.period, "Status: " + item.status].filter(Boolean).join(" · "), detail: item => [item.detail, item.attachments?.length ? "Bestanden: " + item.attachments.map(file => file.name).join(", ") : "Geen bestand gekoppeld."].filter(Boolean).join("\n") },
      { title: "Getuigenverklaringen", items: state.witnesses, describe: item => [item.relationship, item.period, item.contact, "Status: " + item.status].filter(Boolean).join(" · "), detail: item => item.basis },
      { title: "Contact met instanties", items: state.contacts, describe: item => [formatDate(item.date), item.person, item.subject, item.followup ? "Vervolg: " + formatDate(item.followup) : "", "Status: " + item.status].filter(Boolean).join(" · "), detail: item => item.outcome }
    ];
    sections.forEach(section => {
      root.append(textNode("h2", "", section.title));
      if (!section.items.length) {
        root.append(textNode("p", "print-meta", "Geen gegevens geregistreerd."));
        return;
      }
      [...section.items].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(item => {
        const block = textNode("div", "print-item");
        block.append(textNode("h3", "", item.title || item.name || item.organization || "Onderdeel"));
        block.append(textNode("p", "print-meta", section.describe(item)));
        if (section.detail(item)) block.append(textNode("p", "", section.detail(item)));
        root.append(block);
      });
    });
    root.append(textNode("p", "print-meta", "Gegenereerd op " + new Date().toLocaleDateString("nl-NL") + ". Controleer alle feiten en voeg originele bewijsstukken toe voordat je dit dossier indient."));
  }

  function renderAll() {
    renderProfile();
    renderTimeline();
    renderEvidence();
    renderWitnesses();
    renderContacts();
    renderOverview();
    renderPrint();
  }

  function activateView(name) {
    $$(".view").forEach(view => view.classList.toggle("active", view.id === "view-" + name));
    $$(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(password, salt, usages) {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: BACKUP_ITERATIONS, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      usages
    );
  }

  async function exportEncryptedBackup() {
    if (!crypto.subtle) throw new Error("Versleutelde back-ups vereisen een beveiligde verbinding (HTTPS).");
    const password = window.prompt("Kies een sterk wachtwoord voor deze back-up. Bewaar het apart; zonder wachtwoord kan de back-up niet worden geopend.");
    if (!password) return;
    if (password.length < 12) return showToast("Gebruik voor de back-up een wachtwoord van minimaal 12 tekens.");
    const attachments = await getAllAttachments();
    const packagedFiles = [];
    for (const item of attachments) {
      const bytes = new Uint8Array(await item.blob.arrayBuffer());
      packagedFiles.push({
        id: item.id, name: item.name, type: item.type,
        lastModified: item.lastModified || null,
        data: bytesToBase64(bytes)
      });
    }
    const payload = JSON.stringify({ format: "dossier-amsterdam-backup", version: 1, exportedAt: new Date().toISOString(), state, attachments: packagedFiles });
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, ["encrypt"]);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload));
    const envelope = {
      format: "dossier-amsterdam-encrypted-backup",
      version: 1,
      kdf: "PBKDF2-SHA-256",
      iterations: BACKUP_ITERATIONS,
      cipher: "AES-256-GCM",
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    };
    const blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });
    downloadBlob(blob, "dossier-amsterdam-backup-" + new Date().toISOString().slice(0, 10) + ".json");
    showToast("Versleutelde back-up gedownload.");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function importEncryptedBackup(file) {
    if (!crypto.subtle) throw new Error("Versleutelde back-ups vereisen een beveiligde verbinding (HTTPS).");
    const envelope = JSON.parse(await file.text());
    if (envelope.format !== "dossier-amsterdam-encrypted-backup" || envelope.version !== 1) {
      throw new Error("Dit lijkt geen geldige back-up van deze dossierapp.");
    }
    const password = window.prompt("Voer het wachtwoord van de versleutelde back-up in.");
    if (!password) return;
    let clearText;
    try {
      const key = await deriveKey(password, base64ToBytes(envelope.salt), ["decrypt"]);
      const clear = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
        key,
        base64ToBytes(envelope.ciphertext)
      );
      clearText = new TextDecoder().decode(clear);
    } catch {
      throw new Error("Ontsleutelen is niet gelukt. Controleer het wachtwoord en probeer opnieuw.");
    }
    const payload = JSON.parse(clearText);
    if (payload.format !== "dossier-amsterdam-backup" || payload.version !== 1 || !payload.state) {
      throw new Error("De inhoud van deze back-up wordt niet herkend.");
    }
    if (!window.confirm("De huidige lokale gegevens worden vervangen door de inhoud van deze back-up. Maak eerst zo nodig een back-up van de huidige gegevens. Doorgaan?")) return;
    const tx = db.transaction(["state", "attachments"], "readwrite");
    tx.objectStore("state").put(payload.state);
    tx.objectStore("attachments").clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Terugzetten is mislukt."));
      tx.onabort = () => reject(tx.error || new Error("Terugzetten is afgebroken."));
    });
    for (const item of payload.attachments || []) {
      await putAttachment({
        id: item.id, name: item.name, type: item.type || "application/octet-stream",
        lastModified: item.lastModified || null, blob: new Blob([base64ToBytes(item.data)], { type: item.type || "application/octet-stream" })
      });
    }
    state = payload.state;
    renderAll();
    showToast("Back-up is lokaal teruggezet.");
  }

  function registerEvents() {
    ["timeline-form", "evidence-form", "witness-form", "contact-form"].forEach(id => {
      const form = $("#" + id);
      const submit = form.querySelector('button[type="submit"]');
      if (submit) form.dataset.defaultSubmitLabel = submit.textContent;
    });
    $(".nav-button").forEach(button => button.addEventListener("click", () => activateView(button.dataset.view)));
    $$("[data-go]").forEach(button => button.addEventListener("click", () => activateView(button.dataset.go)));

    $("#profile-form").addEventListener("submit", async event => {
      event.preventDefault();
      const values = formObject(event.currentTarget);
      state.profile = {
        name: values.name.trim(), purpose: values.purpose.trim(), mainAddress: values.mainAddress.trim(), periodStart: values.periodStart,
        periodEnd: values.periodEnd, statement: values.statement.trim()
      };
      await saveState();
      renderAll();
      showToast("Persoonlijke verklaring opgeslagen.");
    });

    $("#timeline-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = formObject(form);
      const id = form.dataset.editingId || makeId();
      const record = { id, date: values.date, kind: values.kind, title: values.title.trim(), place: values.place.trim(), detail: values.detail.trim() };
      const index = state.timeline.findIndex(item => item.id === id);
      if (index >= 0) state.timeline[index] = record;
      else state.timeline.push(record);
      clearEditingForm(form);
      await saveState();
      renderAll();
      showToast(index >= 0 ? "Wijzigingen opgeslagen." : "Gebeurtenis toegevoegd.");
    });

    $("#evidence-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = formObject(form);
      const editingId = form.dataset.editingId;
      const existing = editingId ? state.evidence.find(item => item.id === editingId) : null;
      const attachments = existing ? [...(existing.attachments || [])] : [];
      const newlyAdded = [];
      const files = [...form.elements.files.files];
      try {
        for (const file of files) {
          const id = makeId();
          await putAttachment({ id, name: file.name, type: file.type || "application/octet-stream", lastModified: file.lastModified || null, blob: file.slice(0, file.size, file.type || "application/octet-stream") });
          const attachment = { id, name: file.name, type: file.type, size: file.size };
          attachments.push(attachment);
          newlyAdded.push(attachment);
        }
        const record = {
          id: editingId || makeId(), date: values.date.trim(), category: values.category, title: values.title.trim(),
          status: values.status, period: values.period.trim(), detail: values.detail.trim(), attachments
        };
        const index = state.evidence.findIndex(item => item.id === record.id);
        if (index >= 0) state.evidence[index] = record;
        else state.evidence.push(record);
        clearEditingForm(form);
        await saveState();
        renderAll();
        showToast(index >= 0 ? "Wijzigingen opgeslagen." : "Bewijsstuk lokaal opgeslagen.");
      } catch (error) {
        for (const file of newlyAdded) await removeAttachment(file.id);
        showToast(error.message || "Bewijsstuk kon niet worden opgeslagen.");
      }
    });

    $("#witness-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = formObject(form);
      const id = form.dataset.editingId || makeId();
      const record = {
        id, name: values.name.trim(), relationship: values.relationship.trim(), period: values.period.trim(),
        contact: values.contact.trim(), basis: values.basis.trim(), status: values.status
      };
      const index = state.witnesses.findIndex(item => item.id === id);
      if (index >= 0) state.witnesses[index] = record;
      else state.witnesses.push(record);
      clearEditingForm(form);
      await saveState();
      renderAll();
      showToast(index >= 0 ? "Wijzigingen opgeslagen." : "Persoon toegevoegd.");
    });

    $("#contact-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = formObject(form);
      const id = form.dataset.editingId || makeId();
      const record = {
        id, date: values.date, organization: values.organization.trim(), person: values.person.trim(),
        subject: values.subject.trim(), outcome: values.outcome.trim(), followup: values.followup, status: values.status
      };
      const index = state.contacts.findIndex(item => item.id === id);
      if (index >= 0) state.contacts[index] = record;
      else state.contacts.push(record);
      clearEditingForm(form);
      await saveState();
      renderAll();
      showToast(index >= 0 ? "Wijzigingen opgeslagen." : "Contactmoment toegevoegd.");
    });

    $("#print-button").addEventListener("click", () => {
      renderPrint();
      window.print();
    });
    $("#export-button").addEventListener("click", async () => {
      try { await exportEncryptedBackup(); }
      catch (error) { showToast(error.message || "Back-up maken is niet gelukt."); }
    });
    $("#import-file").addEventListener("change", async event => {
      const file = event.currentTarget.files[0];
      if (!file) return;
      try { await importEncryptedBackup(file); }
      catch (error) { showToast(error.message || "Back-up terugzetten is niet gelukt."); }
      finally { event.currentTarget.value = ""; }
    });
  }

  async function start() {
    try {
      db = await openDatabase();
      state = await readState();
      registerEvents();
      renderAll();
      await saveState();
    } catch (error) {
      console.error("Dossierapp kon niet starten:", error);
      showToast("Lokale opslag is niet beschikbaar. Open de website via HTTPS en gebruik een recente browser.");
      const banner = $(".privacy-banner p");
      if (banner) banner.textContent = "Lokale opslag kon niet worden geopend. Gebruik de website via HTTPS en controleer de browserinstellingen.";
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();