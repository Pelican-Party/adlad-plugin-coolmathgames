/**
 * @param {Object} [options]
 * @param {string} [options.splashScreenImageUrl] Url from which the splash screen image will be fetched.
 * When omitted, no splash screen is shown.
 */
export function coolmathGamesPlugin({
	splashScreenImageUrl = "",
} = {}) {
	let initializeCalled = false;
	let lastCallDidShowFullScreenAd = false;

	/** @type {Set<() => void>} */
	const onAdBreakCompleteCbs = new Set();

	/** @type {undefined | string} */
	let currentLevel = undefined;
	let currentLevelIsReplay = false;

	/**
	 * @param {number} ms
	 */
	function wait(ms) {
		/** @type {Promise<void>} */
		const promise = new Promise(resolve => {
			setTimeout(resolve, ms);
		})
		return promise;
	}

	async function showSplashScreen() {
		if (!splashScreenImageUrl) return;

		const splashElement = document.createElement("a");
		splashElement.href = "https://www.coolmathgames.com/";
		splashElement.target = "_blank";
		splashElement.style.cssText = `
			inset: 0;
			position: fixed;
			background: #242424;
			z-index: 100000;
			padding: 20px;
			display: flex;
			justify-content: center;
			align-items: center;
			transition: opacity 0.5s;
		`;
		const imageElement = document.createElement("img");
		splashElement.appendChild(imageElement);
		imageElement.src = splashScreenImageUrl;
		imageElement.style.cssText = `
			width: 100%;
			height: 100%;
			object-fit: contain;
			max-width: 500px;
			max-height: 300px;
		`;

		document.body.appendChild(splashElement);

		/** @type {Promise<void>} */
		const imageLoadPromise = new Promise(resolve => {
			imageElement.addEventListener("load", () => {
				resolve();
			})
		})
		await imageLoadPromise;

		await wait(1500);

		// We stop awaiting this function and instead remove the element asynchronously to allow
		// the initialize function to resolve right as the splash screen starts disappearing.
		// When games wait for adlad.init() to resolve, or when they query data using the adlad storage
		// api,
		(async () => {
			splashElement.style.opacity = "0";

			await wait(500);
			splashElement.remove();
		})();
	}

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

			const splashScreenPromise = showSplashScreen();

			await ctx.loadScriptTag("https://ajax.googleapis.com/ajax/libs/jquery/3.6.3/jquery.min.js");
			await ctx.loadScriptTag("https://www.coolmathgames.com/sites/default/files/cmg-ads.js");
			await splashScreenPromise;
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

			const adsPopupEl = document.querySelector(".ads-popup");
			if (adsPopupEl instanceof HTMLElement) {
				adsPopupEl.style.overflow = "hidden";
			}

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

export default coolmathGamesPlugin;
