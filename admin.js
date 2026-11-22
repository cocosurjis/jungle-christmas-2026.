
// =============================
// ADMINISTRATION
// =============================

let selectedAdminDay = null;
let adminActivities = {};
const adminCalendar = document.getElementById(
    "admin-calendar"
);

const adminForm = document.getElementById(
    "admin-form"
);

const adminType = document.getElementById(
    "admin-type"
);

const adminSave = document.getElementById(
    "admin-save"
);


// =============================
// VÉRIFICATION ADMIN
// =============================

async function initializeAdmin() {

    try {

        const { data: sessionData, error: sessionError } =
            await db.auth.getUser();

        if (sessionError) throw sessionError;

        const user = sessionData.user;

        if (!user) {
            showAdminDenied();
            return;
        }

        const { data: profile, error } = await db
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

        if (error) throw error;

        if (!profile?.is_admin) {
            showAdminDenied();
            return;
        }

        document.getElementById(
            "admin-loading"
        ).hidden = true;

        document.getElementById(
            "admin-panel"
        ).hidden = false;
        await loadAdminActivities();
        renderAdminCalendar();

    } catch (error) {

        console.error(error);

        showAdminDenied();
    }
}

function showAdminDenied() {

    document.getElementById(
        "admin-loading"
    ).hidden = true;

    document.getElementById(
        "admin-denied"
    ).hidden = false;
}

// =============================
// CALENDRIER ADMIN
// =============================

function renderAdminCalendar() {

    adminCalendar.innerHTML = "";

    for (let day = 1; day <= 25; day++) {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "admin-day";

        if (day === 25) {

            button.classList.add("christmas");

            button.textContent =
                "🎁 25 décembre";

        } else {

            button.textContent = day;
        }

        button.addEventListener("click", () => {

            selectAdminDay(day);

        });

        adminCalendar.appendChild(button);
    }
}

// =============================
// SÉLECTION D'UNE CASE
// =============================


function selectAdminDay(day) {

    selectedAdminDay = day;

    document.querySelectorAll(".admin-day")
        .forEach((button, index) => {

            button.classList.toggle(
                "selected",
                index + 1 === day
            );
        });

    const activity = adminActivities[day];

    if (!activity) {
        alert("Impossible de charger cette case.");
        return;
    }

    const config = activity.configuration || {};

    document.getElementById(
        "admin-day-title"
    ).textContent = `Modifier le ${day} décembre`;

    adminForm.hidden = false;

    adminType.value = activity.type;

    document.getElementById(
        "admin-title"
    ).value = activity.title;

    document.getElementById(
        "admin-question"
    ).value = config.question || config.message || "";

    document.getElementById(
        "admin-options"
    ).value = (
        config.options || config.items || []
    ).join("\n");

    document.getElementById(
        "admin-self-vote"
    ).checked = config.allowSelfVote === true;

    document.getElementById(
        "admin-caption"
    ).checked = config.allowCaption !== false;

    document.getElementById(
        "admin-message"
    ).textContent = "";

    updateAdminFields();
}


// =============================
// CHAMPS SELON LE TYPE
// =============================

function updateAdminFields() {

    const type = adminType.value;

    document.getElementById(
        "admin-options-section"
    ).hidden = !["quiz", "draw"].includes(type);

    document.getElementById(
        "admin-vote-section"
    ).hidden = type !== "vote";

    document.getElementById(
        "admin-photo-section"
    ).hidden = type !== "photo";
}

adminType.addEventListener(
    "change",
    updateAdminFields
);

// Ne pas soumettre avant la connexion à Supabase
adminForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (selectedAdminDay === null) return;

    const message = document.getElementById(
        "admin-message"
    );

    const type = adminType.value;

    const title = document.getElementById(
        "admin-title"
    ).value.trim();

    const question = document.getElementById(
        "admin-question"
    ).value.trim();

    const options = document.getElementById(
        "admin-options"
    ).value
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean);

    if (!title) {
        message.textContent = "Le titre est obligatoire.";
        return;
    }

    if (!question) {
        message.textContent =
            "La question ou le message est obligatoire.";
        return;
    }

    if (["quiz", "draw"].includes(type) &&
        options.length < 2) {

        message.textContent =
            "Ajoute au moins deux propositions.";
        return;
    }

    const configuration = {};

    if (type === "surprise") {

        configuration.message = question;

    } else {

        configuration.question = question;
    }

    if (type === "quiz") {

        configuration.options = options;

    }

    if (type === "draw") {

        configuration.items = options;

    }

    if (type === "vote") {

        configuration.allowSelfVote =
            document.getElementById(
                "admin-self-vote"
            ).checked;
    }

    if (type === "photo") {

        configuration.allowCaption =
            document.getElementById(
                "admin-caption"
            ).checked;
    }

    adminSave.disabled = true;

    adminSave.textContent = "Enregistrement...";

    message.textContent = "";

    try {

        const { data, error } = await db
            .from("activities")
            .update({
                title: title,
                type: type,
                configuration: configuration
            })
            .eq("day", selectedAdminDay)
            .select("day, title, type, configuration")
            .single();

        if (error) throw error;

        adminActivities[selectedAdminDay] = data;

        message.textContent =
            "✓ Case enregistrée avec succès !";

        message.style.color = "#28523C";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Erreur lors de l'enregistrement.";

        message.style.color = "#8C2635";

    } finally {

        adminSave.disabled = false;

        adminSave.textContent =
            "Enregistrer les modifications";
    }
});


async function loadAdminActivities() {

    const { data, error } = await db
        .from("activities")
        .select("day, title, type, configuration")
        .order("day");

    if (error) throw error;

    adminActivities = {};

    data.forEach(activity => {
        adminActivities[activity.day] = activity;
    });
}

initializeAdmin();
