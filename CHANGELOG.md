# Changelog

All notable changes to Venturo ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔐 Security - 2026-03-09

#### Fixed

- **CRITICAL**: Add NOT NULL constraints to 19 critical fields
  - `workspace_id` (5 tables) - Prevent data isolation bypass
  - `created_at`, `updated_at` (5 tables) - Guarantee audit trail
  - `status` (4 tables) - Ensure business logic consistency
- Close security vulnerability: `workspace_id` could be NULL, allowing potential cross-workspace data access

### ✅ Added - 2026-03-09

#### Database Integrity

- Add 12/12 P0 Foreign Keys (100% critical FK coverage)
  - `payment_request_items` → `suppliers`
  - `payment_requests` → `suppliers`, `tours`, `orders`
  - `receipts` → `orders`, `customers`
  - `tour_members` → `customers`, `tours`
  - `quotes` → `customers`, `tours`
  - `order_members` → `customers`, `orders`
- Add 32 CHECK constraints for UUID format validation
- Add 12 core indexes for query performance
  - Workspace + Status composite indexes
  - FK column indexes (JOIN performance)
  - Date range indexes

#### Schema Unification

- Unify FK column types (40 uuid → text for consistency)
- Rebuild 8 RLS policies (tour_members, order_members)
- Rebuild 1 view (my_erp_tours) with corrected type casting

#### Data Quality

- Clean 2 orphan records in payment_request_items
- Achieve 94.9% FK coverage (576/607 columns)

#### Documentation

- Add `COMPLETE_OPTIMIZATION_STRATEGY.md` - 60-page system optimization strategy
- Add `reports/deep-health-check-20260309.md` - Comprehensive system health report
- Add `fixes/passport-url-fix.md` - Passport URL fix documentation
- Add automated health check scripts

### 🔧 Changed - 2026-03-09

#### Improvements

- Extend passport signed URL validity from 1 year to 10 years
  - Temporary solution until dynamic URL generation is implemented
  - See `fixes/passport-url-fix.md` for future optimization plan

### 📊 Statistics - 2026-03-09

- Foreign Key Coverage: 66% → 94.9%
- NOT NULL Constraints: 0 → 19 (critical fields)
- CHECK Constraints: 0 → 32 (UUID format)
- Core Indexes: Added 12
- Orphan Records: 2 → 0
- Data Isolation: ⚠️ Vulnerable → ✅ Enforced

---

## Version History

### [0.1.0] - Initial Development

- ERP基礎架構建立
- 旅遊團管理功能
- 訂單處理流程
- 財務模組
- 工作區協作

---

## Migration Files (2026-03-09)

1. `20260309073000_cleanup_orphan_records.sql`
2. `20260309074000_schema_integrity_fix_complete.sql`
3. `20260309075000_complete_fk_fix_with_policies.sql`
4. `20260309080000_add_not_null_constraints.sql`

---

## Credits

- **Lead Engineer**: Matthew (馬修)
- **Date**: 2026-03-09
- **Time**: 2 hours
- **Risk Level**: Low (fully verified)
- **Status**: ✅ Production Ready

---

[Unreleased]: https://github.com/venturo/venturo-aierp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/venturo/venturo-aierp/releases/tag/v0.1.0
