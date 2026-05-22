class LineMessage {
  final String id;
  final String lineUserId;
  final String senderId;
  final String content;
  final String messageType;
  final DateTime timestamp;
  final bool isFromMe;
  final bool isRead;

  LineMessage({
    required this.id,
    required this.lineUserId,
    required this.senderId,
    required this.content,
    this.messageType = 'text',
    required this.timestamp,
    this.isFromMe = false,
    this.isRead = false,
  });

  factory LineMessage.fromJson(Map<String, dynamic> json) {
    final currentUserId = json['current_user_id'] ?? '';
    final senderId = json['sender_id'] ?? '';

    return LineMessage(
      id: json['id'] ?? '',
      lineUserId: json['line_user_id'] ?? '',
      senderId: senderId,
      content: json['content'] ?? json['message'] ?? '',
      messageType: json['message_type'] ?? 'text',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      isFromMe: senderId == currentUserId,
      isRead: json['is_read'] ?? false,
    );
  }

  DateTime get time => timestamp;
}

class LineConversation {
  final String lineUserId;
  final String customerName;
  final String? avatarUrl;
  final String? lastMessage;
  final DateTime? lastMessageTime;
  final int unreadCount;

  LineConversation({
    required this.lineUserId,
    required this.customerName,
    this.avatarUrl,
    this.lastMessage,
    this.lastMessageTime,
    this.unreadCount = 0,
  });

  factory LineConversation.fromJson(Map<String, dynamic> json) {
    return LineConversation(
      lineUserId: json['line_user_id'] ?? json['user_id'] ?? '',
      customerName: json['customer_name'] ?? json['display_name'] ?? 'Unknown',
      avatarUrl: json['avatar_url'],
      lastMessage: json['last_message'] ?? json['preview'],
      lastMessageTime: json['last_message_time'] != null
          ? DateTime.parse(json['last_message_time'])
          : null,
      unreadCount: json['unread_count'] ?? 0,
    );
  }
}