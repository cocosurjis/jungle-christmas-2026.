
// =============================
// CRÉATION D'UN ÉLÉMENT HTML
// =============================

function createGameElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// =============================
// MOTEUR PRINCIPAL
// =============================

async function renderActivity(activity) {

    modalTitle.textContent = activity.title;
    modalContent.innerHTML = "";

    const container = createGameElement(
        "div", "game-container"
    );

    modalContent.appendChild(container);

    switch (activity.type) {

        case "quiz":
            await renderQuiz(activity, container);
            break;

        case "vote":
            await renderVote(activity, container);
            break;

        case "question":
            await renderQuestion(activity, container);
            break;

        case "surprise":
            renderSurprise(activity, container);
            break;
        case "draw":
            await renderDraw(activity, container);
            break;
        case "photo":
            await renderPhoto(activity, container);
            break;

        default:
            container.textContent =
                "Cette surprise est en préparation...";
    }
}

// =============================
// MESSAGE DE CONFIRMATION
// =============================

function renderCompleted(container, answerText) {

    container.innerHTML = "";

    container.appendChild(
        createGameElement(
            "div",
            "game-success-icon",
            "✓"
        )
    );

    container.appendChild(
        createGameElement(
            "h3",
            "",
            "Participation enregistrée !"
        )
    );

    container.appendChild(
        createGameElement(
            "p",
            "game-description",
            "Ta réponse :"
        )
    );

    container.appendChild(
        createGameElement(
            "div",
            "saved-answer",
            answerText
        )
    );

    container.appendChild(
        createGameElement(
            "p",
            "game-note",
            "Ta réponse est définitive."
        )
    );
}

// =============================
// BOUTON DE VALIDATION
// =============================

function addSubmitButton(
    container,
    activity,
    getAnswer,
    getAnswerText
) {

    const button = createGameElement(
        "button",
        "game-submit",
        "Valider ma réponse"
    );

    button.type = "button";

    const errorMessage = createGameElement(
        "p", "game-error"
    );

    button.addEventListener("click", async () => {

        errorMessage.textContent = "";

        const answer = getAnswer();

        if (answer === null) {

            errorMessage.textContent =
                "Tu dois d'abord répondre !";

            return;
        }

        button.disabled = true;

        try {

            await submitResponse(
                activity.day,
                answer
            );

            renderCompleted(
                container,
                getAnswerText(answer)
            );

if (activity.type === "vote") {
    await renderVoteResults(activity, container);
}

        } catch (error) {

            console.error(error);

            errorMessage.textContent =
                "Impossible d'enregistrer ta réponse. Actualise la page avant de réessayer.";

        } finally {

            button.disabled = false;
        }
    });

    container.appendChild(button);
    container.appendChild(errorMessage);
}

// =============================
// JEU 1 : QUIZ
// =============================

async function renderQuiz(activity, container) {

    const config = activity.configuration;
    const previous = await getMyResponse(activity.day);

    if (previous !== null) {

        renderCompleted(
            container,
            config.options[previous.choice] || "Réponse enregistrée"
        );

        return;
    }

    container.appendChild(
        createGameElement(
            "p", "game-question", config.question
        )
    );

    let selected = null;

    const options = createGameElement(
        "div", "game-options"
    );

    config.options.forEach((option, index) => {

        const button = createGameElement(
            "button", "game-option", option
        );

        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", () => {

            selected = index;

            options.querySelectorAll("button")
                .forEach(btn => {
                    btn.classList.remove("selected");
                    btn.setAttribute("aria-pressed", "false");
                });

            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        });

        options.appendChild(button);
    });

    container.appendChild(options);

    addSubmitButton(
        container,
        activity,
        () => selected === null
            ? null
            : { choice: selected },
        answer => config.options[answer.choice]
    );
}

// =============================
// JEU 2 : VOTE
// =============================

