
// =============================
// CONFIGURATION
// =============================

const YEAR = 2026;

const days = Array.from(
    { length: 24 },
    (_, i) => i + 1
);

const decorations = [
    "😇", // Case 1
    "🐀", // Case 2
    "🚌", // Case 3
    "🗳️", // Case 4
    "🌸", // Case 5
    "💌", // Case 6
    "🍆", // Case 7
    "📷", // Case 8
    "🔠", // Case 9
    "🥸", // Case 10
    "🌟", // Case 11
    "🍽️", // Case 12
    "🎳", // Case 13
    "🎶", // Case 14
    "⏱️", // Case 15
    "🎁", // Case 16
    "🤶", // Case 17
    "🧋", // Case 18
    "😻", // Case 19
    "💍", // Case 20
    "🦟", // Case 21
    "🛋️", // Case 22
    "👩‍⚕️", // Case 23
    "⏰"  // Case 24
];

// Mode test uniquement sur ordinateur local

const DEV_MODE = [
    "localhost",
    "127.0.0.1"
].includes(window.location.hostname);

let testMode = false;
let currentUser = null;
let currentProfile = null;
let openedDays = [];
let availableDays = new Set();
let openingInProgress = false;

// =============================
// ÉLÉMENTS HTML
// =============================

const calendar = document.getElementById("calendar");
const modal = document.getElementById("day-modal");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");
const christmasDay = document.getElementById("christmas-day");
const gameError = document.getElementById("game-error");

// =============================
// GESTION DU MODE TEST
// =============================

document.getElementById(
    "test-mode-container"
).hidden = true;

function getTestKey() {

    return `jungle-test-${YEAR}-${currentUser?.id}`;
}

function getOpenedDays() {

    if (testMode) {

        return JSON.parse(
            localStorage.getItem(getTestKey()) || "[]"
        );

    }

    return openedDays;
}

// =============================
// DISPONIBILITÉ DES CASES
// =============================

function isAvailable(day) {

    if (!currentUser) {
        return false;
    }

    if (DEV_MODE && testMode) {
        return true;
    }

    return availableDays.has(day);
}

// =============================
// CHARGEMENT DEPUIS SUPABASE
// =============================

async function loadAvailableDays() {

    const { data, error } = await db
        .from("activities")
        .select("day");

    if (error) {
        throw error;
    }

    availableDays = new Set(
        data.map(row => row.day)
    );
}

async function loadOpenedDays() {

    if (!currentUser) {
        return;
    }

    const { data, error } = await db
        .from("opened_days")
        .select("day")
        .eq("player_id", currentUser.id);

    if (error) {
        throw error;
    }

    openedDays = data.map(row => row.day);
}

// =============================
// SAUVEGARDE D'UNE CASE
// =============================

async function saveOpenedDay(day) {

    if (!currentUser) {
        return;
    }

    if (testMode && DEV_MODE) {

        const savedDays = getOpenedDays();

        if (!savedDays.includes(day)) {

            savedDays.push(day);

            localStorage.setItem(
                getTestKey(),
                JSON.stringify(savedDays)
            );
        }

        return;
    }

    if (openedDays.includes(day)) {
        return;
    }

    const { error } = await db
        .from("opened_days")
        .insert({
            player_id: currentUser.id,
            day: day
        });

    // 23505 = case déjà ouverte sur un autre appareil

    if (error && error.code !== "23505") {
        throw error;
    }

    if (!openedDays.includes(day)) {
        openedDays.push(day);
    }
}

// =============================
// PROGRESSION DU JOUEUR
// =============================

function updateProgress() {

    const total = getOpenedDays()
        .filter(day => day <= 24)
        .length;

    document.getElementById(
        "player-progress"
    ).textContent = testMode
        ? `Mode test — ${total}/24 cases ouvertes`
        : `${total}/24 cases ouvertes`;
}

// =============================
// AFFICHAGE DU CALENDRIER
// =============================

function renderCalendar() {

    calendar.innerHTML = "";

    const savedDays = getOpenedDays();

    days.forEach((day, index) => {

        const door = document.createElement("button");

        door.classList.add("door");

        const available = isAvailable(day);

        const decoration = decorations[index];

        door.innerHTML = `
            <span class="number">${day}</span>
            <span class="decoration">
                ${decoration}
            </span>
        `;

        door.setAttribute(
            "aria-label",
            `${day} décembre`
        );

        if (!available) {

            door.classList.add("locked");
            door.disabled = true;

        }

        if (savedDays.includes(day)) {

            door.classList.add("opened");

        }

        door.addEventListener("click", () => {
            openDay(day);
        });

        calendar.appendChild(door);
    });

    christmasDay.disabled = !isAvailable(25);

    christmasDay.classList.toggle(
        "locked",
        !isAvailable(25)
    );

    christmasDay.classList.toggle(
        "opened",
        savedDays.includes(25)
    );

    updateProgress();
}

// =============================
// OUVERTURE D'UNE CASE
// =============================


async function openDay(day) {

    if (!isAvailable(day) || openingInProgress) {
        return;
    }

    openingInProgress = true;
    gameError.textContent = "";

    try {

        if (day === 25) {

    renderJungleAwards();

} else {

    const activity = await getActivity(day);

    await renderActivity(activity);

}

        await saveOpenedDay(day);

        renderCalendar();

        modal.showModal();

    } catch (error) {

        console.error(error);

        gameError.textContent =
            "Impossible de charger cette activité. Réessaie.";

    } finally {

        openingInProgress = false;
    }
}


// =============================
// COMPTE À REBOURS
// =============================

function updateCountdown() {

    const now = new Date();

    // Minuit en France le 1er décembre

    const start = new Date(
        `${YEAR}-12-01T00:00:00+01:00`
    );

    const difference = start - now;

    const countdown =
        document.getElementById("countdown");

    if (difference > 0) {

        const hours = Math.floor(
            difference / (1000 * 60 * 60)
        );

        const daysLeft = Math.floor(hours / 24);
        const hoursLeft = hours % 24;

        countdown.textContent =
            `Plus que ${daysLeft} j et ${hoursLeft} h !`;

    } else if (

        now < new Date(`${YEAR}-12-26T00:00:00+01:00`)

    ) {

        countdown.textContent =
            "Que les festivités commencent !";

    } else {

        countdown.textContent =
            "Joyeux Noël, la Jungle !";

    }
}

// =============================
// ÉVÉNEMENTS
// =============================

christmasDay.addEventListener("click", () => {
    openDay(25);
});

document.getElementById("close-modal")
    .addEventListener("click", () => {
        modal.close();
    });

document.getElementById("test-mode")
    .addEventListener("change", event => {

        testMode = DEV_MODE && event.target.checked;

        renderCalendar();

    });

// Actualisation toutes les minutes

setInterval(async () => {

    if (!currentUser) {
        return;
    }

    try {

        await loadAvailableDays();
        await loadOpenedDays();

        updateCountdown();
        renderCalendar();

    } catch (error) {

        console.error(error);

    }

}, 60000);


const complaintModal = document.getElementById("complaint-modal");

document.getElementById("complaint-button")
    .addEventListener("click", () => {
        complaintModal.showModal();
    });

document.getElementById("close-complaint")
    .addEventListener("click", () => {
        complaintModal.close();
    });

document.getElementById("complaint-ok")
    .addEventListener("click", () => {
        complaintModal.close();
    });
