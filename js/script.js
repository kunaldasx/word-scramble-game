const elements = {
	word: document.getElementById("scrambledWord"),
	hint: document.getElementById("hintText"),
	time: document.getElementById("timeValue"),
	timerBar: document.getElementById("timerBar"),
	input: document.getElementById("answerInput"),
	submitButton: document.querySelector(".submit-button"),
	skipButton: document.getElementById("skipButton"),
	form: document.getElementById("answerForm"),
	message: document.getElementById("message"),
	difficulty: document.getElementById("difficulty"),
	letters: document.getElementById("letterCount"),
	round: document.getElementById("roundNumber"),
	streakLabel: document.getElementById("streakLabel"),
	score: document.getElementById("scoreValue"),
	scoreChange: document.getElementById("scoreChange"),
	solved: document.getElementById("solvedValue"),
	accuracy: document.getElementById("accuracyValue"),
	bestStreak: document.getElementById("bestStreakValue"),
	focus: document.getElementById("focusValue"),
	focusBar: document.getElementById("focusBar"),
	bestScore: document.getElementById("bestScoreLabel"),
	hintButton: document.getElementById("hintButton"),
	hintCost: document.getElementById("hintCost"),
};
const saved = JSON.parse(localStorage.getItem("lexisprint-progress") || "null");
const state = {
	score: 0,
	streak: 0,
	bestStreak: saved?.bestStreak || 0,
	solved: 0,
	attempts: 0,
	round: 0,
	focus: 0,
	mode: "classic",
	time: 30,
	maxTime: 30,
	word: null,
	previousWord: null,
	timer: null,
	nextRoundTimer: null,
	hintUsed: false,
	roundResolved: false,
	bestScore: saved?.bestScore || 0,
	sound: false,
};
const getWordClass = (wordObj) =>
	wordObj.difficulty ||
	(wordObj.word.length > 8
		? "legendary"
		: wordObj.word.length > 6
			? "exclusive"
			: wordObj.word.length > 4
				? "rare"
				: "common");
const playableWords = words.filter(
	(word) => typeof word?.word === "string" && word.word.length > 0,
);
const shuffle = (value) => {
	const letters = value.split("");
	for (let index = letters.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[letters[index], letters[randomIndex]] = [
			letters[randomIndex],
			letters[index],
		];
	}
	return letters.join("");
};
const scrambleWord = (value) => {
	let scrambled = value;
	for (let attempt = 0; attempt < 10 && scrambled === value; attempt += 1) {
		scrambled = shuffle(value);
	}
	if (scrambled === value) {
		scrambled = `${value.slice(1)}${value[0]}`;
	}
	return scrambled;
};
const saveProgress = () =>
	localStorage.setItem(
		"lexisprint-progress",
		JSON.stringify({
			bestScore: state.bestScore,
			bestStreak: state.bestStreak,
		}),
	);
