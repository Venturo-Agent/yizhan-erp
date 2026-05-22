import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';
import '../models/line_message.dart';

class ChatBubble extends StatelessWidget {
  final LineMessage message;
  final bool showTime;

  const ChatBubble({
    super.key,
    required this.message,
    this.showTime = false,
  });

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');

    return Column(
      crossAxisAlignment: message.isFromMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        if (showTime)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              timeFormat.format(message.time),
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
        Align(
          alignment: message.isFromMe ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            margin: EdgeInsets.only(
              bottom: 4,
              left: message.isFromMe ? 48 : 0,
              right: message.isFromMe ? 0 : 48,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: message.isFromMe ? AppTheme.primaryColor : Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: Radius.circular(message.isFromMe ? 18 : 4),
                bottomRight: Radius.circular(message.isFromMe ? 4 : 18),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.content,
                  style: TextStyle(
                    fontSize: 16,
                    color: message.isFromMe ? Colors.white : AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}