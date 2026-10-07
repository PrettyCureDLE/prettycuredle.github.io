// ============================================================
// PrettyCureDLE
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const CHARACTER_IMAGE_PATH = "./Images/Pose/";

// Clé utilisée pour mémoriser la langue choisie (localStorage).
const LANGUAGE_STORAGE_KEY = "pcdle_language";

// Chaîne ajoutée à la date avant hachage, pour ne pas exposer
// directement la date du jour dans le calcul.
const SEED_SALT = "PrettyCureDLE";


// ============================================================
// LANGUES
// ============================================================
// Pour ajouter une langue : ajouter une entrée dans LANGUAGES
// ci-dessous, puis un bloc de traductions correspondant dans
// TRANSLATIONS un peu plus bas (copier un bloc existant et
// traduire chaque valeur).

const DEFAULT_LANGUAGE = "fr";

const LANGUAGES = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ja", label: "日本語", flag: "🇯🇵" }
];

const TRANSLATIONS = {
    fr: {
        attempts_label: "Tentatives :",
        guess_placeholder: "Entrez le nom d'une Cure...",
        guess_button: "Deviner",
        header_image: "Image",
        header_name: "Nom",
        header_cure_name: "Nom de Cure",
        header_seasons: "Saisons",
        header_hair_color: "Couleur de cheveux",
        header_main_color: "Couleur principale",
        header_eyes_color: "Couleur des yeux",
        header_movie: "Film",
        message_not_found: "Personnage introuvable.",
        message_success: "Bravo ! Tu as trouvé {cureName} en {attempts} tentative(s) !",
        footer_legal: "Mentions légales",
        mode_cures: "Cures",
        mode_mode2: "Mode 2",
        mode_mode3: "Mode 3",
        mode_coming_soon: "Bientôt disponible"
    },
    en: {
        attempts_label: "Attempts:",
        guess_placeholder: "Enter a Cure's name...",
        guess_button: "Guess",
        header_image: "Image",
        header_name: "Name",
        header_cure_name: "Cure Name",
        header_seasons: "Seasons",
        header_hair_color: "Hair Color",
        header_main_color: "Main Color",
        header_eyes_color: "Eyes Color",
        header_movie: "Movie",
        message_not_found: "Character not found.",
        message_success: "Congrats! You found {cureName} in {attempts} attempt(s)!",
        footer_legal: "Legal notice",
        mode_cures: "Cures",
        mode_mode2: "Mode 2",
        mode_mode3: "Mode 3",
        mode_coming_soon: "Coming soon"
    },
    ja: {
        attempts_label: "挑戦回数：",
        guess_placeholder: "キュアの名前を入力...",
        guess_button: "回答する",
        header_image: "画像",
        header_name: "名前",
        header_cure_name: "キュア名",
        header_seasons: "シーズン",
        header_hair_color: "髪の色",
        header_main_color: "メインカラー",
        header_eyes_color: "瞳の色",
        header_movie: "映画",
        message_not_found: "キャラクターが見つかりません。",
        message_success: "おめでとう！{attempts}回で{cureName}を見つけました！",
        footer_legal: "法的事項",
        mode_cures: "キュア",
        mode_mode2: "モード2",
        mode_mode3: "モード3",
        mode_coming_soon: "近日公開"
    }
};

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;

if (!TRANSLATIONS[currentLanguage]) {
    currentLanguage = DEFAULT_LANGUAGE;
}

// Traduit une clé pour la langue courante, avec repli sur la
// langue par défaut puis sur la clé elle-même. {param} dans le
// texte est remplacé par la valeur correspondante de `params`.
function t(key, params = {}) {
    const dictionary = TRANSLATIONS[currentLanguage] || TRANSLATIONS[DEFAULT_LANGUAGE];
    let text = dictionary[key] || TRANSLATIONS[DEFAULT_LANGUAGE][key] || key;

    for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, value);
    }

    return text;
}


