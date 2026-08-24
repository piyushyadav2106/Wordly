const express = require("express");
const cors = require("cors");
const words = require("./words.json");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

const battles = {};
const soloGames = {};


/* =========================
   WORDS
========================= */

function getWordList(length) {

    return words[String(length)] || [];

}


function getRandomWord(length) {

    const list =
        getWordList(length);

    if (!list.length) {
        return null;
    }

    return list[
        Math.floor(
            Math.random() *
            list.length
        )
    ];

}


function isValidWord(word) {

    return getWordList(
        word.length
    ).includes(
        word.toUpperCase()
    );

}


/* =========================
   WORDLE ENGINE
========================= */

function evaluateGuess(
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


/* =====================================================
   SOLO
===================================================== */

app.post(
    "/solo/start",
    (req, res) => {

        const length =
            Number(
                req.body.wordLength
            );


        if (
            ![4,5,6,7]
                .includes(length)
        ) {

            return res.status(400)
                .json({

                    error:
                        "Invalid word length"

                });

        }


        const secretWord =
            getRandomWord(length);


        if (!secretWord) {

            return res.status(400)
                .json({

                    error:
                        "No words available"

                });

        }


        const gameId =
            Math.random()
                .toString(36)
                .substring(2,10)
                .toUpperCase();


        const maxAttempts =
            length === 7
                ? 8
                : length === 6
                    ? 7
                    : 6;


        soloGames[gameId] = {

            secretWord,

            wordLength:
                length,

            guesses: 0,

            maxAttempts,

            finished: false

        };


        res.json({

            success: true,

            gameId,

            wordLength:
                length,

            maxAttempts

        });

    }
);


app.post(
    "/solo/:gameId/guess",
    (req, res) => {

        const game =
            soloGames[
                req.params.gameId
            ];


        if (!game) {

            return res.status(404)
                .json({

                    error:
                        "Game not found"

                });

        }


        if (game.finished) {

            return res.status(400)
                .json({

                    error:
                        "Game already finished"

                });

        }


        const guess =
            req.body.guess
                ?.trim()
                .toUpperCase();


        if (!guess) {

            return res.status(400)
                .json({

                    error:
                        "Enter a word"

                });

        }


        if (
            guess.length !==
            game.wordLength
        ) {

            return res.status(400)
                .json({

                    error:
                        `Word must have ${game.wordLength} letters`

                });

        }


        if (!isValidWord(guess)) {

            return res.status(400)
                .json({

                    error:
                        "Not a word! ❌",

                    invalid: true

                });

        }


        game.guesses++;


        const result =
            evaluateGuess(
                game.secretWord,
                guess
            );


        const correct =
            guess ===
            game.secretWord;


        if (correct) {

            game.finished =
                true;

        }


        const gameOver =
            correct ||
            game.guesses >=
            game.maxAttempts;


        if (gameOver) {

            game.finished =
                true;

        }


        res.json({

            success: true,

            correct,

            result,

            guesses:
                game.guesses,

            maxAttempts:
                game.maxAttempts,

            gameOver,

            answer:
                gameOver
                    ? game.secretWord
                    : null

        });

    }
);


/* =====================================================
   DAILY
===================================================== */

function getDailyWord() {

    const list =
        getWordList(5);


    const now =
        new Date();


    const year =
        now.getUTCFullYear();

    const month =
        now.getUTCMonth();

    const day =
        now.getUTCDate();


    const seed =
        year * 10000 +
        (month + 1) * 100 +
        day;


    return list[
        seed % list.length
    ];

}


app.get(
    "/daily",
    (req, res) => {

        res.json({

            wordLength: 5,

            dailyWord:
                getDailyWord()

        });

    }
);


/* =====================================================
   BATTLE
===================================================== */

app.post(
    "/create-battle",
    (req, res) => {

        const playerName =
            req.body.playerName
                ?.trim();

        const wordLength =
            Number(
                req.body.wordLength
            );


        if (
            !playerName ||
            ![4,5,6,7]
                .includes(wordLength)
        ) {

            return res.status(400)
                .json({

                    error:
                        "Invalid battle settings"

                });

        }


        const secretWord =
            getRandomWord(
                wordLength
            );


        let roomCode;


        do {

            roomCode =
                Math.random()
                    .toString(36)
                    .substring(2,7)
                    .toUpperCase();

        }

        while (
            battles[roomCode]
        );


        battles[roomCode] = {

            roomCode,

            wordLength,

            secretWord,

            status:
                "waiting",

            winner:
                null,

            player1: {

                name:
                    playerName,

                guesses:
                    0,

                solved:
                    false,

                finished:
                    false

            },

            player2:
                null

        };


        res.json({

            success:
                true,

            roomCode

        });

    }
);


app.post(
    "/join-battle",
    (req, res) => {

        const roomCode =
            req.body.roomCode
                ?.trim()
                .toUpperCase();

        const playerName =
            req.body.playerName
                ?.trim();


        const battle =
            battles[roomCode];


        if (!battle) {

            return res.status(404)
                .json({

                    error:
                        "Battle not found"

                });

        }


        if (battle.player2) {

            return res.status(400)
                .json({

                    error:
                        "Battle is already full"

                });

        }


        battle.player2 = {

            name:
                playerName,

            guesses:
                0,

            solved:
                false,

            finished:
                false

        };


        battle.status =
            "playing";


        res.json({

            success:
                true,

            roomCode,

            battle: {

                roomCode:
                    battle.roomCode,

                wordLength:
                    battle.wordLength,

                status:
                    battle.status,

                player1: {

                    name:
                        battle.player1.name

                },

                player2: {

                    name:
                        battle.player2.name

                }

            }

        });

    }
);


app.get(
    "/battle/:roomCode",
    (req, res) => {

        const roomCode =
            req.params.roomCode
                .toUpperCase();


        const battle =
            battles[roomCode];


        if (!battle) {

            return res.status(404)
                .json({

                    error:
                        "Battle not found"

                });

        }


        res.json({

            roomCode:
                battle.roomCode,

            wordLength:
                battle.wordLength,

            status:
                battle.status,

            winner:
                battle.winner,

            player1:
                battle.player1,

            player2:
                battle.player2

        });

    }
);


app.post(
    "/battle/:roomCode/guess",
    (req, res) => {

        const battle =
            battles[
                req.params.roomCode
                    .toUpperCase()
            ];


        if (!battle) {

            return res.status(404)
                .json({

                    error:
                        "Battle not found"

                });

        }


        const player =
            req.body.player;


        const guess =
            req.body.guess
                ?.trim()
                .toUpperCase();


        if (
            player !==
            "player1" &&
            player !==
            "player2"
        ) {

            return res.status(400)
                .json({

                    error:
                        "Invalid player"

                });

        }


        if (
            guess.length !==
            battle.wordLength
        ) {

            return res.status(400)
                .json({

                    error:
                        "Wrong word length"

                });

        }


        if (!isValidWord(guess)) {

            return res.status(400)
                .json({

                    error:
                        "Not a word! ❌",

                    invalid:
                        true

                });

        }


        const currentPlayer =
            battle[player];


        if (currentPlayer.finished) {

            return res.status(400)
                .json({

                    error:
                        "You already finished"

                });

        }


        currentPlayer.guesses++;


        const result =
            evaluateGuess(
                battle.secretWord,
                guess
            );


        const correct =
            guess ===
            battle.secretWord;


        if (correct) {

            currentPlayer.solved =
                true;

            currentPlayer.finished =
                true;

            battle.winner =
                player;

            battle.status =
                "finished";

        }


        res.json({

            success:
                true,

            correct,

            result,

            guesses:
                currentPlayer.guesses,

            winner:
                battle.winner

        });

    }
);


/* =====================================================
   SERVER
===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `WORDLY server running on http://localhost:${PORT}`
        );


        console.log(
            "Dictionary loaded:"
        );


        for (
            const length of
            [4,5,6,7]
        ) {

            console.log(
                `${length} letters: ${
                    getWordList(length).length
                } words`
            );

        }

    }
);