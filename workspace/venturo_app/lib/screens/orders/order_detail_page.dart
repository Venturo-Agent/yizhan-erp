import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/order_provider.dart';

class OrderDetailPage extends ConsumerWidget {
  final String orderId;

  const OrderDetailPage({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderDetailProvider(orderId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('訂單詳情'),
      ),
      body: orderAsync.when(
        data: (order) {
          if (order == null) {
            return const Center(
              child: Text('找不到訂單'),
            );
          }

          final dateFormat = DateFormat('yyyy/MM/dd');

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSection(
                  '基本資訊',
                  [
                    _buildInfoRow('訂單編號', order.orderNumber),
                    _buildInfoRow('狀態', order.statusLabel),
                    _buildInfoRow('付款狀態', order.paymentStatusLabel),
                    if (order.tourName != null)
                      _buildInfoRow('行程名稱', order.tourName!),
                    if (order.departureDate != null)
                      _buildInfoRow(
                        '出發日期',
                        dateFormat.format(order.departureDate!),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSection(
                  '人數統計',
                  [
                    _buildInfoRow('總人數', '${order.memberCount} 人'),
                    _buildInfoRow('成人', '${order.adultCount} 人'),
                    if (order.childCount > 0)
                      _buildInfoRow('兒童', '${order.childCount} 人'),
                    if (order.infantCount > 0)
                      _buildInfoRow('嬰兒', '${order.infantCount} 人'),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSection(
                  '聯絡人',
                  [
                    if (order.contactPerson != null)
                      _buildInfoRow('姓名', order.contactPerson!),
                    if (order.contactPhone != null)
                      _buildInfoRow('電話', order.contactPhone!),
                    if (order.contactEmail != null)
                      _buildInfoRow('Email', order.contactEmail!),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSection(
                  '金額',
                  [
                    _buildInfoRow(
                      '總金額',
                      '\$${order.totalAmount.toStringAsFixed(0)}',
                    ),
                    _buildInfoRow(
                      '已付',
                      '\$${order.paidAmount.toStringAsFixed(0)}',
                    ),
                    _buildInfoRow(
                      '待付',
                      '\$${order.remainingAmount.toStringAsFixed(0)}',
                    ),
                  ],
                ),
                if (order.notes != null && order.notes!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildSection(
                    '備註',
                    [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          order.notes!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Text('載入失敗: $error'),
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}