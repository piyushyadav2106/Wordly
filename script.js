const API =
    window.location.port === "5500"
        ? "http://localhost:3000"
        : "";


/* =====================================================
   GLOBAL
===================================================== */

let wordLength = 5;
let hintsUsed = 0;
const MAX_HINTS = 3;
let maxAttempts = 6;

let currentRow = 0;
let currentGuess = "";
let soloGameId = "";
let lastGameLength = 5;

let keyboardStates = {};


/* DAILY */

let dailyWord = "";
let dailyRow = 0;
let dailyGuess = "";
let dailyFinished = false;
let dailyShareRows = [];

/* BATTLE */

let battlePlayer = "";
let battleWordLength = 5;
let battleCurrentRow = 0;
let battleCurrentGuess = "";
let battleMaxAttempts = 6;

let battlePolling = null;
let waitingInterval = null;


/* =====================================================
   HELPERS
===================================================== */

function getStats() {

    const saved =
        localStorage.getItem("wordlyStats");

    if (saved) {
        return JSON.parse(saved);
    }

    return {
        games: 0,
        wins: 0,
        streak: 0,
        bestStreak: 0,

        distribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
            8: 0
        }
    };
}


function saveStats(stats) {

    localStorage.setItem(
        "wordlyStats",
        JSON.stringify(stats)
    );

}


function recordGame(won, guesses) {

    const stats = getStats();

    stats.games++;

    if (won) {

        stats.wins++;

        stats.streak++;

        if (
            stats.streak >
            stats.bestStreak
        ) {
            stats.bestStreak =
                stats.streak;
        }

        if (
            stats.distribution[guesses] !==
            undefined
        ) {
            stats.distribution[guesses]++;
        }

    } else {

        stats.streak = 0;

    }

    saveStats(stats);
}


/* =====================================================
   PAGE CONTROL
===================================================== */

function showHome() {

    const pages = [
        "home",
        "game-area",
        "result-screen",
        "stats-page",
        "daily-page",
        "battle-menu",
        "waiting-room",
        "battle-arena"
    ];

    pages.forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;

        if (id === "home") {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");
        }

    });

}


function goHome() {

    clearInterval(battlePolling);
    clearInterval(waitingInterval);

    showHome();
}


/* =====================================================
   SOLO GAME
===================================================== */

async function startGame(length) {

    wordLength = Number(length);

    lastGameLength = wordLength;

    currentRow = 0;
    currentGuess = "";
    hintUsed = false;
const hintMessage =
    document.getElementById("hint-message");

if (hintMessage) {
    hintMessage.textContent = "";
    hintMessage.classList.remove("hint-show");
}

const hintButton =
    document.getElementById("hint-button");

if (hintButton) {
    hintButton.disabled = false;
    hintButton.textContent = "💡 HINT";
}

    keyboardStates = {};

    try {

        const response =
            await fetch(
                API + "/solo/start",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        wordLength
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.error ||
                "Could not start game"
            );

            return;
        }

        soloGameId =
            data.gameId;

        maxAttempts =
            data.maxAttempts;


        document
            .getElementById("home")
            .classList.add("hidden");

        document
            .getElementById("game-area")
            .classList.remove("hidden");

        document
            .getElementById("result-screen")
            .classList.add("hidden");


        document
            .getElementById("word-length")
            .textContent =
            `${wordLength} Letters`;

        document
            .getElementById("attempts")
            .textContent =
            `0 / ${maxAttempts}`;


        showMessage("");

        createBoard();

        createKeyboard();

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to server!"
        );

    }
}


/* =====================================================
   SOLO BOARD
===================================================== */

function createBoard() {

    const board =
        document.getElementById("board");

    board.innerHTML = "";

    for (
        let r = 0;
        r < maxAttempts;
        r++
    ) {

        const row =
            document.createElement("div");

        row.className = "row";

        for (
            let c = 0;
            c < wordLength;
            c++
        ) {

            const tile =
                document.createElement("div");

            tile.className = "tile";

            tile.id =
                `tile-${r}-${c}`;

            row.appendChild(tile);
        }

        board.appendChild(row);
    }
}


/* =====================================================
   SOLO KEYBOARD
===================================================== */

function createKeyboard() {

    const keyboard =
        document.getElementById("keyboard");

    keyboard.innerHTML = "";

    const rows = [

        [
            "Q","W","E","R","T",
            "Y","U","I","O","P"
        ],

        [
            "A","S","D","F","G",
            "H","J","K","L"
        ],

        [
            "ENTER",
            "Z","X","C","V",
            "B","N","M",
            "⌫"
        ]

    ];

    rows.forEach(letters => {

        const row =
            document.createElement("div");

        row.className =
            "keyboard-row";

        letters.forEach(letter => {

            const button =
                document.createElement("button");

            button.className = "key";

            button.textContent = letter;

            button.onclick = () =>
                handleKey(letter);

            row.appendChild(button);
        });

        keyboard.appendChild(row);
    });
}


