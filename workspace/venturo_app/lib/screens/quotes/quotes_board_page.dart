import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/quote_provider.dart';
import '../../widgets/quote_card.dart';
import '../../widgets/empty_state.dart';

class QuotesBoardPage extends ConsumerWidget {
  const QuotesBoardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final boardAsync = ref.watch(quoteBoardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('報價行程看板'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(quoteBoardProvider);
            },
          ),
        ],
      ),
      body: boardAsync.when(
        data: (board) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(quoteBoardProvider);
            },
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildColumn(context, '草稿', 'drafts', Colors.grey, board),
                  const SizedBox(width: 12),
                  _buildColumn(context, '報價中', 'pending', Colors.orange, board),
                  const SizedBox(width: 12),
                  _buildColumn(context, '已確認', 'confirmed', Colors.green, board),
                  const SizedBox(width: 12),
                  _buildColumn(context, '已完成', 'closed', Colors.blue, board),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: AppTheme.secondaryColor,
              ),
              const SizedBox(height: 16),
              Text('載入失敗: $error'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(quoteBoardProvider);
                },
                child: const Text('重試'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColumn(
    BuildContext context,
    String title,
    String key,
    Color color,
    Map<String, List> board,
  ) {
    final quotes = board[key] ?? [];

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
              color: color.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${quotes.length}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: quotes.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        '尚無項目',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: quotes.length,
                    itemBuilder: (context, index) {
                      final quote = quotes[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: QuoteCard(
                          quote: quote,
                          onTap: () {
                            context.push('/quotes/${quote.id}');
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}