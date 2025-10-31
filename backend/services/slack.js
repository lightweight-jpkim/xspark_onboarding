import { WebClient } from '@slack/web-api';

export class SlackService {
  constructor(token) {
    this.client = new WebClient(token);
  }

  /**
   * 워크스페이스의 모든 채널 목록 조회
   */
  async listChannels() {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200
      });

      return result.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        memberCount: channel.num_members
      }));
    } catch (error) {
      console.error('채널 목록 조회 오류:', error);
      throw new Error(`Slack 채널 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 채널의 메시지 가져오기 (일자별)
   * @param {string} channelId - 채널 ID
   * @param {string} date - 날짜 (YYYY-MM-DD)
   */
  async getChannelMessages(channelId, date) {
    try {
      // 날짜를 Unix timestamp로 변환
      const targetDate = new Date(date);
      const oldest = Math.floor(targetDate.getTime() / 1000); // 00:00:00
      const latest = oldest + 86400; // +24시간

      console.log(`📅 ${date} 메시지 조회:`, {
        channelId,
        oldest: new Date(oldest * 1000),
        latest: new Date(latest * 1000)
      });

      // 메시지 가져오기
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: oldest.toString(),
        latest: latest.toString(),
        limit: 1000  // 하루치면 충분할 것
      });

      if (!result.messages || result.messages.length === 0) {
        return [];
      }

      // 메시지를 시간순으로 정렬 (오래된 것부터)
      const messages = result.messages.reverse();

      // 사용자 정보 가져오기 (한 번에)
      const userIds = [...new Set(messages.map(m => m.user).filter(Boolean))];
      const users = await this.getUsersInfo(userIds);

      // 메시지 포맷팅
      const formattedMessages = await Promise.all(
        messages.map(async msg => {
          const user = users[msg.user] || { name: 'Unknown User' };

          // 스레드 답글 가져오기 (있는 경우)
          let replies = [];
          if (msg.thread_ts && msg.thread_ts === msg.ts) {
            replies = await this.getThreadReplies(channelId, msg.thread_ts);
          }

          return {
            user: user.name,
            time: new Date(parseFloat(msg.ts) * 1000).toLocaleTimeString('ko-KR'),
            text: msg.text,
            replies: replies,
            hasFiles: msg.files && msg.files.length > 0,
            files: msg.files ? msg.files.map(f => ({
              name: f.name,
              url: f.url_private
            })) : []
          };
        })
      );

      console.log(`✅ ${formattedMessages.length}개 메시지 조회 완료`);
      return formattedMessages;

    } catch (error) {
      console.error('메시지 조회 오류:', error);
      throw new Error(`Slack 메시지 조회 실패: ${error.message}`);
    }
  }

  /**
   * 스레드 답글 가져오기
   */
  async getThreadReplies(channelId, threadTs) {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: 100
      });

      // 첫 메시지 제외 (원본 메시지)
      const replies = result.messages.slice(1);

      if (replies.length === 0) return [];

      const userIds = [...new Set(replies.map(m => m.user).filter(Boolean))];
      const users = await this.getUsersInfo(userIds);

      return replies.map(reply => ({
        user: users[reply.user]?.name || 'Unknown User',
        time: new Date(parseFloat(reply.ts) * 1000).toLocaleTimeString('ko-KR'),
        text: reply.text
      }));
    } catch (error) {
      console.warn('스레드 조회 오류:', error.message);
      return [];
    }
  }

  /**
   * 사용자 정보 가져오기 (캐싱)
   */
  async getUsersInfo(userIds) {
    const users = {};

    try {
      for (const userId of userIds) {
        const result = await this.client.users.info({ user: userId });
        users[userId] = {
          name: result.user.real_name || result.user.name,
          displayName: result.user.profile.display_name || result.user.name
        };
      }
    } catch (error) {
      console.warn('사용자 정보 조회 오류:', error.message);
    }

    return users;
  }

  /**
   * 채널 정보 조회
   */
  async getChannelInfo(channelId) {
    try {
      const result = await this.client.conversations.info({
        channel: channelId
      });

      return {
        id: result.channel.id,
        name: result.channel.name,
        topic: result.channel.topic.value,
        purpose: result.channel.purpose.value,
        memberCount: result.channel.num_members
      };
    } catch (error) {
      console.error('채널 정보 조회 오류:', error);
      throw new Error(`채널 정보 조회 실패: ${error.message}`);
    }
  }
}
