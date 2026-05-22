class Supplier {
  final String id;
  final String code;
  final String name;
  final String? shortName;
  final String? englishName;
  final String supplierTypeCode;
  final bool isDomestic;
  final String? contactPerson;
  final String? phone;
  final String? mobile;
  final String? email;
  final String? lineId;
  final String? address;
  final String? city;
  final String? country;
  final double rating;
  final bool isPreferred;
  final bool isActive;
  final int usageCount;
  final String? notes;

  Supplier({
    required this.id,
    required this.code,
    required this.name,
    this.shortName,
    this.englishName,
    this.supplierTypeCode = 'other',
    this.isDomestic = true,
    this.contactPerson,
    this.phone,
    this.mobile,
    this.email,
    this.lineId,
    this.address,
    this.city,
    this.country,
    this.rating = 0,
    this.isPreferred = false,
    this.isActive = true,
    this.usageCount = 0,
    this.notes,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) {
    return Supplier(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      shortName: json['short_name'],
      englishName: json['english_name'],
      supplierTypeCode: json['supplier_type_code'] ?? 'other',
      isDomestic: json['is_domestic'] ?? true,
      contactPerson: json['contact_person'],
      phone: json['phone'],
      mobile: json['mobile'],
      email: json['email'],
      lineId: json['line_id'],
      address: json['address'],
      city: json['city'],
      country: json['country'],
      rating: (json['rating'] ?? 0).toDouble(),
      isPreferred: json['is_preferred'] ?? false,
      isActive: json['is_active'] ?? true,
      usageCount: json['usage_count'] ?? 0,
      notes: json['notes'],
    );
  }

  String get supplierTypeLabel {
    switch (supplierTypeCode) {
      case 'hotel':
        return '飯店';
      case 'restaurant':
        return '餐廳';
      case 'transport':
        return '交通';
      case 'attraction':
        return '景點';
      case 'guide':
        return '導遊';
      case 'agency':
        return '旅行社';
      case 'ticketing':
        return '票券';
      case 'employee':
        return '員工';
      default:
        return '其他';
    }
  }

  String get contactInfo {
    if (mobile != null && mobile!.isNotEmpty) return mobile!;
    if (phone != null && phone!.isNotEmpty) return phone!;
    return '';
  }
}