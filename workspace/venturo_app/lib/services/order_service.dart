import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';

class OrderService {
  Future<List<Map<String, dynamic>>> getOrders({
    String? salesId,
    String? status,
    int limit = 20,
    int offset = 0,
  }) async {
    var query = SupabaseConfig.instance
        .from('orders')
        .select('*')
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    if (salesId != null) {
      query = query.eq('sales_id', salesId);
    }

    if (status != null) {
      query = query.eq('status', status);
    }

    final response = await query;
    return response as List<Map<String, dynamic>>;
  }

  Future<Map<String, dynamic>?> getOrderById(String id) async {
    final response = await SupabaseConfig.instance
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

    return response as Map<String, dynamic>?;
  }

  Future<List<Map<String, dynamic>>> getMyOrders({
    required String employeeId,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await SupabaseConfig.instance
        .from('orders')
        .select('*')
        .eq('sales_id', employeeId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    return response as List<Map<String, dynamic>>;
  }

  Future<int> getMyOrdersCount(String employeeId) async {
    final response = await SupabaseConfig.instance
        .from('orders')
        .select('id')
        .eq('sales_id', employeeId)
        .count();

    return response;
  }
}