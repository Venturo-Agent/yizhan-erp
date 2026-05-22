import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/quote.dart';
import '../services/quote_service.dart';

final quoteServiceProvider = Provider((ref) => QuoteService());

final quotesProvider = FutureProvider<List<Quote>>((ref) async {
  final service = ref.read(quoteServiceProvider);
  final data = await service.getQuotes();
  return data.map((json) => Quote.fromJson(json)).toList();
});

final quoteBoardProvider = FutureProvider<Map<String, List<Quote>>>((ref) async {
  final service = ref.read(quoteServiceProvider);
  final data = await service.getQuoteBoardData();

  return {
    'drafts': (data['drafts'] as List).map((json) => Quote.fromJson(json)).toList(),
    'pending': (data['pending'] as List).map((json) => Quote.fromJson(json)).toList(),
    'confirmed': (data['confirmed'] as List).map((json) => Quote.fromJson(json)).toList(),
    'closed': (data['closed'] as List).map((json) => Quote.fromJson(json)).toList(),
  };
});

final quoteDetailProvider = FutureProvider.family<Quote?, String>((ref, id) async {
  final service = ref.read(quoteServiceProvider);
  final data = await service.getQuoteById(id);
  return data != null ? Quote.fromJson(data) : null;
});

import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase.dart';