
// =============================
// ACTIVITÉS DE TEST
// =============================

const testActivities = {
    1: {
        title: "Le quiz de la Jungle",
        type: "quiz",
        configuration: {
            question: "Combien sommes-nous dans la Jungle ?",
            options: ["5", "7", "12", "25"]
        }
    },

    2: {
        title: "Les dossiers de la Jungle",
        type: "vote",
        configuration: {
            question: "Qui serait le plus susceptible de rater son avion ?",
            allowSelfVote: false
        }
    },

    3: {
        title: "Confessions de Noël",
        type: "question",
        configuration: {
            question: "Quel est ton meilleur souvenir avec la Jungle ?"
        }
    },

    4: {
        title: "Petite surprise",
        type: "surprise",
        configuration: {
            message: "Aujourd'hui, pas de défi. Profite de ta journée ! 🎄"
        }
    }
};

// =============================
// RÉCUPÉRER UNE ACTIVITÉ
// =============================


async function getActivity(day) {

    // Mode test : les administrateurs peuvent
    // consulter les vraies activités à l'avance.

    if (DEV_MODE && testMode) {

        if (!currentProfile?.is_admin) {
            throw new Error("Mode test réservé à l'administrateur.");
        }

        const { data, error } = await db
            .from("activities")
            .select("day, title, type, configuration")
            .eq("day", day)
            .single();

        if (error) throw error;

        return data;
    }

    // Mode normal : les règles Supabase
    // contrôlent les dates de déverrouillage.

    const { data, error } = await db
        .from("activities")
        .select("day, title, type, configuration")
        .eq("day", day)
        .single();

    if (error) throw error;

    return data;
}


// =============================
// RÉCUPÉRER LES JOUEURS
// =============================

async function getPlayers() {

    const { data, error } = await db
        .from("profiles")
        .select("id, username, avatar")
        .order("username");

    if (error) throw error;

    return data;
}

// =============================
// RÉPONSES EN MODE TEST
// =============================

function getTestResponseKey(day) {

    return `jungle-response-test-${YEAR}-${currentUser.id}-${day}`;
}

// =============================
// RÉCUPÉRER MA RÉPONSE
// =============================

async function getMyResponse(day) {

    if (DEV_MODE && testMode) {

        return JSON.parse(
            localStorage.getItem(
                getTestResponseKey(day)
            ) || "null"
        );
    }

    const { data, error } = await db
        .from("responses")
        .select("answer")
        .eq("player_id", currentUser.id)
        .eq("day", day)
        .maybeSingle();

    if (error) throw error;

    return data ? data.answer : null;
}

// =============================
// ENREGISTRER MA RÉPONSE
// =============================

async function submitResponse(day, answer) {

    if (!currentUser) {
        throw new Error("Joueur non connecté.");
    }

    if (DEV_MODE && testMode) {

        const key = getTestResponseKey(day);

        if (localStorage.getItem(key) !== null) {
            throw new Error("Tu as déjà répondu.");
        }

        localStorage.setItem(
            key,
            JSON.stringify(answer)
        );

        return;
    }

    const { error } = await db
        .from("responses")
        .insert({
            player_id: currentUser.id,
            day: day,
            answer: answer
        });

    if (error) throw error;
}

async function getVoteResults(day) {

    // Résultats fictifs pour tester l'affichage

    if (DEV_MODE && testMode) {

        return {
            total: 7,
            voted: 7,
            revealed: true,
            results: [
                { username: "Joueur 3", votes: 4 },
                { username: "Joueur 5", votes: 2 },
                { username: "Joueur 2", votes: 1 },
                { username: "Joueur 1", votes: 0 },
                { username: "Joueur 4", votes: 0 },
                { username: "Joueur 6", votes: 0 },
                { username: "Joueur 7", votes: 0 }
            ]
        };
    }

    const { data, error } = await db.rpc(
        "get_vote_results",
        { p_day: day }
    );

    if (error) throw error;

    return data;
}

// =============================
// ACTIVITÉ DE TEST : TIRAGE
// =============================

testActivities[5] = {

    title: "Le destin de la Jungle",

    type: "draw",

    configuration: {

        question: "Aujourd'hui, le hasard décide de ton sort.",

        items: [
            "Envoie un compliment à quelqu'un de la Jungle.",
            "Envoie ta photo la plus honteuse de l'année.",
            "Fais une déclaration d'amitié dramatique.",
            "Imite un membre de la Jungle dans un vocal.",
            "Retrouve une vieille photo du groupe."
        ]
    }
};

// =============================
// TIRAGE ALÉATOIRE
// =============================