/* =====================================================
   SOLO KEY
===================================================== */

function handleKey(key) {

    if (key === "ENTER") {

        submitGuess();

        return;
    }

    if (key === "⌫") {

        currentGuess =
            currentGuess.slice(0, -1);

        updateBoard();

        return;
    }

    if (
        /^[A-Z]$/.test(key) &&
        currentGuess.length <
        wordLength
    ) {

        currentGuess += key;

        updateBoard();
    }
}


/* =====================================================
   SOLO BOARD UPDATE
===================================================== */

function updateBoard() {

    for (
        let c = 0;
        c < wordLength;
        c++
    ) {

        const tile =
            document.getElementById(
                `tile-${currentRow}-${c}`
            );

        if (!tile) continue;

        tile.textContent =
            currentGuess[c] || "";

        if (currentGuess[c]) {

            tile.classList.remove("pop");

            void tile.offsetWidth;

            tile.classList.add("pop");
        }
    }
}


/* =====================================================
   SOLO SUBMIT
===================================================== */

async function submitGuess() {

    if (!soloGameId) {

        showMessage(
            "Game hasn't started!"
        );

        return;
    }

    if (
        currentGuess.length !==
        wordLength
    ) {

        shakeBoard();

        showMessage(
            "Not enough letters!"
        );

        return;
    }

    const guess =
        currentGuess.toUpperCase();

    try {

        const response =
            await fetch(
                API +
                `/solo/${soloGameId}/guess`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        guess
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            shakeBoard();

            showMessage(
                data.error ||
                "Not a word! ❌"
            );

            return;
        }


        applyResult(
            currentRow,
            data.result,
            guess
        );


        document
            .getElementById("attempts")
            .textContent =
            `${data.guesses} / ${data.maxAttempts}`;


        if (data.correct) {

            const solvedGuess =
                data.guesses;

            currentGuess = "";

            setTimeout(() => {

                finishSoloGame(
                    true,
                    solvedGuess,
                    data.answer
                );

            }, wordLength * 150 + 600);

            return;
        }


        if (data.gameOver) {

            const totalGuesses =
                data.guesses;

            currentGuess = "";

            setTimeout(() => {

                finishSoloGame(
                    false,
                    totalGuesses,
                    data.answer
                );

            }, wordLength * 150 + 600);

            return;
        }


        currentRow++;

        currentGuess = "";

    } catch (error) {

        console.error(error);

        showMessage(
            "Server connection error!"
        );
    }
}


/* =====================================================
   SOLO RESULT
===================================================== */

function applyResult(
    row,
    result,
    guess
) {

    result.forEach((state, i) => {

        const tile =
            document.getElementById(
                `tile-${row}-${i}`
            );

        if (!tile) return;

        setTimeout(() => {

            tile.classList.add("flip");

            setTimeout(() => {

                setTileColor(
                    tile,
                    state
                );

                updateKeyboardLetter(
                    guess[i],
                    state
                );

            }, 250);

        }, i * 130);

    });
}


function setTileColor(
    tile,
    state
) {

    if (state === "green") {

        tile.style.background =
            "#4caf50";

        tile.style.borderColor =
            "#4caf50";

    } else if (
        state === "yellow"
    ) {

        tile.style.background =
            "#d6a72c";

        tile.style.borderColor =
            "#d6a72c";

    } else {

        tile.style.background =
            "#444";

        tile.style.borderColor =
            "#444";
    }
}


/* =====================================================
   KEYBOARD COLORS
===================================================== */

function updateKeyboardLetter(
    letter,
    newState
) {

    if (!letter) return;

    const priority = {
        gray: 1,
        yellow: 2,
        green: 3
    };

    const oldState =
        keyboardStates[letter];

    if (
        oldState &&
        priority[oldState] >=
        priority[newState]
    ) {
        return;
    }

    keyboardStates[letter] =
        newState;


    document
        .querySelectorAll(".key")
        .forEach(button => {

            if (
                button.textContent ===
                letter
            ) {

                button.classList.remove(
                    "key-green",
                    "key-yellow",
                    "key-gray"
                );

                button.classList.add(
                    `key-${newState}`
                );
            }

        });
}


/* =====================================================
   SOLO FINISH
===================================================== */

function finishSoloGame(
    won,
    guesses,
    answer
) {

    recordGame(
        won,
        guesses
    );

    const stats =
        getStats();


    document
        .getElementById("game-area")
        .classList.add("hidden");

    document
        .getElementById("result-screen")
        .classList.remove("hidden");


    document
        .getElementById("result-icon")
        .textContent =
        won ? "🎉" : "😵";


    document
        .getElementById("result-title")
        .textContent =
        won
            ? "YOU GOT IT!"
            : "NICE TRY!";


    document
        .getElementById("result-word")
        .textContent =
        answer || "-----";


    document
        .getElementById("result-details")
        .textContent =
        won
            ? `Solved in ${guesses} ${
                guesses === 1
                    ? "try"
                    : "tries"
            }`
            : "Better luck next time!";


    document
        .getElementById("result-streak")
        .textContent =
        `${stats.streak}🔥`;


    document
        .getElementById("result-best")
        .textContent =
        `${stats.bestStreak}🔥`;
}


