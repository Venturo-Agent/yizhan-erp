import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/auth/login_page.dart';
import '../screens/home/home_page.dart';
import '../screens/orders/orders_page.dart';
import '../screens/orders/order_detail_page.dart';
import '../screens/quotes/quotes_board_page.dart';
import '../screens/customers/customers_page.dart';
import '../screens/messages/conversations_page.dart';
import '../screens/messages/chat_page.dart';
import '../screens/settings/settings_page.dart';
import '../providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isLoggingIn = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoggingIn) return '/login';
      if (isLoggedIn && isLoggingIn) return '/';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => HomePage(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const OrdersPage(),
          ),
          GoRoute(
            path: '/orders',
            builder: (context, state) => const OrdersPage(),
          ),
          GoRoute(
            path: '/orders/:id',
            builder: (context, state) => OrderDetailPage(
              orderId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/quotes',
            builder: (context, state) => const QuotesBoardPage(),
          ),
          GoRoute(
            path: '/customers',
            builder: (context, state) => const CustomersPage(),
          ),
          GoRoute(
            path: '/messages',
            builder: (context, state) => const ConversationsPage(),
          ),
          GoRoute(
            path: '/messages/:lineUserId',
            builder: (context, state) => ChatPage(
              lineUserId: state.pathParameters['lineUserId']!,
              customerName: state.uri.queryParameters['name'] ?? 'Chat',
            ),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
  );
});