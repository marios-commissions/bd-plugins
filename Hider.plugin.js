/**
 * @name Hider
 * @description Adds icons to the titlebar to hide the server & channel sidebar
 * @version 1.0.0
 * @author eternal
 * @authorId 263689920210534400
 */
const { Webpack, React, DOM, Patcher, Utils, alert } = BdApi;

const Classes = Webpack.getModule(m => m.sidebar && m.activityPanel && m.container);
const Guilds = Webpack.getModule(m => (m = m.type?.toString?.()) && ~m.indexOf('guildsnav'));
const _React = Webpack.getModule(m => m.Fragment && Object.keys(m).length === 3);
const Dispatcher = Webpack.getModule(m => m._dispatch);

class Plugin {
	state = {
		guilds: false,
		channels: false
	};

	start() {
		DOM.addStyle('hider', `
       .hider-button-wrapper {
          display: flex;
          justify-content: center;
					align-items: center;
          gap: .5rem;
          margin-right: 5px;
       }

       .hider-hide-servers {
          position: relative;
          top: -1px;
          cursor: pointer;
          width: 14px;
          height: 14px;
          pointer-events: auto;
          -webkit-app-region: no-drag;
          background-image: url("data:image/svg+xml,%3Csvg fill='%23a3a6aa' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3C!--! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --%3E%3Cpath d='M306.7 325.1L162.4 380.6C142.1 388.1 123.9 369 131.4 349.6L186.9 205.3C190.1 196.8 196.8 190.1 205.3 186.9L349.6 131.4C369 123.9 388.1 142.1 380.6 162.4L325.1 306.7C321.9 315.2 315.2 321.9 306.7 325.1V325.1zM255.1 224C238.3 224 223.1 238.3 223.1 256C223.1 273.7 238.3 288 255.1 288C273.7 288 288 273.7 288 256C288 238.3 273.7 224 255.1 224V224zM512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256zM256 48C141.1 48 48 141.1 48 256C48 370.9 141.1 464 256 464C370.9 464 464 370.9 464 256C464 141.1 370.9 48 256 48z'/%3E%3C/svg%3E");
          transition: background-color .1s;
       }

       .hider-hide-channels {
          position: relative;
          top: -1px;
          cursor: pointer;
          width: 14px;
          height: 14px;
          pointer-events: auto;
          -webkit-app-region: no-drag;
          background-image: url("data:image/svg+xml,%3Csvg fill='%23a3a6aa' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3C!--! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --%3E%3Cpath d='M256 32C114.6 32 .0272 125.1 .0272 240c0 47.63 19.91 91.25 52.91 126.2c-14.88 39.5-45.87 72.88-46.37 73.25c-6.625 7-8.375 17.25-4.625 26C5.818 474.2 14.38 480 24 480c61.5 0 109.1-25.75 139.1-46.25C191.1 442.8 223.3 448 256 448c141.4 0 255.1-93.13 255.1-208S397.4 32 256 32zM256.1 400c-26.75 0-53.12-4.125-78.38-12.12l-22.75-7.125l-19.5 13.75c-14.25 10.12-33.88 21.38-57.5 29c7.375-12.12 14.37-25.75 19.88-40.25l10.62-28l-20.62-21.87C69.82 314.1 48.07 282.2 48.07 240c0-88.25 93.25-160 208-160s208 71.75 208 160S370.8 400 256.1 400z'/%3E%3C/svg%3E");
          transition: background-color .1s;
       }
    `);

		// Get window titlebar
		const titlebar = document.querySelector('div[class*="titleBar"]');
		if (!titlebar) return alert('Hider couldn\'t start, couldn\'nt find titlebar.');

		// Create wrapper button
		const wrapper = DOM.parseHTML('<div class="hider-button-wrapper" />');

		// Create buttons
		const servers = DOM.parseHTML('<div class="hider-hide-servers" />');
		const channels = DOM.parseHTML('<div class="hider-hide-channels" />');

		// Add click listeners
		servers.addEventListener('click', () => Dispatcher.dispatch({ type: 'HIDER_TOGGLE_SERVERS' }));
		channels.addEventListener('click', () => Dispatcher.dispatch({ type: 'HIDER_TOGGLE_CHANNELS' }));

		// Append payload
		wrapper.append(servers);
		wrapper.append(channels);
		titlebar.append(wrapper);

		const _this = this;
		Patcher.after('hider', Guilds, 'type', (_, args, res) => {
			const [, forceUpdate] = React.useState({});

			Patcher.after('hider', res.props.children, 'type', (_, args, res) => {
				React.useEffect(() => {
					function listener() {
						_this.state.guilds = !_this.state.guilds;
						forceUpdate({});
					}

					Dispatcher.subscribe('HIDER_TOGGLE_SERVERS', listener);

					return () => Dispatcher.unsubscribe('HIDER_TOGGLE_SERVERS', listener);
				}, []);

				const wrapped = Utils.findInTree(res, r => r?.hasOwnProperty('theme') && r.children !== void 0);
				if (!wrapped) return res;

				wrapped.children = (orig => function (...args) {
					const res = orig.apply(this, args);

					delete res.props.style;
					res.props.style = {};

					if (_this.state.guilds) {
						res.props.style.display = 'none';
					} else {
						res.props.style.display = 'block';
					}

					return res;
				})(wrapped.children);

				return res;
			});

			return res;
		});

		for (const key in _React) {
			if (key === 'Fragment') continue;

			Patcher.after('hider', _React, key, (_, [, props], _res) => {
				if (props.hasNotice !== void 0) {
					console.log(_res);
					Patcher.after('hider', _res, 'type', (_, args, res) => {
						const [, forceUpdate] = React.useState({});

						React.useEffect(() => {
							function listener() {
								_this.state.channels = !_this.state.channels;
								forceUpdate({});
							}

							Dispatcher.subscribe('HIDER_TOGGLE_CHANNELS', listener);

							return () => Dispatcher.unsubscribe('HIDER_TOGGLE_CHANNELS', listener);
						}, []);

						const wrapped = Utils.findInTree(res, r => r?.hasOwnProperty('theme') && r.children !== void 0);
						if (!wrapped) return res;

						wrapped.children = (orig => function (...args) {
							const res = orig.apply(this, args);

							delete res.props.style;
							res.props.style = {};

							if (_this.state.channels) {
								res.props.style.display = 'none';
							} else {
								res.props.style.display = 'flex';
							}

							return res;
						})(wrapped.children);

						return res;
					});
				}
			});
		}

		this.forceUpdateAll();
	}

	stop() {
		Patcher.unpatchAll('hider');
		this.forceUpdateAll();

		const container = document.querySelector('.hider-button-wrapper');
		container?.remove();
	}

	forceUpdateAll() {
		const node = document.querySelector(`.${Classes.container}`);
		if (!node) return BdApi.alert('No node found.');

		const instance = ZLibrary.ReactTools.getOwnerInstance(node);
		if (!instance) return BdApi.alert('No owner instance found.');

		const app = ZLibrary.Utilities.findInTree(instance, e => (e = e?.stateNode?.props?.className) && ~e.indexOf('app'), { walkable: ['return', '_reactInternals'] });
		if (!app) return;


		const Shakeable = app.stateNode;
		if (!Shakeable) return BdApi.alert('No shakeable found');

		const ShakeablePrototype = Shakeable?._reactInternals?.type?.prototype;
		if (!ShakeablePrototype) return BdApi.alert('No shakeable prototype found.');

		const unpatch = Patcher.after('read-all', ShakeablePrototype, 'render', (_, args, res) => {
			res.key = Math.random();
			unpatch();
		});

		Shakeable.forceUpdate();
	}
}

module.exports = Plugin;
