/**
 * @name WebhookColours
 * @description Allows launching multiple instances of the app with keybinds.
 * @authorId 282595588950982656
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
            name: 'WebhookColours',
            authors: [
                {
                    name: 'eternal',
                    discord_id: '282595588950982656',
                    github_username: 'localip'
                }
            ],
            version: '1.0.0',
            description: 'Adds per-username consistent colouring to provided User IDs (mostly useful for webhooks).',
            github: 'https://github.com/localip'
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
        const _settings = PluginUtilities.loadData(config.info.name, 'settings', {
            users: []
        });
        const saveSettings = Lodash.debounce(()=>PluginUtilities.saveData(config.info.name, 'settings', _settings), 500);
        const settings = new Proxy(_settings, {
            set: (target, prop, value)=>{
                target[prop] = value;
                console.log('saving');
                saveSettings();
                return true;
            }
        });
        return class extends Plugin {
            constructor(...args){
                super(...args);
                this.toColour = this.toColour.bind(this);
            }
            start() {
                const Tag = BdApi.Webpack.getByStrings('renderRemixTag', {
                    defaultExport: false
                });
                Patcher.after(Tag, 'Z', (_, [props], res)=>{
                    const { author , message  } = props;
                    if (!(settings.users ?? []).includes(message?.author?.id)) return;
                    const _this = this;
                    const popout = Utilities.findInReactTree(res, (r)=>r?.props?.renderPopout);
                    popout.props.children = ((old)=>function(...args) {
                            const res = old.apply(this, args);
                            res.props.style ??= {};
                            res.props.style.color ??= _this.toColour(author.nick);
                            return res;
                        })(popout.props.children);
                });
                DOMTools.addStyle(config.info.name, `
						.wc-settings {
							display: flex;
							flex-direction: column;
							color: var(--text-normal);
							gap: 1rem;
							align-items: center;
						}

						.wc-settings-id-input {
							appearance: none;
							border: 1px solid var(--deprecated-text-input-border);
							color: var(--text-normal);
							padding: 5px;
							border-radius: 3px;
							background: var(--background-secondary);
							width: 100%;
						}

						.wc-users {
							display: flex;
							align-items: center;
							gap: 0.25rem;
							color: var(--text-normal);
							flex-direction: column;
							width: 100%;
						}

						.wc-user-card {
							border-radius: 5px;
							border: 1px solid var(--card-bg);
							background: var(--background-secondary-alt);
							width: 100%;
							padding: 5px;
							gap: 0.5rem;
							display: flex;
							align-items: center;
						}

						.wc-user-delete {
							margin-left: auto;
							appearance: none;
							background: none;
							border: none;
							color: var(--text-danger);
						}
				`.trim());
            }
            toColour(string) {
                let hash = 0;
                for (const char of string.split('')){
                    hash = char.charCodeAt(0) + ((hash << 5) - hash);
                }
                ;
                let colour = '#';
                for(let i = 0; i < 3; i++){
                    const value = hash >> i * 8 & 0xff;
                    colour += value.toString(16).padStart(2, '0');
                }
                return colour;
            }
            stop() {
                Patcher.unpatchAll();
                DOMTools.removeStyle(config.info.name);
            }
            getSettingsPanel() {
                const Settings = this.settings.bind(this);
                return /*#__PURE__*/ BdApi.React.createElement(Settings, null);
            }
            settings() {
                const [id, setId] = React.useState('');
                const [, forceUpdate] = React.useState({});
                React.useEffect(()=>{
                    const listener = (e)=>{
                        if (e.key !== 'Enter' || !id) return;
                        settings.users ??= [];
                        if (!settings.users.includes(id)) {
                            settings.users.push(id);
                            settings.users = settings.users;
                        }
                        setId('');
                    };
                    document.addEventListener('keydown', listener);
                    return ()=>document.removeEventListener('keydown', listener);
                }, [
                    id
                ]);
                return /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "wc-settings"
                }, /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "wc-users"
                }, (settings.users ?? []).map((user)=>/*#__PURE__*/ BdApi.React.createElement("div", {
                        className: "wc-user-card"
                    }, /*#__PURE__*/ BdApi.React.createElement("span", null, user), /*#__PURE__*/ BdApi.React.createElement("button", {
                        className: "wc-user-delete",
                        onClick: ()=>{
                            const idx = settings.users.indexOf(user);
                            if (idx > -1) settings.users.splice(idx, 1);
                            settings.users = settings.users;
                            forceUpdate({});
                        }
                    }, "Delete")))), /*#__PURE__*/ BdApi.React.createElement("input", {
                    placeholder: "Enter an ID here and click enter to add it.",
                    className: "wc-settings-id-input",
                    type: "text",
                    value: id,
                    onChange: (e)=>!Number.isNaN(Number(e.target.value)) && setId(e.target.value)
                }));
            }
        };
    })(ZLibrary.buildPlugin(config));
})(); /*@end@*/ 

