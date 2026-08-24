const API = "http://localhost:3000";

/* =====================================================
   GLOBAL
===================================================== */

let wordLength = 5;
let maxAttempts = 6;
let currentRow = 0;
let currentGuess = "";
let soloGameId = "";

let lastGameLength = 5;

let keyboardStates = {};

let battlePlayer = "";
let battleWordLength = 5;
let battleCurrentRow = 0;
let battleCurrentGuess = "";
let battleMaxAttempts = 6;
let battlePolling = null;
let waitingInterval = null;

let dailyWord = "";
let dailyRow = 0;
let dailyGuess = "";
let dailyFinished = false;


/* =====================================================
   STORAGE / STATS
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


function recordGame(
    won,
    guesses
) {

    const stats =
        getStats();

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
            stats.distribution[
                guesses
            ] !== undefined
        ) {

            stats.distribution[
                guesses
            ]++;

        }

    } else {

        stats.streak = 0;

    }


    saveStats(stats);

}


/* =====================================================
   HOME
===================================================== */

function showHome() {

    document
        .getElementById("home")
        .classList.remove("hidden");

    document
        .getElementById("game-area")
        .classList.add("hidden");

    document
        .getElementById("result-screen")
        .classList.add("hidden");

    document
        .getElementById("stats-page")
        .classList.add("hidden");

    document
        .getElementById("daily-page")
        .classList.add("hidden");

    document
        .getElementById("battle-menu")
        .classList.add("hidden");

    document
        .getElementById("waiting-room")
        .classList.add("hidden");

    document
        .getElementById("battle-arena")
        .classList.add("hidden");

}


/* =====================================================
   SOLO START
===================================================== */

async function startGame(length) {

    wordLength =
        Number(length);

    lastGameLength =
        wordLength;

    currentRow = 0;

    currentGuess = "";

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
                        wordLength:
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
            wordLength +
            " Letters";


        document
            .getElementById("attempts")
            .textContent =
            "0 / " +
            maxAttempts;


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
        document.getElementById(
            "board"
        );


    board.innerHTML = "";


    for (
        let r = 0;
        r < maxAttempts;
        r++
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.className =
            "row";


        for (
            let c = 0;
            c < wordLength;
            c++
        ) {

            const tile =
                document.createElement(
                    "div"
                );


            tile.className =
                "tile";


            tile.id =
                `tile-${r}-${c}`;


            row.appendChild(tile);

        }


        board.appendChild(row);

    }

}


/* =====================================================
   KEYBOARD
===================================================== */

function createKeyboard() {

    const keyboard =
        document.getElementById(
            "keyboard"
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


    rows.forEach(
        letters => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "keyboard-row";


            letters.forEach(
                letter => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.className =
                        "key";


                    button.textContent =
                        letter;


                    button.onclick =
                        () =>
                            handleKey(letter);


                    row.appendChild(
                        button
                    );

                }
            );


            keyboard.appendChild(row);

        }
    );

}


/* =====================================================
   KEY
===================================================== */

function handleKey(key) {

    if (key === "ENTER") {

        submitGuess();

        return;

    }


    if (key === "⌫") {

        currentGuess =
            currentGuess.slice(
                0,
                -1
            );


        updateBoard();

        return;

    }


    if (
        currentGuess.length <
        wordLength
    ) {

        currentGuess += key;

        updateBoard();

    }

}


/* =====================================================
   UPDATE BOARD
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
            currentGuess[c] ||
            "";


        if (currentGuess[c]) {

            tile.classList.remove(
                "pop"
            );

            void tile.offsetWidth;

            tile.classList.add(
                "pop"
            );

        }

    }

}


/* =====================================================
   SOLO GUESS
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
                "/solo/" +
                soloGameId +
                "/guess",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        guess: guess
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
            resultSafe(
                data.result
            ),
            guess
        );


        document
            .getElementById(
                "attempts"
            )
            .textContent =
            data.guesses +
            " / " +
            data.maxAttempts;


        if (data.correct) {

            currentGuess = "";

            setTimeout(
                () => {

                    finishSoloGame(
                        true,
                        data.guesses,
                        data.answer
                    );

                },
                wordLength * 150 + 500
            );

            return;

        }


        if (data.gameOver) {

            currentGuess = "";

            setTimeout(
                () => {

                    finishSoloGame(
                        false,
                        data.guesses,
                        data.answer
                    );

                },
                wordLength * 150 + 500
            );

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
   SAFE RESULT
===================================================== */

