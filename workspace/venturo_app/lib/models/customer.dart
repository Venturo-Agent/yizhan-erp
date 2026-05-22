class Customer {
  final String id;
  final String code;
  final String name;
  final String? englishName;
  final String? nickname;
  final String? phone;
  final String? alternativePhone;
  final String? email;
  final String? address;
  final String? city;
  final String? country;
  final String? nationalId;
  final String? passportNumber;
  final String? passportExpiry;
  final DateTime? birthDate;
  final String? gender;
  final String? nationality;
  final String lineUserId;
  final String memberType;
  final bool isVip;
  final String? vipLevel;
  final int totalOrders;
  final double totalSpent;
  final String? notes;

  Customer({
    required this.id,
    required this.code,
    required this.name,
    this.englishName,
    this.nickname,
    this.phone,
    this.alternativePhone,
    this.email,
    this.address,
    this.city,
    this.country,
    this.nationalId,
    this.passportNumber,
    this.passportExpiry,
    this.birthDate,
    this.gender,
    this.nationality,
    this.lineUserId = '',
    this.memberType = 'potential',
    this.isVip = false,
    this.vipLevel,
    this.totalOrders = 0,
    this.totalSpent = 0,
    this.notes,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      englishName: json['english_name'],
      nickname: json['nickname'],
      phone: json['phone'],
      alternativePhone: json['alternative_phone'],
      email: json['email'],
      address: json['address'],
      city: json['city'],
      country: json['country'],
      nationalId: json['national_id'],
      passportNumber: json['passport_number'],
      passportExpiry: json['passport_expiry'],
      birthDate: json['birth_date'] != null
          ? DateTime.parse(json['birth_date'])
          : null,
      gender: json['gender'],
      nationality: json['nationality'],
      lineUserId: json['line_user_id'] ?? '',
      memberType: json['member_type'] ?? 'potential',
      isVip: json['is_vip'] ?? false,
      vipLevel: json['vip_level'],
      totalOrders: json['total_orders'] ?? 0,
      totalSpent: (json['total_spent'] ?? 0).toDouble(),
      notes: json['notes'],
    );
  }

  String get memberTypeLabel {
    switch (memberType) {
      case 'member':
        return '會員';
      case 'vip':
        return 'VIP';
      case 'potential':
        return '潛在客戶';
      default:
        return memberType;
    }
  }

  bool get hasLineLinked => lineUserId.isNotEmpty;
}