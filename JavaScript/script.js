// ============================================================
// PrettyCureDLE
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const CHARACTER_IMAGE_PATH = "./Images/Pose/";

// Clé utilisée pour mémoriser la langue choisie (localStorage).
const LANGUAGE_STORAGE_KEY = "pcdle_language";

// Préfixe des clés utilisées pour sauvegarder la partie en
// cours (localStorage). Une clé par mode + par jour : le
// lendemain, la date change donc la clé change, et l'ancienne
// est nettoyée automatiquement (voir cleanupOldSessions).
const SESSION_STORAGE_PREFIX = "pcdle_session_";

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
        guess_placeholder: "Entrez un nom...",
        guess_button: "Deviner",
        header_image: "Image",
        header_name: "Nom",
        header_cure_name: "Nom de Cure",
        header_seasons: "Saisons",
        header_hair_color: "Couleur de cheveux",
        header_main_color: "Couleur principale",
        header_eyes_color: "Couleur des yeux",
        header_movie: "Film",
        header_first_episode: "Premier épisode",
        header_last_episode: "Dernier épisode",
        header_attack_defeat: "Attaque / Défaite",
        info_movie: "Nombre de films auxquels la Cure a participé",
        message_not_found: "Personnage introuvable.",
        message_success: "Bravo ! Tu as trouvé {name} en {attempts} tentative(s) !",
        footer_legal: "Mentions légales",
        mode_cures: "Cures",
        mode_enemies: "Ennemis",
        mode_mode3: "Mode 3",
        mode_coming_soon: "Bientôt disponible"
    },
    en: {
        attempts_label: "Attempts:",
        guess_placeholder: "Enter a name...",
        guess_button: "Guess",
        header_image: "Image",
        header_name: "Name",
        header_cure_name: "Cure Name",
        header_seasons: "Seasons",
        header_hair_color: "Hair Color",
        header_main_color: "Main Color",
        header_eyes_color: "Eyes Color",
        header_movie: "Movie",
        header_first_episode: "First Episode",
        header_last_episode: "Last Episode",
        header_attack_defeat: "Attack / Defeat",
        info_movie: "Number of movies the Cure appeared in",
        message_not_found: "Character not found.",
        message_success: "Congrats! You found {name} in {attempts} attempt(s)!",
        footer_legal: "Legal notice",
        mode_cures: "Cures",
        mode_enemies: "Enemies",
        mode_mode3: "Mode 3",
        mode_coming_soon: "Coming soon"
    },
    ja: {
        attempts_label: "挑戦回数：",
        guess_placeholder: "名前を入力...",
        guess_button: "回答する",
        header_image: "画像",
        header_name: "名前",
        header_cure_name: "キュア名",
        header_seasons: "シーズン",
        header_hair_color: "髪の色",
        header_main_color: "メインカラー",
        header_eyes_color: "瞳の色",
        header_movie: "映画",
        header_first_episode: "初登場話",
        header_last_episode: "最終登場話",
        header_attack_defeat: "必殺技 / 敗北",
        info_movie: "キュアが出演した映画の数",
        message_not_found: "キャラクターが見つかりません。",
        message_success: "おめでとう！{attempts}回で{name}を見つけました！",
        footer_legal: "法的事項",
        mode_cures: "キュア",
        mode_enemies: "敵",
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
// Chaque mode réutilise le même moteur de jeu (comparaison de
// champs, saisons avec flèche basée sur la génération, etc.)
// mais pioche ses personnages dans un autre fichier JSON et
// affiche ses propres colonnes ("columns").
//
// Types de colonne disponibles :
//   - "image"   : la portrait du personnage, pas de comparaison
//   - "text"    : comparaison stricte d'un champ (field: chemin
//                 à points dans l'objet, ex. "categories.attack_defeat")
//   - "season"  : saisons + flèche basée sur "categories.generation"
//                 (qui n'est jamais affichée telle quelle)
//   - "episode" : nombre d'épisode, avec flèche s'il s'agit de
//                 deux nombres, ou un trait "—" si l'un des deux
//                 est un nom de film (donc pas comparable)
//   - "movie"   : nombre de films (déduit de filmFile), avec
//                 flèche, et une bulle d'info optionnelle (infoKey)
//
// Pour ajouter un mode : lui donner un id, un characterFile, un
// dataKey (nom de la clé racine du tableau dans le JSON), des
// searchFields (champs utilisés pour chercher/suggérer), un
// revealField (nom affiché dans le message de victoire), ses
// columns, et available: true une fois le JSON prêt.

const GAME_MODES = [
    {
        id: "cures",
        labelKey: "mode_cures",
        characterFile: "./Data/Cures.json",
        filmFile: "./Data/Films.json",
        dataKey: "characters",
        searchFields: ["name", "cure_name"],
        revealField: "cure_name",
        columns: [
            { type: "image" },
            { type: "text", field: "name", headerKey: "header_name" },
            { type: "text", field: "cure_name", headerKey: "header_cure_name" },
            { type: "season", headerKey: "header_seasons" },
            { type: "text", field: "categories.cure_hair_color", headerKey: "header_hair_color" },
            { type: "text", field: "categories.cure_main_color", headerKey: "header_main_color" },
            { type: "text", field: "categories.cure_eyes_color", headerKey: "header_eyes_color" },
            { type: "movie", headerKey: "header_movie", infoKey: "info_movie" }
        ],
        available: true
    },
    {
        id: "enemies",
        labelKey: "mode_enemies",
        characterFile: "./Data/Enemies.json",
        filmFile: null,
        dataKey: "enemies",
        searchFields: ["name"],
        revealField: "name",
        columns: [
            { type: "image" },
            { type: "text", field: "name", headerKey: "header_name" },
            { type: "season", headerKey: "header_seasons" },
            { type: "episode", field: "categories.first_episode", headerKey: "header_first_episode" },
            { type: "episode", field: "categories.last_episode", headerKey: "header_last_episode" },
            { type: "text", field: "categories.attack_defeat", headerKey: "header_attack_defeat" }
        ],
        available: true
    },
    {
        id: "mode3",
        labelKey: "mode_mode3",
        characterFile: "./Data/Mode3.json",
        filmFile: "./Data/Mode3_Films.json",
        dataKey: "characters",
        searchFields: ["name"],
        revealField: "name",
        columns: [],
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

// Identifiants des personnages déjà devinés dans la partie en
// cours, dans l'ordre, pour pouvoir sauvegarder/restaurer la
// session.
let guessHistory = [];


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
        characters = charactersData[mode.dataKey] || [];

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
// ACCÈS GÉNÉRIQUE À UN CHAMP ("a.b.c")
// ============================================================

function getField(object, path) {
    if (!object || !path) {
        return undefined;
    }

    return path
        .split(".")
        .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), object);
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
    createGameInterface();

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

    currentMode.columns.forEach((column, index) => {
        const header = document.getElementById(`header-col-${index}`);

        if (!header) {
            return;
        }

        header.textContent = t(column.headerKey);

        if (column.infoKey) {
            const icon = document.createElement("span");
            icon.className = "info-icon";
            icon.title = t(column.infoKey);
            icon.textContent = "ⓘ";
            header.appendChild(icon);
        }
    });
}


// ============================================================
// CRÉATION DE L'INTERFACE
// ============================================================

function renderColumnHeader(column, index) {
    const infoHTML = column.infoKey
        ? ` <span class="info-icon" title="${escapeHTML(t(column.infoKey))}">ⓘ</span>`
        : "";

    return `<div id="header-col-${index}">${t(column.headerKey)}${infoHTML}</div>`;
}

function setResultsGridColumns() {
    const count = Math.max(currentMode.columns.length, 1);

    document.documentElement.style.setProperty(
        "--results-grid-columns",
        `80px repeat(${count - 1}, 1fr)`
    );
}

function createGameInterface() {
    const gameContainer = document.querySelector(".game-container");

    if (!gameContainer) {
        console.error("Impossible de trouver .game-container");
        return;
    }

    const headerCells = currentMode.columns
        .map((column, index) => renderColumnHeader(column, index))
        .join("");

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
                <div class="results-header">${headerCells}</div>

                <div id="guess-results"></div>
            </div>

        </div>
    `;

    setResultsGridColumns();
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
            return currentMode.searchFields.some(field =>
                normalizeText(getField(character, field)).includes(value)
            );
        })
        .slice(0, 8);

    for (const character of matchingCharacters) {
        const label = currentMode.searchFields
            .map(field => getField(character, field))
            .filter(part => part !== undefined && part !== null && part !== "")
            .join(" — ");

        const suggestion = document.createElement("div");
        suggestion.className = "suggestion";
        suggestion.textContent = label;

        suggestion.addEventListener("click", () => {
            input.value = getField(character, currentMode.searchFields[0]);
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

    return characters.find(character =>
        currentMode.searchFields.some(field => normalizeText(getField(character, field)) === normalized)
    );
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
    guessHistory.push(character.id);
    document.getElementById("attempt-count").textContent = attempts;

    addGuessResult(character);

    input.value = "";
    document.getElementById("suggestions").innerHTML = "";

    if (character.id === targetCharacter.id) {
        gameFinished = true;

        showMessage(
            t("message_success", {
                name: getField(targetCharacter, currentMode.revealField),
                attempts
            }),
            "success"
        );

        input.disabled = true;
        document.getElementById("guess-button").disabled = true;
    }

    saveSession();
}


// ============================================================
// AJOUT D'UNE LIGNE DE RÉSULTAT
// ============================================================

function addGuessResult(character) {
    const results = document.getElementById("guess-results");

    const row = document.createElement("div");
    row.className = "guess-row";

    row.innerHTML = currentMode.columns
        .map(column => renderColumnCell(column, character))
        .join("");

    results.prepend(row);
}

function renderColumnCell(column, character) {
    switch (column.type) {
        case "image":
            return renderImageCell(character);

        case "text":
            return createResultCell(
                getField(character, column.field),
                compareValue(getField(character, column.field), getField(targetCharacter, column.field))
            );

        case "season": {
            const guessSeasons = getField(character, "categories.season") || [];
            const targetSeasons = getField(targetCharacter, "categories.season") || [];

            return createSeasonCell(
                guessSeasons,
                compareSeasons(guessSeasons, targetSeasons),
                getField(character, "categories.generation"),
                getField(targetCharacter, "categories.generation")
            );
        }

        case "episode":
            return createEpisodeCell(
                getField(character, column.field),
                getField(targetCharacter, column.field)
            );

        case "movie":
            return createMovieCell(getMovieCount(character.id), getMovieCount(targetCharacter.id));

        default:
            return "";
    }
}


// ============================================================
// CELLULE IMAGE
// ============================================================

function renderImageCell(character) {
    const src = getCharacterImage(character);
    const alt = escapeHTML(getField(character, currentMode.revealField) || "");

    if (!src) {
        return `
            <div class="result-cell image-cell">
                <div class="image-placeholder">?</div>
            </div>
        `;
    }

    return `
        <div class="result-cell image-cell">
            <img
                src="${src}"
                alt="${alt}"
                onerror="this.style.display='none'; this.parentElement.classList.add('image-missing');"
            >
        </div>
    `;
}


// ============================================================
// CELLULE DE RÉSULTAT (comparaison simple)
// ============================================================

function createResultCell(value, correct) {
    const className = correct ? "correct" : "incorrect";

    return `
        <div class="result-cell ${className}">
            ${escapeHTML(value !== undefined && value !== null && value !== "" ? String(value) : "?")}
        </div>
    `;
}


// ============================================================
// CELLULE DES SAISONS
// ============================================================
// La catégorie "Génération" n'est jamais affichée en tant que
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

    if (!comparison.exact && guessGeneration !== undefined && targetGeneration !== undefined) {
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
// CELLULE ÉPISODE (first_episode / last_episode)
// ============================================================
// La valeur est soit un numéro d'épisode (nombre), soit un nom
// de film (texte) quand l'apparition a lieu dans un film plutôt
// que dans la série, soit null si inconnu. On ne peut comparer
// un "ordre" que si les deux valeurs sont des nombres ; sinon on
// affiche un simple trait "—" plutôt qu'une flèche trompeuse.

function createEpisodeCell(guessValue, targetValue) {
    const hasGuessValue = guessValue !== undefined && guessValue !== null && guessValue !== "";
    const hasTargetValue = targetValue !== undefined && targetValue !== null && targetValue !== "";

    const correct = compareValue(guessValue, targetValue);
    const className = correct ? "correct" : "incorrect";
    const displayValue = hasGuessValue ? String(guessValue) : "?";

    let suffix = "";

    if (!correct && hasGuessValue && hasTargetValue) {
        const guessIsNumber = typeof guessValue === "number";
        const targetIsNumber = typeof targetValue === "number";

        if (guessIsNumber && targetIsNumber) {
            suffix = guessValue < targetValue ? " ↑" : " ↓";
        }
        else {
            // L'une des deux valeurs (ou les deux) est un nom de
            // film : il n'y a pas d'ordre numérique à comparer.
            suffix = " —";
        }
    }

    return `
        <div class="result-cell ${className}">
            ${escapeHTML(displayValue)}${suffix}
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

    const arrow = guessCount < targetCount ? " ↑" : " ↓";

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
// SAUVEGARDE DE LA SESSION (localStorage)
// ============================================================
// Une partie est sauvegardée par mode et par jour : si tu
// recharges la page, tes propositions déjà faites réapparaissent
// automatiquement. Le lendemain, la date change donc c'est une
// toute nouvelle clé : la sauvegarde de la veille devient
// obsolète (et sera nettoyée par cleanupOldSessions).

function getSessionKey(mode, dateSeed) {
    return `${SESSION_STORAGE_PREFIX}${mode.id}_${dateSeed}`;
}

function saveSession() {
    const key = getSessionKey(currentMode, getTodaySeed());

    const session = {
        guesses: guessHistory,
        attempts,
        finished: gameFinished
    };

    try {
        localStorage.setItem(key, JSON.stringify(session));
    }
    catch (error) {
        console.error("Impossible de sauvegarder la session :", error);
    }
}

function restoreSession() {
    const key = getSessionKey(currentMode, getTodaySeed());

    let session = null;

    try {
        const raw = localStorage.getItem(key);

        if (raw) {
            session = JSON.parse(raw);
        }
    }
    catch (error) {
        console.error("Impossible de lire la session sauvegardée :", error);
    }

    if (!session || !Array.isArray(session.guesses)) {
        return;
    }

    for (const id of session.guesses) {
        const character = characters.find(item => item.id === id);

        if (character) {
            addGuessResult(character);
        }
    }

    guessHistory = [...session.guesses];
    attempts = session.attempts || session.guesses.length;
    document.getElementById("attempt-count").textContent = attempts;

    if (session.finished) {
        gameFinished = true;

        showMessage(
            t("message_success", {
                name: getField(targetCharacter, currentMode.revealField),
                attempts
            }),
            "success"
        );

        document.getElementById("guess-input").disabled = true;
        document.getElementById("guess-button").disabled = true;
    }
}

// Supprime les sessions sauvegardées des jours précédents, pour
// ne pas accumuler des clés inutiles dans le localStorage.
function cleanupOldSessions() {
    const todaySeed = getTodaySeed();

    try {
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.startsWith(SESSION_STORAGE_PREFIX) && !key.endsWith(todaySeed)) {
                keysToRemove.push(key);
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    }
    catch (error) {
        console.error("Impossible de nettoyer les anciennes sessions :", error);
    }
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
    guessHistory = [];

    document.getElementById("attempt-count").textContent = "0";
    document.getElementById("guess-results").innerHTML = "";
    document.getElementById("message").textContent = "";
    document.getElementById("message").className = "";

    const input = document.getElementById("guess-input");
    input.value = "";
    input.disabled = false;

    document.getElementById("guess-button").disabled = false;

    restoreSession();
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
    cleanupOldSessions();

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