function playAgain() {

    document
        .getElementById("result-screen")
        .classList.add("hidden");

    startGame(lastGameLength);
}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(text) {

    const element =
        document.getElementById("message");

    if (element) {

        element.textContent = text;
    }
}


function shakeBoard() {

    const board =
        document.getElementById("board");

    if (!board) return;

    board.classList.remove("shake");

    void board.offsetWidth;

    board.classList.add("shake");

    setTimeout(() => {

        board.classList.remove("shake");

    }, 500);
}


/* =====================================================
   STATS
===================================================== */

function showStats() {

    const stats =
        getStats();

    document
        .getElementById("home")
        .classList.add("hidden");

    document
        .getElementById("stats-page")
        .classList.remove("hidden");


    document
        .getElementById("stat-games")
        .textContent =
        stats.games;


    const winRate =
        stats.games === 0
            ? 0
            : Math.round(
                (
                    stats.wins /
                    stats.games
                ) * 100
            );


    document
        .getElementById("stat-wins")
        .textContent =
        `${winRate}%`;


    document
        .getElementById("stat-streak")
        .textContent =
        `${stats.streak}🔥`;


    document
        .getElementById("stat-best")
        .textContent =
        `${stats.bestStreak}🔥`;


    renderDistribution(
        stats.distribution
    );
}


function renderDistribution(
    distribution
) {

    const container =
        document.getElementById(
            "distribution"
        );

    container.innerHTML = "";

    let max = 1;

    Object.values(
        distribution
    ).forEach(value => {

        if (value > max) {
            max = value;
        }

    });


    Object.keys(
        distribution
    ).forEach(number => {

        const value =
            distribution[number];

        const row =
            document.createElement("div");

        row.className =
            "dist-row";


        const label =
            document.createElement("span");

        label.className =
            "dist-number";

        label.textContent =
            number;


        const bar =
            document.createElement("div");

        bar.className =
            "dist-bar";


        bar.style.width =
            value === 0
                ? "25px"
                : Math.max(
                    25,
                    (
                        value /
                        max
                    ) * 100
                ) + "%";


        bar.textContent = value;


        row.appendChild(label);

        row.appendChild(bar);

        container.appendChild(row);

    });
}


function resetStats() {

    if (
        !confirm(
            "Reset all Wordly stats?"
        )
    ) {
        return;
    }

    localStorage.removeItem(
        "wordlyStats"
    );

    showStats();
}


/* =====================================================
   DAILY
===================================================== */

async function startDaily() {

    const today =
        getTodayKey();


    const played =
        localStorage.getItem(
            "wordlyDailyPlayed"
        );


    document
        .getElementById("home")
        .classList.add("hidden");


    document
        .getElementById("daily-page")
        .classList.remove("hidden");


    document
        .getElementById("daily-number")
        .textContent =
        `DAILY • ${getDailyNumber()}`;


    /*
     * Already played today
     */

    if (played === today) {

        showDailyAlreadyPlayed();

        return;
    }


    dailyRow = 0;

    dailyGuess = "";

    dailyFinished = false;

    dailyShareRows = [];
    
    keyboardStates = {};


    try {

        const response =
            await fetch(
                API + "/daily"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "Daily unavailable"
            );
        }


        dailyWord =
            data.dailyWord.toUpperCase();


        document
            .getElementById(
                "daily-game-area"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "daily-result"
            )
            .classList.add(
                "hidden"
            );


        createDailyBoard();

        createDailyKeyboard();

        updateDailyCountdown();


    } catch (error) {

        console.error(error);

        alert(
            "Daily challenge unavailable!"
        );
    }
}


function getTodayKey() {

    const now =
        new Date();

    return [
        now.getFullYear(),
        String(
            now.getMonth() + 1
        ).padStart(2, "0"),
        String(
            now.getDate()
        ).padStart(2, "0")
    ].join("-");
}


function showDailyAlreadyPlayed() {

    document
        .getElementById(
            "daily-game-area"
        )
        .classList.add("hidden");


    document
        .getElementById(
            "daily-result"
        )
        .classList.remove("hidden");


    document
        .getElementById(
            "daily-result-title"
        )
        .textContent =
        "TODAY'S CHALLENGE COMPLETE";


    document
        .getElementById(
            "daily-result-text"
        )
        .textContent =
        "You've already played today's challenge. Come back tomorrow!";


    document
        .getElementById(
            "daily-share"
        )
        .textContent =
        "✓ PLAYED TODAY";


    updateDailyCountdown();
}


/* =====================================================
   DAILY BOARD
===================================================== */