function resultSafe(result) {

    if (
        Array.isArray(result)
    ) {

        return result;

    }

    return [];

}


/* =====================================================
   APPLY RESULT
===================================================== */

function applyResult(
    row,
    result,
    guess
) {

    result.forEach(
        (state, i) => {

            const tile =
                document.getElementById(
                    `tile-${row}-${i}`
                );


            if (!tile) return;


            setTimeout(
                () => {

                    tile.classList.add(
                        "flip"
                    );


                    setTimeout(
                        () => {

                            if (
                                state ===
                                "green"
                            ) {

                                tile.style.background =
                                    "#4caf50";

                                tile.style.borderColor =
                                    "#4caf50";

                            }

                            else if (
                                state ===
                                "yellow"
                            ) {

                                tile.style.background =
                                    "#d6a72c";

                                tile.style.borderColor =
                                    "#d6a72c";

                            }

                            else {

                                tile.style.background =
                                    "#444";

                                tile.style.borderColor =
                                    "#444";

                            }


                            updateKeyboardLetter(
                                guess[i],
                                state
                            );


                        },
                        250
                    );

                },
                i * 130
            );

        }
    );

}


/* =====================================================
   SMART KEYBOARD
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
        keyboardStates[
            letter
        ];


    if (
        oldState &&
        priority[oldState] >=
        priority[newState]
    ) {

        return;

    }


    keyboardStates[
        letter
    ] =
        newState;


    document
        .querySelectorAll(".key")
        .forEach(
            button => {

                if (
                    button.textContent ===
                    letter
                ) {

                    button.classList.remove(
                        "key-green",
                        "key-yellow",
                        "key-gray"
                    );


                    if (
                        newState ===
                        "green"
                    ) {

                        button.classList.add(
                            "key-green"
                        );

                    }

                    else if (
                        newState ===
                        "yellow"
                    ) {

                        button.classList.add(
                            "key-yellow"
                        );

                    }

                    else {

                        button.classList.add(
                            "key-gray"
                        );

                    }

                }

            }
        );

}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(text) {

    const message =
        document.getElementById(
            "message"
        );


    if (message) {

        message.textContent =
            text;

    }

}


/* =====================================================
   SHAKE
===================================================== */

function shakeBoard() {

    const board =
        document.getElementById(
            "board"
        );


    board.classList.remove(
        "shake"
    );


    void board.offsetWidth;


    board.classList.add(
        "shake"
    );


    setTimeout(
        () => {

            board.classList.remove(
                "shake"
            );

        },
        500
    );

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
        .getElementById(
            "game-area"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "result-screen"
        )
        .classList.remove(
            "hidden"
        );


    const icon =
        document.getElementById(
            "result-icon"
        );


    const title =
        document.getElementById(
            "result-title"
        );


    if (won) {

        icon.textContent =
            "🎉";

        title.textContent =
            "YOU GOT IT!";

    } else {

        icon.textContent =
            "😵";

        title.textContent =
            "NICE TRY!";

    }


    document
        .getElementById(
            "result-word"
        )
        .textContent =
        answer || "-----";


    document
        .getElementById(
            "result-details"
        )
        .textContent =
        won
            ? `Solved in ${guesses} ${
                guesses === 1
                    ? "try"
                    : "tries"
            }`
            : "Better luck next time!";


    document
        .getElementById(
            "result-streak"
        )
        .textContent =
        stats.streak +
        "🔥";


    document
        .getElementById(
            "result-best"
        )
        .textContent =
        stats.bestStreak +
        "🔥";

}


