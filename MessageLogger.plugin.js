/**
 * @name MessageLogger
 * @authorId 263689920210534400
 * @donate https://paypal.me/eternal404
 */

module.exports = (() => {
  const config = {
    info: {
      name: 'MessageLogger',
      authors: [
        {
          name: 'eternal',
          discord_id: '263689920210534400',
          github_username: 'localip'
        }
      ],
      version: '1.0.0',
      description: 'Stops discord from disconnecting you when you\'re in a call alone for more than 5 minutes.',
      github: 'https://github.com/localip',
      github_raw: 'https://raw.githubusercontent.com/discord-modifications/better-discord-plugins/master/MessageLogger/MessageLogger.plugin.js'
    },
  };

  return !global.ZeresPluginLibrary ? class {
    constructor() {
      this.start = this.load = this.handleMissingLib;
    }

    getName() {
      return config.info.name.replace(/\s+/g, '');
    }

    getAuthor() {
      return config.info.authors.map(a => a.name).join(', ');
    }

    getVersion() {
      return config.info.version;
    }

    getDescription() {
      return config.info.description + ' You are missing libraries for this plugin, please enable the plugin and click Download Now.';
    }

    start() { }

    stop() { }

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

      if (!dependencies.map(d => window.hasOwnProperty(d.global)).includes(false)) return;

      if (global.eternalModal) {
        while (global.eternalModal && dependencies.map(d => window.hasOwnProperty(d.global)).includes(false)) await new Promise(f => setTimeout(f, 1000));
        if (!dependencies.map(d => window.hasOwnProperty(d.global)).includes(false)) return BdApi.Plugins.reload(this.getName());
      };

      global.eternalModal = true;

      BdApi.showConfirmationModal(
        'Dependencies needed',
        `Dependencies needed for ${this.getName()} are missing. Please click download to install the dependecies.`,
        {
          confirmText: 'Download',
          cancelText: 'Cancel',
          onCancel: () => delete global.eternalModal,
          onConfirm: async () => {
            for (const dependency of dependencies) {
              if (!window.hasOwnProperty(dependency.global)) {
                await new Promise((resolve) => {
                  request.get(dependency.url, (error, __, body) => {
                    if (error) return electron.shell.openExternal(dependency.external);
                    fs.writeFile(path.join(BdApi.Plugins.folder, dependency.filename), body, resolve);
                  });
                });
              }
            }

            delete global.eternalModal;
          }
        }
      );
    }
  } : initialize(ZLibrary.buildPlugin(config));

  function initialize([Plugin, API]) {
    const { Patcher, ReactTools, Utilities, DOMTools, WebpackModules, DiscordModules: { Dispatcher, React }, Logger } = API;

    return class extends Plugin {
      async start() {
        if (process.env.NO_MESSAGE_LOGGER) return BdApi.UI.showToast('Detected non-primary instance, not launching message logger');

        this.settings = Utilities.loadSettings('MessageLogger', { cache: { deleted: {} }, guilds: [] });
        this.cache = this.settings.cache;

        const Messages = WebpackModules.getByProps('getMessage');
        const Channels = WebpackModules.getByProps('getChannel');

        Patcher.instead(Dispatcher, 'dispatch', (_, args, orig) => {
          const [payload] = args;

          if (payload.type === 'MESSAGE_DELETE') {
            const channel = Channels.getChannel(payload.channelId);
            if (!channel?.id) return orig.apply(this, args);

            if (channel.guild_id && !~this.settings.guilds.indexOf(channel.guild_id)) return orig.apply(this, args);

            const msg = Messages.getMessage(payload.channelId, payload.id);
            if (!msg?.id) return orig.apply(this, args);

            this.cache.deleted[msg.channel_id] ??= {};
            this.cache.deleted[msg.channel_id][msg.id] = msg;

            Utilities.saveSettings(this.name, { cache: this.cache });

            Dispatcher.dispatch({ type: 'ML_UPDATE_MESSAGE', id: payload.id });

            return Promise.resolve();
          }

          if (payload.type === 'LOAD_MESSAGES_SUCCESS') {
            const channel = Channels.getChannel(payload.channelId);
            if (!channel?.id) return orig.apply(this, args);

            this.populate(payload.messages, this.cache.deleted[channel.id], !payload.hasMoreAfter && !payload.isBefore, !payload.hasMoreBefore && !payload.isAfter);
          }

          return orig.apply(this, args);
        });

        let node;

        while (!(node = document.querySelector('div[class*="cozyMessage-"]'))) {
          await new Promise(f => setTimeout(f, 1));
        }

        const instance = ReactTools.getReactInstance(node);
        const MemoMessage = Utilities.findInTree(instance, e => {
          const f = e?.elementType?.type?.toString?.();
          if (!f) return false;

          return ~f.indexOf('THREAD_STARTER_MESSAGE');
        }, { walkable: ['return', 'child'] });

        if (!MemoMessage?.elementType?.type) return BdApi.alert('Message Logger', 'Failed to find MemoMessage module.');

        DOMTools.addStyle('message-logger', `
          .ml-deleted {
            background: rgba(255, 25, 25, 0.1);
            border-left: 2px solid rgba(255, 25, 25, 0.3);
          }


          .ml-whitelisted-guild {
            color: white;
            cursor: pointer;
          }

          .ml-whitelisted-guild:hover {
            color: red;
          }
        `);

        Patcher.after(MemoMessage.elementType, 'type', (_, [{ message, channel }], res) => {
          const [, forceUpdate] = React.useState({});

          React.useEffect(() => {
            function handler({ id }) {
              if (id !== message.id) return;

              forceUpdate({});
            }

            Dispatcher.subscribe('ML_UPDATE_MESSAGE', handler);

            return () => Dispatcher.unsubscribe('ML_UPDATE_MESSAGE', handler);
          }, []);

          if (this.cache.deleted[channel.id]?.[message.id]) {
            res.props.children.props.className = [res.props.className, 'ml-deleted'].filter(Boolean).join(' ');
          }
        });

        this.forceUpdateChat();
      };

      stop() {
        Patcher.unpatchAll();
        this.forceUpdateChat();

        DOMTools.removeStyle('message-logger');
      };

      getSettingsPanel() {
        const { Settings } = this;

        return React.createElement(Settings.bind(this));
      }

      Settings() {
        const [guilds, setGuilds] = React.useState({ guilds: this.settings.guilds });
        const [input, setInput] = React.useState(null);
        return React.createElement('div', null, React.createElement('input', {
          type: 'text',
          onChange: (e) => setInput(e.target.value)
        }), React.createElement('button', {
          onClick: () => {
            this.settings.guilds.push(input);

            setGuilds({ guilds: this.settings.guilds });
            Utilities.saveSettings(this.name, this.settings);
          }
        }, "Add"), React.createElement('br', null), guilds.guilds.map(e => React.createElement('p', {
          className: 'ml-whitelisted-guild',
          onClick: () => {
            const idx = this.settings.guilds.findIndex(g => g === e);
            if (idx === -1) return;

            this.settings.guilds.splice(idx, 1);
            setGuilds({ guilds: this.settings.guilds });
            Utilities.saveSettings(this.name, this.settings);
          }
        }, e)));
      }

      forceUpdateChat() {
        const node = document.querySelector('main[class*="chatContent"]');
        if (!node) return;

        const instance = ReactTools.getReactInstance(node);
        if (!instance) return;

        const payload = Utilities.findInTree(instance, e => typeof e?.memoizedProps?.showQuarantinedUserBanner === 'boolean', { walkable: ['return'] })?.stateNode;
        if (!payload) return;

        const unpatch = Patcher.after(payload, 'render', (self, _, res) => {
          unpatch();

          if (!res) return;

          res.key = Math.random().toString(36).substring(2, 10).toUpperCase();
          res.ref = () => self.forceUpdate();
        });

        payload.forceUpdate();
      }

      populate(messages, deletedMessages, channelStart, channelEnd) {
        if (!deletedMessages) return;

        const deleted = Object.values(deletedMessages);

        const DISCORD_EPOCH = 14200704e5;
        const savedIDs = [];
        const IDs = [];

        for (let i = 0, len = messages.length; i < len; i++) {
          const { id } = messages[i];
          IDs.push({ id: id, time: (id / 4194304) + DISCORD_EPOCH });
        }

        for (let i = 0, len = deleted.length; i < len; i++) {
          const message = deleted[i];
          if (!message) continue;

          savedIDs.push({ id: message.id, time: (message.id / 4194304) + DISCORD_EPOCH });
        }

        savedIDs.sort((a, b) => a.time - b.time);

        if (!savedIDs.length) return;
        const { time: lowestTime } = IDs[IDs.length - 1] ?? {};
        const { time: highestTime } = IDs[0] ?? [{}];
        const lowestIDX = channelEnd ? 0 : savedIDs.findIndex(e => e.time > lowestTime);

        if (lowestIDX === -1) return;
        const highestIDX = channelStart ? savedIDs.length - 1 : this._findLastIndex(savedIDs, e => e.time < highestTime);
        if (highestIDX === -1) return;
        const reAddIDs = savedIDs.slice(lowestIDX, highestIDX + 1);

        reAddIDs.push(...IDs);
        reAddIDs.sort((a, b) => b.time - a.time);
        for (let i = 0, len = reAddIDs.length; i < len; i++) {
          const { id } = reAddIDs[i];
          if (messages.filter(Boolean).findIndex((e) => e.id === id) !== -1) continue;
          const message = deletedMessages[id];
          messages.splice(i, 0, message);
        }
      }

      _findLastIndex(array, predicate) {
        let l = array.length;
        while (l--) {
          if (predicate(array[l], l, array))
            return l;
        }
        return -1;
      }
    };
  }
})();

/*@end@*/