function createDailyBoard() {

    const board =
        document.getElementById(
            "daily-board"
        );

    board.innerHTML = "";


    for (
        let r = 0;
        r < 6;
        r++
    ) {

        const row =
            document.createElement("div");

        row.className =
            "daily-row";


        for (
            let c = 0;
            c < 5;
            c++
        ) {

            const tile =
                document.createElement("div");

            tile.className =
                "daily-tile";

            tile.id =
                `daily-tile-${r}-${c}`;

            row.appendChild(tile);
        }


        board.appendChild(row);
    }
}


/* =====================================================
   DAILY KEYBOARD
===================================================== */

function createDailyKeyboard() {

    const keyboard =
        document.getElementById(
            "daily-keyboard"
        );

    keyboard.innerHTML = "";


    const rows = [

        [
            "Q","W","E","R","T",
            "Y","U","I","O","P"
        ],

        [
            "A","S","D","F","G",
            "H","J","K","L"
        ],

        [
            "ENTER",
            "Z","X","C","V",
            "B","N","M",
            "⌫"
        ]

    ];


    rows.forEach(letters => {

        const row =
            document.createElement("div");

        row.className =
            "daily-key-row";


        letters.forEach(letter => {

            const button =
                document.createElement("button");

            button.className =
                "daily-key";

            button.textContent =
                letter;

            button.onclick =
                () =>
                    handleDailyKey(letter);

            row.appendChild(button);
        });


        keyboard.appendChild(row);
    });
}


/* =====================================================
   DAILY KEY
===================================================== */

function handleDailyKey(key) {

    if (dailyFinished) {
        return;
    }


    if (key === "ENTER") {

        submitDailyGuess();

        return;
    }


    if (key === "⌫") {

        dailyGuess =
            dailyGuess.slice(0, -1);

        updateDailyBoard();

        return;
    }


    if (
        /^[A-Z]$/.test(key) &&
        dailyGuess.length < 5
    ) {

        dailyGuess += key;

        updateDailyBoard();
    }
}


/* =====================================================
   DAILY BOARD UPDATE
===================================================== */

function updateDailyBoard() {

    for (
        let c = 0;
        c < 5;
        c++
    ) {

        const tile =
            document.getElementById(
                `daily-tile-${dailyRow}-${c}`
            );

        if (!tile) continue;

        tile.textContent =
            dailyGuess[c] || "";


        if (dailyGuess[c]) {

            tile.classList.remove("pop");

            void tile.offsetWidth;

            tile.classList.add("pop");
        }
    }
}


/* =====================================================
   DAILY SUBMIT
===================================================== */

async function submitDailyGuess() {

    if (dailyFinished) {
        return;
    }


    if (
        dailyGuess.length !== 5
    ) {

        shakeDailyBoard();

        showDailyMessage(
            "Not enough letters!"
        );

        return;
    }


    const guess =
        dailyGuess.toUpperCase();


    try {

    /* FAST LOCAL VALIDATION */

const response =
    await fetch(
        API + "/words/5"
    );

const validWords =
    await response.json();

if (
    !validWords.includes(guess)
) {

    shakeDailyBoard();

    showDailyMessage(
        "Not a word! ❌"
    );

    return;
}


        /*
         * Evaluate against DAILY word.
         */

        const result =
            evaluateLocal(
                dailyWord,
                guess
            );
console.log("DAILY RESULT:", result);

            const shareLine = result.map(state => {

    if (state === "green") {
        return "🟩";
    }

    if (state === "yellow") {
        return "🟨";
    }

    return "⬛";
}).join("");

dailyShareRows.push(shareLine);

        applyDailyResult(
            dailyRow,
            result,
            guess
        );


        /*
         * WIN
         */

        if (
            guess === dailyWord
        ) {

            dailyFinished = true;


            lockDaily();


            setTimeout(() => {

                finishDaily(
                    true,
                    dailyRow + 1
                );

            }, 1500);


            return;
        }


        dailyRow++;

        dailyGuess = "";


        /*
         * LOSS
         */

        if (
            dailyRow >= 6
        ) {

            dailyFinished = true;

            lockDaily();


            setTimeout(() => {

                finishDaily(
                    false,
                    6
                );

            }, 1500);
        }
    }
    catch (error) {

        console.error(error);

        showDailyMessage(
            "Connection error!"
        );
    }
}


/* =====================================================
   DAILY LOCK
===================================================== */

function lockDaily() {

    localStorage.setItem(
        "wordlyDailyPlayed",
        getTodayKey()
    );
}


/* =====================================================
   DAILY WORDLE LOGIC
===================================================== */

function evaluateLocal(
    secret,
    guess
) {

    const result =
        Array(secret.length)
            .fill("gray");

    const used =
        Array(secret.length)
            .fill(false);


    for (
        let i = 0;
        i < secret.length;
        i++
    ) {

        if (
            guess[i] === secret[i]
        ) {

            result[i] = "green";

            used[i] = true;
        }
    }


    for (
        let i = 0;
        i < guess.length;
        i++
    ) {

        if (
            result[i] === "green"
        ) {
            continue;
        }


        for (
            let j = 0;
            j < secret.length;
            j++
        ) {

            if (
                !used[j] &&
                guess[i] === secret[j]
            ) {

                result[i] = "yellow";

                used[j] = true;

                break;
            }
        }
    }


    return result;
}


