/**
 * @name Forwarder
 * @authorId 263689920210534400
 * @donate https://paypal.me/eternal404
 */

module.exports = (() => {
  const config = {
    info: {
      name: 'Forwarder',
      authors: [
        {
          name: 'eternal',
          discord_id: '263689920210534400',
          github_username: 'localip'
        }
      ],
      version: '1.0.0',
      description: 'Forwards messages from selected channels.',
      github: 'https://github.com/localip',
      github_raw: 'https://raw.githubusercontent.com/discord-modifications/better-discord-plugins/master/Forwarder/Forwarder.plugin.js'
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
    const { Patcher, ReactTools, Utilities, DOMTools, WebpackModules, DiscordModules: { Dispatcher, React, UserStore, APIModule }, Logger } = API;

    const request = require('request');

    return class extends Plugin {
      constructor(...args) {
        super(...args);

        this.pending = [];
        this._started = false;
        this.settings = Utilities.loadSettings('Forwarder', {
          webhook: 'https://discord.com/api/webooks/123/123',
          channels: {}
        });


        this.handleMessage = this.handleMessage.bind(this);
      }

      async start() {
        if (process.env.NO_FORWARDER) {
          return BdApi.UI.showToast('Detected non-primary instance, not launching forwader');
        }

        Dispatcher.subscribe('MESSAGE_CREATE', this.handleMessage);
      };

      stop() {
        if (process.env.NO_FORWARDER) return;
        Dispatcher.unsubscribe('MESSAGE_CREATE', this.handleMessage);
      };

      getSettingsPanel() {
        const { Settings } = this;

        return React.createElement(Settings.bind(this));
      }

      handleMessage({ optimistic, channelId, message }) {
        if (optimistic || !this.settings.channels[channelId]) return;
        const id = this.settings.webhook.match(/[0-9]{18,20}/)?.[0];

        const user = UserStore.getCurrentUser();

        if (
          message.author.id === id ||
          message.author.id === user.id
        ) return;

        console.log(this.pending);
        Promise.allSettled(this.pending).then(() => {
          this.pending = [];
          this.pending.push(this.post(message));
        });
      }

      Settings() {
        const [channels, setChannels] = React.useState(this.settings.channels ?? {});
        const [webhook, setWebhook] = React.useState(this.settings.webhook);
        const [name, setName] = React.useState(null);
        const [id, setID] = React.useState(null);

        return React.createElement('div', null, React.createElement('div', null, React.createElement('input', {
          placeholder: 'Webhook',
          type: 'text',
          value: webhook,
          onChange: (e) => {
            setWebhook(e.target.value);
            this.settings.webhook = e.target.value;
            Utilities.saveSettings(this.name, this.settings);
          }
        })), React.createElement('input', {
          placeholder: 'Name',
          type: 'text',
          value: name,
          onChange: (e) => setName(e.target.value)
        }), React.createElement('input', {
          placeholder: 'ID',
          type: 'text',
          value: id,
          onChange: (e) => setID(e.target.value)
        }), React.createElement('button', {
          onClick: () => {
            if (!id || !name) return BdApi.UI.showToast('Please provide both an ID and a name.');

            this.settings.channels[id] = name;

            const clone = { ...this.settings.channels };
            clone[id] = name;

            setChannels(clone);
            Utilities.saveSettings(this.name, this.settings);
          }
        }, 'Add'), React.createElement('br', null), Object.entries(channels).map(([id, name]) => React.createElement('p', {
          className: 'ml-whitelisted-guild',
          onClick: () => {
            const cloned = { ...this.settings.channels };
            delete cloned[id];
            setChannels(cloned);
            this.settings.channels = cloned;

            Utilities.saveSettings(this.name, this.settings);
          }
        }, name + ' - ' + id)));
      }

      async post(msg) {
        const author = UserStore.getUser(msg.author?.id);

        const promise = new Promise((resolve, reject) => {
          try {
            const body = JSON.stringify({
              content: [
                `\`${this.settings.channels?.[msg.channel_id] ?? 'Unknown'}\``,
                '',
                msg.content,
                '',
                msg.attachments.length && '\`Attachments:\`',
                ...msg.attachments?.map(e => e.url)
              ].filter(Boolean).join('\n') ?? '',
              username: msg.author.username + '#' + msg.author.discriminator,
              avatar_url: author?.getAvatarURL?.(),
              embeds: msg.embeds
            });

            request.post(this.settings.webhook, {
              body,
              headers: {
                'Content-Type': 'application/json',
              }
            }, (err, res, body) => {
              if (err) reject(err);

              resolve(true);
            });
          } catch (e) {
            console.error(e);
            reject(e);
          }
        });

        return promise;
      }
    };
  };
})();

/*@end@*/
