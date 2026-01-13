// --- Elementos UI do highlight ---
const btnToggle = document.getElementById("toggleFilters");
const panel = document.getElementById("filtersPanel");
const taTerms = document.getElementById("hlTerms");
const cbMatchCase = document.getElementById("hlMatchCase");

// Chave por arquivo (cada arquivo mantém sua lista no local.storage)
const fileParam = new URL(window.location.href).searchParams.get("file") || "";
const LS_KEY = "hl_terms::" + fileParam;
const LS_CASE = "hl_case::" + fileParam;
const LS_PANEL = "hl_panel_open::" + fileParam;

function saveSettings() {
    localStorage.setItem(LS_KEY, taTerms.value);
    localStorage.setItem(LS_CASE, cbMatchCase.checked ? "1" : "0");
    localStorage.setItem(LS_PANEL, panel.classList.contains("hl-hidden") ? "0" : "1");
}

function loadSettings() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved !== null) taTerms.value = saved;

    const savedCase = localStorage.getItem(LS_CASE);
    if (savedCase !== null) cbMatchCase.checked = (savedCase === "1");

    const savedPanel = localStorage.getItem(LS_PANEL);
    if (savedPanel === "1") {
        panel.classList.remove("hl-hidden");
        btnToggle.textContent = "Esconder marcadores";
    }
}

function togglePanel() {
    panel.classList.toggle("hl-hidden");
    const open = !panel.classList.contains("hl-hidden");
    btnToggle.textContent = open ? "Esconder marcadores" : "Mostrar marcadores";
    saveSettings();
}

// Converte termos em array fazendo split por '\n'
function getTermsToHighlight() {
    const lines = taTerms.value.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // remove duplicados simples
    return Array.from(new Set(lines));
}

 // Aplica highlight nos termos (simples e funciona bem pra logs)
function addHighlightStyleToTerms(text, termsToHighlight) {
    const flags = cbMatchCase.checked ? "g" : "gi";
    for (const t of termsToHighlight) {
        const re = new RegExp(escapeRegex(t), flags);
        text = text.replace(re, (x) => `<span class="hl-term">${x}</span>`);
    }
    return text;
}

// Reaplica highlight quando usuário muda termos/config
let debounce = null;
function scheduleRerender() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
        saveSettings();
        renderLogText();
    }, 150);
}

// Eventos
btnToggle.addEventListener("click", togglePanel);
taTerms.addEventListener("input", scheduleRerender);
cbMatchCase.addEventListener("change", scheduleRerender);