async function renderVote(activity, container) {

    const config = activity.configuration;

    const players = await getPlayers();

    const previous = await getMyResponse(
        activity.day
    );

    if (previous !== null) {

        const player = players.find(
            p => p.id === previous.playerId
        );

        renderCompleted(
        container,
        player?.username || "Vote enregistré"
        );

    await renderVoteResults(activity, container);

    return;
    }

    const candidates = players.filter(player =>
        config.allowSelfVote ||
        player.id !== currentUser.id
    );

    container.appendChild(
        createGameElement(
            "p", "game-question", config.question
        )
    );

    container.appendChild(
        createGameElement(
            "p",
            "game-note",
            "Les autres joueurs ne verront pas ton vote individuel."
        )
    );

    if (candidates.length === 0) {

        container.appendChild(
            createGameElement(
                "p",
                "game-note",
                "Aucun autre joueur disponible pour le moment."
            )
        );

        return;
    }

    let selected = null;

    const options = createGameElement(
        "div", "game-options"
    );

    candidates.forEach(player => {

        const button = createGameElement(
            "button",
            "game-option",
            `${player.avatar || "🎄"} ${player.username}`
        );

        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", () => {

            selected = player.id;

            options.querySelectorAll("button")
                .forEach(btn => {
                    btn.classList.remove("selected");
                    btn.setAttribute("aria-pressed", "false");
                });

            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        });

        options.appendChild(button);
    });

    container.appendChild(options);

    addSubmitButton(
        container,
        activity,
        () => selected
            ? { playerId: selected }
            : null,
        answer => players.find(
            p => p.id === answer.playerId
        )?.username
    );
}

// =============================
// JEU 3 : QUESTION OUVERTE
// =============================

async function renderQuestion(activity, container) {

    const config = activity.configuration;

    const previous = await getMyResponse(
        activity.day
    );

    if (previous !== null) {

        renderCompleted(container, previous.text);
        return;
    }

    container.appendChild(
        createGameElement(
            "p", "game-question", config.question
        )
    );

    const textarea = createGameElement(
        "textarea", "game-textarea"
    );

    textarea.placeholder =
        "Écris ta réponse ici...";

    textarea.setAttribute(
        "aria-label", "Ta réponse"
    );

    textarea.maxLength = 1000;
    textarea.rows = 5;

    container.appendChild(textarea);

    const counter = createGameElement(
        "p", "game-counter", "0/1000"
    );

    textarea.addEventListener("input", () => {

        counter.textContent =
            `${textarea.value.length}/1000`;
    });

    container.appendChild(counter);

    addSubmitButton(
        container,
        activity,
        () => textarea.value.trim()
            ? { text: textarea.value.trim() }
            : null,
        answer => answer.text
    );
}

// =============================
// JEU 4 : SURPRISE SIMPLE
// =============================

function renderSurprise(activity, container) {

    const config = activity.configuration;

    container.appendChild(
        createGameElement(
            "div", "surprise-icon", "🎁"
        )
    );

    container.appendChild(
        createGameElement(
            "p",
            "surprise-message",
            config.message || "Joyeux Noël !"
        )
    );
}

async function renderVoteResults(activity, container) {

    const section = createGameElement(
        "div", "vote-results"
    );

    container.appendChild(section);

    try {

        const data = await getVoteResults(activity.day);

        section.appendChild(
            createGameElement(
                "h3", "", "Résultats de la Jungle"
            )
        );

        section.appendChild(
            createGameElement(
                "p",
                "game-note",
                `${data.voted}/${data.total} joueurs ont voté`
            )
        );

        if (!data.revealed) {

            section.appendChild(
                createGameElement(
                    "div",
                    "waiting-icon",
                    "⏳"
                )
            );

            section.appendChild(
                createGameElement(
                    "p",
                    "game-note",
                    "On attend encore les retardataires..."
                )
            );

            const refreshButton = createGameElement(
                "button",
                "game-option",
                "Actualiser les résultats"
            );

            refreshButton.addEventListener("click", () => {

                section.remove();

                renderVoteResults(activity, container);
            });

            section.appendChild(refreshButton);

            return;
        }

        const maxVotes = Math.max(
            0,
            ...data.results.map(p => Number(p.votes))
        );

        data.results.forEach(player => {

            const percentage = data.voted > 0
                ? Math.round(player.votes / data.voted * 100)
                : 0;

            const winner =
                player.votes === maxVotes && maxVotes > 0;

            const row = createGameElement(
                "div", "vote-result-row"
            );

            const label = createGameElement(
                "div", "vote-result-label"
            );

            label.appendChild(
                createGameElement(
                    "span",
                    "",
                    `${winner ? "👑 " : ""}${player.username}`
                )
            );

            label.appendChild(
                createGameElement(
                    "span",
                    "",
                    `${player.votes} vote(s) — ${percentage}%`
                )
            );

            const track = createGameElement(
                "div", "vote-result-track"
            );

            const bar = createGameElement(
                "div",
                winner
                    ? "vote-result-bar winner"
                    : "vote-result-bar"
            );

            bar.style.width = `${percentage}%`;

            track.appendChild(bar);
            row.appendChild(label);
            row.appendChild(track);

            section.appendChild(row);
        });

        section.appendChild(
            createGameElement(
                "p",
                "vote-final-message",
                "La Jungle a parlé."
            )
        );

    } catch (error) {

        console.error(error);

        section.textContent =
            "Impossible de charger les résultats.";
    }
}