/* =====================================================
   DAILY RESULT ANIMATION
===================================================== */

function applyDailyResult(
    row,
    result,
    guess
) {

    result.forEach((state, i) => {

        const tile =
            document.getElementById(
                `daily-tile-${row}-${i}`
            );

        if (!tile) return;


        setTimeout(() => {

            tile.classList.add("flip");


            setTimeout(() => {

                setTileColor(
                    tile,
                    state
                );


                updateDailyKeyboard(
                    guess[i],
                    state
                );

            }, 250);

        }, i * 130);

    });
}


/* =====================================================
   DAILY KEYBOARD COLORS
===================================================== */

function updateDailyKeyboard(
    letter,
    state
) {

    if (!letter) return;


    const priority = {
        gray: 1,
        yellow: 2,
        green: 3
    };


    const oldState =
        keyboardStates[letter];


    if (
        oldState &&
        priority[oldState] >=
        priority[state]
    ) {

        return;
    }


    keyboardStates[letter] =
        state;


    document
        .querySelectorAll(
            ".daily-key"
        )
        .forEach(button => {

            if (
                button.textContent ===
                letter
            ) {

                button.classList.remove(
                    "key-green",
                    "key-yellow",
                    "key-gray"
                );


                button.classList.add(
                    `key-${state}`
                );
            }
        });
}


/* =====================================================
   DAILY SHAKE
===================================================== */

function shakeDailyBoard() {

    const board =
        document.getElementById(
            "daily-board"
        );

    if (!board) return;


    board.classList.remove(
        "shake"
    );

    void board.offsetWidth;

    board.classList.add(
        "shake"
    );


    setTimeout(() => {

        board.classList.remove(
            "shake"
        );

    }, 500);
}


/* =====================================================
   DAILY MESSAGE
===================================================== */

function showDailyMessage(
    text
) {

    const message =
        document.getElementById(
            "daily-message"
        );

    if (!message) return;


    message.textContent =
        text;


    setTimeout(() => {

        message.textContent = "";

    }, 2000);
}


/* =====================================================
   DAILY FINISH
===================================================== */

function finishDaily(
    won,
    guesses
) {

    lockDaily();


    document
        .getElementById(
            "daily-game-area"
        )
        .classList.add("hidden");


    document
        .getElementById(
            "daily-result"
        )
        .classList.remove("hidden");


    document
        .getElementById(
            "daily-result-title"
        )
        .textContent =
        won
            ? "🎉 DAILY COMPLETE!"
            : "😵 BETTER LUCK TOMORROW!";


    document
        .getElementById(
            "daily-result-text"
        )
        .textContent =
        won
            ? `Solved in ${guesses} ${
                guesses === 1
                    ? "try"
                    : "tries"
            }`
            : `The word was ${dailyWord}`;


    buildDailyShare();

    updateDailyCountdown();
}


/* =====================================================
   DAILY SHARE
===================================================== */

function buildDailyShare() {

    const attempts =
        dailyShareRows.length;

    const result =
        `${attempts}/6\n\n` +
        dailyShareRows.join("\n");

    const shareBox =
        document.getElementById(
            "daily-share"
        );

    if (shareBox) {
        shareBox.textContent =
            result;
    }
}


async function copyDailyResult() {

    const shareText =
        `Wordly Daily #${getDailyNumber()}\n\n` +
        document
            .getElementById(
                "daily-share"
            )
            .textContent;

    try {

        if (
            navigator.share
        ) {

            await navigator.share({
                title:
                    `Wordly Daily #${getDailyNumber()}`,
                text:
                    shareText
            });

        } else {

            await navigator.clipboard
                .writeText(
                    shareText
                );

            document
                .getElementById(
                    "daily-next"
                )
                .textContent =
                "Copied! 📋";
        }

    } catch (error) {

        if (
            error.name !==
            "AbortError"
        ) {

            try {

                await navigator.clipboard
                    .writeText(
                        shareText
                    );

                document
                    .getElementById(
                        "daily-next"
                    )
                    .textContent =
                    "Copied! 📋";

            } catch (e) {

                console.error(
                    "Share failed:",
                    e
                );
            }
        }
    }
}

/* =====================================================
   DAILY NUMBER
===================================================== */

function getDailyNumber() {

    const start =
        new Date(
            2026,
            0,
            1
        );


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const first =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );


    return (
        Math.floor(
            (
                today -
                first
            ) /
            86400000
        ) + 1
    );
}


/* =====================================================
   DAILY COUNTDOWN
===================================================== */

