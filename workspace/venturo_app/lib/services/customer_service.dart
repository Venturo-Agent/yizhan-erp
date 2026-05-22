import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';

class CustomerService {
  Future<List<Map<String, dynamic>>> getCustomers({
    String? search,
    int limit = 20,
    int offset = 0,
  }) async {
    var query = SupabaseConfig.instance
        .from('customers')
        .select('*')
        .order('name', ascending: true)
        .range(offset, offset + limit - 1);

    if (search != null && search.isNotEmpty) {
      query = query.or('name.ilike.%$search%,phone.ilike.%$search%,email.ilike.%$search%');
    }

    final response = await query;
    return response as List<Map<String, dynamic>>;
  }

  Future<Map<String, dynamic>?> getCustomerById(String id) async {
    final response = await SupabaseConfig.instance
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

    return response as Map<String, dynamic>?;
  }

  Future<Map<String, dynamic>?> getCustomerByCode(String code) async {
    final response = await SupabaseConfig.instance
        .from('customers')
        .select('*')
        .eq('code', code)
        .maybeSingle();

    return response as Map<String, dynamic>?;
  }

  Future<List<Map<String, dynamic>>> getVipCustomers() async {
    final response = await SupabaseConfig.instance
        .from('customers')
        .select('*')
        .eq('is_vip', true)
        .order('total_spent', ascending: false)
        .limit(50);

    return response as List<Map<String, dynamic>>;
  }
}