import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String _url = 'https://aawrgygqgemgqssflfrx.supabase.co';
  static const String _anonKey = 'YOUR_ANON_KEY';

  static late SupabaseClient client;

  static Future<void> init() async {
    await Supabase.initialize(
      url: _url,
      anonKey: _anonKey,
    );
    client = Supabase.instance.client;
  }

  static SupabaseClient get instance => client;
}