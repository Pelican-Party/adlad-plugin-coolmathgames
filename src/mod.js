export function coolmathGamesPlugin() {
	let initializeCalled = false;
	let lastCallDidShowFullScreenAd = false;

	/** @type {Set<() => void>} */
	const onAdBreakCompleteCbs = new Set();

	/** @type {undefined | string} */
	let currentLevel = undefined;
	let currentLevelIsReplay = false;

	const plugin = /** @type {const} @satisfies {import("$adlad").AdLadPlugin} */ ({
		name: "coolmathgames",
		async initialize(ctx) {
			if (initializeCalled) {
				throw new Error("CoolmathGames plugin is being initialized more than once");
			}
			initializeCalled = true;

			document.addEventListener("adBreakStart", () => {
				ctx.setNeedsPause(true);
				ctx.setNeedsMute(true);
				lastCallDidShowFullScreenAd = true;
			});
			document.addEventListener("adBreakComplete", () => {
				ctx.setNeedsPause(false);
				ctx.setNeedsMute(false);
				onAdBreakCompleteCbs.forEach((cb) => cb());
				onAdBreakCompleteCbs.clear();
			});

			/**
			 * @param {string} src
			 */
			function createScript(src) {
				const script = document.createElement("script");
				script.src = src;
				document.body.appendChild(script);
				/** @type {Promise<void>} */
				const promise = new Promise((resolve, reject) => {
					script.addEventListener("load", () => {
						resolve();
					});
					script.addEventListener("error", (e) => {
						reject(e.error);
					});
				});
				return promise;
			}
			await createScript("https://ajax.googleapis.com/ajax/libs/jquery/3.6.3/jquery.min.js");
			await createScript("https://www.coolmathgames.com/sites/default/files/cmg-ads.js");
		},
		manualNeedsPause: true,
		manualNeedsMute: true,
		async gameplayStart() {
			updateCurrentLevel();
		},
		async showFullScreenAd() {
			lastCallDidShowFullScreenAd = false;

			/** @type {Promise<void>} */
			const promise = new Promise((resolve) => {
				onAdBreakCompleteCbs.add(resolve);
			});

			// @ts-ignore External call
			cmgAdBreak();

			await promise;

			if (lastCallDidShowFullScreenAd) {
				return {
					didShowAd: true,
					errorReason: null,
				};
			} else {
				return {
					didShowAd: false,
					errorReason: /** @type {const} */ ("time-constraint"),
				};
			}
		},
		customRequests: {
			/**
			 * @param {string} level
			 * @param {boolean} isReplay
			 */
			setCurrentLevel(level, isReplay) {
				currentLevel = level;
				currentLevelIsReplay = isReplay;
				updateCurrentLevel();
			},
		},
	});

	function updateCurrentLevel() {
		if (currentLevelIsReplay) {
			// @ts-ignore External call
			parent.cmgGameEvent("replay", currentLevel);
		} else {
			// @ts-ignore External call
			parent.cmgGameEvent("start", currentLevel);
		}
	}

	return plugin;
}