function updateDailyCountdown() {

    const now =
        new Date();


    const tomorrow =
        new Date(now);


    tomorrow.setHours(
        24,
        0,
        0,
        0
    );


    const seconds =
        Math.max(
            0,
            Math.floor(
                (
                    tomorrow -
                    now
                ) / 1000
            )
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );


    const secs =
        seconds % 60;


    const element =
        document.getElementById(
            "daily-next"
        );


    if (element) {

        element.textContent =
            `Next challenge in ${hours}h ${minutes}m ${secs}s`;
    }


    setTimeout(
        updateDailyCountdown,
        1000
    );
}


/* =====================================================
   BATTLE MENU
===================================================== */

function openBattle() {

    document
        .getElementById("home")
        .classList.add("hidden");

    document
        .getElementById("battle-menu")
        .classList.remove("hidden");
}


function showBattleMessage(text) {

    const element =
        document.getElementById(
            "battle-message"
        );

    if (element) {

        element.textContent = text;
    }
}


/* =====================================================
   CREATE BATTLE
===================================================== */

async function createBattle() {

    const playerName =
        document
            .getElementById(
                "create-name"
            )
            .value
            .trim();


    const length =
        Number(
            document
                .getElementById(
                    "create-length"
                )
                .value
        );


    if (!playerName) {

        showBattleMessage(
            "Enter your name first!"
        );

        return;
    }


    try {

        const response =
            await fetch(
                API +
                "/create-battle",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        playerName,
                        wordLength:
                            length
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            showBattleMessage(
                data.error
            );

            return;
        }


        window.currentRoom =
            data.roomCode;

        window.currentPlayer =
            playerName;


        document
            .getElementById(
                "battle-menu"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "waiting-room"
            )
            .classList.remove("hidden");


        document
            .getElementById(
                "room-code"
            )
            .textContent =
            data.roomCode;


        startWaiting();

    }
    catch (error) {

        console.error(error);

        showBattleMessage(
            "Cannot connect to server!"
        );
    }
}


/* =====================================================
   JOIN BATTLE
===================================================== */

async function joinBattle() {

    const playerName =
        document
            .getElementById(
                "join-name"
            )
            .value
            .trim();


    const roomCode =
        document
            .getElementById(
                "join-code"
            )
            .value
            .trim()
            .toUpperCase();


    if (
        !playerName ||
        !roomCode
    ) {

        showBattleMessage(
            "Enter name and room code!"
        );

        return;
    }


    try {

        const response =
            await fetch(
                API +
                "/join-battle",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        playerName,
                        roomCode
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            showBattleMessage(
                data.error
            );

            return;
        }


        window.currentRoom =
            roomCode;

        window.currentPlayer =
            playerName;


        document
            .getElementById(
                "battle-menu"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "waiting-room"
            )
            .classList.add("hidden");


        startBattleGame(
            data.battle
        );

    }
    catch (error) {

        console.error(error);

        showBattleMessage(
            "Cannot connect to server!"
        );
    }
}


/* =====================================================
   BATTLE WAITING
===================================================== */

function startWaiting() {

    clearInterval(
        waitingInterval
    );


    waitingInterval =
        setInterval(
            checkBattle,
            1000
        );
}


async function checkBattle() {

    if (!window.currentRoom) {
        return;
    }


    try {

        const response =
            await fetch(
                API +
                "/battle/" +
                window.currentRoom
            );


        const battle =
            await response.json();


        if (!battle.player2) {
            return;
        }


        clearInterval(
            waitingInterval
        );


        document
            .getElementById(
                "waiting-text"
            )
            .textContent =
            "Opponent found!";


        document
            .getElementById(
                "players"
            )
            .textContent =
            battle.player1.name +
            " ⚔️ " +
            battle.player2.name;


        setTimeout(() => {

            startBattleGame(
                battle
            );

        }, 700);

    }
    catch (error) {

        console.log(error);
    }
}


/* =====================================================
   BATTLE GAME
===================================================== */

function startBattleGame(
    battle
) {

    document
        .getElementById(
            "waiting-room"
        )
        .classList.add("hidden");


    document
        .getElementById(
            "battle-arena"
        )
        .classList.remove("hidden");


    battleWordLength =
        Number(
            battle.wordLength
        );


    battleMaxAttempts =
        battleWordLength === 7
            ? 8
            : battleWordLength === 6
                ? 7
                : 6;


    battleCurrentRow = 0;

    battleCurrentGuess = "";


    if (
        battle.player1.name ===
        window.currentPlayer
    ) {

        battlePlayer =
            "player1";

    } else {

        battlePlayer =
            "player2";
    }


    document
        .getElementById(
            "arena-room-code"
        )
        .textContent =
        battle.roomCode;


    document
        .getElementById(
            "arena-you-name"
        )
        .textContent =
        window.currentPlayer;


    const opponent =
        battlePlayer === "player1"
            ? battle.player2
            : battle.player1;


    if (opponent) {

        document
            .getElementById(
                "arena-opponent-name"
            )
            .textContent =
            opponent.name;
    }


    createBattleBoard();

    createBattleKeyboard();


    document
        .getElementById(
            "battle-status"
        )
        .textContent =
        "🔥 BATTLE STARTED!";


    startBattlePolling();
}


