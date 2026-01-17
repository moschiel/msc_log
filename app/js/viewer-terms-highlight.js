// Chave por arquivo (cada arquivo mantém sua lista no local.storage)
const fileParam = new URL(window.location.href).searchParams.get("file") || "";
const LS_KEY = "hl_terms::" + fileParam;
const LS_CASE = "hl_case::" + fileParam;
const LS_PANEL = "hl_panel_open::" + fileParam;

function saveSettings() {
    localStorage.setItem(LS_KEY, taTerms.value);
    localStorage.setItem(LS_CASE, cbMatchCase.checked ? "1" : "0");
    localStorage.setItem(LS_PANEL, termsPanel.classList.contains("hl-hidden") ? "0" : "1");
}

function loadSettings() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved !== null) taTerms.value = saved;

    const savedCase = localStorage.getItem(LS_CASE);
    if (savedCase !== null) cbMatchCase.checked = (savedCase === "1");

    const savedPanel = localStorage.getItem(LS_PANEL);
    if (savedPanel === "1") {
        termsPanel.classList.remove("hl-hidden");
        btnToggleTermsVisibility.textContent = "Esconder marcadores";
    }
}

function toggleTermsPanelVisibility() {
    termsPanel.classList.toggle("hl-hidden");
    const open = !termsPanel.classList.contains("hl-hidden");
    btnToggleTermsVisibility.textContent = open ? "Esconder marcadores" : "Mostrar marcadores";
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
function highlightTerms(text, termsToHighlight) {
    const flags = cbMatchCase.checked ? "g" : "gi";
    for (const t of termsToHighlight) {
        const re = new RegExp(escapeRegex(t), flags);
        text = text.replace(re, (x) => `<span class="hl-term">${x}</span>`);
    }
    return text;
}

// Reaplica highlight quando usuário muda termos/config
let debounceTermsRerender = null;
function scheduleTermsRerender() {
    if (debounceTermsRerender) clearTimeout(debounceTermsRerender);
    debounceTermsRerender = setTimeout(() => {
        saveSettings();
        renderLogText();
    }, 150);
}