/**
 * @name UserHider
 * @description Adds icons to the titlebar to hide the server & channel sidebar
 * @version 1.0.0
 * @author eternal
 * @authorId 263689920210534400
 */

const { Webpack, React, Data, DOM, Patcher } = BdApi;

const Message = Webpack.getModule((m) => typeof m === 'object' && !Array.isArray(m) && Object.keys(m).find((k) => m[k] && m !== window && m.toString && (m[k]?.toString === Function.prototype.toString || m[k]?.toString?.toString().includes('originalFunction')) && m[k]?.toString().includes('Message must not be a thread')));
const Accessories = Webpack.getByStrings('renderSuppressEmbeds', 'isMessageSnapshot', 'useSetting', { defaultExport: false });
const Reactions = Webpack.getByStrings('combinedReactions', 'remainingReactions', { defaultExport: false });
const Classes = Webpack.getByKeys('sidebar', 'activityPanel', 'container');
const MessageReferenceStore = Webpack.getByKeys('getMessageByReference');
const UserStore = Webpack.getByKeys('getCurrentUser', 'getUser');
const MessagesClass = Webpack.getByKeys('_channelMessages');
const ReactionStore = Webpack.getByKeys('getReactions');
const Dispatcher = Webpack.getByKeys('_dispatch');

let isInSettings = false;
let isHidingReactions = [];

const FORCE_RENDER_OVERRIDES = {
	useMemo: factory => factory(),
	useState: s => [typeof s === 'function' ? s() : s, () => void 0],
	useReducer: v => [v, () => void 0],
	useEffect: () => { },
	useLayoutEffect: () => { },
	useRef: (initialValue) => ({ current: initialValue }),
	useCallback: cb => cb,
	useImperativeHandle: () => { },
	useContext: (ctx) => ctx._currentValue
};

const FORCE_RENDER_KEYS = Object.keys(FORCE_RENDER_OVERRIDES);

const _settings = Data.load('user-hider', 'settings') ?? {};
const settings = new Proxy(_settings, {
	get(target, prop) {
		return target[prop];
	},

	set(target, prop, value) {
		try {
			target[prop] = value;

			Data.save('user-hider', 'settings', target);
			if (!isInSettings) Plugin.forceUpdateAll();

			return true;
		} catch (error) {
			return false;
		}
	}
});

class Plugin {
	state = {
		guilds: false,
		channels: false
	};