/* =====================================================
   PLAY AGAIN
===================================================== */

function playAgain() {

    document
        .getElementById(
            "result-screen"
        )
        .classList.add(
            "hidden"
        );


    startGame(
        lastGameLength
    );

}


/* =====================================================
   STATS PAGE
===================================================== */

function showStats() {

    const stats =
        getStats();


    document
        .getElementById(
            "home"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "stats-page"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "stat-games"
        )
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
        .getElementById(
            "stat-wins"
        )
        .textContent =
        winRate + "%";


    document
        .getElementById(
            "stat-streak"
        )
        .textContent =
        stats.streak +
        "🔥";


    document
        .getElementById(
            "stat-best"
        )
        .textContent =
        stats.bestStreak +
        "🔥";


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
    ).forEach(
        value => {

            if (value > max) {

                max = value;

            }

        }
    );


    Object.keys(
        distribution
    ).forEach(
        number => {

            const value =
                distribution[
                    number
                ];


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "dist-row";


            const label =
                document.createElement(
                    "span"
                );


            label.className =
                "dist-number";


            label.textContent =
                number;


            const bar =
                document.createElement(
                    "div"
                );


            bar.className =
                "dist-bar";


            const width =
                value === 0
                    ? 25
                    : Math.max(
                        25,
                        (
                            value /
                            max
                        ) * 100
                    );


            bar.style.width =
                width + "%";


            bar.textContent =
                value;


            row.appendChild(
                label
            );


            row.appendChild(
                bar
            );


            container.appendChild(
                row
            );

        }
    );

}


function resetStats() {

    const confirmReset =
        confirm(
            "Reset all Wordly stats?"
        );


    if (!confirmReset) {
        return;
    }


    localStorage.removeItem(
        "wordlyStats"
    );


    showStats();

}


/* =====================================================
   DAILY CHALLENGE
===================================================== */

async function startDaily() {

    dailyRow = 0;

    dailyGuess = "";

    dailyFinished = false;

    keyboardStates = {};


    try {

        const response =
            await fetch(
                API + "/daily"
            );


        const data =
            await response.json();


        dailyWord =
            data.dailyWord
                .toUpperCase();


        document
            .getElementById(
                "home"
            )
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "daily-page"
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


        document
            .getElementById(
                "daily-game-area"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "daily-number"
            )
            .textContent =
            "DAILY • " +
            getDailyNumber();


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


function getDailyNumber() {

    const start =
        new Date(
            Date.UTC(
                2026,
                0,
                1
            )
        );


    const now =
        new Date();


    const today =
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        );


    return Math.floor(
        (
            today -
            start.getTime()
        ) /
        86400000
    ) + 1;

}


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
            document.createElement(
                "div"
            );


        row.className =
            "daily-row";


        for (
            let c = 0;
            c < 5;
            c++
        ) {

            const tile =
                document.createElement(
                    "div"
                );


            tile.className =
                "daily-tile";


            tile.id =
                `daily-tile-${r}-${c}`;


            row.appendChild(
                tile
            );

        }


        board.appendChild(
            row
        );

    }

}


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


    rows.forEach(
        letters => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "daily-key-row";


            letters.forEach(
                letter => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.className =
                        "daily-key";


                    button.textContent =
                        letter;


                    button.onclick =
                        () =>
                            handleDailyKey(
                                letter
                            );


                    row.appendChild(
                        button
                    );

                }
            );


            keyboard.appendChild(
                row
            );

        }
    );

}


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
            dailyGuess.slice(
                0,
                -1
            );


        updateDailyBoard();

        return;

    }


    if (
        dailyGuess.length < 5
    ) {

        dailyGuess += key;

        updateDailyBoard();

    }

}


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


        if (tile) {

            tile.textContent =
                dailyGuess[c] ||
                "";

        }

    }

}


