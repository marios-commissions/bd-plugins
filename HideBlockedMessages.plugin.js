/**
 * @name HideBlockedMessages
 * @description Adds a read all notifications
 * @version 1.0.0
 * @author eternal
 * @authorId 263689920210534400
 */

const { Webpack, Patcher } = BdApi;

const Messages = Webpack.getModule(m => m.prototype?.jumpToMessage && m.prototype?.hasAfterCached && m.prototype?.forEach);

class HideBlockedMessages {
   async start() {
      const MessageConstants = Webpack.getModule(m => m.USER_MESSAGE, { searchExports: true });
      const BlockedStore = Webpack.getModule(m => m.isBlocked);

      const MessageList = Webpack.getModule(m => m.type?.toString?.().includes('showingQuarantineBanner'), { searchExports: true });

      Patcher.after('hide-blocked-messages', MessageList, 'type', (_, __, res) => {
         const child = res.props.children;

         if (child.props.channelStream && Array.isArray(child.props.channelStream)) {
            const old = child.props.channelStream.filter(n => n.type != 'MESSAGE_GROUP_BLOCKED');
            const payload = [];

            if (old.length !== child.props.channelStream.length) {
               for (let i in old) {
                  let next = parseInt(i) + 1;
                  if (
                     old[i].type != 'DIVIDER' ||
                     (
                        old[next] && old[i].type == 'DIVIDER' &&
                        old[next].type != 'DIVIDER' &&
                        old.slice(next).some(next => next.type != 'DIVIDER')
                     )
                  ) {
                     payload.push(old[i]);
                  }
               }

               let groupId, timestamp, author;
               for (let i in payload) {
                  if (
                     payload[i].type == 'MESSAGE' && MessageConstants.USER_MESSAGE.has(payload[i].content.type) &&
                     groupId != payload[i].groupId && timestamp && payload[i].content.timestamp - timestamp < 600000
                  ) {
                     if (author && author.id == payload[i].content.author.id && author.username == payload[i].content.author.username) {
                        payload[i] = Object.assign({}, payload[i], { groupId: groupId });
                     }

                     author = payload[i].content.author;
                  } else {
                     author = null;
                  }

                  groupId = payload[i].groupId;
                  timestamp = payload[i].content.timestamp;
               }

               child.props.channelStream = payload;
            }
         }

         if (child.props.messages) {
            const prev = child.props.messages;

            child.props.messages = new Messages();
            for (let key in prev) child.props.messages[key] = prev[key];

            const _array = [].concat(child.props.messages._array.filter(e => !e.author || !BlockedStore.isBlocked(e.author.id)));
            const _map = Object.fromEntries([].concat(Object.values(child.props.messages._map).filter(e => !e.author || !BlockedStore.isBlocked(e.author.id))).map(e => [e.channel_id, e]));
            child.props.messages._clearMessages();

            child.props.messages._array = _array;
            child.props.messages._map = _map;

            if (child.props.oldestUnreadMessageId && child.props.messages._array.every(n => n.id !== child.props.oldestUnreadMessageId)) {
               child.props.oldestUnreadMessageId = null;
            }
         };

         console.log(child);

         return res;
      });
   }

   stop() {
      Patcher.unpatchAll('hide-blocked-messages');
   }
};

module.exports = HideBlockedMessages;