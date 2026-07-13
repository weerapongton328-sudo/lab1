import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 1. Users & RBAC (Role-Based Access Control) Table
// Supports: admin, manager, cashier
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  username: text('username').notNull().unique(),
  password: text('password').notNull().default('1234'),
  name: text('name').notNull(),
  role: text('role').notNull().default('cashier'), // 'admin' | 'manager' | 'cashier'
  isActive: boolean('is_active').notNull().default(true),
  canAccessPos: boolean('can_access_pos').notNull().default(true),
  canManageBackend: boolean('can_manage_backend').notNull().default(false),
  canManageStock: boolean('can_manage_stock').notNull().default(false),
  canManagePromotions: boolean('can_manage_promotions').notNull().default(false),
  canViewHistory: boolean('can_view_history').notNull().default(false),
  canViewReports: boolean('can_view_reports').notNull().default(false),
  canVoidBill: boolean('can_void_bill').notNull().default(false), // Role-based Access Control
  canManualDiscount: boolean('can_manual_discount').notNull().default(false), // Role-based Access Control
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 1.5. Product Categories Table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 2. Core Products Table (Represents the product itself)
// Represents stock in the lowest possible unit (e.g., pieces / "ชิ้น")
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  baseUnit: text('base_unit').notNull().default('ชิ้น'), // Lowest unit name (e.g., "ชิ้น", "ตัว", "ขวด")
  stockQuantity: integer('stock_quantity').notNull().default(0), // Total stock represented in baseUnit (lowest unit)
  minStock: integer('min_stock').notNull().default(10), // Warning threshold for near-out-of-stock
  imageUrl: text('image_url'), // Optional product image
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  category: text('category').notNull().default('ทั่วไป'), // Category of product (kept for backwards compatibility)
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 3. Product Units Table (Multi-unit mapping: piece, pack, carton)
// Defines barcodes and pricing for each presentation unit (e.g. 1 Carton = 4 Packs = 24 Pieces)
export const productUnits = pgTable('product_units', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  unitName: text('unit_name').notNull(), // Presentation name (e.g., "ชิ้น", "แพ็ค", "ลัง")
  barcode: text('barcode').notNull().unique(), // Scanning barcode for this presentation
  conversionFactor: integer('conversion_factor').notNull().default(1), // Multiplying factor to the lowest base unit
  retailPrice: numeric('retail_price', { precision: 12, scale: 2 }).notNull(), // Retail sale price
  wholesalePrice: numeric('wholesale_price', { precision: 12, scale: 2 }).notNull(), // Wholesale sale price
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'), // Base cost of this presentation
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 4. Bundles Table (Promotional Gift Sets / Bundles)
// Bundles can be scanned directly via a bundle barcode
export const bundles = pgTable('bundles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode').notNull().unique(), // Scan barcode for the bundle
  price: numeric('price', { precision: 12, scale: 2 }).notNull(), // Bundle selling price
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 5. Bundle Items Table (Mapping product units inside a bundle)
export const bundleItems = pgTable('bundle_items', {
  id: serial('id').primaryKey(),
  bundleId: integer('bundle_id')
    .references(() => bundles.id, { onDelete: 'cascade' })
    .notNull(),
  productUnitId: integer('product_unit_id')
    .references(() => productUnits.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: integer('quantity').notNull().default(1), // Quantity of this presentation unit inside the bundle
});

// 6. Sales / Orders Table
// Includes credentials from Cashier and void transactions authorized by Admin/Manager
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  billNumber: text('bill_number').notNull().unique(), // e.g. POS-20260623-0001
  cashierId: integer('cashier_id')
    .references(() => users.id)
    .notNull(),
  saleType: text('sale_type').notNull().default('retail'), // 'retail' (ปลีก) | 'wholesale' (ส่ง)
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(), // Subtotal after discounts
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  receivedAmount: numeric('received_amount', { precision: 12, scale: 2 }).notNull(),
  changeAmount: numeric('change_amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' (เงินสด) | 'transfer' (โอนเงิน)
  splitCashAmount: numeric('split_cash_amount', { precision: 12, scale: 2 }),
  splitTransferAmount: numeric('split_transfer_amount', { precision: 12, scale: 2 }),
  splitWelfareAmount: numeric('split_welfare_amount', { precision: 12, scale: 2 }),
  roundingDiff: text('rounding_diff').notNull().default('0.00'),
  status: text('status').notNull().default('completed'), // 'completed' | 'voided'
  voidedBy: integer('voided_by')
    .references(() => users.id), // Authorized Admin/Manager who canceled the bill
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
  taxInvoiceNumber: text('tax_invoice_number'), // For Full Tax Invoice
  taxInvoiceDetails: text('tax_invoice_details'), // JSON string: { name, address, taxId, phone, branch }
  vatAmount: numeric('vat_amount', { precision: 12, scale: 2 }), // For Full Tax Invoice
  subtotalBeforeVat: numeric('subtotal_before_vat', { precision: 12, scale: 2 }), // For Full Tax Invoice
  memberId: integer('member_id').references(() => members.id, { onDelete: 'set null' }),
  pointsEarned: integer('points_earned').default(0),
  pointsRedeemed: integer('points_redeemed').default(0),
  debtorId: integer('debtor_id').references(() => debtors.id, { onDelete: 'set null' }),
  shiftId: integer('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 7. Order Items Table
// Tracks exact sales. Records snapshots of prices and conversions for auditing.
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id), // Nullable if direct bundle item, but useful for statistics
  productUnitId: integer('product_unit_id')
    .references(() => productUnits.id), // Selected selling unit
  bundleId: integer('bundle_id')
    .references(() => bundles.id), // Selected bundle sold (if applicable)
  unitName: text('unit_name').notNull(), // Snapshot of unit presentation (e.g. ชิ้น, แพ็ค, ลัง, "ชุดโปรโมชั่น")
  quantity: integer('quantity').notNull(), // Sold volume of this item/bundle
  pricePerUnit: numeric('price_per_unit', { precision: 12, scale: 2 }).notNull(), // Snapshot price at purchase time
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  conversionFactor: integer('conversion_factor').notNull().default(1), // Snapshot conversion factor at sale time (used for re-calculating stock cuts if needed)
});

// 8. Void & Price Override Audit Logs
// Strictly logs unauthorized behaviors approved by Admin/Manager
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actionType: text('action_type').notNull(), // 'void_order' | 'price_override' | 'stock_adjustment'
  orderId: integer('order_id')
    .references(() => orders.id),
  authorizedBy: integer('authorized_by')
    .references(() => users.id)
    .notNull(), // Admin/Manager who approved the override
  performedBy: integer('performed_by')
    .references(() => users.id)
    .notNull(), // Cashier on duty
  details: text('details').notNull(), // Explaining the override event
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 8.5 Suppliers Table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 9. Stock-In / Inbound Logs
export const stockInLogs = pgTable('stock_in_logs', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  productUnitId: integer('product_unit_id')
    .references(() => productUnits.id, { onDelete: 'set null' }),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(), // Received presentation units volume (e.g. 5)
  unitName: text('unit_name').notNull(), // Snapshot unit name (e.g. "ลัง")
  conversionFactor: integer('conversion_factor').notNull().default(1), // multiplier
  baseQuantityAdded: integer('base_quantity_added').notNull(), // standard items count added
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'), // Cost at inbound lot
  lotNumber: text('lot_number'),
  expiryDate: timestamp('expiry_date'),
  receivedBy: integer('received_by')
    .references(() => users.id)
    .notNull(), // Cashier/Manager on duty
  receivedAt: timestamp('received_at').notNull() .defaultNow() , // custom time received
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 9.5. Promotions Table
// Supports: quantity_discount (Type A) and buy_x_get_y (Type B) automatic calculations
export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'quantity_discount' | 'buy_x_get_y' | 'set_discount' | 'cart_discount' | 'step_discount'
  applyTo: text('apply_to').notNull().default('product'), // 'product' | 'category' | 'custom_set' | 'all'
  productUnitId: integer('product_unit_id')
    .references(() => productUnits.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'cascade' }),
  customProductUnitIds: text('custom_product_unit_ids'), // stored as JSON array string "[1, 2, 3]"
  minQuantity: integer('min_quantity').notNull().default(1),
  discountPerUnit: numeric('discount_per_unit', { precision: 12, scale: 2 }).default('0.00'),
  discountPercent: numeric('discount_percent', { precision: 12, scale: 2 }), // For percentage discounts
  minimumAmount: numeric('minimum_amount', { precision: 12, scale: 2 }), // For cart total minimums
  freeProductUnitId: integer('free_product_unit_id')
    .references(() => productUnits.id, { onDelete: 'set null' }),
  freeQuantity: integer('free_quantity').default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 10. Store Settings Table
export const storeSettings = pgTable('store_settings', {
  id: integer('id').primaryKey().default(1), // Lock to ID 1
  name: text('name').notNull().default('NS EASY MINIMART'),
  address: text('address').notNull().default('123/45 ถนนรักแผ่นดิน ดินแดง กรุงเทพฯ 10400'),
  phone: text('phone').notNull().default('02-123-4567'),
  taxId: text('tax_id').notNull().default('1234567890123'),
  logoUrl: text('logo_url').default('/logo.svg'),
  receiptFooter: text('receipt_footer').notNull().default('*** ขอบคุณที่มาอุดหนุน ***\nระบบ NS Easy Store POS Terminal-Ready'),
  receiptHeader: text('receipt_header').notNull().default('ใบเสร็จรับเงิน/ใบส่งของ'),
  taxInvoiceHeader: text('tax_invoice_header').notNull().default('ใบกำกับภาษีเต็มรูป'),
  allowNegativeStock: boolean('allow_negative_stock').notNull().default(false),
  pointsToDiscountRatio: numeric('points_to_discount_ratio', { precision: 12, scale: 2 }).notNull().default('0.10'), // 10 points = 1 THB default
  pointsEarnRatio: text('points_earn_ratio').notNull().default('20.00'), // 20 THB = 1 point default
  enableBillPayment: boolean('enable_bill_payment').notNull().default(true),
  billPaymentFee: text('bill_payment_fee').notNull().default('10.00'),
  roundingMode: text('rounding_mode').notNull().default('none'), // 'none', 'floor', 'ceil', 'round', 'round_025'
  billRoundingMode: text('bill_rounding_mode').notNull().default('none'), // 'none', 'floor', 'ceil', 'round', 'round_025'
  alertSoundUrl: text('alert_sound_url'),
  promptpayEnabled: boolean('promptpay_enabled').notNull().default(false),
  promptpayNumber: text('promptpay_number'),
  promptpayName: text('promptpay_name'),
  promptpayQrUrl: text('promptpay_qr_url'),
  enableAdvancedInventory: boolean('enable_advanced_inventory').notNull().default(false),
  enableTaxInvoice: boolean('enable_tax_invoice').notNull().default(false),
  vatRate: text('vat_rate').notNull().default('7.00'),
  vatType: text('vat_type').notNull().default('include'), // 'include' | 'exclude'
  enableWeightBarcode: boolean('enable_weight_barcode').notNull().default(false),
  weightBarcodePrefix: text('weight_barcode_prefix').notNull().default('20'),
  weightBarcodeType: text('weight_barcode_type').notNull().default('weight'), // 'weight' or 'price'
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 11. Bill Payments Table
export const billPayments = pgTable('bill_payments', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(), // e.g. BP-20260623-0001
  billType: text('bill_type').notNull(), // 'PEA' (กฟภ), 'MEA' (กฟน), 'PWA' (กปภ), 'MWA' (กปน), etc.
  referenceNumber: text('reference_number'), // Ref 1 / Ref 2 or Barcode (Optional)
  customerName: text('customer_name').notNull().default('ลูกค้าทั่วไป'), // Owner of the bill
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  fee: text('fee').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  roundingDiff: text('rounding_diff').notNull().default('0.00'),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash', 'transfer'
  cashierId: integer('cashier_id').references(() => users.id).notNull(),
  shiftId: integer('shift_id').references(() => shifts.id),
  status: text('status').notNull().default('completed'), // 'completed', 'voided'
  voidedBy: integer('voided_by').references(() => users.id),
  voidedAt: timestamp('voided_at'),
  createdAt: timestamp('created_at') .defaultNow() .notNull(),
});

// --- Relations Setup ---

export const usersRelations = relations(users, ({ many }) => ({
  ordersHandled: many(orders, { relationName: 'cashierSales' }),
  ordersVoided: many(orders, { relationName: 'managerVoids' }),
  actionsAuthorized: many(auditLogs, { relationName: 'authorizations' }),
  actionsPerformed: many(auditLogs, { relationName: 'performances' }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  units: many(productUnits),
  salesItems: many(orderItems),
}));

export const productUnitsRelations = relations(productUnits, ({ one, many }) => ({
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
  bundleItems: many(bundleItems),
  orderItems: many(orderItems),
}));

export const bundlesRelations = relations(bundles, ({ many }) => ({
  items: many(bundleItems),
  orderItems: many(orderItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleItems.bundleId],
    references: [bundles.id],
  }),
  productUnit: one(productUnits, {
    fields: [bundleItems.productUnitId],
    references: [productUnits.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  cashier: one(users, {
    fields: [orders.cashierId],
    references: [users.id],
    relationName: 'cashierSales',
  }),
  voidManager: one(users, {
    fields: [orders.voidedBy],
    references: [users.id],
    relationName: 'managerVoids',
  }),
  items: many(orderItems),
  logs: many(auditLogs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  parentProduct: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  parentProductUnit: one(productUnits, {
    fields: [orderItems.productUnitId],
    references: [productUnits.id],
  }),
  parentBundle: one(bundles, {
    fields: [orderItems.bundleId],
    references: [bundles.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  order: one(orders, {
    fields: [auditLogs.orderId],
    references: [orders.id],
  }),
  authorizer: one(users, {
    fields: [auditLogs.authorizedBy],
    references: [users.id],
    relationName: 'authorizations',
  }),
  performer: one(users, {
    fields: [auditLogs.performedBy],
    references: [users.id],
    relationName: 'performances',
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  stockIns: many(stockInLogs),
}));

export const stockInLogsRelations = relations(stockInLogs, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [stockInLogs.supplierId],
    references: [suppliers.id],
  }),
}));

// 11. Members (Loyalty CRM)
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  points: integer('points').notNull().default(0),
  isDebtor: boolean('is_debtor').notNull().default(false),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 12. Debtors (Credit Sales Management)
export const debtors = pgTable('debtors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('10000.00'),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

// 13. Debtor Payments
export const debtorPayments = pgTable('debtor_payments', {
  id: serial('id').primaryKey(),
  debtorId: integer('debtor_id'),
  memberId: integer('member_id'), // Use this now
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' | 'transfer'
  recordedBy: integer('recorded_by')
    .references(() => users.id)
    .notNull(),
  receiptNumber: text('receipt_number'),
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 14. Shifts (Shift Management)
export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  cashierId: integer('cashier_id')
    .references(() => users.id)
    .notNull(),
  startTime: timestamp('start_time').notNull() .defaultNow() ,
  endTime: timestamp('end_time'),
  startCash: numeric('start_cash', { precision: 12, scale: 2 }).notNull().default('0.00'),
  endCash: numeric('end_cash', { precision: 12, scale: 2 }),
  actualCash: numeric('actual_cash', { precision: 12, scale: 2 }),
  difference: text('difference'),
  status: text('status').notNull().default('open'), // 'open' | 'closed'
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 15. Expenses & Purchases (เอาเงินออกไปซื้อของ / ค่าใช้จ่าย)
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  shiftId: integer('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('general'), // 'restock' | 'general' | 'utility' | 'other'
  recordedBy: integer('recorded_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at') .defaultNow() ,
});

// 16. Purchase Orders (PO)
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  prId: integer('pr_id'), // Removed references to avoid circular dependency in same file without types, wait, references is fine if table is declared, but it's declared after. I will just declare it as integer.
  poNumber: text('po_number').notNull().unique(), // e.g. PO-20260627-0001
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'received' | 'cancelled'
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  poId: integer('po_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id),
  productUnitId: integer('product_unit_id').references(() => productUnits.id),
  quantity: integer('quantity').notNull(),
  receivedQuantity: integer('received_quantity').notNull().default(0),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  creator: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.poId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
  productUnit: one(productUnits, {
    fields: [purchaseOrderItems.productUnitId],
    references: [productUnits.id],
  }),
}));

export const purchaseRequisitions = pgTable('purchase_requisitions', {
  id: serial('id').primaryKey(),
  prNumber: text('pr_number').notNull().unique(), // PR-XXXX
  requestedBy: integer('requested_by').references(() => users.id).notNull(),
  department: text('department'),
  reason: text('reason'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'ordered'
  requiredDate: timestamp('required_date'),
  createdAt: timestamp('created_at') .defaultNow() ,
  updatedAt: timestamp('updated_at') .defaultNow() ,
});

export const purchaseRequisitionItems = pgTable('purchase_requisition_items', {
  id: serial('id').primaryKey(),
  prId: integer('pr_id').references(() => purchaseRequisitions.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id),
  productUnitId: integer('product_unit_id').references(() => productUnits.id),
  quantity: integer('quantity').notNull(),
  estimatedPrice: numeric('estimated_price', { precision: 12, scale: 2 }),
});

export const goodsReceipts = pgTable('goods_receipts', {
  id: serial('id').primaryKey(),
  grNumber: text('gr_number').notNull().unique(), // GR-XXXX
  poId: integer('po_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  receivedBy: integer('received_by').references(() => users.id).notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  status: text('status').notNull().default('completed'), // 'completed' | 'cancelled'
  note: text('note'),
  receivedAt: timestamp('received_at') .defaultNow() ,
  createdAt: timestamp('created_at') .defaultNow() ,
});

export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id: serial('id').primaryKey(),
  grId: integer('gr_id').references(() => goodsReceipts.id, { onDelete: 'cascade' }).notNull(),
  poItemId: integer('po_item_id').references(() => purchaseOrderItems.id),
  productId: integer('product_id').references(() => products.id),
  productUnitId: integer('product_unit_id').references(() => productUnits.id),
  quantity: integer('quantity').notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
});
