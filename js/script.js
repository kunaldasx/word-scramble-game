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
	combo: document.getElementById("comboValue"),
	solved: document.getElementById("solvedValue"),
	accuracy: document.getElementById("accuracyValue"),
	bestStreak: document.getElementById("bestStreakValue"),
	focus: document.getElementById("focusValue"),
	focusBar: document.getElementById("focusBar"),
	bestScore: document.getElementById("bestScoreLabel"),
	hintButton: document.getElementById("hintButton"),
	hintCost: document.getElementById("hintCost"),
	leaderboardList: document.getElementById("leaderboardList"),
};
const saved = JSON.parse(localStorage.getItem("lexisprint-progress") || "null");
const leaderboard = JSON.parse(
	localStorage.getItem("lexisprint-leaderboard") || "[]",
);
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
	bestCombo: saved?.bestCombo || 1,
	comboMilestone2: false,
	comboMilestone3: false,
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
const formatMultiplier = (multiplier) =>
	multiplier
		.toFixed(2)
		.replace(/\.0+$/, "")
		.replace(/(\.\d)0$/, "$1");
const getComboMultiplier = (streak) => {
	if (streak <= 1) return 1;
	return Number(Math.min(3, 1 + (streak - 1) * 0.25).toFixed(2));
};
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
const saveProgress = () => {
	localStorage.setItem(
		"lexisprint-progress",
		JSON.stringify({
			bestScore: state.bestScore,
			bestStreak: state.bestStreak,
			bestCombo: state.bestCombo,
		}),
	);
};
const renderLeaderboard = () => {
	const entries = JSON.parse(
		localStorage.getItem("lexisprint-leaderboard") || "[]",
	);
	if (!entries.length) {
		elements.leaderboardList.innerHTML =
			"<li><span>None yet</span><strong>0</strong></li>";
		return;
	}
	elements.leaderboardList.innerHTML = entries
		.slice(0, 5)
		.map(
			(entry, index) => `
				<li>
					<span>#${index + 1}</span>
					<strong>${entry.score}</strong>
					<small>x${entry.bestCombo}</small>
				</li>
			`,
		)
		.join("");
};
const saveLeaderboardEntry = () => {
	const entries = JSON.parse(
		localStorage.getItem("lexisprint-leaderboard") || "[]",
	);
	entries.push({
		score: state.score,
		bestStreak: state.bestStreak,
		bestCombo: state.bestCombo,
		label: new Date().toLocaleDateString(),
	});
	entries.sort((a, b) => b.score - a.score || b.bestCombo - a.bestCombo);
	localStorage.setItem(
		"lexisprint-leaderboard",
		JSON.stringify(entries.slice(0, 5)),
	);
	renderLeaderboard();
};
const pulseCombo = () => {
	elements.combo.classList.remove("combo-pop");
	void elements.combo.offsetWidth;
	elements.combo.classList.add("combo-pop");
};
const updateStats = () => {
	elements.score.textContent = state.score;
	elements.solved.textContent = state.solved;
	elements.accuracy.textContent = `${state.attempts ? Math.round((state.solved / state.attempts) * 100) : 0}%`;
	elements.bestStreak.textContent = state.bestStreak;
	elements.focus.textContent = `${state.focus}%`;
	elements.focusBar.style.width = `${state.focus}%`;
	elements.bestScore.textContent = `BEST SCORE ${state.bestScore}`;
	const currentCombo = getComboMultiplier(state.streak);
	elements.combo.textContent = `x${formatMultiplier(currentCombo)}`;
	if (state.streak >= 2) pulseCombo();
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
const getModeSettings = (mode) => {
	if (mode === "blitz") return { timer: 15, bonus: 1.15 };
	if (mode === "hard") return { timer: 18, bonus: 1.35 };
	return { timer: 30, bonus: 1 };
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
	const modeSettings = getModeSettings(state.mode);
	state.maxTime =
		state.mode === "blitz"
			? 15
			: state.mode === "hard"
				? { common: 18, rare: 16, exclusive: 14, legendary: 12 }[wordClass] ||
					18
				: { common: 30, rare: 28, exclusive: 25, legendary: 22 }[wordClass] ||
					30;
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
	elements.combo.textContent = `x${formatMultiplier(getComboMultiplier(state.streak))}`;
	elements.combo.classList.remove("combo-pop");
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
		state.comboMilestone2 = false;
		state.comboMilestone3 = false;
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
	state.bestCombo = Math.max(state.bestCombo, getComboMultiplier(state.streak));
	if (state.streak >= 2 && !state.comboMilestone2) {
		state.comboMilestone2 = true;
		setMessage("Combo x2 unlocked! Keep the chain alive.", false);
	}
	if (state.streak >= 3 && !state.comboMilestone3) {
		state.comboMilestone3 = true;
		setMessage("Combo x3 unlocked! You are on fire.", false);
	}
	const difficultyBonus = { common: 0, rare: 4, exclusive: 8, legendary: 12 }[
		getWordClass(state.word)
	];
	const basePoints = Math.max(
		5,
		10 +
			Math.ceil(state.time / 3) +
			difficultyBonus +
			(state.streak >= 3 ? 5 : 0),
	);
	const perfectBonus =
		!state.hintUsed && state.time >= Math.ceil(state.maxTime * 0.6) ? 8 : 0;
	const modeBonus = getModeSettings(state.mode).bonus;
	const multiplier = getComboMultiplier(state.streak);
	const points = Math.round(
		(basePoints + perfectBonus) * multiplier * modeBonus,
	);
	state.score += points;
	state.bestScore = Math.max(state.bestScore, state.score);
	state.focus = Math.min(100, state.focus + 12);
	elements.input.classList.add("correct");
	elements.input.disabled = true;
	elements.submitButton.disabled = true;
	elements.skipButton.disabled = true;
	elements.hintButton.disabled = true;
	elements.scoreChange.textContent = `${perfectBonus ? `Perfect! ` : ""}+${points} points · ${state.streak} streak · x${formatMultiplier(multiplier)} combo`;
	pulseCombo();
	setMessage(`${state.word.word.toUpperCase()} solved. Nice work.`);
	saveProgress();
	saveLeaderboardEntry();
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
	state.comboMilestone2 = false;
	state.comboMilestone3 = false;
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
renderLeaderboard();
updateStats();
newRound();
