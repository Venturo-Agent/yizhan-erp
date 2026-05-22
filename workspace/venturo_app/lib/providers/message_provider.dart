import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/line_message.dart';
import '../services/line_service.dart';

final lineServiceProvider = Provider((ref) => LineService());

final conversationsProvider = FutureProvider<List<LineConversation>>((ref) async {
  final service = ref.read(lineServiceProvider);
  final data = await service.getConversations();
  return data.map((json) => LineConversation.fromJson(json)).toList();
});

final messagesProvider = FutureProvider.family<List<LineMessage>, String>((ref, lineUserId) async {
  final service = ref.read(lineServiceProvider);
  final data = await service.getMessages(lineUserId);
  return data.map((json) => LineMessage.fromJson(json)).toList();
});

final selectedConversationProvider = StateProvider<LineConversation?>((ref) => null);