async function submitDailyGuess() {

    if (
        dailyGuess.length !== 5
    ) {

        document
            .getElementById(
                "daily-message"
            )
            .textContent =
            "Not enough letters!";

        return;

    }


    const guess =
        dailyGuess.toUpperCase();


    try {

        /*
         * Validate through server's
         * normal dictionary route
         * using a temporary solo game.
         */

        const start =
            await fetch(
                API + "/solo/start",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        wordLength: 5
                    })
                }
            );


        /*
         * We don't use the random
         * secret from that game.
         *
         * Daily result is calculated
         * locally against the daily
         * word after dictionary check.
         */

        if (!start.ok) {

            throw new Error(
                "Dictionary unavailable"
            );

        }


        /*
         * Basic common-word validation
         * is handled by the server through
         * a temporary check below.
         */

        const game =
            await start.json();


        const response =
            await fetch(
                API +
                "/solo/" +
                game.gameId +
                "/guess",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        guess: guess
                    })
                }
            );


        const validation =
            await response.json();


        /*
         * If server says invalid,
         * reject the daily guess.
         */

        if (
            !response.ok &&
            validation.invalid
        ) {

            document
                .getElementById(
                    "daily-message"
                )
                .textContent =
                "Not a word! ❌";

            return;

        }


        /*
         * Daily Wordle evaluation.
         */

        const result =
            evaluateLocal(
                dailyWord,
                guess
            );


        applyDailyResult(
            dailyRow,
            result,
            guess
        );


        if (
            guess === dailyWord
        ) {

            dailyFinished =
                true;


            setTimeout(
                () => {

                    finishDaily(
                        true,
                        dailyRow + 1
                    );

                },
                1200
            );


            return;

        }


        dailyRow++;

        dailyGuess = "";


        if (
            dailyRow >= 6
        ) {

            dailyFinished =
                true;


            setTimeout(
                () => {

                    finishDaily(
                        false,
                        6
                    );

                },
                1200
            );

        }

    } catch (error) {

        console.error(error);

        document
            .getElementById(
                "daily-message"
            )
            .textContent =
            "Connection error!";

    }

}


function evaluateLocal(
    secret,
    guess
) {

    const result =
        Array(
            secret.length
        ).fill("gray");


    const used =
        Array(
            secret.length
        ).fill(false);


    for (
        let i = 0;
        i < secret.length;
        i++
    ) {

        if (
            guess[i] ===
            secret[i]
        ) {

            result[i] =
                "green";

            used[i] =
                true;

        }

    }


    for (
        let i = 0;
        i < guess.length;
        i++
    ) {

        if (
            result[i] ===
            "green"
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
                guess[i] ===
                secret[j]
            ) {

                result[i] =
                    "yellow";

                used[j] =
                    true;

                break;

            }

        }

    }


    return result;

}


function applyDailyResult(
    row,
    result,
    guess
) {

    result.forEach(
        (state, i) => {

            const tile =
                document.getElementById(
                    `daily-tile-${row}-${i}`
                );


            if (!tile) return;


            setTimeout(
                () => {

                    if (
                        state ===
                        "green"
                    ) {

                        tile.style.background =
                            "#4caf50";

                        tile.style.borderColor =
                            "#4caf50";

                    }

                    else if (
                        state ===
                        "yellow"
                    ) {

                        tile.style.background =
                            "#d6a72c";

                        tile.style.borderColor =
                            "#d6a72c";

                    }

                    else {

                        tile.style.background =
                            "#444";

                        tile.style.borderColor =
                            "#444";

                    }

                },
                i * 120
            );

        }
    );

}


function finishDaily(
    won,
    guesses
) {

    document
        .getElementById(
            "daily-game-area"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "daily-result"
        )
        .classList.remove(
            "hidden"
        );


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

}


