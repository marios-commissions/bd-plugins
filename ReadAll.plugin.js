/**
 * @name ReadAll
 * @description Adds a read all notifications
 * @version 1.0.0
 * @author eternal
 * @authorId 263689920210534400
 */

const { DOM, React, Webpack, Patcher } = BdApi;

const Classes = Webpack.getModule(m => m.sidebar && m.activityPanel && m.container);
const ChannelStore = Webpack.getModule(m => m.getSortedPrivateChannels, { searchExports: true });
const MessageStore = Webpack.getModule(m => m.lastMessageId && m.hasUnread);
const Dispatcher = Webpack.getModule(m => m._dispatch && m.dispatch);

class ReadAll {
   async start() {
      while (!document.querySelector(`.${Classes.container}`)) {
         await new Promise(f => setTimeout(f, 1));
      }

      const GuildsNav = Webpack.getModule(m => m?.type?.toString?.().includes('guildsnav'), { searchExports: true });

      Patcher.after('read-all', GuildsNav, 'type', (_, args, res) => {
         Patcher.after('read-all', res.props.children, 'type', (_, args, res) => {
            const children = ZLibrary.Utilities.findInReactTree(res, e => Array.isArray(e) && e.find(b => b?.props?.isOnHubVerificationRoute !== void 0));
            if (!children) return;

            const idx = children.findIndex(e => e?.props?.isOnHubVerificationRoute !== void 0);
            children.splice(idx + 2, 0, React.createElement(ReadAllButton));
         });

         return res;
      });

      DOM.addStyle('read-all', `
         .read-all-button {
            background: var(--background-primary);
            border-radius: 5px;
            margin: 10px 10px;
            padding:  5px;
            font-size: 12px;
            color: var(--text-normal);
            text-align: center;
            transition: background .2s;
         }

         .read-all-button:hover {
            background: var(--brand-experiment);
         }
      `);

      this.forceUpdateAll();
   }

   stop() {
      Patcher.unpatchAll('read-all');
      DOM.removeStyle('read-all');
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

function ReadAllButton() {
   return React.createElement('div', {
      className: 'read-all-button',
      onClick: () => {
         const channels = ChannelStore.loadAllGuildAndPrivateChannelsFromDisk();

         Dispatcher.wait(() => Dispatcher.dispatch({
            type: 'BULK_ACK',
            channels: Object.keys(channels).map(c => ({
               channelId: c,
               messageId: MessageStore.lastMessageId(c)
            }))
         }));
      }
   }, 'read all');
}

module.exports = ReadAll;