const updateStats = () => {
	elements.score.textContent = state.score;
	elements.solved.textContent = state.solved;
	elements.accuracy.textContent = `${state.attempts ? Math.round((state.solved / state.attempts) * 100) : 0}%`;
	elements.bestStreak.textContent = state.bestStreak;
	elements.focus.textContent = `${state.focus}%`;
	elements.focusBar.style.width = `${state.focus}%`;
	elements.bestScore.textContent = `BEST SCORE ${state.bestScore}`;
};
const setMessage = (text, error = false) => {
	elements.message.textContent = text;
	elements.message.classList.toggle("error", error);
};
const stopTimer = () => clearInterval(state.timer);
const scheduleNewRound = (delay) => {
	clearTimeout(state.nextRoundTimer);
	state.nextRoundTimer = setTimeout(newRound, delay);
};
const startTimer = () => {
	stopTimer();
	state.timer = setInterval(() => {
		state.time -= 1;
		elements.time.textContent = state.time;
		elements.timerBar.style.width = `${(state.time / state.maxTime) * 100}%`;
		if (state.time <= 0) {
			stopTimer();
			state.roundResolved = true;
			state.attempts += 1;
			setMessage(
				`Time's up. The word was ${state.word.word.toUpperCase()}.`,
				true,
			);
			elements.input.disabled = true;
			elements.submitButton.disabled = true;
			elements.skipButton.disabled = true;
			elements.hintButton.disabled = true;
			scheduleNewRound(1300);
		}
	}, 1000);
};
const newRound = () => {
	stopTimer();
	clearTimeout(state.nextRoundTimer);
	state.round += 1;
	state.hintUsed = false;
	state.roundResolved = false;
	const availableWords = playableWords.filter(
		(word) => word.word !== state.previousWord,
	);
	state.word =
		availableWords[Math.floor(Math.random() * availableWords.length)];
	state.previousWord = state.word.word;
	const wordClass = getWordClass(state.word);
	state.maxTime =
		state.mode === "blitz"
			? 15
			: { common: 30, rare: 28, exclusive: 25, legendary: 22 }[wordClass] || 30;
	state.time = state.maxTime;
	elements.word.textContent = scrambleWord(state.word.word);
	elements.difficulty.textContent = wordClass.toUpperCase();
	elements.letters.textContent = `${state.word.word.length} LETTERS`;
	elements.round.textContent = String(state.round).padStart(2, "0");
	elements.streakLabel.textContent = state.streak
		? `${state.streak} IN A ROW`
		: "BUILD YOUR STREAK";
	elements.time.textContent = state.time;
	elements.timerBar.style.width = "100%";
	elements.input.value = "";
	elements.input.disabled = false;
	elements.submitButton.disabled = false;
	elements.skipButton.disabled = false;
	elements.input.maxLength = state.word.word.length;
	elements.input.className = "";
	elements.hint.textContent = "A clue will appear here.";
	elements.hintButton.disabled = false;
	elements.hintCost.textContent = state.score >= 3 ? "−3" : "free";
	setMessage("");
	startTimer();
	elements.input.focus();
};
const checkAnswer = () => {
	if (state.roundResolved) return;
	const answer = elements.input.value.trim().toLowerCase();
	if (!answer) {
		setMessage("Type an answer first.", true);
		elements.input.classList.add("shake");
		setTimeout(() => elements.input.classList.remove("shake"), 400);
		return;
	}
	state.attempts += 1;
	if (answer !== state.word.word.toLowerCase()) {
		state.streak = 0;
		state.focus = Math.max(0, state.focus - 8);
		elements.input.classList.add("incorrect");
		setMessage("Not quite. Keep looking at the clue.", true);
		updateStats();
		setTimeout(() => elements.input.classList.remove("incorrect"), 500);
		return;
	}
	state.roundResolved = true;
	stopTimer();
	state.solved += 1;
	state.streak += 1;
	state.bestStreak = Math.max(state.bestStreak, state.streak);
	const difficultyBonus = { common: 0, rare: 4, exclusive: 8, legendary: 12 }[
		getWordClass(state.word)
	];
	const points = Math.max(
		5,
		10 +
			Math.ceil(state.time / 3) +
			difficultyBonus +
			(state.streak >= 3 ? 5 : 0),
	);
	state.score += points;
	state.bestScore = Math.max(state.bestScore, state.score);
	state.focus = Math.min(100, state.focus + 12);
	elements.input.classList.add("correct");
	elements.input.disabled = true;
	elements.submitButton.disabled = true;
	elements.skipButton.disabled = true;
	elements.hintButton.disabled = true;
	elements.scoreChange.textContent = `+${points} points · ${state.streak} streak`;
	setMessage(`${state.word.word.toUpperCase()} solved. Nice work.`);
	saveProgress();
	updateStats();
	scheduleNewRound(1100);
};
elements.form.addEventListener("submit", (event) => {
	event.preventDefault();
	checkAnswer();
});
document.getElementById("skipButton").addEventListener("click", () => {
	if (state.roundResolved) return;
	state.roundResolved = true;
	state.attempts += 1;
	state.streak = 0;
	setMessage(`Skipped. The word was ${state.word.word.toUpperCase()}.`, true);
	elements.input.disabled = true;
	elements.submitButton.disabled = true;
	elements.skipButton.disabled = true;
	elements.hintButton.disabled = true;
	stopTimer();
	updateStats();
	scheduleNewRound(700);
});
elements.hintButton.addEventListener("click", () => {
	if (state.hintUsed || state.roundResolved) return;
	state.hintUsed = true;
	state.score = Math.max(0, state.score - 3);
	elements.hint.textContent = state.word.hint;
	elements.hintButton.disabled = true;
	elements.hintCost.textContent = "used";
	updateStats();
});
document.querySelectorAll(".mode-button").forEach((button) =>
	button.addEventListener("click", () => {
		document
			.querySelectorAll(".mode-button")
			.forEach((item) => item.classList.remove("active"));
		button.classList.add("active");
		state.mode = button.dataset.mode;
		newRound();
	}),
);
document
	.getElementById("themeToggle")
	.addEventListener("click", () => document.body.classList.toggle("warm-mode"));
document.getElementById("soundToggle").addEventListener("click", (event) => {
	state.sound = !state.sound;
	event.currentTarget.textContent = state.sound ? "♫" : "⌁";
});
updateStats();
newRound();