function buildDailyShare() {

    const rows = [];


    for (
        let r = 0;
        r <= dailyRow &&
        r < 6;
        r++
    ) {

        let line = "";


        for (
            let c = 0;
            c < 5;
            c++
        ) {

            const tile =
                document.getElementById(
                    `daily-tile-${r}-${c}`
                );


            if (!tile) continue;


            const bg =
                tile.style.background;


            if (
                bg.includes(
                    "76, 175, 80"
                ) ||
                bg ===
                    "rgb(76, 175, 80)"
            ) {

                line += "🟩";

            }

            else if (
                bg.includes(
                    "214, 167, 44"
                ) ||
                bg ===
                    "rgb(214, 167, 44)"
            ) {

                line += "🟨";

            }

            else if (
                bg
            ) {

                line += "⬛";

            }

        }


        if (line.length === 5) {

            rows.push(line);

        }

    }


    document
        .getElementById(
            "daily-share"
        )
        .textContent =
        rows.join("\n");


}


function copyDailyResult() {

    const share =
        `Wordly Daily #${
            getDailyNumber()
        }\n\n` +
        document
            .getElementById(
                "daily-share"
            )
            .textContent;


    navigator.clipboard
        .writeText(
            share
        );


    document
        .getElementById(
            "daily-next"
        )
        .textContent =
        "Copied! 📋";

}


function updateDailyCountdown() {

    const now =
        new Date();


    const tomorrow =
        new Date(
            now
        );


    tomorrow.setHours(
        24,
        0,
        0,
        0
    );


    const seconds =
        Math.floor(
            (
                tomorrow -
                now
            ) / 1000
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (
                seconds %
                3600
            ) / 60
        );


    const secondsLeft =
        seconds % 60;


    const element =
        document.getElementById(
            "daily-next"
        );


    if (
        element &&
        !dailyFinished
    ) {

        element.textContent =
            `Next challenge in ${hours}h ${minutes}m ${secondsLeft}s`;

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
        .getElementById(
            "home"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "battle-menu"
        )
        .classList.remove(
            "hidden"
        );

}


function showBattleMessage(text) {

    const element =
        document.getElementById(
            "battle-message"
        );


    if (element) {

        element.textContent =
            text;

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

                        playerName:
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
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "waiting-room"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "room-code"
            )
            .textContent =
            data.roomCode;


        startWaiting();


    } catch (error) {

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

                        playerName:
                            playerName,

                        roomCode:
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
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "waiting-room"
            )
            .classList.add(
                "hidden"
            );


        startBattleGame(
            data.battle
        );


    } catch (error) {

        console.error(error);

        showBattleMessage(
            "Cannot connect to server!"
        );

    }

}


/* =====================================================
   WAITING
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

    if (
        !window.currentRoom
    ) {
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


        if (
            !battle.player2
        ) {
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


        setTimeout(
            () => {

                startBattleGame(
                    battle
                );

            },
            700
        );


    } catch (error) {

        console.log(error);

    }

}


/* =====================================================
   START BATTLE GAME
===================================================== */

function startBattleGame(
    battle
) {

    document
        .getElementById(
            "waiting-room"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "battle-arena"
        )
        .classList.remove(
            "hidden"
        );


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
            document.createElement(
                "div"
            );


        row.className =
            "battle-row";


        for (
            let c = 0;
            c < battleWordLength;
            c++
        ) {

            const tile =
                document.createElement(
                    "div"
                );


            tile.className =
                "battle-tile";


            tile.id =
                `battle-tile-${r}-${c}`;


            row.appendChild(
                tile
            );

        }


        board.appendChild(
            row
        );

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


    rows.forEach(
        letters => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "battle-key-row";


            letters.forEach(
                letter => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.className =
                        "battle-key";


                    button.textContent =
                        letter;


                    button.onclick =
                        () =>
                            handleBattleKey(
                                letter
                            );


                    row.appendChild(
                        button
                    );

                }
            );


            keyboard.appendChild(
                row
            );

        }
    );

}


/* =====================================================
   BATTLE KEY
===================================================== */