/* =====================================================
   BATTLE BOARD
===================================================== */

function createBattleBoard() {

    const board =
        document.getElementById(
            "battle-board"
        );

    board.innerHTML = "";


    for (
        let r = 0;
        r < battleMaxAttempts;
        r++
    ) {

        const row =
            document.createElement("div");

        row.className =
            "battle-row";


        for (
            let c = 0;
            c < battleWordLength;
            c++
        ) {

            const tile =
                document.createElement("div");

            tile.className =
                "battle-tile";

            tile.id =
                `battle-tile-${r}-${c}`;

            row.appendChild(tile);
        }


        board.appendChild(row);
    }
}


/* =====================================================
   BATTLE KEYBOARD
===================================================== */

function createBattleKeyboard() {

    const keyboard =
        document.getElementById(
            "battle-keyboard"
        );

    keyboard.innerHTML = "";


    const rows = [

        [
            "Q","W","E","R","T",
            "Y","U","I","O","P"
        ],

        [
            "A","S","D","F","G",
            "H","J","K","L"
        ],

        [
            "ENTER",
            "Z","X","C","V",
            "B","N","M",
            "⌫"
        ]

    ];


    rows.forEach(letters => {

        const row =
            document.createElement("div");

        row.className =
            "battle-key-row";


        letters.forEach(letter => {

            const button =
                document.createElement("button");

            button.className =
                "battle-key";

            button.textContent =
                letter;

            button.onclick =
                () =>
                    handleBattleKey(
                        letter
                    );

            row.appendChild(button);
        });


        keyboard.appendChild(row);
    });
}


/* =====================================================
   BATTLE KEY
===================================================== */

function handleBattleKey(key) {

    if (key === "ENTER") {

        submitBattleGuess();

        return;
    }


    if (key === "⌫") {

        battleCurrentGuess =
            battleCurrentGuess.slice(
                0,
                -1
            );

        updateBattleBoard();

        return;
    }


    if (
        /^[A-Z]$/.test(key) &&
        battleCurrentGuess.length <
        battleWordLength
    ) {

        battleCurrentGuess += key;

        updateBattleBoard();
    }
}


/* =====================================================
   BATTLE BOARD UPDATE
===================================================== */

function updateBattleBoard() {

    for (
        let c = 0;
        c < battleWordLength;
        c++
    ) {

        const tile =
            document.getElementById(
                `battle-tile-${battleCurrentRow}-${c}`
            );

        if (tile) {

            tile.textContent =
                battleCurrentGuess[c] ||
                "";
        }
    }
}


/* =====================================================
   BATTLE SUBMIT
===================================================== */

async function submitBattleGuess() {

    if (
        battleCurrentGuess.length !==
        battleWordLength
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                API +
                "/battle/" +
                window.currentRoom +
                "/guess",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        player:
                            battlePlayer,

                        guess:
                            battleCurrentGuess

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            document
                .getElementById(
                    "battle-message"
                )
                .textContent =
                data.error ||
                "Not a word! ❌";

            return;
        }


        applyBattleResult(
            battleCurrentRow,
            data.result
        );


        document
            .getElementById(
                "you-guesses"
            )
            .textContent =
            `${data.guesses} guesses`;


        document
            .getElementById(
                "you-progress"
            )
            .style.width =
            Math.min(
                (
                    data.guesses /
                    battleMaxAttempts
                ) * 100,
                100
            ) + "%";


        if (data.correct) {

            setTimeout(() => {

                finishBattle(true);

            }, 1000);

            return;
        }


        battleCurrentRow++;

        battleCurrentGuess = "";


        if (
            battleCurrentRow >=
            battleMaxAttempts
        ) {

            setTimeout(() => {

                finishBattle(false);

            }, 800);
        }

    }
    catch (error) {

        console.error(error);

        document
            .getElementById(
                "battle-message"
            )
            .textContent =
            "Connection error!";
    }
}


/* =====================================================
   BATTLE RESULT
===================================================== */

function applyBattleResult(
    row,
    result
) {

    result.forEach((state, i) => {

        const tile =
            document.getElementById(
                `battle-tile-${row}-${i}`
            );

        if (!tile) return;


        setTimeout(() => {

            tile.classList.add("flip");


            setTimeout(() => {

                setTileColor(
                    tile,
                    state
                );

            }, 250);

        }, i * 130);

    });
}


/* =====================================================
   BATTLE POLLING
===================================================== */

function startBattlePolling() {

    clearInterval(
        battlePolling
    );


    battlePolling =
        setInterval(
            updateBattleStatus,
            1000
        );
}


