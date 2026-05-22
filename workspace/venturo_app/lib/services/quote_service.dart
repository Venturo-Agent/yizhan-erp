import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';

class QuoteService {
  Future<List<Map<String, dynamic>>> getQuotes({
    String? status,
    int limit = 50,
  }) async {
    var query = SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .order('created_at', ascending: false)
        .limit(limit);

    if (status != null) {
      query = query.eq('confirmation_status', status);
    }

    final response = await query;
    return response as List<Map<String, dynamic>>;
  }

  Future<Map<String, dynamic>?> getQuoteById(String id) async {
    final response = await SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

    return response as Map<String, dynamic>?;
  }

  Future<Map<String, dynamic>> getQuoteBoardData() async {
    final drafts = await SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .eq('confirmation_status', 'draft')
        .order('created_at', ascending: false)
        .limit(20);

    final pending = await SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .eq('confirmation_status', 'pending')
        .order('created_at', ascending: false)
        .limit(20);

    final confirmed = await SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .eq('confirmation_status', 'customer_confirmed')
        .order('confirmed_at', ascending: false)
        .limit(20);

    final closed = await SupabaseConfig.instance
        .from('quotes')
        .select('*')
        .eq('confirmation_status', 'closed')
        .order('confirmed_at', ascending: false)
        .limit(20);

    return {
      'drafts': drafts,
      'pending': pending,
      'confirmed': confirmed,
      'closed': closed,
    };
  }

  Future<void> updateQuoteStatus(String id, String status) async {
    await SupabaseConfig.instance
        .from('quotes')
        .update({'confirmation_status': status})
        .eq('id', id);
  }
}