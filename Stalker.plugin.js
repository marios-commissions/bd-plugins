/**
 * @name Stalker
 * @authorId 263689920210534400
 * @donate https://paypal.me/eternal404
 */

module.exports = (() => {
  const config = {
    info: {
      name: 'Stalker',
      authors: [
        {
          name: 'eternal',
          discord_id: '263689920210534400',
          github_username: 'localip'
        }
      ],
      version: '1.0.0',
      description: 'Stalks a certain person server-wide.',
      github: 'https://github.com/localip'
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
    const { Utilities, DiscordModules: { Dispatcher, React, UserStore } } = API;

    const request = require('request');

    return class extends Plugin {
      constructor(...args) {
        super(...args);

        this.pending = [];
        this._started = false;
        this.settings = Utilities.loadSettings('Stalker', {
          webhook: 'https://discord.com/api/webooks/123/123',
          users: []
        });


        this.handleMessage = this.handleMessage.bind(this);
      }

      async start() {
        if (process.env.NO_STALKER) {
          return BdApi.UI.showToast('Detected non-primary instance, not launching forwader');
        }

        Dispatcher.subscribe('MESSAGE_CREATE', this.handleMessage);
      };

      stop() {
        if (process.env.NO_STALKER) return;

        Dispatcher.unsubscribe('MESSAGE_CREATE', this.handleMessage);
      };

      getSettingsPanel() {
        const { Settings } = this;

        return React.createElement(Settings.bind(this));
      }

      handleMessage({ optimistic, message }) {
        if (optimistic) return;

        if (!this.settings.users.includes(message.author.id)) return;

        this.post(message);
      }

      Settings() {
        const [users, setUsers] = React.useState({ data: this.settings.users ?? [] });
        const [webhook, setWebhook] = React.useState(this.settings.webhook);
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
          placeholder: 'ID',
          type: 'text',
          value: id,
          onChange: (e) => setID(e.target.value)
        }), React.createElement('button', {
          onClick: () => {
            if (!id) return BdApi.UI.showToast('Please provide both an ID and a name.');

            this.settings.users.push(id);

            setUsers({ data: [...this.settings.users] });
            Utilities.saveSettings(this.name, this.settings);
          }
        }, 'Add'), React.createElement('br', null), users.data.map(name => React.createElement('p', {
          className: 'ml-whitelisted-guild',
          onClick: () => {
            this.settings.users = this.settings.users.filter(i => i !== name);

            setUsers({ data: [...this.settings.users] });

            Utilities.saveSettings(this.name, this.settings);
          }
        }, name)));
      }

      async post(msg) {
        const author = UserStore.getUser(msg.author?.id);

        const promise = new Promise((resolve, reject) => {
          try {
            const body = JSON.stringify({
              content: [
                `\`URL:\` https://discord.com/channels/${msg.guild_id ?? '@me'}/${msg.channel_id}/${msg.id}`,
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
              console.log(err);
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
