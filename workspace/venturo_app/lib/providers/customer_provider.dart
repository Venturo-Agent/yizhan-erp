import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer.dart';
import '../services/customer_service.dart';

final customerServiceProvider = Provider((ref) => CustomerService());

final customersProvider = FutureProvider.family<List<Customer>, String?>((ref, search) async {
  final service = ref.read(customerServiceProvider);
  final data = await service.getCustomers(search: search);
  return data.map((json) => Customer.fromJson(json)).toList();
});

final customerDetailProvider = FutureProvider.family<Customer?, String>((ref, id) async {
  final service = ref.read(customerServiceProvider);
  final data = await service.getCustomerById(id);
  return data != null ? Customer.fromJson(data) : null;
});

final vipCustomersProvider = FutureProvider<List<Customer>>((ref) async {
  final service = ref.read(customerServiceProvider);
  final data = await service.getVipCustomers();
  return data.map((json) => Customer.fromJson(json)).toList();
});

final customerSearchProvider = StateProvider<String>((ref) => '');