function handleBattleKey(
    key
) {

    if (
        key === "ENTER"
    ) {

        submitBattleGuess();

        return;

    }


    if (
        key === "⌫"
    ) {

        battleCurrentGuess =
            battleCurrentGuess.slice(
                0,
                -1
            );


        updateBattleBoard();

        return;

    }


    if (
        battleCurrentGuess.length <
        battleWordLength
    ) {

        battleCurrentGuess +=
            key;


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
   BATTLE GUESS
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
            data.guesses +
            " guesses";


        const progress =
            Math.min(
                (
                    data.guesses /
                    battleMaxAttempts
                ) * 100,
                100
            );


        document
            .getElementById(
                "you-progress"
            )
            .style.width =
            progress + "%";


        if (
            data.correct
        ) {

            setTimeout(
                () => {

                    finishBattle(
                        true
                    );

                },
                1000
            );


            return;

        }


        battleCurrentRow++;

        battleCurrentGuess = "";


        if (
            battleCurrentRow >=
            battleMaxAttempts
        ) {

            setTimeout(
                () => {

                    finishBattle(
                        false
                    );

                },
                800
            );

        }

    } catch (error) {

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

    result.forEach(
        (state, i) => {

            const tile =
                document.getElementById(
                    `battle-tile-${row}-${i}`
                );


            if (!tile) return;


            setTimeout(
                () => {

                    tile.classList.add(
                        "flip"
                    );


                    setTimeout(
                        () => {

                            if (
                                state ===
                                "green"
                            ) {

                                tile.style.background =
                                    "#4caf50";

                            }

                            else if (
                                state ===
                                "yellow"
                            ) {

                                tile.style.background =
                                    "#d6a72c";

                            }

                            else {

                                tile.style.background =
                                    "#444";

                            }

                        },
                        250
                    );

                },
                i * 130
            );

        }
    );

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

    if (
        !window.currentRoom
    ) {
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


        if (
            !battle.player2
        ) {
            return;
        }


        const opponent =
            battlePlayer ===
            "player1"
                ? battle.player2
                : battle.player1;


        document
            .getElementById(
                "opponent-guesses"
            )
            .textContent =
            opponent.guesses +
            " guesses";


        const progress =
            Math.min(
                (
                    opponent.guesses /
                    battleMaxAttempts
                ) * 100,
                100
            );


        document
            .getElementById(
                "opponent-progress"
            )
            .style.width =
            progress + "%";


        if (
            battle.status ===
            "finished"
        ) {

            if (
                battle.winner !==
                battlePlayer
            ) {

                finishBattle(
                    false
                );

            }

        }

    } catch (error) {

        console.log(error);

    }

}


/* =====================================================
   BATTLE FINISH
===================================================== */

function finishBattle(
    won
) {

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
            "🔥 Amazing! You cracked it first!";

    } else {

        status.textContent =
            "💀 YOU LOST!";

        message.textContent =
            "Your opponent got the word first.";

    }


    disableBattleKeyboard();

}


/* =====================================================
   DISABLE BATTLE
===================================================== */

function disableBattleKeyboard() {

    document
        .querySelectorAll(
            ".battle-key"
        )
        .forEach(
            button => {

                button.disabled =
                    true;

            }
        );

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
        .writeText(
            code
        );


    document
        .getElementById(
            "waiting-text"
        )
        .textContent =
        "Code copied! 📋";

}


/* =====================================================
   LEAVE BATTLE
===================================================== */

function leaveBattle() {

    clearInterval(
        battlePolling
    );


    document
        .getElementById(
            "battle-arena"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "home"
        )
        .classList.remove(
            "hidden"
        );

}


/* =====================================================
   HOME
===================================================== */

function goHome() {

    clearInterval(
        battlePolling
    );

    clearInterval(
        waitingInterval
    );


    showHome();

}


/* =====================================================
   PHYSICAL KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        const game =
            document.getElementById(
                "game-area"
            );


        if (
            !game ||
            game.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        const key =
            event.key.toUpperCase();


        if (
            key ===
            "BACKSPACE"
        ) {

            handleKey("⌫");

        }

        else if (
            key ===
            "ENTER"
        ) {

            handleKey("ENTER");

        }

        else if (
            /^[A-Z]$/.test(key)
        ) {

            handleKey(key);

        }

    }
);