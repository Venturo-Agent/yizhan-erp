import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';

final authStateProvider = StateNotifierProvider<AuthStateNotifier, AsyncValue<User?>>((ref) {
  return AuthStateNotifier();
});

class AuthStateNotifier extends StateNotifier<AsyncValue<User?>> {
  AuthStateNotifier() : super(const AsyncValue.data(null)) {
    _init();
  }

  void _init() {
    final currentUser = SupabaseConfig.instance.auth.currentUser;
    state = AsyncValue.data(currentUser);

    SupabaseConfig.instance.auth.onAuthStateChange.listen((event) {
      state = AsyncValue.data(event.session?.user);
    });
  }

  Future<void> signInWithPhone(String phone) async {
    state = const AsyncValue.loading();

    try {
      await SupabaseConfig.instance.auth.signInWithOtp(
        phone: phone,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> verifyOtp(String phone, String code) async {
    state = const AsyncValue.loading();

    try {
      final response = await SupabaseConfig.instance.auth.verifyOTP(
        phone: phone,
        token: code,
        type: OtpType.sms,
      );

      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signOut() async {
    await SupabaseConfig.instance.auth.signOut();
    state = const AsyncValue.data(null);
  }

  User? get currentUser => state.valueOrNull;
}

final currentEmployeeProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authState = ref.watch(authStateProvider);
  final user = authState.valueOrNull;

  if (user == null) return null;

  final response = await SupabaseConfig.instance
      .from('employees')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

  return response as Map<String, dynamic>?;
});