async function updateBattleStatus() {

    if (!window.currentRoom) {
        return;
    }


    try {

        const response =
            await fetch(
                API +
                "/battle/" +
                window.currentRoom
            );


        const battle =
            await response.json();


        if (!battle.player2) {
            return;
        }


        const opponent =
            battlePlayer === "player1"
                ? battle.player2
                : battle.player1;


        document
            .getElementById(
                "opponent-guesses"
            )
            .textContent =
            `${opponent.guesses} guesses`;


        document
            .getElementById(
                "opponent-progress"
            )
            .style.width =
            Math.min(
                (
                    opponent.guesses /
                    battleMaxAttempts
                ) * 100,
                100
            ) + "%";


        if (
            battle.status ===
            "finished"
        ) {

            if (
                battle.winner !==
                battlePlayer
            ) {

                finishBattle(false);
            }
        }

    }
    catch (error) {

        console.log(error);
    }
}


/* =====================================================
   BATTLE FINISH
===================================================== */

function finishBattle(won) {

    clearInterval(
        battlePolling
    );


    const status =
        document.getElementById(
            "battle-status"
        );


    const message =
        document.getElementById(
            "battle-message"
        );


    if (won) {

        status.textContent =
            "🏆 YOU WIN!";

        message.textContent =
            "You cracked it first! 🔥";

    } else {

        status.textContent =
            "💀 YOU LOST!";

        message.textContent =
            "Your opponent got it first.";

    }


    disableBattleKeyboard();
}


function disableBattleKeyboard() {

    document
        .querySelectorAll(
            ".battle-key"
        )
        .forEach(button => {

            button.disabled = true;

        });
}


function leaveBattle() {

    clearInterval(
        battlePolling
    );

    document
        .getElementById(
            "battle-arena"
        )
        .classList.add("hidden");

    showHome();
}


/* =====================================================
   COPY ROOM
===================================================== */

function copyRoomCode() {

    const code =
        document
            .getElementById(
                "room-code"
            )
            .textContent;


    navigator.clipboard
        .writeText(code);


    document
        .getElementById(
            "waiting-text"
        )
        .textContent =
        "Code copied! 📋";
}


/* =====================================================
   PHYSICAL KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        const key =
            event.key.toUpperCase();


        /*
         * SOLO
         */

        const game =
            document.getElementById(
                "game-area"
            );


        if (
            game &&
            !game.classList.contains(
                "hidden"
            )
        ) {

            if (
                key === "BACKSPACE"
            ) {

                handleKey("⌫");

            } else if (
                key === "ENTER"
            ) {

                handleKey("ENTER");

            } else if (
                /^[A-Z]$/.test(key)
            ) {

                handleKey(key);
            }

            return;
        }


        /*
         * DAILY
         */

        const daily =
            document.getElementById(
                "daily-page"
            );


        if (
            daily &&
            !daily.classList.contains(
                "hidden"
            ) &&
            !dailyFinished
        ) {

            if (
                key === "BACKSPACE"
            ) {

                handleDailyKey("⌫");

            } else if (
                key === "ENTER"
            ) {

                handleDailyKey("ENTER");

            } else if (
                /^[A-Z]$/.test(key)
            ) {

                handleDailyKey(key);
            }

            return;
        }


        /*
         * BATTLE
         */

        const battle =
            document.getElementById(
                "battle-arena"
            );


        if (
            battle &&
            !battle.classList.contains(
                "hidden"
            )
        ) {

            if (
                key === "BACKSPACE"
            ) {

                handleBattleKey("⌫");

            } else if (
                key === "ENTER"
            ) {

                handleBattleKey("ENTER");

            } else if (
                /^[A-Z]$/.test(key)
            ) {

                handleBattleKey(key);
            }
        }

    }
);
/* =====================================================
   HINT SYSTEM
===================================================== */


async function useHint() {

    if (hintsUsed >= MAX_HINTS) {
        showMessage("No hints left! 💡");
        return;
    }

    if (!soloGameId) {
        return;
    }

    try {

        const response =
            await fetch(
                API +
                "/hint/" +
                soloGameId
            );

        const hint =
            await response.json();

        if (!response.ok) {
            showMessage(
                hint.error ||
                "Hint unavailable!"
            );
            return;
        }

        const message =
            document.getElementById(
                "hint-message"
            );

        if (message) {

            message.textContent =
                "💡 " + hint.clue;

            message.classList.add(
                "hint-show"
            );
        }

        // One attempt is consumed
        hintsUsed++;

        // Sync attempts with server
if (typeof hint.guesses === "number") {

    const attempts =
        document.getElementById(
            "attempts"
        );

    if (attempts) {

        attempts.textContent =
            `${hint.guesses} / ${hint.maxAttempts}`;
    }
}

        const button =
            document.getElementById(
                "hint-button"
            );

        if (button) {

            const remaining =
                MAX_HINTS - hintsUsed;

            if (remaining > 0) {

                button.textContent =
                    `💡 HINT ×${remaining}`;

            } else {

                button.textContent =
                    "💡 HINTS USED";

                button.disabled = true;
            }
        }

    } catch (error) {

        console.error(error);

        showMessage(
            "Hint unavailable!"
        );
    }
}