	start() {
		DOM.addStyle('user-hider', `
			.uh-settings-wrapper {

			}

			.uh-add-input {
			  width: 100%;
				background: var(--input-background);
				appearance: none;
				padding: 10px;
				border-radius: 5px;
				border: none;
				outline: none;
				color: var(--text-normal);
			}

			.uh-add-input::placeholder {
				color: var(--input-placeholder-text);
			}

			.uh-add-wrapper {
				display: flex;
				width: 100%;
				align-items: center;
				gap: 1rem;
			}

			.uh-add-button {
				margin-top: 10px;
				width: 100%;
				appearance: none;
				background: var(--button-positive-background);
				border-radius: 5px;
				color: var(--text-normal);
				padding: 10px;
				transition: background 0.2s;
			}

			.uh-add-button:hover {
				background: var(--button-positive-background-hover);
			}

			.uh-add-button:active {
				background: var(--button-positive-background-active);
			}

			.uh-add-button:disabled {
				background: var(--button-positive-background-disabled);
				opacity: 0.75;
			}

			.uh-remove-button {
				appearance: none;
				background: var(--button-danger-background);
				border-radius: 5px;
				color: var(--text-normal);
				padding: 10px;
				transition: background 0.2s;
			}

			.uh-remove-button:hover {
				background: var(--button-danger-background-hover);
			}

			.uh-remove-button:active {
				background: var(--button-danger-background-active);
			}

			.uh-remove-button:disabled {
				background: var(--button-danger-background-disabled);
				opacity: 0.75;
			}

			.uh-replies-label {
				color: var(--text-normal);
				white-space: nowrap;
			}

			.uh-divider {
				height: 1px;
				width: 100%;
				background: var(--background-modifier-active);
				margin: 15px 0;
			}

			.uh-users {
				display:flex;
				justify-content: center;
				flex-direction: column;
				gap: 1rem;
				overflow: hidden;
			}

			.uh-user-wrapper {
				display: flex;
				gap: 1rem;
				align-items: center;
				padding: 10px;
				background: var(--background-secondary);
				border-radius: 10px;
			}

			.uh-user-id {
				color: var(--text-normal);
			}

			.uh-user-replies {
				margin-left: auto;
			}

			.uh-user-replies-label {
				color: var(--text-normal);
				white-space: nowrap;
			}
		`);

		Patcher.instead('user-hider', Dispatcher, '_dispatch', (self, args, original) => {
			const [payload] = args;

			if (payload.type === 'TYPING_START') {
				const users = settings.users ?? [];

				if (users.includes(payload.userId)) {
					console.log(`[User Hider] Blocked ${payload.userId} from typing.`);
					return;
				}
			}

			return original.apply(self, args);
		});

		if (MessagesClass) {
			// console.log(MessagesClass._channelMessages);
			MessagesClass.__channelMessages = MessagesClass._channelMessages;

			MessagesClass._channelMessages = new Proxy(MessagesClass.__channelMessages, {
				get(target, prop) {
					const value = target[prop];

					if (value && value._array && value._map) {
						const users = settings.users ?? [];
						const showReplies = settings.showReplies ?? [];

						value._array = value._array.filter(message => {
							if (users.includes(message.author.id) && showReplies.includes(message.author.id) && message.messageReference) {
								const reference = MessageReferenceStore.getMessageByReference(message.messageReference);
								if (!reference?.message) return users.includes(message.author.id);

								const currentUser = UserStore.getCurrentUser();
								if (!currentUser) return true;

								if (reference.message.author.id === currentUser.id) {
									return true;
								}

								return false;
							}

							return !users.includes(message.author.id);
						});
					}

					return value;
				},

				set(target, prop, value) {
					return target[prop] = value;
				}
			});
		} else {
			BdApi.alert('[User Hider] Failed to find Messages class!');
		}

		const AccessoriesKey = Object.keys(Accessories).find(p => ['renderSuppressEmbeds', 'isMessageSnapshot', 'useSetting'].every(c => Accessories[p].toString().includes(c)));
		if (AccessoriesKey) {
			Patcher.before('user-hider', Accessories, AccessoriesKey, (_, args, res) => {
				const [{ message }] = args;
				const [, forceUpdate] = React.useState({});

				React.useEffect(() => {
					function callback() {
						forceUpdate({});
					}

					Dispatcher.subscribe('MESSAGE_REACTION_ADD', callback);
					Dispatcher.subscribe('MESSAGE_REACTION_REMOVE', callback);
					Dispatcher.subscribe('MESSAGE_REACTION_ADD_USERS', callback);
					Dispatcher.subscribe('UH_CHANGE_HIDING', callback);

					return () => {
						Dispatcher.unsubscribe('MESSAGE_REACTION_ADD', callback);
						Dispatcher.unsubscribe('MESSAGE_REACTION_REMOVE', callback);
						Dispatcher.unsubscribe('MESSAGE_REACTION_ADD_USERS', callback);
						Dispatcher.unsubscribe('UH_CHANGE_HIDING', callback);
					};
				}, []);

				if (message && isHidingReactions.includes(message.id)) {
					args[0].disableReactionReads = true;
				} else {
					args[0].disableReactionReads = false;
				}
			});
		}


		Patcher.after('user-hider', Reactions, 'Z', (_, args, res) => {
			const [{ message }] = args;

			const [, forceUpdate] = React.useState({});

			React.useEffect(() => {
				function callback() {
					forceUpdate({});
				}

				Dispatcher.subscribe('MESSAGE_REACTION_ADD', callback);
				Dispatcher.subscribe('MESSAGE_REACTION_REMOVE', callback);
				Dispatcher.subscribe('MESSAGE_REACTION_ADD_USERS', callback);

				return () => {
					Dispatcher.unsubscribe('MESSAGE_REACTION_ADD', callback);
					Dispatcher.unsubscribe('MESSAGE_REACTION_REMOVE', callback);
					Dispatcher.unsubscribe('MESSAGE_REACTION_ADD_USERS', callback);
				};
			}, []);


			const origSize = res?.props?.combinedReactions?.length ?? 0;
			const newCombined = [];

			for (const reaction of (res?.props?.combinedReactions ?? [])) {
				if (!reaction?.emoji) continue;
				const users = ReactionStore.getReactions(message.channel_id, message.id, reaction.emoji, 100, 0);

				const filtered = Object.keys(users ?? {}).filter(r => (settings.users ?? []).includes(r));
				const newCount = reaction.count - filtered.length;

				if (newCount) {
					newCombined.push({ ...reaction, count: newCount });
				};
			}

			res.props.combinedReactions = newCombined;

			if (res?.props?.combinedReactions) {
				if (res.props.combinedReactions.length !== origSize && res.props.combinedReactions.length === 0) {
					if (!isHidingReactions.includes(message.id)) {
						isHidingReactions.push(message.id);
						Dispatcher.dispatch({ type: 'UH_CHANGE_HIDING' });
					}

					return null;
				}

				if (res.props.combinedReactions.length === origSize && res.props.combinedReactions.length !== 0) {
					if (isHidingReactions.includes(message.id)) {
						const idx = isHidingReactions.indexOf(message.id);
						if (idx > -1) isHidingReactions.splice(idx, 1);

						Dispatcher.dispatch({ type: 'UH_CHANGE_HIDING' });
					}
				}
			}
		});

		Patcher.before('user-hider', Message, 'type', (_, args) => {
			try {
				if (!args || !args.length) return;

				const [{ message }] = args;

				const reference = React.useMemo(() => message.messageReference && MessageReferenceStore.getMessageByReference(message.messageReference), [message]);
				if (!reference?.message) return;

				if ((settings.users ?? []).includes(reference.message.author.id)) {
					console.log(`[User Hider] Blocked message reply from showing on message ${message.id} in channel ${message.channel_id}`);

					const newMessage = new Proxy(message, {
						get(target, prop) {
							if (prop === 'messageReference') {
								return null;
							}

							return target[prop];
						},

						set(target, prop, value) {
							return target[prop] = value;
						}
					});

					args[0].message = newMessage;
				}
			} catch (error) {
				console.error('[User Hider] Failed to modify reply message reference:', error);
			}
		});

		setTimeout(() => Plugin.forceUpdateAll(), 0);
	}