// =============================
// JEU 5 : TIRAGE ALÉATOIRE
// =============================

async function renderDraw(activity, container) {

    const previous = await getMyResponse(
        activity.day
    );

    if (previous !== null) {

        renderDrawResult(container, previous);
        return;
    }

    container.appendChild(
        createGameElement(
            "p",
            "game-question",
            activity.configuration.question
        )
    );

    const mysteryBox = createGameElement(
        "div", "draw-box"
    );

    const symbol = createGameElement(
        "div", "draw-symbol", "?"
    );

    mysteryBox.appendChild(symbol);

    mysteryBox.appendChild(
        createGameElement(
            "p", "", "Ta mission secrète"
        )
    );

    container.appendChild(mysteryBox);

    const button = createGameElement(
        "button",
        "game-submit",
        "Découvrir mon destin"
    );

    const note = createGameElement(
        "p",
        "game-note",
        "Un seul tirage. Aucun retour en arrière."
    );

    const errorMessage = createGameElement(
        "p", "game-error"
    );

    button.addEventListener("click", async () => {

        button.disabled = true;
        button.textContent = "Le destin réfléchit...";

        errorMessage.textContent = "";

        mysteryBox.classList.add("drawing");

        try {

            const result = await drawRandomItem(
                activity
            );

            // Petite animation avant la révélation

            await new Promise(resolve =>
                setTimeout(resolve, 1200)
            );

            renderDrawResult(container, result);

        } catch (error) {

            console.error(error);

            mysteryBox.classList.remove("drawing");

            errorMessage.textContent =
                "Le tirage a échoué. Réessaie.";

            button.disabled = false;

            button.textContent =
                "Découvrir mon destin";
        }

    });

    container.appendChild(button);
    container.appendChild(note);
    container.appendChild(errorMessage);
}

// =============================
// AFFICHAGE DU RÉSULTAT
// =============================

function renderDrawResult(container, result) {

    container.innerHTML = "";

    const resultBox = createGameElement(
        "div", "draw-box draw-revealed"
    );

    resultBox.appendChild(
        createGameElement(
            "div", "draw-result-icon", "📜"
        )
    );

    resultBox.appendChild(
        createGameElement(
            "p", "draw-label", "TA MISSION"
        )
    );

    resultBox.appendChild(
        createGameElement(
            "p", "draw-result-text", result.text
        )
    );

    container.appendChild(resultBox);

    container.appendChild(
        createGameElement(
            "p",
            "vote-final-message",
            "Le destin a parlé. Bonne chance."
        )
    );

    container.appendChild(
        createGameElement(
            "p",
            "game-note",
            "✓ Ton tirage est enregistré."
        )
    );
}

// =============================
// JEU 6 : DÉFI PHOTO
// =============================

