
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Game = "charades" | "bluff" | "quicktap";

const words = [
  "Chicken Biryani",
  "Dancing",
  "Cricket",
  "Coffee",
  "Pizza",
  "Elephant",
  "Movie Star",
  "Sleeping",
  "Shopping",
  "Football",
  "Birthday Cake",
  "Robot",
];

const questions = [
  {
    question: "Which animal is known as the king of the jungle?",
    options: ["Tiger", "Lion", "Elephant", "Wolf"],
    answer: "Lion",
  },
  {
    question: "Which drink is commonly made from coffee beans?",
    options: ["Lemonade", "Coffee", "Milkshake", "Tea"],
    answer: "Coffee",
  },
  {
    question: "How many days are there in a week?",
    options: ["5", "6", "7", "8"],
    answer: "7",
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: "Mars",
  },
];

export default function PartyGamesPage() {
  const params = useParams<{ cafeId: string }>();
  const searchParams = useSearchParams();

  const cafeId = params.cafeId;
  const orderId = searchParams.get("orderId") || "";

  const [players, setPlayers] = useState(4);
  const [game, setGame] = useState<Game | null>(null);
  const [word, setWord] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [running, setRunning] = useState(false);
  const [tapStarted, setTapStarted] = useState(false);
  const [tapMessage, setTapMessage] = useState(
    "Press start when you are ready."
  );

  useEffect(() => {
    if (!running || seconds <= 0) return;

    const timer = window.setTimeout(
      () => setSeconds((current) => current - 1),
      1000
    );

    return () => window.clearTimeout(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  function startCharades() {
    setGame("charades");
    setWord(words[Math.floor(Math.random() * words.length)]);
    setScore(0);
  }

  function nextWord() {
    setWord(words[Math.floor(Math.random() * words.length)]);
  }

  function startBluffQuiz() {
    setGame("bluff");
    setQuestionIndex(0);
    setSelectedAnswer("");
    setScore(0);
  }

  function answerQuiz(answer: string) {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);

    if (answer === questions[questionIndex].answer) {
      setScore((current) => current + 1);
    }
  }

  function nextQuestion() {
    if (questionIndex >= questions.length - 1) {
      setGame(null);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer("");
  }

  function startQuickTap() {
    setGame("quicktap");
    setScore(0);
    setSeconds(30);
    setRunning(false);
    setTapStarted(false);
    setTapMessage("Tap Start to begin your 30-second challenge.");
  }

  function tapPoint() {
    if (!running || seconds <= 0) return;
    setScore((current) => current + 1);
  }

  function backToGames() {
    setGame(null);
    setRunning(false);
  }

  const recommended =
    players <= 3
      ? [
          { id: "quicktap", title: "⚡ Quick Tap", detail: "30-second reaction challenge" },
          { id: "charades", title: "🎭 Charades", detail: "Guess words together" },
        ]
      : players <= 5
      ? [
          { id: "charades", title: "🎭 Party Charades", detail: "Act, guess, and laugh" },
          { id: "bluff", title: "🧠 Trivia Challenge", detail: "Answer fun questions" },
          { id: "quicktap", title: "⚡ Quick Tap", detail: "Beat your friends' score" },
        ]
      : [
          { id: "charades", title: "🎭 Team Charades", detail: "Split into teams and compete" },
          { id: "bluff", title: "🧠 Group Trivia", detail: "Play together and compare scores" },
        ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-400">
              CafeFlow Entertainment
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Party Games 🎉
            </h1>
            <p className="mt-2 text-slate-300">
              Good food. Great company. Let the games begin.
            </p>
          </div>
          <a
            href={`/menu/${cafeId}`}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800"
          >
            Back to Menu
          </a>
        </header>

        {orderId && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="font-bold text-emerald-300">
              🍽️ Your order has been placed!
            </p>
            <p className="mt-1 break-all text-sm text-slate-300">
              Order ID: {orderId}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Enjoy a game while the cafe prepares your order.
            </p>
          </div>
        )}

        {!game && (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7">
              <h2 className="text-xl font-extrabold">
                How many people are playing?
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose your group size for recommendations.
              </p>

              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayers(count)}
                    className={`rounded-xl px-3 py-4 font-black transition ${
                      players === count
                        ? "bg-orange-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {count === 9 ? "9+" : count}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-black">Recommended for you</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {players >= 6
                      ? "Group and team games"
                      : players >= 4
                      ? "Party games for your group"
                      : "Quick games for a small group"}
                  </p>
                </div>
                <span className="text-sm text-orange-300">
                  {players === 9 ? "9+" : players} players
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {recommended.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-900 p-5"
                  >
                    <h3 className="text-xl font-extrabold">{item.title}</h3>
                    <p className="mt-2 min-h-10 text-sm text-slate-400">
                      {item.detail}
                    </p>
                    <button
                      onClick={() => {
                        if (item.id === "charades") startCharades();
                        if (item.id === "bluff") startBluffQuiz();
                        if (item.id === "quicktap") startQuickTap();
                      }}
                      className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 font-extrabold hover:bg-orange-400"
                    >
                      Play Now →
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {game === "charades" && (
          <section className="rounded-3xl bg-white p-6 text-slate-900 sm:p-10">
            <button onClick={backToGames} className="text-sm font-bold text-slate-500">
              ← All games
            </button>
            <p className="mt-6 text-sm font-bold uppercase tracking-widest text-orange-600">
              Charades
            </p>
            <h2 className="mt-2 text-3xl font-black">Act it out!</h2>
            <p className="mt-2 text-slate-600">
              One person acts or gives clues without saying the word. Everyone else guesses.
            </p>
            <div className="my-8 rounded-2xl bg-orange-50 p-8 text-center">
              <p className="text-sm text-orange-700">
                Show this word to the clue-giver only
              </p>
              <p className="mt-3 text-3xl font-black text-slate-900">{word}</p>
            </div>
            <button
              onClick={nextWord}
              className="w-full rounded-xl bg-slate-900 px-5 py-4 font-bold text-white"
            >
              Next Word
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              Tip: pass the phone to the next player without showing the word to the guessers.
            </p>
          </section>
        )}

        {game === "bluff" && (
          <section className="rounded-3xl bg-white p-6 text-slate-900 sm:p-10">
            <button onClick={backToGames} className="text-sm font-bold text-slate-500">
              ← All games
            </button>
            <p className="mt-6 text-sm font-bold uppercase tracking-widest text-orange-600">
              Trivia Challenge
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Question {questionIndex + 1} of {questions.length}
            </h2>
            <p className="mt-4 text-lg font-bold">
              {questions[questionIndex].question}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {questions[questionIndex].options.map((answer) => (
                <button
                  key={answer}
                  disabled={Boolean(selectedAnswer)}
                  onClick={() => answerQuiz(answer)}
                  className={`rounded-xl border p-4 text-left font-bold ${
                    selectedAnswer === answer
                      ? answer === questions[questionIndex].answer
                        ? "border-green-500 bg-green-50"
                        : "border-red-400 bg-red-50"
                      : selectedAnswer && answer === questions[questionIndex].answer
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {answer}
                </button>
              ))}
            </div>
            {selectedAnswer && (
              <div className="mt-5 rounded-xl bg-slate-100 p-4">
                <p className="font-bold">
                  {selectedAnswer === questions[questionIndex].answer
                    ? "Correct! 🎉"
                    : `The correct answer is ${questions[questionIndex].answer}.`}
                </p>
                <p className="mt-1 text-sm">Score: {score}</p>
                <button
                  onClick={nextQuestion}
                  className="mt-4 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white"
                >
                  {questionIndex === questions.length - 1
                    ? "Finish Quiz"
                    : "Next Question →"}
                </button>
              </div>
            )}
          </section>
        )}

        {game === "quicktap" && (
          <section className="rounded-3xl bg-white p-6 text-slate-900 sm:p-10">
            <button onClick={backToGames} className="text-sm font-bold text-slate-500">
              ← All games
            </button>
            <p className="mt-6 text-sm font-bold uppercase tracking-widest text-orange-600">
              Quick Tap Challenge
            </p>
            <h2 className="mt-2 text-3xl font-black">How fast are you?</h2>
            <p className="mt-2 text-slate-600">
              Tap the big button as many times as possible in 30 seconds.
              Take turns and compare scores.
            </p>
            <div className="my-6 flex justify-between rounded-2xl bg-slate-100 p-5">
              <div>
                <p className="text-sm text-slate-500">Time left</p>
                <p className="text-3xl font-black">{seconds}s</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Taps</p>
                <p className="text-3xl font-black">{score}</p>
              </div>
            </div>
            {!running && seconds === 30 && (
              <button
                onClick={() => {
                  setScore(0);
                  setSeconds(30);
                  setTapStarted(true);
                  setTapMessage("Go! Tap as fast as you can.");
                  setRunning(true);
                }}
                className="w-full rounded-xl bg-slate-900 p-4 font-bold text-white"
              >
                Start Challenge
              </button>
            )}
            {running && (
              <button
                onClick={tapPoint}
                className="w-full select-none rounded-2xl bg-orange-500 py-16 text-3xl font-black text-white active:scale-95"
              >
                TAP! ⚡
              </button>
            )}
            {seconds === 0 && (
              <div className="rounded-xl bg-green-50 p-5 text-center">
                <p className="text-xl font-black">Time's up! 🎉</p>
                <p className="mt-2">You scored {score} taps.</p>
                <button
                  onClick={startQuickTap}
                  className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
                >
                  Play Again
                </button>
              </div>
            )}
            {tapStarted && seconds > 0 && !running && (
              <p className="mt-4 text-center text-sm text-slate-500">{tapMessage}</p>
            )}
          </section>
        )}

        <footer className="mt-10 text-center text-sm text-slate-500">
          <p>Play together. Keep it friendly. Enjoy your visit. 🧡</p>
          <p className="mt-2">Powered by CafeFlow</p>
        </footer>
      </div>
    </main>
  );
}
