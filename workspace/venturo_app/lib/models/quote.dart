class Quote {
  final String id;
  final String code;
  final String quoteType;
  final String status;
  final String? customerId;
  final String? customerName;
  final String? customerPhone;
  final String? destination;
  final DateTime? startDate;
  final DateTime? endDate;
  final int days;
  final int numberOfPeople;
  final double totalAmount;
  final double totalCost;
  final double profitMargin;
  final String confirmationStatus;
  final DateTime? confirmedAt;

  Quote({
    required this.id,
    required this.code,
    this.quoteType = 'standard',
    this.status = 'draft',
    this.customerId,
    this.customerName,
    this.customerPhone,
    this.destination,
    this.startDate,
    this.endDate,
    this.days = 0,
    this.numberOfPeople = 0,
    this.totalAmount = 0,
    this.totalCost = 0,
    this.profitMargin = 0,
    this.confirmationStatus = 'draft',
    this.confirmedAt,
  });

  factory Quote.fromJson(Map<String, dynamic> json) {
    return Quote(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      quoteType: json['quote_type'] ?? 'standard',
      status: json['status'] ?? 'draft',
      customerId: json['customer_id'],
      customerName: json['customer_name'],
      customerPhone: json['customer_phone'],
      destination: json['destination'],
      startDate: json['start_date'] != null
          ? DateTime.parse(json['start_date'])
          : null,
      endDate: json['end_date'] != null
          ? DateTime.parse(json['end_date'])
          : null,
      days: json['days'] ?? 0,
      numberOfPeople: json['number_of_people'] ?? 0,
      totalAmount: (json['total_amount'] ?? 0).toDouble(),
      totalCost: (json['total_cost'] ?? 0).toDouble(),
      profitMargin: (json['profit_margin'] ?? 0).toDouble(),
      confirmationStatus: json['confirmation_status'] ?? 'draft',
      confirmedAt: json['confirmed_at'] != null
          ? DateTime.parse(json['confirmed_at'])
          : null,
    );
  }

  String get quoteTypeLabel => quoteType == 'quick' ? '快速報價' : '標準報價';

  String get confirmationLabel {
    switch (confirmationStatus) {
      case 'draft':
        return '草稿';
      case 'pending':
        return '報價中';
      case 'customer_confirmed':
        return '已確認';
      case 'closed':
        return '已完成';
      default:
        return confirmationStatus;
    }
  }

  double get grossProfit => totalAmount - totalCost;
  double get profitRate =>
      totalCost > 0 ? (grossProfit / totalCost * 100) : 0;
}