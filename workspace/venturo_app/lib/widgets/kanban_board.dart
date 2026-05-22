import 'package:flutter/material.dart';
import '../config/theme.dart';

class KanbanBoard extends StatelessWidget {
  final List<KanbanColumn> columns;
  final Function(String cardId, String fromColumn, String toColumn)? onCardMoved;

  const KanbanBoard({
    super.key,
    required this.columns,
    this.onCardMoved,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: columns.map((column) {
          return Padding(
            padding: const EdgeInsets.only(right: 16),
            child: _buildColumn(context, column),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildColumn(BuildContext context, KanbanColumn column) {
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: column.color.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: column.color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  column.title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: column.color,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: column.color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${column.cards.length}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: column.color,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: column.cards.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        '尚無項目',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: column.cards.length,
                    itemBuilder: (context, index) {
                      final card = column.cards[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _buildCard(card),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(KanbanCard card) {
    return Card(
      child: InkWell(
        onTap: card.onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                card.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              if (card.subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  card.subtitle!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (card.tags != null && card.tags!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: card.tags!.map((tag) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tag,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class KanbanColumn {
  final String id;
  final String title;
  final Color color;
  final List<KanbanCard> cards;

  const KanbanColumn({
    required this.id,
    required this.title,
    required this.color,
    required this.cards,
  });
}

class KanbanCard {
  final String id;
  final String title;
  final String? subtitle;
  final List<String>? tags;
  final VoidCallback? onTap;

  const KanbanCard({
    required this.id,
    required this.title,
    this.subtitle,
    this.tags,
    this.onTap,
  });
}