async function renderPhoto(activity, container) {

    container.innerHTML = "";

    const config = activity.configuration;

    container.appendChild(

        createGameElement(
            "p",
            "game-question",
            config.question
        )

    );

    const submissions = await getPhotoSubmissions(
        activity.day
    );

    const myPhoto = submissions.find(

        photo => photo.player_id === currentUser.id

    );

    if (myPhoto) {

        container.appendChild(

            createGameElement(
                "div",
                "game-success-icon",
                "✓"
            )
        );

        container.appendChild(

            createGameElement(
                "h3",
                "",
                "Ta photo a bien été envoyée !"
            )
        );

    } else {

        renderPhotoUpload(activity, container);

    }

    await renderPhotoGallery(
        activity,
        container,
        submissions
    );
}

// =============================
// FORMULAIRE D'ENVOI
// =============================

function renderPhotoUpload(activity, container) {

    let selectedFile = null;

    const uploadBox = createGameElement(
        "div",
        "photo-upload-box"
    );

    const input = createGameElement(
        "input",
        "photo-file-input"
    );

    input.type = "file";

    input.accept = "image/jpeg,image/png,image/webp";

    input.hidden = true;

    const chooseButton = createGameElement(
        "button",
        "photo-choose-button",
        "📷 Choisir ma photo"
    );

    chooseButton.addEventListener(
        "click",
        () => input.click()
    );

    const preview = createGameElement(
        "img",
        "photo-preview"
    );

    preview.alt = "Aperçu de ta photo";

    preview.hidden = true;

    const fileName = createGameElement(
        "p",
        "game-note"
    );

    const errorMessage = createGameElement(
        "p",
        "game-error"
    );

    const caption = createGameElement(
        "textarea",
        "game-textarea"
    );

    caption.placeholder = "Une petite légende ? (facultatif)";

    caption.rows = 3;

    caption.maxLength = 300;

    caption.hidden =
        activity.configuration.allowCaption === false;

    const submitButton = createGameElement(
        "button",
        "game-submit",
        "Envoyer ma photo"
    );

    submitButton.disabled = true;

    // Sélection et aperçu

    input.addEventListener("change", () => {

        const file = input.files[0];

        if (!file) return;

        errorMessage.textContent = "";

        if (!["image/jpeg", "image/png", "image/webp"]
            .includes(file.type)) {

            selectedFile = null;

            preview.hidden = true;

            submitButton.disabled = true;

            fileName.textContent = "";

            errorMessage.textContent =
                "Choisis une image JPG, PNG ou WEBP.";

            return;
        }

        if (file.size > 25 * 1024 * 1024) {

            selectedFile = null;

            preview.hidden = true;

            submitButton.disabled = true;

            fileName.textContent = "";

            errorMessage.textContent =
                "Cette photo est trop volumineuse.";

            return;
        }

        selectedFile = file;

        const reader = new FileReader();

        reader.onload = () => {

            preview.src = reader.result;

            preview.hidden = false;

            fileName.textContent = file.name;

            submitButton.disabled = false;

            chooseButton.textContent =
                "📷 Choisir une autre photo";
        };

        reader.onerror = () => {

            errorMessage.textContent =
                "Impossible de lire cette image.";

            submitButton.disabled = true;

        };

        submitButton.disabled = true;

        reader.readAsDataURL(file);

    });

    // Envoi de la photo

    submitButton.addEventListener("click", async () => {

        if (!selectedFile) return;

        submitButton.disabled = true;

        chooseButton.disabled = true;

        caption.disabled = true;

        submitButton.textContent =
            "Envoi en cours...";

        errorMessage.textContent = "";

        try {

            await uploadPhoto(

                activity.day,

                selectedFile,

                caption.hidden
                    ? ""
                    : caption.value.trim()

            );

        } catch (error) {

            console.error(error);

            errorMessage.textContent =
                "Impossible d'envoyer la photo. Réessaie.";

            submitButton.disabled = false;

            chooseButton.disabled = false;

            caption.disabled = false;

            submitButton.textContent =
                "Envoyer ma photo";

            return;
        }

        try {

            await renderPhoto(activity, container);

        } catch (error) {

            console.error(error);

            container.textContent =
                "Photo envoyée ! Rouvre la case pour consulter la galerie.";

        }
    });

    uploadBox.appendChild(input);
    uploadBox.appendChild(chooseButton);
    uploadBox.appendChild(preview);
    uploadBox.appendChild(fileName);
    uploadBox.appendChild(caption);
    uploadBox.appendChild(submitButton);
    uploadBox.appendChild(errorMessage);

    container.appendChild(uploadBox);
}

