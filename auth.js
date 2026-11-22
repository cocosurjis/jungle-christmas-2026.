
// =============================
// ÉLÉMENTS HTML
// =============================

const loginScreen =
    document.getElementById("login-screen");

const gameScreen =
    document.getElementById("game-screen");

const loadingScreen =
    document.getElementById("loading-screen");

const loginForm =
    document.getElementById("login-form");

const loginError =
    document.getElementById("login-error");

const loginButton =
    document.getElementById("login-button");

// =============================
// AFFICHAGE DE LA CONNEXION
// =============================

function showLogin() {

    currentUser = null;
    currentProfile = null;

    openedDays = [];
    availableDays = new Set();

    testMode = false;

    document.getElementById(
        "test-mode"
    ).checked = false;

    if (modal.open) {
        modal.close();
    }

    gameScreen.hidden = true;
    loadingScreen.hidden = true;
    loginScreen.hidden = false;

}

// =============================
// CHARGEMENT DU PROFIL
// =============================

async function loadProfile(user) {

    const { data, error } = await db
        .from("profiles")
        .select("id, username, avatar, is_admin")
        .eq("id", user.id)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// =============================
// ACCÈS AU CALENDRIER
// =============================

async function showGame(user) {

    loadingScreen.hidden = false;
    loginScreen.hidden = true;
    gameScreen.hidden = true;

    try {

        currentUser = user;

        currentProfile = await loadProfile(user);
        document.getElementById(
            "test-mode-container"
        ).hidden = !(DEV_MODE && currentProfile.is_admin);

        await Promise.all([
            loadAvailableDays(),
            loadOpenedDays()
        ]);

        document.getElementById(
            "player-name"
        ).textContent =
            `Bienvenue, ${currentProfile.username} !`;

        gameError.textContent = "";

        updateCountdown();
        renderCalendar();

        loadingScreen.hidden = true;
        gameScreen.hidden = false;

    } catch (error) {

        console.error(error);

        await db.auth.signOut();

        showLogin();

        loginError.textContent =
            "Impossible de charger ton profil.";

    }
}

// =============================
// CONNEXION
// =============================

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    loginError.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "Connexion...";

    const email = document.getElementById(
        "email"
    ).value.trim();

    const password = document.getElementById(
        "password"
    ).value;

    try {

        const { data, error } =
            await db.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        await showGame(data.user);

        document.getElementById(
            "password"
        ).value = "";

    } catch (error) {

        console.error(error);

        loginError.textContent =
            "Connexion impossible. Vérifie tes identifiants.";

    } finally {

        loginButton.disabled = false;

        loginButton.textContent =
            "Entrer dans la Jungle";

    }

});

// =============================
// DÉCONNEXION
// =============================

document.getElementById("logout-button")
    .addEventListener("click", async () => {

        const { error } = await db.auth.signOut();

        if (error) {

            console.error(error);

            gameError.textContent =
                "Impossible de te déconnecter.";

            return;
        }

        loginForm.reset();
        loginError.textContent = "";

        showLogin();

    });

// =============================
// RESTAURATION DE LA SESSION
// =============================

async function initializeAuth() {

    try {

        const { data, error } =
            await db.auth.getSession();

        if (error) {
            throw error;
        }

        if (data.session) {

            await showGame(data.session.user);

        } else {

            showLogin();

        }

    } catch (error) {

        console.error(error);

        showLogin();

        loginError.textContent =
            "Impossible de vérifier la connexion.";

    }
}

db.auth.onAuthStateChange(event => {

    if (event === "SIGNED_OUT") {
        showLogin();
    }

});

initializeAuth();
