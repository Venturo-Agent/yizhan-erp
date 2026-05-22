import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';

class LineService {
  Future<List<Map<String, dynamic>>> getConversations() async {
    final response = await SupabaseConfig.instance
        .from('line_conversations')
        .select('''
          *,
          customers (name, avatar_url)
        ''')
        .order('last_message_at', ascending: false)
        .limit(50);

    return response as List<Map<String, dynamic>>;
  }

  Future<List<Map<String, dynamic>>> getMessages(
    String lineUserId, {
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await SupabaseConfig.instance
        .from('line_messages')
        .select('*')
        .eq('line_user_id', lineUserId)
        .order('timestamp', ascending: true)
        .range(offset, offset + limit - 1);

    return response as List<Map<String, dynamic>>;
  }

  Future<void> sendMessage(String lineUserId, String content) async {
    final currentUser = SupabaseConfig.instance.auth.currentUser;

    await SupabaseConfig.instance.from('line_messages').insert({
      'line_user_id': lineUserId,
      'sender_id': currentUser?.id,
      'message': content,
      'message_type': 'text',
      'timestamp': DateTime.now().toIso8601String(),
      'direction': 'outbound',
    });

    await SupabaseConfig.instance
        .from('line_conversations')
        .update({'last_message': content, 'last_message_at': DateTime.now().toIso8601String()})
        .eq('line_user_id', lineUserId);
  }

  Future<void> markAsRead(String lineUserId) async {
    await SupabaseConfig.instance
        .from('line_messages')
        .update({'is_read': true})
        .eq('line_user_id', lineUserId)
        .eq('is_read', false);

    await SupabaseConfig.instance
        .from('line_conversations')
        .update({'unread_count': 0})
        .eq('line_user_id', lineUserId);
  }

  Stream<List<Map<String, dynamic>>> watchMessages(String lineUserId) {
    return SupabaseConfig.instance
        .channel('line_messages_$lineUserId')
        .on(
          PostgrestFilter(
            type: PostgrestAction.insert,
            table: 'line_messages',
            filter: Filter.eq('line_user_id', lineUserId),
          ),
          (payload) {
            return payload.newRecords;
          },
        )
        .subscribe() as Stream<List<Map<String, dynamic>>>;
  }
}