// =============================
// GALERIE COLLECTIVE
// =============================

async function renderPhotoGallery(
    activity,
    container,
    submissions
) {

    const gallery = createGameElement(
        "div",
        "photo-gallery"
    );

    gallery.appendChild(

        createGameElement(
            "h3",
            "",
            "La galerie de la Jungle"
        )
    );

    const players = await getPlayers();

    gallery.appendChild(

        createGameElement(
            "p",
            "game-note",
            `${submissions.length}/${players.length} joueurs ont participé`
        )
    );

    if (submissions.length === 0) {

        gallery.appendChild(

            createGameElement(
                "p",
                "game-note",
                "Personne n'a encore envoyé de photo..."
            )
        );

    } else {

        const grid = createGameElement(
            "div",
            "photo-grid"
        );

        submissions.forEach(photo => {

            const card = createGameElement(
                "div",
                "photo-card"
            );

            if (photo.url) {

                const image = createGameElement(
                    "img",
                    "gallery-image"
                );

                image.src = photo.url;

                image.alt =
                    `Photo de ${photo.username}`;

                image.loading = "lazy";

                image.tabIndex = 0;

                image.setAttribute("role", "button");

                image.addEventListener("click", () => {

                    openFullPhoto(photo);

                });

                image.addEventListener("keydown", event => {

                    if (event.key === "Enter" ||
                        event.key === " ") {

                        event.preventDefault();

                        openFullPhoto(photo);
                    }
                });

                card.appendChild(image);

            } else {

                card.appendChild(

                    createGameElement(
                        "p",
                        "game-note",
                        "Photo indisponible"
                    )
                );
            }

            card.appendChild(

                createGameElement(
                    "p",
                    "photo-author",
                    `${photo.avatar || "🎄"} ${photo.username}`
                )
            );

            if (photo.caption) {

                card.appendChild(

                    createGameElement(
                        "p",
                        "photo-caption",
                        photo.caption
                    )
                );
            }

            grid.appendChild(card);

        });

        gallery.appendChild(grid);
    }

    const refreshButton = createGameElement(
        "button",
        "game-option",
        "Actualiser la galerie"
    );

    refreshButton.addEventListener("click", async () => {

        refreshButton.disabled = true;

        try {

            const updated = await getPhotoSubmissions(
                activity.day
            );

            await renderPhotoGallery(
                activity,
                container,
                updated
            );

            gallery.remove();

        } catch (error) {

            console.error(error);

            refreshButton.disabled = false;

        }
    });

    gallery.appendChild(refreshButton);

    container.appendChild(gallery);
}

// =============================
// AFFICHER UNE PHOTO EN GRAND
// =============================

function openFullPhoto(photo) {

    const viewer = createGameElement(
        "dialog",
        "photo-viewer"
    );

    const closeButton = createGameElement(
        "button",
        "photo-viewer-close",
        "×"
    );

    closeButton.setAttribute(
        "aria-label", "Fermer la photo"
    );

    const image = createGameElement(
        "img",
        "full-photo"
    );

    image.src = photo.url;

    image.alt = `Photo de ${photo.username}`;

    closeButton.addEventListener(
        "click",
        () => viewer.close()
    );

    viewer.addEventListener(
        "close",
        () => viewer.remove()
    );

    viewer.appendChild(closeButton);
    viewer.appendChild(image);

    viewer.appendChild(

        createGameElement(
            "p",
            "photo-author",
            photo.username
        )
    );

    if (photo.caption) {

        viewer.appendChild(

            createGameElement(
                "p",
                "photo-caption",
                photo.caption
            )
        );
    }

    document.body.appendChild(viewer);

    viewer.showModal();
}

 // =============================
 // JUNGLE AWARDS 2026
 // =============================