// ============================================================
// MODES DE JEU
// ============================================================
// Chaque mode réutilise exactement le même mécanisme de jeu
// (comparaison nom / saisons / couleurs / nombre de films),
// mais pioche ses personnages dans un autre couple de fichiers
// JSON. Les modes 2 et 3 sont pour l'instant désactivés
// (available: false) car leurs fichiers de données n'existent
// pas encore.
//
// Pour activer un nouveau mode plus tard :
//   1. Déposer ses fichiers dans Data/ (même structure que
//      Cures.json / Films.json).
//   2. Renseigner characterFile (et filmFile si besoin) ci-dessous.
//   3. Passer available à true.

const GAME_MODES = [
    {
        id: "cures",
        labelKey: "mode_cures",
        characterFile: "./Data/Cures.json",
        filmFile: "./Data/Films.json",
        available: true
    },
    {
        id: "mode2",
        labelKey: "mode_mode2",
        characterFile: "./Data/Mode2.json",
        filmFile: "./Data/Mode2_Films.json",
        available: false
    },
    {
        id: "mode3",
        labelKey: "mode_mode3",
        characterFile: "./Data/Mode3.json",
        filmFile: "./Data/Mode3_Films.json",
        available: false
    }
];

let currentMode = GAME_MODES[0];


// ============================================================
// DONNÉES
// ============================================================

let characters = [];
let films = [];

let targetCharacter = null;
let attempts = 0;
let gameFinished = false;


// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

async function loadData(mode) {
    try {
        const charactersResponse = await fetch(mode.characterFile);

        if (!charactersResponse.ok) {
            throw new Error(`Impossible de charger ${mode.characterFile}`);
        }

        const charactersData = await charactersResponse.json();
        characters = charactersData.characters || [];

        if (mode.filmFile) {
            const filmsResponse = await fetch(mode.filmFile);

            if (!filmsResponse.ok) {
                throw new Error(`Impossible de charger ${mode.filmFile}`);
            }

            const filmsData = await filmsResponse.json();
            films = filmsData.films || [];
        }
        else {
            films = [];
        }

        console.log(`Données chargées pour le mode "${mode.id}" :`, characters.length, "personnage(s)");
    }
    catch (error) {
        console.error("Erreur lors du chargement des données :", error);

        document.body.innerHTML += `
            <p style="color: red; text-align: center; font-size: 20px;">
                Impossible de charger les données.
                Consulte la console du navigateur.
            </p>
        `;
    }
}


// ============================================================
// NOMBRE DE FILMS D'UN PERSONNAGE
// ============================================================

function getMovieCount(characterId) {
    let count = 0;

    for (const film of films) {
        if (!Array.isArray(film.characters)) {
            continue;
        }

        if (film.characters.includes(characterId)) {
            count++;
        }
    }

    return count;
}


// ============================================================
// NORMALISATION DU TEXTE
// ============================================================

function normalizeText(text) {
    if (text === undefined || text === null) {
        return "";
    }

    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


// ============================================================
// COMPARAISON SIMPLE
// ============================================================

function compareValue(guess, target) {
    return normalizeText(guess) === normalizeText(target);
}


// ============================================================
// COMPARAISON DES SAISONS
// ============================================================

function compareSeasons(guessSeasons, targetSeasons) {
    if (!Array.isArray(guessSeasons) || !Array.isArray(targetSeasons)) {
        return {
            exact: false,
            partial: false
        };
    }

    const guess = guessSeasons.map(normalizeText);
    const target = targetSeasons.map(normalizeText);

    const sameLength = guess.length === target.length;

    const allSame =
        sameLength &&
        guess.every(season => target.includes(season));

    const hasCommon = guess.some(season => target.includes(season));

    return {
        exact: allSame,
        partial: hasCommon
    };
}


// ============================================================
// BARRE SUPÉRIEURE (MODES + LANGUE)
// ============================================================

function setupTopBar() {
    renderModeSwitcher();
    renderLanguageSwitcher();
}


// ----- Sélecteur de mode -----

function renderModeSwitcher() {
    const container = document.getElementById("mode-switcher");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (const mode of GAME_MODES) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "mode-tab";
        tab.textContent = t(mode.labelKey);

        if (mode.id === currentMode.id) {
            tab.classList.add("active");
        }

        if (!mode.available) {
            tab.classList.add("disabled");
            tab.title = t("mode_coming_soon");
        }

        tab.addEventListener("click", () => selectMode(mode));

        container.appendChild(tab);
    }
}

