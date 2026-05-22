class Order {
  final String id;
  final String orderNumber;
  final String? tourId;
  final String? tourName;
  final String? contactPerson;
  final String? contactPhone;
  final String? contactEmail;
  final String? salesId;
  final String? salesPerson;
  final int memberCount;
  final int adultCount;
  final int childCount;
  final int infantCount;
  final String status;
  final String paymentStatus;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final DateTime? departureDate;
  final String? notes;

  Order({
    required this.id,
    required this.orderNumber,
    this.tourId,
    this.tourName,
    this.contactPerson,
    this.contactPhone,
    this.contactEmail,
    this.salesId,
    this.salesPerson,
    this.memberCount = 0,
    this.adultCount = 0,
    this.childCount = 0,
    this.infantCount = 0,
    this.status = 'pending',
    this.paymentStatus = 'unpaid',
    this.totalAmount = 0,
    this.paidAmount = 0,
    this.remainingAmount = 0,
    this.departureDate,
    this.notes,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      orderNumber: json['order_number'] ?? '',
      tourId: json['tour_id'],
      tourName: json['tour_name'],
      contactPerson: json['contact_person'],
      contactPhone: json['contact_phone'],
      contactEmail: json['contact_email'],
      salesId: json['sales_id'],
      salesPerson: json['sales_person'],
      memberCount: json['member_count'] ?? 0,
      adultCount: json['adult_count'] ?? 0,
      childCount: json['child_count'] ?? 0,
      infantCount: json['infant_count'] ?? 0,
      status: json['status'] ?? 'pending',
      paymentStatus: json['payment_status'] ?? 'unpaid',
      totalAmount: (json['total_amount'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? 0).toDouble(),
      remainingAmount: (json['remaining_amount'] ?? 0).toDouble(),
      departureDate: json['departure_date'] != null
          ? DateTime.parse(json['departure_date'])
          : null,
      notes: json['notes'],
    );
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return '待處理';
      case 'pending_review':
        return '待審核';
      case 'hk':
        return '已確認';
      case 'kk':
        return '已出團';
      case 'hl':
        return '已結團';
      case 'lk':
        return '已取消';
      default:
        return status;
    }
  }

  String get paymentStatusLabel {
    switch (paymentStatus) {
      case 'unpaid':
        return '未付款';
      case 'partial':
        return '部分付款';
      case 'paid':
        return '已付清';
      case 'refunded':
        return '已退款';
      default:
        return paymentStatus;
    }
  }
}