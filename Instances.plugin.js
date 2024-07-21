/**
 * @name Instances
 * @description Allows launching multiple instances of the app with keybinds.
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
            name: 'Instances',
            authors: [
                {
                    name: 'eternal',
                    discord_id: '282595588950982656',
                    github_username: 'localip'
                }
            ],
            version: '1.0.0',
            description: 'Allows launching multiple instances of the app with keybinds.',
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
        const child = require('child_process');
        const React = DiscordModules.React;
        const Lodash = window._;
        const _settings = PluginUtilities.loadData(config.info.name, 'settings', {
            amount: 5,
            keybinds: {
                single: 'F12',
                multiple: 'F10'
            }
        });
        const saveSettings = Lodash.debounce(()=>PluginUtilities.saveData(config.info.name, 'settings', _settings), 500);
        const settings = new Proxy(_settings, {
            set: (target, prop, value)=>{
                target[prop] = value;
                saveSettings();
                return true;
            }
        });
        return class extends Plugin {
            constructor(...args){
                super(...args);
                this.open = this.open.bind(this);
                this.openMultiple = this.openMultiple.bind(this);
                this.onKeyDown = this.onKeyDown.bind(this);
                this.active = true;
            }
            start() {
                document.addEventListener('keydown', this.onKeyDown);
                DOMTools.addStyle(config.info.name, `
					.instances-settings-container {
						margin-top: 10px;
						display: flex;
						flex-direction: column;
						gap: 1rem;
					}

					.instances-settings-container .label {
						color: var(--text-normal);
						font-size: 16px;
						margin: 0;
						padding: 0;
					}

					.instances-settings-container .recorder {
						background-color: var(--background-tertiary);
						color: var(--interactive-normal);
						transition: all .2s;
						border-radius: 5px;
						appearance: none;
						font-size: 14px;
						padding: 10px;
						border: none;
					}

					.instances-settings-container .recorder:focus {
						color: var(--interactive-active);
					}
				`.trim());
            }
            stop() {
                document.removeEventListener('keydown', this.onKeyDown);
                DOMTools.removeStyle(config.info.name);
            }
            onKeyDown({ key , ctrlKey  }) {
                if (!this.active || !ctrlKey) return;
                if (key === settings.keybinds.single) {
                    this.open();
                } else if (key === settings.keybinds.multiple) {
                    this.openMultiple();
                }
            }
            open() {
                child.exec(`set MULTI_INSTANCE=1 "${process.execPath}" --multi-instance`);
            }
            openMultiple() {
                const amount = settings.amount ?? 5;
                for(let i = 0; amount > i; i++){
                    this.open();
                }
            }
            getSettingsPanel() {
                const Settings = this.settings.bind(this);
                return /*#__PURE__*/ BdApi.React.createElement(Settings, null);
            }
            settings() {
                const [multipleBind, setMultipleBind] = React.useState(settings.keybinds.multiple);
                const [singleBind, setSingleBind] = React.useState(settings.keybinds.single);
                const [count, setCount] = React.useState(settings.amount);
                const multipleRef = React.createRef();
                const singleRef = React.createRef();
                console.log(count);
                React.useEffect(()=>{
                    this.active = false;
                    function onSingleKeyDown(e) {
                        setSingleBind(e.key);
                        settings.keybinds.single = e.key;
                    }
                    function onMultipleKeyDown(e) {
                        setMultipleBind(e.key);
                        settings.keybinds.multiple = e.key;
                    }
                    singleRef.current?.addEventListener('keydown', onSingleKeyDown);
                    multipleRef.current?.addEventListener('keydown', onMultipleKeyDown);
                    return ()=>{
                        singleRef.current?.removeEventListener('keydown', onSingleKeyDown);
                        multipleRef.current?.removeEventListener('keydown', onMultipleKeyDown);
                        this.active = true;
                    };
                }, [
                    singleRef,
                    multipleRef
                ]);
                return /*#__PURE__*/ BdApi.React.createElement("div", {
                    className: "instances-settings-container"
                }, /*#__PURE__*/ BdApi.React.createElement("input", {
                    type: "hidden",
                    autoFocus: true,
                    style: {
                        display: 'none'
                    }
                }), /*#__PURE__*/ BdApi.React.createElement("p", {
                    className: "label"
                }, "Single Window"), /*#__PURE__*/ BdApi.React.createElement("input", {
                    type: "text",
                    className: "recorder",
                    ref: singleRef,
                    value: singleBind?.toUpperCase()
                }), /*#__PURE__*/ BdApi.React.createElement("p", {
                    className: "label"
                }, "Multiple Windows"), /*#__PURE__*/ BdApi.React.createElement("input", {
                    type: "text",
                    className: "recorder",
                    ref: multipleRef,
                    value: multipleBind?.toUpperCase()
                }), /*#__PURE__*/ BdApi.React.createElement("p", {
                    className: "label"
                }, "Multiple Windows Count - ", count), /*#__PURE__*/ BdApi.React.createElement("input", {
                    className: "count",
                    type: "range",
                    min: "1",
                    max: "20",
                    value: count,
                    onInput: (e)=>{
                        setCount(e.target.value);
                        settings.amount = e.target.value;
                    }
                }));
            }
        };
    })(ZLibrary.buildPlugin(config));
})(); /*@end@*/ 