async function drawRandomItem(activity) {

    const previous = await getMyResponse(
        activity.day
    );

    if (previous !== null) {
        return previous;
    }

    const items = activity.configuration.items;

    if (!Array.isArray(items) || items.length === 0) {

        throw new Error("Aucun élément à tirer.");
    }

    const index = Math.floor(
        Math.random() * items.length
    );

    const result = {

        drawIndex: index,
        text: items[index]

    };

    try {

        await submitResponse(
            activity.day,
            result
        );

        return result;

    } catch (error) {

        // Si un tirage a déjà été effectué
        // depuis un autre appareil.

        const saved = await getMyResponse(
            activity.day
        );

        if (saved !== null) {
            return saved;
        }

        throw error;
    }
}

// =============================
// ACTIVITÉ DE TEST : PHOTO
// =============================

testActivities[6] = {

    title: "Les archives compromettantes",

    type: "photo",

    configuration: {

        question: "Partage la photo la plus chaotique de ton année 2026.",

        allowCaption: true
    }
};

// =============================
// COMPRESSION DE LA PHOTO
// =============================

async function compressPhoto(file) {

    const bitmap = await createImageBitmap(file);

    try {

        const maxSize = 1600;

        const ratio = Math.min(
            1,
            maxSize / Math.max(
                bitmap.width,
                bitmap.height
            )
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
            1, Math.round(bitmap.width * ratio)
        );

        canvas.height = Math.max(
            1, Math.round(bitmap.height * ratio)
        );

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";

        context.fillRect(
            0, 0, canvas.width, canvas.height
        );

        context.drawImage(
            bitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return await new Promise((resolve, reject) => {

            canvas.toBlob(blob => {

                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Compression impossible."));
                }

            }, "image/jpeg", 0.8);

        });

    } finally {

        bitmap.close();

    }
}

// =============================
// CLÉ DU MODE TEST
// =============================

function getTestPhotoKey(day) {

    return `jungle-photo-test-${YEAR}-${currentUser.id}-${day}`;
}

// =============================
// RÉCUPÉRER LES PHOTOS
// =============================

async function getPhotoSubmissions(day) {

    if (DEV_MODE && testMode) {

        const saved = localStorage.getItem(
            getTestPhotoKey(day)
        );

        return saved ? [JSON.parse(saved)] : [];
    }

    const { data, error } = await db
        .from("photo_submissions")
        .select("*")
        .eq("day", day)
        .order("created_at");

    if (error) throw error;

    const players = await getPlayers();

    return await Promise.all(

        data.map(async submission => {

            const player = players.find(
                p => p.id === submission.player_id
            );

            const { data: photo, error: photoError } =
                await db.storage
                    .from("jungle-photos")
                    .createSignedUrl(
                        submission.photo_path,
                        3600
                    );

            return {

                ...submission,

                username: player?.username || "Joueur",

                avatar: player?.avatar || "🎄",

                url: photoError ? null : photo.signedUrl

            };
        })
    );
}

// =============================
// ENVOYER UNE PHOTO
// =============================

async function uploadPhoto(day, file, caption) {

    if (!currentUser) {

        throw new Error("Connexion requise.");

    }

    const compressed = await compressPhoto(file);

    // MODE TEST : stockage local uniquement

    if (DEV_MODE && testMode) {

        const key = getTestPhotoKey(day);

        if (localStorage.getItem(key)) {

            throw new Error("Photo déjà envoyée.");

        }

        const url = await new Promise(
            (resolve, reject) => {

                const reader = new FileReader();

                reader.onload = () => resolve(reader.result);

                reader.onerror = reject;

                reader.readAsDataURL(compressed);
            }
        );

        const submission = {

            player_id: currentUser.id,

            username: currentProfile.username,

            avatar: currentProfile.avatar || "🎄",

            day: day,

            caption: caption,

            url: url
        };

        localStorage.setItem(
            key,
            JSON.stringify(submission)
        );

        return;
    }

    // MODE NORMAL : Supabase Storage

    const path = `${currentUser.id}/${day}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await db.storage
        .from("jungle-photos")
        .upload(path, compressed, {

            contentType: "image/jpeg",

            upsert: false

        });

    if (uploadError) throw uploadError;

    const { error: insertError } = await db
        .from("photo_submissions")
        .insert({

            player_id: currentUser.id,

            day: day,

            photo_path: path,

            caption: caption

        });

    if (insertError) {

        // Supprime le fichier si la participation
        // n'a pas pu être enregistrée.

        await db.storage
            .from("jungle-photos")
            .remove([path]);

        throw insertError;
    }
}