async function selectMode(mode) {
    if (!mode.available) {
        showMessage(t("mode_coming_soon"), "error");
        return;
    }

    if (mode.id === currentMode.id) {
        return;
    }

    currentMode = mode;
    renderModeSwitcher();

    await loadData(currentMode);
    await startNewGame();
}


// ----- Sélecteur de langue -----

function renderLanguageSwitcher() {
    const container = document.getElementById("language-switcher");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <button type="button" class="language-button" id="language-button"></button>
        <div class="language-menu" id="language-menu">
            ${LANGUAGES.map(lang => `
                <div class="language-option" data-lang="${lang.code}">
                    <span>${lang.flag}</span>
                    <span>${lang.label}</span>
                </div>
            `).join("")}
        </div>
    `;

    const button = document.getElementById("language-button");
    const menu = document.getElementById("language-menu");

    button.addEventListener("click", event => {
        event.stopPropagation();
        menu.classList.toggle("open");
    });

    document.addEventListener("click", () => {
        menu.classList.remove("open");
    });

    for (const option of menu.querySelectorAll(".language-option")) {
        option.addEventListener("click", () => {
            setLanguage(option.dataset.lang);
            menu.classList.remove("open");
        });
    }

    updateLanguageSwitcherUI();
}

function updateLanguageSwitcherUI() {
    const button = document.getElementById("language-button");
    const menu = document.getElementById("language-menu");

    if (!button || !menu) {
        return;
    }

    const current = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

    button.textContent = `${current.flag} ${current.label}`;

    for (const option of menu.querySelectorAll(".language-option")) {
        option.classList.toggle("active", option.dataset.lang === currentLanguage);
    }
}

function setLanguage(lang) {
    if (!TRANSLATIONS[lang] || lang === currentLanguage) {
        return;
    }

    currentLanguage = lang;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    applyTranslations();
}


// ----- Application des traductions à l'interface -----

function applyTranslations() {
    document.documentElement.lang = currentLanguage;

    updateLanguageSwitcherUI();
    renderModeSwitcher();

    const footerLink = document.getElementById("footer-legal-link");

    if (footerLink) {
        footerLink.textContent = t("footer_legal");
    }

    const attemptsLabel = document.getElementById("attempts-label");

    if (attemptsLabel) {
        attemptsLabel.textContent = t("attempts_label");
    }

    const input = document.getElementById("guess-input");

    if (input) {
        input.placeholder = t("guess_placeholder");
    }

    const guessButton = document.getElementById("guess-button");

    if (guessButton) {
        guessButton.textContent = t("guess_button");
    }

    const headerKeysById = {
        "header-image": "header_image",
        "header-name": "header_name",
        "header-cure-name": "header_cure_name",
        "header-seasons": "header_seasons",
        "header-hair-color": "header_hair_color",
        "header-main-color": "header_main_color",
        "header-eyes-color": "header_eyes_color",
        "header-movie": "header_movie"
    };

    for (const [id, key] of Object.entries(headerKeysById)) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = t(key);
        }
    }
}


// ============================================================
// CRÉATION DE L'INTERFACE
// ============================================================

function createGameInterface() {
    const gameContainer = document.querySelector(".game-container");

    if (!gameContainer) {
        console.error("Impossible de trouver .game-container");
        return;
    }

    gameContainer.innerHTML = `
        <div id="game">

            <div id="game-status">
                <span>
                    <span id="attempts-label">${t("attempts_label")}</span>
                    <strong id="attempt-count">0</strong>
                </span>
            </div>

            <div id="guess-area">
                <input
                    type="text"
                    id="guess-input"
                    placeholder="${t("guess_placeholder")}"
                    autocomplete="off"
                >

                <div id="suggestions"></div>

                <button id="guess-button">
                    ${t("guess_button")}
                </button>
            </div>

            <div id="message"></div>

            <div id="results">
                <div class="results-header">
                    <div id="header-image">${t("header_image")}</div>
                    <div id="header-name">${t("header_name")}</div>
                    <div id="header-cure-name">${t("header_cure_name")}</div>
                    <div id="header-seasons">${t("header_seasons")}</div>
                    <div id="header-hair-color">${t("header_hair_color")}</div>
                    <div id="header-main-color">${t("header_main_color")}</div>
                    <div id="header-eyes-color">${t("header_eyes_color")}</div>
                    <div id="header-movie">${t("header_movie")}</div>
                </div>

                <div id="guess-results"></div>
            </div>

        </div>
    `;

    setupEvents();
}


// ============================================================
// ÉVÉNEMENTS
// ============================================================

function setupEvents() {
    const input = document.getElementById("guess-input");
    const button = document.getElementById("guess-button");

    button.addEventListener("click", submitGuess);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            submitGuess();
        }
    });

    input.addEventListener("input", updateSuggestions);
}


// ============================================================
// SUGGESTIONS
// ============================================================

function updateSuggestions() {
    const input = document.getElementById("guess-input");
    const suggestions = document.getElementById("suggestions");

    const value = normalizeText(input.value);

    suggestions.innerHTML = "";

    if (!value) {
        return;
    }

    const matchingCharacters = characters
        .filter(character => {
            const name = normalizeText(character.name);
            const cureName = normalizeText(character.cure_name);

            return name.includes(value) || cureName.includes(value);
        })
        .slice(0, 8);

    for (const character of matchingCharacters) {
        const suggestion = document.createElement("div");
        suggestion.className = "suggestion";
        suggestion.textContent = `${character.name} — ${character.cure_name}`;

        suggestion.addEventListener("click", () => {
            input.value = character.name;
            suggestions.innerHTML = "";
        });

        suggestions.appendChild(suggestion);
    }
}


// ============================================================
// TROUVER LE PERSONNAGE ENTRÉ
// ============================================================

function findCharacter(value) {
    const normalized = normalizeText(value);

    return characters.find(character => {
        return (
            normalizeText(character.name) === normalized ||
            normalizeText(character.cure_name) === normalized
        );
    });
}


// ============================================================
// SOUMETTRE UNE PROPOSITION
// ============================================================

function submitGuess() {
    if (gameFinished) {
        return;
    }

    const input = document.getElementById("guess-input");
    const value = input.value.trim();

    if (!value) {
        return;
    }

    const character = findCharacter(value);

    if (!character) {
        showMessage(t("message_not_found"), "error");
        return;
    }

    attempts++;
    document.getElementById("attempt-count").textContent = attempts;

    addGuessResult(character);

    input.value = "";
    document.getElementById("suggestions").innerHTML = "";

    if (character.id === targetCharacter.id) {
        gameFinished = true;

        showMessage(
            t("message_success", {
                cureName: targetCharacter.cure_name,
                attempts
            }),
            "success"
        );

        input.disabled = true;
        document.getElementById("guess-button").disabled = true;
    }
}


// ============================================================
// AJOUT D'UNE LIGNE DE RÉSULTAT
// ============================================================

function addGuessResult(character) {
    const results = document.getElementById("guess-results");

    const targetCategories = targetCharacter.categories || {};
    const guessCategories = character.categories || {};

    const targetSeasons = targetCategories.season || [];
    const guessSeasons = guessCategories.season || [];

    const seasonComparison = compareSeasons(guessSeasons, targetSeasons);

    const targetMovieCount = getMovieCount(targetCharacter.id);
    const guessMovieCount = getMovieCount(character.id);

    const row = document.createElement("div");
    row.className = "guess-row";

    row.innerHTML = `

        <div class="result-cell image-cell">
            <img
                src="${getCharacterImage(character)}"
                alt="${escapeHTML(character.cure_name)}"
            >
        </div>

        ${createResultCell(
            character.name,
            compareValue(character.name, targetCharacter.name)
        )}

        ${createResultCell(
            character.cure_name,
            compareValue(character.cure_name, targetCharacter.cure_name)
        )}

        ${createSeasonCell(
            guessSeasons,
            seasonComparison,
            guessCategories.generation,
            targetCategories.generation
        )}

        ${createResultCell(
            guessCategories.cure_hair_color,
            compareValue(guessCategories.cure_hair_color, targetCategories.cure_hair_color)
        )}

        ${createResultCell(
            guessCategories.cure_main_color,
            compareValue(guessCategories.cure_main_color, targetCategories.cure_main_color)
        )}

        ${createResultCell(
            guessCategories.cure_eyes_color,
            compareValue(guessCategories.cure_eyes_color, targetCategories.cure_eyes_color)
        )}

        ${createMovieCell(guessMovieCount, targetMovieCount)}

    `;

    results.prepend(row);
}


// ============================================================
// CELLULE DE RÉSULTAT
// ============================================================

function createResultCell(value, correct) {
    const className = correct ? "correct" : "incorrect";

    return `
        <div class="result-cell ${className}">
            ${escapeHTML(value !== undefined && value !== null ? String(value) : "?")}
        </div>
    `;
}


// ============================================================
// CELLULE DES SAISONS
// ============================================================
// La catégorie "Génération" n'est plus affichée en tant que
// colonne à part : elle reste dans les données et sert
// uniquement à déterminer la flèche (monte / descend)
// affichée dans la case des saisons.

function createSeasonCell(seasons, comparison, guessGeneration, targetGeneration) {
    let className = "incorrect";
    let arrow = "";

    if (comparison.exact) {
        className = "correct";
    }
    else if (comparison.partial) {
        className = "partial";
    }

    if (!comparison.exact) {
        if (guessGeneration < targetGeneration) {
            arrow = " ↑";
        }
        else if (guessGeneration > targetGeneration) {
            arrow = " ↓";
        }
    }

    return `
        <div class="result-cell ${className}">
            ${seasons.length > 0 ? seasons.map(escapeHTML).join("<br>") : "?"}${arrow}
        </div>
    `;
}


// ============================================================
// CELLULE MOVIE
// ============================================================

function createMovieCell(guessCount, targetCount) {
    if (guessCount === targetCount) {
        return `
            <div class="result-cell correct">
                ${guessCount}
            </div>
        `;
    }

    let arrow = "";

    if (guessCount < targetCount) {
        arrow = " ↑";
    }
    else if (guessCount > targetCount) {
        arrow = " ↓";
    }

    return `
        <div class="result-cell incorrect">
            ${guessCount}${arrow}
        </div>
    `;
}


// ============================================================
// IMAGE
// ============================================================

function getCharacterImage(character) {
    if (!character.image || character.image === "NaN") {
        return "";
    }

    return CHARACTER_IMAGE_PATH + character.image;
}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(message, type) {
    const messageElement = document.getElementById("message");

    messageElement.textContent = message;
    messageElement.className = type;
}


// ============================================================
// ÉCHAPPER LE HTML
// ============================================================

function escapeHTML(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// NOUVELLE PARTIE
// ============================================================

async function startNewGame() {
    if (characters.length === 0) {
        return;
    }

    targetCharacter = await getDailyCharacter();

    attempts = 0;
    gameFinished = false;

    document.getElementById("attempt-count").textContent = "0";
    document.getElementById("guess-results").innerHTML = "";
    document.getElementById("message").textContent = "";
    document.getElementById("message").className = "";

    const input = document.getElementById("guess-input");
    input.value = "";
    input.disabled = false;

    document.getElementById("guess-button").disabled = false;
}


function getTodaySeed() {
    const today = new Date();

    return (
        today.getUTCFullYear() +
        "-" +
        String(today.getUTCMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getUTCDate()).padStart(2, "0")
    );
}


// Hache la chaîne fournie en SHA-256 et renvoie un entier non
// signé dérivé des 4 premiers octets du condensat. Le résultat
// n'a aucun lien direct/prévisible avec la date d'origine,
// contrairement à un simple hash "maison".
async function hashSeed(string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(SEED_SALT + currentMode.id + string);

    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);

    let seed = 0;

    for (let i = 0; i < 4; i++) {
        seed = (seed << 8) | bytes[i];
    }

    return Math.abs(seed);
}


async function getDailyCharacter() {
    const dateSeed = getTodaySeed();
    const seed = await hashSeed(dateSeed);
    const index = seed % characters.length;

    return characters[index];
}


// ============================================================
// INITIALISATION
// ============================================================

async function init() {
    await loadData(currentMode);

    if (characters.length === 0) {
        console.error("Aucun personnage disponible.");
        return;
    }

    createGameInterface();
    setupTopBar();
    applyTranslations();

    await startNewGame();
}


// ============================================================
// LANCEMENT
// ============================================================

init();