	stop() {
		Patcher.unpatchAll('user-hider');
		// DOM.removeStyle('user-hider');
		MessagesClass._channelMessages = MessagesClass.__channelMessages;
		Plugin.forceUpdateAll();
	}

	getSettingsPanel() {
		return () => {
			const [id, setId] = React.useState('');
			const [showReplies, setShowReplies] = React.useState(false);
			const [, forceUpdate] = React.useState({});

			React.useEffect(() => {
				isInSettings = true;

				return () => {
					isInSettings = false;
					Plugin.forceUpdateAll();
				};
			}, []);

			const users = settings.users ?? [];
			const replies = settings.showReplies ?? [];

			return <div className='uh-settings-wrapper'>
				<div className='uh-users'>
					{users.map(user => <div className='uh-user-wrapper'>
						<button
							className='uh-remove-button'
							onClick={() => {
								const idx = users.indexOf(user);
								if (idx > -1) {
									users.splice(idx, 1);
									settings.users = users;
								}

								const idxReplies = replies.indexOf(user);
								if (idxReplies > -1) {
									replies.splice(idxReplies, 1);
									settings.showReplies = replies;
								}

								forceUpdate({});
							}}
						>
							Remove
						</button>
						<p className='uh-user-id'>
							{user}
						</p>
						<input
							className='uh-user-replies'
							id='uh-user-replies'
							type='checkbox'
							checked={replies.includes(user)}
							onChange={(event) => {
								if (!replies.includes(user)) {
									replies.push(user);
									settings.showReplies = replies;
								} else {
									const idx = replies.indexOf(user);
									if (idx > -1) {
										replies.splice(idx, 1);
										settings.showReplies = replies;
									}
								}

								forceUpdate();
								setShowReplies(event.target.value);
							}}
						/>
						<label className='uh-user-replies-label' htmlFor='uh-user-replies'>
							Show Replies?
						</label>
					</div>)}
				</div>
				<div className='uh-divider' />
				<div className='uh-add-wrapper'>
					<input
						className='uh-add-input'
						placeholder='User ID'
						type='text'
						value={id}
						onChange={(event) => setId(event.target.value)}
					/>
					<input
						className='uh-replies'
						id='uh-replies'
						type='checkbox'
						value={showReplies}
						onChange={(event) => setShowReplies(event.target.value)}
					/>
					<label className='uh-replies-label' htmlFor='uh-replies'>
						Show Replies?
					</label>
				</div>
				<button
					className='uh-add-button'
					disabled={!id.length}
					onClick={() => {
						if (!users.includes(id)) {
							users.push(id);
							settings.users = users;
						}

						if (showReplies && !replies.includes(id)) {
							replies.push(id);
							settings.showReplies = replies;
						}

						setId('');
						setShowReplies(false);
					}}
				>
					Add
				</button>
			</div>;
		};
	}

	forceRender(component) {
		return (...args) => {
			const ReactDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
			const originals = FORCE_RENDER_KEYS.map(e => [e, ReactDispatcher[e]]);

			Object.assign(ReactDispatcher, FORCE_RENDER_OVERRIDES);

			const res = {
				rendered: null,
				error: null
			};

			try {
				res.rendered = component(...args);
			} catch (error) {
				res.error = error;
			}

			Object.assign(ReactDispatcher, Object.fromEntries(originals));

			if (res.error) {
				throw res.error;
			}

			return res.rendered;
		};
	};

	static forceUpdateAll() {
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

		const unpatch = Patcher.after('user-hider', ShakeablePrototype, 'render', (_, args, res) => {
			res.key = Math.random();
			unpatch();
		});

		Shakeable.forceUpdate();
	}
};

module.exports = Plugin;