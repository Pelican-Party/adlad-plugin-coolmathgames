export function coolmathGamesPlugin() {
	let initializeCalled = false;
	let lastCallDidShowFullScreenAd = false;

	/** @type {Set<() => void>} */
	const onAdBreakCompleteCbs = new Set();

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
				onAdBreakCompleteCbs.forEach(cb => cb());
				onAdBreakCompleteCbs.clear();
			})

			const jqueryUrl = "https://ajax.googleapis.com/ajax/libs/jquery/3.6.3/jquery.min.js";
			await import(jqueryUrl);
			const sdkUrl = "https://www.coolmathgames.com/sites/default/files/cmg-ads.js"
			await import(sdkUrl);
		},
		manualNeedsPause: true,
		manualNeedsMute: true,
		async gameplayStart() {
			// @ts-ignore
			parent.cmgGameEvent("start");
		},
		async showFullScreenAd() {
			lastCallDidShowFullScreenAd = false;
			// @ts-ignore
			cmgAdBreak();

			/** @type {Promise<void>} */
			const promise = new Promise(resolve => {
				onAdBreakCompleteCbs.add(resolve);
			});
			await promise;

			if (lastCallDidShowFullScreenAd) {
				return {
					didShowAd: true,
					errorReason: null,
				}
			} else {
				return {
					didShowAd: false,
					errorReason: "time-constraint"
				}
			}
		},
	});

	return plugin;
}
