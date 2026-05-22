import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../services/order_service.dart';

final orderServiceProvider = Provider((ref) => OrderService());

final ordersProvider = FutureProvider.family<List<Order>, String?>((ref, salesId) async {
  final service = ref.read(orderServiceProvider);
  final data = await service.getOrders(salesId: salesId);
  return data.map((json) => Order.fromJson(json)).toList();
});

final myOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final authState = ref.watch(authStateProvider);
  final user = authState.valueOrNull;

  if (user == null) return [];

  final employeeData = await SupabaseConfig.instance
      .from('employees')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

  if (employeeData == null) return [];

  final service = ref.read(orderServiceProvider);
  final data = await service.getMyOrders(employeeId: employeeData['id']);
  return data.map((json) => Order.fromJson(json)).toList();
});

final orderDetailProvider = FutureProvider.family<Order?, String>((ref, id) async {
  final service = ref.read(orderServiceProvider);
  final data = await service.getOrderById(id);
  return data != null ? Order.fromJson(data) : null;
});

import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';