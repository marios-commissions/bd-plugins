/**
 * @name EmojiReact
 * @authorId 282595588950982656
 * @invite HQ5N7Rcajc
 * @donate https://paypal.me/eternal404
 */ /*@cc_on
@if (@_jscript)

    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/ module.exports = (()=>{
    const config = {
        info: {
            name: 'EmojiReact',
            authors: [
                {
                    name: 'eternal',
                    discord_id: '282595588950982656',
                    github_username: 'eternal404'
                }
            ],
            version: '1.0.0',
            description: 'Description here.',
            github: 'https://github.com/eternal404',
            github_raw: 'https://raw.githubusercontent.com/discord-modifications/better-discord-plugins/master/EmojiReact/EmojiReact.plugin.js'
        }
    };
    return !global.ZeresPluginLibrary ? class {
        constructor(){
            this.start = this.load = this.handleMissingLib;
        }
        getName() {
            return config.info.name.replace(/\s+/g, '');
        }
        getAuthor() {
            return config.info.authors.map((a)=>a.name).join(', ');
        }
        getVersion() {
            return config.info.version;
        }
        getDescription() {
            return config.info.description + ' You are missing libraries for this plugin, please enable the plugin and click Download Now.';
        }
        start() {}
        stop() {}
        async handleMissingLib() {
            const request = require('request');
            const path = require('path');
            const fs = require('fs');
            const dependencies = [
                {
                    global: 'ZeresPluginLibrary',
                    filename: '0PluginLibrary.plugin.js',
                    external: 'https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js',
                    url: 'https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js'
                }
            ];
            if (!dependencies.map((d)=>window.hasOwnProperty(d.global)).includes(false)) return;
            if (global.eternalModal) {
                while(global.eternalModal && dependencies.map((d)=>window.hasOwnProperty(d.global)).includes(false))await new Promise((f)=>setTimeout(f, 1000));
                if (!dependencies.map((d)=>window.hasOwnProperty(d.global)).includes(false)) return BdApi.Plugins.reload(this.getName());
            }
            ;
            global.eternalModal = true;
            BdApi.showConfirmationModal('Dependencies needed', `Dependencies needed for ${this.getName()} are missing. Please click download to install the dependecies.`, {
                confirmText: 'Download',
                cancelText: 'Cancel',
                onCancel: ()=>delete global.eternalModal,
                onConfirm: async ()=>{
                    for (const dependency of dependencies){
                        if (!window.hasOwnProperty(dependency.global)) {
                            await new Promise((resolve)=>{
                                request.get(dependency.url, (error, res, body)=>{
                                    if (error) return electron.shell.openExternal(dependency.external);
                                    fs.writeFile(path.join(BdApi.Plugins.folder, dependency.filename), body, resolve);
                                });
                            });
                        }
                    }
                    delete global.eternalModal;
                }
            });
        }
    } : (([Plugin, API])=>{
        const { WebpackModules , DiscordModules , PluginUtilities , DOMTools , Patcher , Utilities  } = API;
        const React = DiscordModules.React;
        const Lodash = window._;
        const MiniPopover = WebpackModules.find((m)=>m.default?.displayName === 'MiniPopover');
        const Emojis = WebpackModules.getByProps('searchWithoutFetchingLatest');
        const EmojiSmile = WebpackModules.getByDisplayName('EmojiSmile');
        const SliderInput = WebpackModules.getByDisplayName('Slider');
        const SearchBar = WebpackModules.getByDisplayName('SearchBar');
        const FormTitle = WebpackModules.getByDisplayName('FormTitle');
        const SwitchItem = WebpackModules.getByDisplayName('Switch');
        const Reactions = WebpackModules.getByProps('addReaction');
        const Tooltip = WebpackModules.getByDisplayName('Tooltip');
        const _settings = PluginUtilities.loadData(config.info.name, 'settings', {
            emojis: []
        });
        const _saveSettings = Lodash.debounce(()=>PluginUtilities.saveData(config.info.name, 'settings', _settings), 500);
        const settings = new Proxy(_settings, {
            set: (target, prop, value)=>{
                target[prop] = value;
                _saveSettings();
                return true;
            }
        });
        return class extends Plugin {
            start() {
                Patcher.after(MiniPopover, 'default', (_, [props], res)=>{
                    const PopoverButton = this.renderPopoverButton.bind(this);
                    const { channel , message  } = Utilities.findInReactTree(props.children, (r)=>r?.channel);
                    res.props.children?.unshift(/*#__PURE__*/ BdApi.React.createElement(PopoverButton, {
                        message: message,
                        channel: channel
                    }));
                });
                DOMTools.addStyle(config.info.name, `
               .emoji-react-emote {
                  margin: 5px;
                  width: 32px;
                  height: 32px;
                  cursor: pointer;
               }

               .er-popover-icon {
                  width: 22px;
                  height: 22px;
               }

               .er-popover-icon > svg {
                  width: 22px;
                  height: 22px;
               }

               .emoji-react-emote-container {
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: center;
               }

               .emoji-react-emote[data-is-disabled='true'] {
                  filter: grayscale(1);
               }

               .er-settings-switch-container {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin: 15px 0;
               }

               .er-settings-switch-container:not([data-is-on='true']) {
                  margin-bottom: 10px;
               }

               .er-settings-switch-title {
                  color: var(--text-normal);
               }

               .er-manager-search-bar {
                  margin: 20px 0;
               }

               .er-random-emoji-count {
                  margin-top: 20px;
               }
            `);
            }
            stop() {
                Patcher.unpatchAll();
                DOMTools.removeStyle(config.info.name);
            }
            renderPopoverButton({ channel , message  }) {
                const [reacting, setReacting] = React.useState(false);
                const blacklistedGuilds = [];
                return /*#__PURE__*/ BdApi.React.createElement(Tooltip, {
                    text: reacting ? 'Reacting...' : 'Mass React',
                    hideOnClick: false
                }, (p)=>/*#__PURE__*/ BdApi.React.createElement(MiniPopover.Button, Object.assign({}, p, {
                        className: "er-popover-icon",
                        disabled: reacting,
                        onClick: async ()=>{
                            setReacting(true);
                            const available = Emojis.searchWithoutFetchingLatest(channel, '');
                            const emojis = !settings.useRandom ? available.unlocked.filter((r)=>settings.emojis.some((e)=>{
                                    if (e.uniqueName !== void 0 && r.uniqueName !== void 0 && e.uniqueName === r.uniqueName) {
                                        return true;
                                    }
                                    if (e.id !== void 0 && r.id !== void 0 && e.id === r.id) {
                                        return true;
                                    }
                                    return false;
                                })) : this.shuffle(available.unlocked).filter((r)=>!blacklistedGuilds.includes(r.guildId) && settings.onlyAnimated ? r.animated : true).slice(0, settings.randomizeCount ? Math.floor(Math.random() * (Math.ceil(20) - Math.ceil(5) + 1)) + 5 : settings.randomCount);
                            for (const emoji of emojis){
                                Reactions.addReaction(channel.id, message.id, {
                                    name: emoji.surrogates ?? emoji.name,
                                    id: emoji.id,
                                    animated: emoji.animated
                                });
                                await new Promise((f)=>setTimeout(f, 750));
                            }
                            if (!settings.useRandom && settings.emojis.length - emojis.length !== 0) {
                                BdApi.showToast(`Mass reacted with the exception of ${settings.emojis.length - emojis.length} emojis due to permissions.`);
                            }
                            setReacting(false);
                        }
                    }), /*#__PURE__*/ BdApi.React.createElement(EmojiSmile, null)));
            }
            shuffle(array) {
                let currentIndex = array.length, randomIndex;
                // While there remain elements to shuffle.
                while(currentIndex != 0){
                    // Pick a remaining element.
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex--;
                    // And swap it with the current element.
                    [array[currentIndex], array[randomIndex]] = [
                        array[randomIndex],
                        array[currentIndex]
                    ];
                }
                return array;
            }
            getSettingsPanel() {
                const Settings = this.settings.bind(this);
                return /*#__PURE__*/ BdApi.React.createElement(Settings, null);
            }
            settings() {
                const emojis = Emojis.searchWithoutFetchingLatest(null, '');
                const [random, setRandom] = React.useState(settings.useRandom);
                const [length, setLength] = React.useState(settings.emojis.length);
                const [animated, setAnimated] = React.useState(settings.onlyAnimated);
                const [randomizeCount, setRandomizeCount] = React.useState(settings.randomizeCount);
                const [randomCount, setRandomCount] = React.useState(settings.randomCount);
                const [search, setSearch] = React.useState(null);
                const Emoji = this.makeEmoji;
                return /*#__PURE__*/ BdApi.React.createElement(BdApi.React.Fragment, null, /*#__PURE__*/ BdApi.React.createElement("div", {
                    "data-is-on": random,
                    className: "er-settings-switch-container"
                }, /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "er-settings-switch-title"
                }, "Use random selection"), /*#__PURE__*/ BdApi.React.createElement(SwitchItem, {
                    checked: random,
                    onChange: ()=>{
                        settings.useRandom = !settings.useRandom;
                        setRandom(settings.useRandom);
                    }
                })), random && /*#__PURE__*/ BdApi.React.createElement("div", {
                    "data-is-on": animated,
                    className: "er-settings-switch-container"
                }, /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "er-settings-switch-title"
                }, "Only animated emojis"), /*#__PURE__*/ BdApi.React.createElement(SwitchItem, {
                    checked: animated,
                    onChange: ()=>{
                        settings.onlyAnimated = !settings.onlyAnimated;
                        setAnimated(settings.onlyAnimated);
                    }
                })), random && /*#__PURE__*/ BdApi.React.createElement("div", {
                    "data-is-on": randomizeCount,
                    className: "er-settings-switch-container"
                }, /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "er-settings-switch-title"
                }, "Randomize random selection reaction count between 5-20"), /*#__PURE__*/ BdApi.React.createElement(SwitchItem, {
                    checked: randomizeCount,
                    onChange: ()=>{
                        settings.randomizeCount = !settings.randomizeCount;
                        setRandomizeCount(settings.randomizeCount);
                    }
                })), !randomizeCount && random && /*#__PURE__*/ BdApi.React.createElement(SliderInput, {
                    className: "er-random-emoji-count",
                    minValue: 1,
                    maxValue: 20,
                    stickToMarkers: true,
                    markers: Object.keys([
                        ...new Array(20)
                    ]).map((e)=>Number(e) + 1),
                    defaultValue: 10,
                    initialValue: randomCount,
                    onValueChange: (val)=>{
                        settings.randomCount = val;
                        setRandomCount(randomCount);
                    },
                    onMarkerRender: (v)=>`${v}`
                }), !settings.useRandom && /*#__PURE__*/ BdApi.React.createElement(BdApi.React.Fragment, null, /*#__PURE__*/ BdApi.React.createElement(FormTitle, null, length, " selected"), /*#__PURE__*/ BdApi.React.createElement(SearchBar, {
                    onQueryChange: (v)=>setSearch(v),
                    onClear: ()=>setSearch(null),
                    placeholder: "Search Emojis",
                    size: SearchBar.Sizes.MEDIUM,
                    query: search,
                    className: "er-manager-search-bar"
                }), /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "emoji-react-emote-container"
                }, (search ? emojis?.unlocked?.filter((r)=>(r.uniqueName ?? r.name).toLowerCase().includes(search.toLowerCase())) : emojis?.unlocked)?.map((e)=>/*#__PURE__*/ BdApi.React.createElement(Emoji, {
                        setLength: setLength,
                        emoji: e
                    })), ";")));
            }
            makeEmoji({ emoji , setLength  }) {
                const id = emoji.uniqueName ?? emoji.id;
                const [enabled, setEnabled] = React.useState(settings.emojis.find((r)=>r.uniqueName === id || r.id === id));
                return /*#__PURE__*/ BdApi.React.createElement(Tooltip, {
                    hideOnClick: false,
                    text: emoji.uniqueName ?? emoji.name
                }, (p)=>/*#__PURE__*/ BdApi.React.createElement("img", Object.assign({}, p, {
                        "data-is-disabled": !enabled,
                        className: "emoji-react-emote",
                        onClick: ()=>{
                            if (enabled) {
                                const idx = settings.emojis.findIndex((r)=>r.uniqueName === id || r.id === id);
                                if (~idx) settings.emojis.splice(idx, 1);
                                setEnabled(false);
                            } else {
                                // Trigger setter
                                settings.emojis = [
                                    ...settings.emojis,
                                    emoji
                                ];
                                setEnabled(true);
                            }
                            setLength(settings.emojis.length);
                        },
                        src: emoji.url
                    })));
            }
        };
    })(ZLibrary.buildPlugin(config));
})(); /*@end@*/ 