const jungleAwards = [
    {
        name: "AD",
        award: "Award de la meilleure Poire",
        description: "Il a pas compris que c'est pas en cherchant dans les vignes qu'il en trouvera une autre🙄",
        photo: "images/AD.jpeg"
    },
    {
        name: "Gwendal",
        award: "Award ",
        description: "",
        photo: "images/Gwendal.jpeg"
    },
    {
        name: "Loraline",
        award: "Award du pied le plus capricieux 🦶",
        description: "Et pourtant elle a quand même fait les petites Calanques, quelle femme !",
        photo: "images/Loraline.jpg"
    },
    {
        name: "Mathew",
        award: "Award du stalkeur agrée de la Jungle",
        description: "Le FBI envie cet instinct surdéveloppé : une info = une enquête, trois profils retrouvés et un arbre généalogique reconstitué.",
        photo: "images/Mathew.jpeg"
    },
    {
        name: "Sarah",
        award: "Award de l'exhibitionniste de la Jungle ",
        description: "Peu adepte des vêtements sur elle-même, elle met pourtant un point d'honneur à habiller les autres…fantômes compris.",
        photo: "images/Sarah.jpeg"
    },
    {
        name: "Vâni",
        award: "Award de la ministre des loisirs de la Jungle",
        description: "Une journée de 48 heures, ce serait quand même plus pratique pour caser toutes ses passions.",
        photo: "images/Vâni.jpeg"
    },
    {
        name: "Chloé",
        award: "Award de la personne la plus présente, ponctuelle, intelligente, belle, sexy, adroite, sophistiquée...",
        description: "Toujours humble, restons concis",
        photo: "images/Chloé1.jpeg"
    },
];

function renderJungleAwards() {

    modalTitle.textContent = "";
    modalContent.innerHTML = "";

    const container = createGameElement(
        "div",
        "jungle-awards"
    );

    modalContent.appendChild(container);

    // Écran d'accueil
    container.innerHTML = `
        <div class="awards-welcome">
            <div class="awards-trophy">🏆</div>
            <h2>JUNGLE AWARDS 2026</h2>
            <p>La cérémonie la plus prestigieuse de la Jungle.</p>
            <button class="game-submit" id="start-awards">
                🎬 Lancer la cérémonie
            </button>
        </div>
    `;

    container.querySelector("#start-awards")
        .addEventListener("click", () => {
            showJungleAward(container, 0);
        });
}

function showJungleAward(container, index) {

    container.innerHTML = "";

    // Fin de la cérémonie
    if (index >= jungleAwards.length) {

        container.innerHTML = `
            <div class="awards-finale">
                <div class="awards-trophy">🏆🎄</div>
                <h2>JOYEUX NOËL LA JUNGLE !</h2>
                <p>La cérémonie des Jungle Awards 2026
                est officiellement terminée.</p>
                <button class="game-submit" id="restart-awards">
                    🔄 Revoir la cérémonie
                </button>
            </div>
        `;

        container.querySelector("#restart-awards")
            .addEventListener("click", () => {
                renderJungleAwards();
            });

        return;
    }

    const person = jungleAwards[index];

    const card = createGameElement(
        "div",
        "award-card"
    );

    card.appendChild(
        createGameElement(
            "p",
            "award-counter",
            `AWARD ${index + 1} / ${jungleAwards.length}`
        )
    );

    if (person.photo) {

        const image = createGameElement(
            "img",
            "award-photo"
        );

        image.src = person.photo;
        image.alt = `Photo de ${person.name}`;

        card.appendChild(image);

    } else {

        card.appendChild(
            createGameElement(
                "div",
                "award-photo-placeholder",
                "📸"
            )
        );
    }

    card.appendChild(
        createGameElement(
            "h2",
            "award-name",
            person.name
        )
    );

    card.appendChild(
        createGameElement(
            "div",
            "award-trophy",
            "🏆"
        )
    );

    card.appendChild(
        createGameElement(
            "h3",
            "award-title",
            person.award
        )
    );

    card.appendChild(
        createGameElement(
            "p",
            "award-description",
            person.description
        )
    );

    const nextButton = createGameElement(
        "button",
        "game-submit",
        index === jungleAwards.length - 1
            ? "🎄 Terminer la cérémonie"
            : "Suivant →"
    );

    nextButton.addEventListener("click", () => {
        showJungleAward(container, index + 1);
    });

    card.appendChild(nextButton);
    container.appendChild(card);
}
