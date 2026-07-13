import "dotenv/config";
process.env.TZ = "Asia/Bangkok";
const getBangkokDateString = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};
const getBangkokLocalStartAndEnd = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== "string") {
    return { start: new Date(), end: new Date() };
  }
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start, end };
};
import express from "express";
import path from "path";
import fs from "fs";
import iconv from "iconv-lite";
import { db } from "./src/db/index.ts";
import {
  users,
  products,
  productUnits,
  orders,
  orderItems,
  bundles,
  bundleItems,
  auditLogs,
  categories,
  stockInLogs,
  storeSettings,
  promotions,
  members,
  debtors,
  debtorPayments,
  shifts,
  suppliers,
  billPayments,
  expenses,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  purchaseRequisitions,
  purchaseRequisitionItems,
} from "./src/db/schema.ts";
import { eq, desc, sql, and, lte, gte, like, isNotNull, or, inArray } from "drizzle-orm";
import net from "net";

import { migrate } from 'drizzle-orm/pglite/migrator';

async function runMigrations() {
  console.log("Running database migrations...");
  try {
    // Look for migrations relative to the current file or CWD
    const migrationsPath = path.join(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("Database migrations completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Helper for generating custom human-identifiable codes
const generateBillNumber = async (txClient?: any) => {
  const client = txClient || db;
  const dateStr = getBangkokDateString().replace(/-/g, ""); // "20260623"
  // Let's count today's bills for the suffix
  const prefix = `POS-${dateStr}`;
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(sql`bill_number LIKE ${prefix + "%"}`);
  
  const nextNum = (countResult[0]?.count || 0) + 1;
  const suffix = nextNum.toString().padStart(4, "0");
  return `${prefix}-${suffix}`;
};

// Seed endpoint to populate mock database if empty
app.post("/api/health", (req, res) => {
  console.log("FRONTEND ERROR:", req.body);
  res.json({ ok: true });
});

app.get("/api/db-health", async (req, res) => {
  try {
    const start = Date.now();
    const result = await db.execute(sql`SELECT NOW()`);
    res.json({
      status: "connected",
      latencyMs: Date.now() - start,
      time: result.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message,
      stack: err.stack,
      cause: err.cause ? err.cause.message : null
    });
  }
});

export async function seedDatabase() {
  // 1. Seed users if not exists
    const existingUsers = await db.select().from(users);
    let cashierUser, managerUser, adminUser;
    
    if (existingUsers.length === 0) {
      try {
        const seeded = await db.insert(users).values([
          {
            uid: "worker-cashier-3333",
            username: "cashier",
            password: "1234",
            name: "พิมพา เจริญสุข (พนักงานขาย)",
            role: "cashier",
            isActive: true,
            canAccessPos: true,
            canManageBackend: false,
            canManageStock: false,
            canManagePromotions: false,
            canViewHistory: false,
            canViewReports: false,
          },
          {
            uid: "worker-manager-2222",
            username: "manager",
            password: "1234",
            name: "วรวิทย์ พรมดี (ผู้จัดการ)",
            role: "manager",
            isActive: true,
            canAccessPos: true,
            canManageBackend: false,
            canManageStock: true,
            canManagePromotions: false,
            canViewHistory: true,
            canViewReports: false,
          },
          {
            uid: "worker-admin-1111",
            username: "admin",
            password: "1234",
            name: "สมศักดิ์ รักไทย (เจ้าของร้าน)",
            role: "owner",
            isActive: true,
            canAccessPos: true,
            canManageBackend: true,
            canManageStock: true,
            canManagePromotions: true,
            canViewHistory: true,
            canViewReports: true,
          },
        ]).returning();
        cashierUser = seeded[0];
        managerUser = seeded[1];
        adminUser = seeded[2];
      } catch (insertErr) {
        // Handle concurrent insertions
        const freshUsers = await db.select().from(users);
        cashierUser = freshUsers.find(u => u.role === "cashier") || freshUsers[0];
        managerUser = freshUsers.find(u => u.role === "manager") || freshUsers[0];
        adminUser = freshUsers.find(u => u.role === "owner" || u.role === "admin") || freshUsers[0];
      }
    } else {
      cashierUser = existingUsers.find(u => u.role === "cashier") || existingUsers[0];
      managerUser = existingUsers.find(u => u.role === "manager") || existingUsers[0];
      adminUser = existingUsers.find(u => u.role === "owner" || u.role === "admin") || existingUsers[0];
    }

    // 1.5. Seed Product Categories if empty
    const existingCats = await db.select().from(categories);
    let dryFoodCat, alcoholCat, beverageCat, generalCat;
    if (existingCats.length === 0) {
      const seededCats = await db.insert(categories).values([
        { name: "อาหารแห้ง" },
        { name: "เครื่องดื่มมึนเมา" },
        { name: "เครื่องดื่ม" },
        { name: "ของใช้ในบ้าน" },
        { name: "ทั่วไป" },
      ]).returning();
      dryFoodCat = seededCats[0];
      alcoholCat = seededCats[1];
      beverageCat = seededCats[2];
      generalCat = seededCats[4];
    } else {
      dryFoodCat = existingCats.find(c => c.name === "อาหารแห้ง") || existingCats[0];
      alcoholCat = existingCats.find(c => c.name === "เครื่องดื่มมึนเมา") || existingCats[0];
      beverageCat = existingCats.find(c => c.name === "เครื่องดื่ม") || existingCats[0];
      generalCat = existingCats.find(c => c.name === "ทั่วไป") || existingCats[0];
    }

    // 2. Seed realistic Thai minmart products
    const existingProducts = await db.select().from(products);
    if (existingProducts.length === 0) {
      // Mama Noodles
      const [p1] = await db.insert(products).values({
        name: "บะหมี่กึ่งสำเร็จรูป มาม่า รสต้มยำกุ้ง",
        description: "บะหมี่กึ่งสำเร็จรูปที่ขายดีที่สุด เผ็ดร้อน จัดจ้าน",
        baseUnit: "ซอง",
        stockQuantity: 480, // e.g. 10 cartons (480 packs)
        minStock: 50,
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=300&auto=format&fit=crop",
        categoryId: dryFoodCat.id,
        category: "อาหารแห้ง",
      }).returning();

      // Product units for Mama Noodles
      await db.insert(productUnits).values([
        {
          productId: p1.id,
          unitName: "ซอง",
          barcode: "8850100789012",
          conversionFactor: 1,
          retailPrice: "10.00",
          wholesalePrice: "9.50",
          costPrice: "7.00",
        },
        {
          productId: p1.id,
          unitName: "แพ็ค (6 ซอง)",
          barcode: "8850100789029",
          conversionFactor: 6,
          retailPrice: "57.00", // (9.5 per pack)
          wholesalePrice: "54.00", // (9.0 per pack)
          costPrice: "42.00",
        },
        {
          productId: p1.id,
          unitName: "ลัง (30 ซอง)",
          barcode: "8850100789036",
          conversionFactor: 30,
          retailPrice: "270.00", // (9.00 per pack)
          wholesalePrice: "255.00", // (8.50 per pack)
          costPrice: "210.00",
        },
      ]);

      // Chang Beer
      const [p2] = await db.insert(products).values({
        name: "เบียร์ช้าง (Chang Beer) Classic",
        description: "เบียร์กระป๋องคลาสสิก ปริมาตรสุทธิ 490 มล.",
        baseUnit: "กระป๋อง",
        stockQuantity: 120, // 5 cartons / 24 cans
        minStock: 24,
        imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=300&auto=format&fit=crop",
        categoryId: alcoholCat.id,
        category: "เครื่องดื่มมึนเมา",
      }).returning();

      await db.insert(productUnits).values([
        {
          productId: p2.id,
          unitName: "กระป๋อง",
          barcode: "8851993110214",
          conversionFactor: 1,
          retailPrice: "40.00",
          wholesalePrice: "38.00",
          costPrice: "34.00",
        },
        {
          productId: p2.id,
          unitName: "แพ็ค (4 กระป๋อง)",
          barcode: "8851993110221",
          conversionFactor: 4,
          retailPrice: "155.00",
          wholesalePrice: "148.00",
          costPrice: "132.00",
        },
        {
          productId: p2.id,
          unitName: "ลัง (24 กระป๋อง)",
          barcode: "8851993110238",
          conversionFactor: 24,
          retailPrice: "900.00",
          wholesalePrice: "850.00",
          costPrice: "780.00",
        },
      ]);

      // Drinking Water
      const [p3] = await db.insert(products).values({
        name: "น้ำดื่ม คริสตัล 1500 มล.",
        description: "น้ำดื่มสะอาดคุณภาพมาตรฐานสากล คริสตัล",
        baseUnit: "ขวด",
        stockQuantity: 180, // 30 packs
        minStock: 30,
        imageUrl: "https://images.unsplash.com/photo-1608885898957-a599fb18fc3f?q=80&w=300&auto=format&fit=crop",
        categoryId: beverageCat.id,
        category: "เครื่องดื่ม",
      }).returning();

      await db.insert(productUnits).values([
        {
          productId: p3.id,
          unitName: "ขวด",
          barcode: "8851012111017",
          conversionFactor: 1,
          retailPrice: "15.00",
          wholesalePrice: "14.00",
          costPrice: "10.00",
        },
        {
          productId: p3.id,
          unitName: "แพ็ค (6 ขวด)",
          barcode: "8851012111024",
          conversionFactor: 6,
          retailPrice: "75.00",
          wholesalePrice: "70.00",
          costPrice: "52.00",
        },
      ]);

      // Coca-Cola Classic
      const [p4] = await db.insert(products).values({
        name: "โค้ก ออริจินัล 325 มล.",
        description: "น้ำอัดลมรสชาติอร่อยซ่า สดชื่นสะใจแบบคลาสสิก",
        baseUnit: "กระป๋อง",
        stockQuantity: 240, 
        minStock: 48,
        imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=300&auto=format&fit=crop",
        categoryId: beverageCat.id,
        category: "เครื่องดื่ม",
      }).returning();

      await db.insert(productUnits).values([
        {
          productId: p4.id,
          unitName: "กระป๋อง",
          barcode: "8851952350231",
          conversionFactor: 1,
          retailPrice: "15.00",
          wholesalePrice: "14.00",
          costPrice: "11.00",
        },
        {
          productId: p4.id,
          unitName: "แพ็ค (6 กระป๋อง)",
          barcode: "8851952350248",
          conversionFactor: 6,
          retailPrice: "85.00",
          wholesalePrice: "80.00",
          costPrice: "64.00",
        },
        {
          productId: p4.id,
          unitName: "ลัง (24 กระป๋อง)",
          barcode: "8851952350255",
          conversionFactor: 24,
          retailPrice: "330.00",
          wholesalePrice: "310.00",
          costPrice: "240.00",
        },
      ]);

      // Seed a Bundle Promo set (party set)
      const [uClassicBeerCarton] = await db
        .select()
        .from(productUnits)
        .where(eq(productUnits.barcode, "8851993110238")); // Carton Chang Beer (24 cans)
      const [uCokePack] = await db
        .select()
        .from(productUnits)
        .where(eq(productUnits.barcode, "8851952350248")); // Pack of Coke (6 cans)

      if (uClassicBeerCarton && uCokePack) {
        const [bundleSet] = await db.insert(bundles).values({
          name: "ชุดปาร์ตี้สุดคุ้ม (เบียร์ช้าง 1 ลัง + โค้ก 2 แพ็ค)",
          barcode: "9900100200301",
          price: "1050.00", // (Normal value: 900 + 85 + 85 = 1070. discount 20 thb)
          description: "ชุดรวมเพื่อการสังสรรค์ในราคาพิเศษ ประหยัดคุ้มค่าใจดี",
          isActive: true,
        }).returning();

        await db.insert(bundleItems).values([
          {
            bundleId: bundleSet.id,
            productUnitId: uClassicBeerCarton.id,
            quantity: 1,
          },
          {
            bundleId: bundleSet.id,
            productUnitId: uCokePack.id,
            quantity: 2,
          }
        ]);
      }
    }

    // 2.5. Seed default promotions if promotions table is empty
    const existingPromos = await db.select().from(promotions);
    if (existingPromos.length === 0) {
      const dbUnits = await db.select().from(productUnits);
      const mamaUnit = dbUnits.find(u => u.barcode === "8850100789012"); // "ซอง"
      const beerUnit = dbUnits.find(u => u.barcode === "8851993110214"); // "กระป๋อง"
      const cokeUnit = dbUnits.find(u => u.barcode === "8851952350231"); // "กระป๋อง"

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // active for 1 year

      const promoValues = [];
      if (mamaUnit) {
        promoValues.push({
          name: "โปรโมชั่น มาม่าต้มยำกุ้ง ซื้อ 3 ชิ้น ลดทันทีชิ้นละ 1 บาท",
          description: "ซื้อบะหมี่กึ่งสำเร็จรูป มาม่า รสต้มยำกุ้ง ครบ 3 ชิ้น/ซองขึ้นไป ได้รับส่วนลดชิ้นละ 1 บาทโดยอัตโนมัติ",
          type: "quantity_discount",
          productUnitId: mamaUnit.id,
          minQuantity: 3,
          discountPerUnit: "1.00",
          startDate,
          endDate,
          isActive: true
        });
      }

      if (beerUnit && cokeUnit) {
        promoValues.push({
          name: "โปรโมชั่น เบียร์ช้าง 2 กระป๋อง แถมฟรี โค้ก 1 กระป๋อง",
          description: "ซื้อเบียร์ช้าง (Chang Beer) Classic ครบ 2 กระป๋อง แถมฟรีทันที โค้ก ออริจินัล 1 กระป๋อง (ปรับราคาของแถมเป็น 0 บาทให้อัตโนมัติ)",
          type: "buy_x_get_y",
          productUnitId: beerUnit.id,
          minQuantity: 2,
          freeProductUnitId: cokeUnit.id,
          freeQuantity: 1,
          startDate,
          endDate,
          isActive: true
        });
      }

      if (promoValues.length > 0) {
        await db.insert(promotions).values(promoValues);
      }
    }
}

app.post("/api/seed", async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: "Seeding complete!" });
  } catch (error: any) {
    console.error("Seeding failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET users
app.get("/api/users", async (req, res) => {
  try {
    const list = await db.select().from(users).where(eq(users.isActive, true));
    res.json(list);
  } catch (err: any) {
    console.error("Database query for users failed, returning fallback seed users:", err.message);
    const fallbackUsers = [
      {
        id: 1,
        uid: "worker-admin-1111",
        username: "admin",
        password: "1234",
        name: "สมศักดิ์ รักไทย (เจ้าของร้าน)",
        role: "owner",
        isActive: true,
        canAccessPos: true,
        canManageBackend: true,
        canManageStock: true,
        canManagePromotions: true,
        canViewHistory: true,
        canViewReports: true,
        canVoidBill: true,
        canManualDiscount: true,
      },
      {
        id: 2,
        uid: "worker-manager-2222",
        username: "manager",
        password: "1234",
        name: "วรวิทย์ พรมดี (ผู้จัดการ)",
        role: "manager",
        isActive: true,
        canAccessPos: true,
        canManageBackend: true,
        canManageStock: true,
        canManagePromotions: true,
        canViewHistory: true,
        canViewReports: true,
        canVoidBill: true,
        canManualDiscount: true,
      },
      {
        id: 3,
        uid: "worker-cashier-3333",
        username: "cashier",
        password: "1234",
        name: "พิมพา เจริญสุข (พนักงานขาย)",
        role: "cashier",
        isActive: true,
        canAccessPos: true,
        canManageBackend: false,
        canManageStock: false,
        canManagePromotions: false,
        canViewHistory: false,
        canViewReports: false,
        canVoidBill: false,
        canManualDiscount: false,
      },
    ];
    res.json(fallbackUsers);
  }
});

// SENSITIVE ACTION APPROVAL API
// Verifies user role & credential (since we're building a simplified POS kiosk, we expect user or PIN matching)
// In a highly realistic POS system, the cashier triggers standard void login:
app.post("/api/auth/approve", async (req, res) => {
  const { userId, requiredRoles } = req.body;
  try {
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    if (!userRecord) {
      return res.status(404).json({ success: false, message: "ไม่พบพนักงาน" });
    }
    
    // Checks if the user has approval right
    if (!requiredRoles.includes(userRecord.role)) {
      return res.status(403).json({
        success: false,
        message: `สิทธิ์ของคุณ (${userRecord.role}) ไม่เพียงพอสำหรับรายการนี้ (ต้องการ: ${requiredRoles.join(", ")})`,
      });
    }

    res.json({ success: true, user: userRecord });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET products with all unit variations
app.get("/api/products", async (req, res) => {
  try {
    const allProducts = await db.select().from(products);
    const allUnits = await db.select().from(productUnits);

    const productsWithUnits = allProducts.map((p) => {
      const units = allUnits.filter((u) => u.productId === p.id);
      return {
        ...p,
        units,
      };
    });

    res.json(productsWithUnits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create fully functioning item with dynamic unit structures
app.post("/api/products", async (req, res) => {
  const { name, description, baseUnit, stockQuantity, minStock, imageUrl, categoryId, category, units } = req.body;

  try {
    // Write inside transactional query to ensure integrity
    const result = await db.transaction(async (tx) => {
      let resolvedCategoryName = category || "ทั่วไป";
      if (categoryId) {
        const [catRec] = await tx.select().from(categories).where(eq(categories.id, parseInt(categoryId)));
        if (catRec) {
          resolvedCategoryName = catRec.name;
        }
      }

      const [newProduct] = await tx
        .insert(products)
        .values({
          name,
          description,
          baseUnit: baseUnit || "ชิ้น",
          stockQuantity: parseInt(stockQuantity) || 0,
          minStock: parseInt(minStock) || 10,
          imageUrl,
          categoryId: categoryId ? parseInt(categoryId) : null,
          category: resolvedCategoryName,
        })
        .returning();

      let createdUnits = [];
      if (units && Array.isArray(units)) {
        for (const u of units) {
          const [insertedUnit] = await tx
            .insert(productUnits)
            .values({
              productId: newProduct.id,
              unitName: u.unitName,
              barcode: u.barcode,
              conversionFactor: parseInt(u.conversionFactor) || 1,
              retailPrice: u.retailPrice.toString(),
              wholesalePrice: u.wholesalePrice.toString(),
              costPrice: (u.costPrice || "0.00").toString(),
            })
            .returning();
          createdUnits.push(insertedUnit);
        }
      }

      return { ...newProduct, units: createdUnits };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create product failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import Excel products
app.post("/api/products/bulk", async (req, res) => {
  const productsArray = req.body.products;
  if (!Array.isArray(productsArray)) {
    return res.status(400).json({ error: "ข้อมูลผิดรูปแบบ (ต้องเป็น Array ของสินค้า)" });
  }

  try {
    const results = await db.transaction(async (tx) => {
      const insertedProducts = [];
      for (const prodData of productsArray) {
        let resolvedCategoryName = prodData.category || "ทั่วไป";
        let resolvedCategoryId = null;

        // Try to match or create category
        if (prodData.category) {
          const [catRec] = await tx.select().from(categories).where(eq(categories.name, prodData.category));
          if (catRec) {
            resolvedCategoryId = catRec.id;
          } else {
            const [newCat] = await tx.insert(categories).values({ name: prodData.category }).returning();
            resolvedCategoryId = newCat.id;
          }
        }

        const [newProduct] = await tx.insert(products).values({
          name: prodData.name,
          description: prodData.description || "",
          baseUnit: prodData.baseUnit || "ชิ้น",
          stockQuantity: parseInt(prodData.stockQuantity) || 0,
          minStock: parseInt(prodData.minStock) || 10,
          categoryId: resolvedCategoryId,
          category: resolvedCategoryName,
        }).returning();

        let createdUnits = [];
        if (prodData.units && Array.isArray(prodData.units)) {
          for (const u of prodData.units) {
            const [insertedUnit] = await tx.insert(productUnits).values({
              productId: newProduct.id,
              unitName: u.unitName || "ชิ้น",
              barcode: u.barcode || Date.now().toString(),
              conversionFactor: parseInt(u.conversionFactor) || 1,
              retailPrice: (u.retailPrice || "0.00").toString(),
              wholesalePrice: (u.wholesalePrice || "0.00").toString(),
              costPrice: (u.costPrice || "0.00").toString(),
            }).returning();
            createdUnits.push(insertedUnit);
          }
        }

        insertedProducts.push({ ...newProduct, units: createdUnits });
      }
      return insertedProducts;
    });

    res.status(201).json({ success: true, count: results.length, data: results });
  } catch (error: any) {
    console.error("Bulk Import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Edit existing product with custom unit replacements
app.put("/api/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id);
  const { name, description, baseUnit, stockQuantity, minStock, imageUrl, categoryId, category, units } = req.body;

  if ((stockQuantity !== undefined && parseInt(stockQuantity) < 0) || (units && Array.isArray(units) && units.some((u: any) => parseFloat(u.costPrice || "0") < 0))) {
    return res.status(400).json({ error: "Invalid value" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      let resolvedCategoryName = category || "ทั่วไป";
      if (categoryId) {
        const [catRec] = await tx.select().from(categories).where(eq(categories.id, parseInt(categoryId)));
        if (catRec) {
          resolvedCategoryName = catRec.name;
        }
      }

      const [updatedProduct] = await tx
        .update(products)
        .set({
          name,
          description,
          baseUnit,
          stockQuantity: parseInt(stockQuantity) || 0,
          minStock: parseInt(minStock) || 0,
          imageUrl,
          categoryId: categoryId ? parseInt(categoryId) : null,
          category: resolvedCategoryName,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      // For units, we delete old non-existent units and upsert current units
      await tx.delete(productUnits).where(eq(productUnits.productId, productId));

      let updatedUnits = [];
      if (units && Array.isArray(units)) {
        for (const u of units) {
          const [insertedUnit] = await tx
            .insert(productUnits)
            .values({
              productId,
              unitName: u.unitName,
              barcode: u.barcode,
              conversionFactor: parseInt(u.conversionFactor) || 1,
              retailPrice: u.retailPrice.toString(),
              wholesalePrice: u.wholesalePrice.toString(),
              costPrice: (u.costPrice || "0.00").toString(),
            })
            .returning();
          updatedUnits.push(insertedUnit);
        }
      }

      return { ...updatedProduct, units: updatedUnits };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Edit product failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product and cascade its multi-units
app.delete("/api/products/:id", async (req, res) => {
  const pId = parseInt(req.params.id);
  try {
    await db.transaction(async (tx) => {
      // Detach from history logs to preserve records but unlink the product
      await tx.update(orderItems).set({ productId: null, productUnitId: null }).where(eq(orderItems.productId, pId));
      await tx.update(purchaseOrderItems).set({ productId: null, productUnitId: null }).where(eq(purchaseOrderItems.productId, pId));
      await tx.update(purchaseRequisitionItems).set({ productId: null, productUnitId: null }).where(eq(purchaseRequisitionItems.productId, pId));
      await tx.update(goodsReceiptItems).set({ productId: null, productUnitId: null }).where(eq(goodsReceiptItems.productId, pId));
      
      // Delete structured dependencies manually if cascade isn't fully enabled
      await tx.delete(stockInLogs).where(eq(stockInLogs.productId, pId));
      
      const units = await tx.select({ id: productUnits.id }).from(productUnits).where(eq(productUnits.productId, pId));
      if (units.length > 0) {
        const unitIds = units.map(u => u.id);
        await tx.delete(bundleItems).where(inArray(bundleItems.productUnitId, unitIds));
        await tx.delete(promotions).where(inArray(promotions.productUnitId, unitIds));
      }
      
      await tx.delete(productUnits).where(eq(productUnits.productId, pId));
      
      // Finally delete the product
      await tx.delete(products).where(eq(products.id, pId));
    });
    res.json({ message: "ลบสินค้าสำเร็จ" });
  } catch (err: any) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET bundles & nested items with their associated barcodes
app.get("/api/bundles", async (req, res) => {
  try {
    const activeBundles = await db.select().from(bundles).where(eq(bundles.isActive, true));
    const items = await db.select().from(bundleItems);
    const allUnits = await db.select().from(productUnits);
    const allProducts = await db.select().from(products);

    const formatted = activeBundles.map((b) => {
      const mappedItems = items
        .filter((item) => item.bundleId === b.id)
        .map((item) => {
          const unit = allUnits.find((u) => u.id === item.productUnitId);
          const product = unit ? allProducts.find((p) => p.id === unit.productId) : null;
          return {
            ...item,
            unit,
            product,
          };
        });
      return {
        ...b,
        items: mappedItems,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Bundle Set Promotion
app.post("/api/bundles", async (req, res) => {
  const { name, barcode, price, description, items } = req.body; // items = [{ productUnitId, quantity }]
  try {
    const result = await db.transaction(async (tx) => {
      const [newBundle] = await tx
        .insert(bundles)
        .values({
          name,
          barcode,
          price: price.toString(),
          description,
          isActive: true,
        })
        .returning();

      const createdItems = [];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const [insertedItem] = await tx
            .insert(bundleItems)
            .values({
              bundleId: newBundle.id,
              productUnitId: item.productUnitId,
              quantity: parseInt(item.quantity) || 1,
            })
            .returning();
          createdItems.push(insertedItem);
        }
      }
      return { ...newBundle, items: createdItems };
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("Create bundle failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all orders history
app.get("/api/orders", async (req, res) => {
  try {
    const sales = await db.select().from(orders).orderBy(desc(orders.id));
    const items = await db.select().from(orderItems);
    const cashierUsers = await db.select().from(users);

    const ordersWithItems = sales.map((o) => {
      const orderLines = items.filter((item) => item.orderId === o.id);
      const cashierName = cashierUsers.find((u) => u.id === o.cashierId)?.name || "พนักงานทั่วไป";
      const voidManagerName = o.voidedBy
        ? cashierUsers.find((u) => u.id === o.voidedBy)?.name
        : null;

      return {
        ...o,
        cashierName,
        voidedByName: voidManagerName,
        taxInvoiceDetails: o.taxInvoiceDetails ? (typeof o.taxInvoiceDetails === "string" ? JSON.parse(o.taxInvoiceDetails) : o.taxInvoiceDetails) : null,
        items: orderLines,
      };
    });

    res.json(ordersWithItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CHECKOUT API (Submit Sale & Decrement inventory)
// Highly authentic POS sale controller! Matches "Multi-unit Stock proper decrement"
app.post("/api/orders", async (req, res) => {
  const {
    cashierId,
    saleType, // 'retail' (ปลีก) | 'wholesale' (ส่ง)
    discount,
    receivedAmount,
    paymentMethod,
    splitCashAmount,
    splitTransferAmount,
    splitWelfareAmount,
    items, // array of { type: 'unit'|'bundle', id: number(unitId or bundleId), qty: number, finalPrice: string }
    memberId,
    pointsRedeemed,
    debtorId,
    shiftId,
    clientCreatedAt,
  } = req.body;

  try {
    const finalOrder = await db.transaction(async (tx) => {
      // 0. Fetch store settings to check if negative stock is allowed
      const settingsList = await tx.select().from(storeSettings).where(eq(storeSettings.id, 1));
      const allowNegative = settingsList[0]?.allowNegativeStock ?? false;

      // 0.5 Pessimistic row lock to prevent race conditions during concurrent checkouts (concurrency)
      const dbProducts = await tx.select().from(products).for("update");
      const dbUnits = await tx.select().from(productUnits);
      const dbBundles = await tx.select().from(bundles);

      // Check shift status if shiftId is provided
      if (shiftId) {
        const activeShifts = await tx.select().from(shifts).where(eq(shifts.id, shiftId));
        if (activeShifts.length > 0 && activeShifts[0].status === "closed") {
          throw new Error("กะของท่านได้ถูกปิดไปแล้ว ไม่สามารถขายสินค้าได้ โปรดเข้ากะใหม่อีกครั้ง");
        }
      }

      // Check Member
      let activeMember = null;
      if (memberId) {
        const memberList = await tx.select().from(members).where(eq(members.id, memberId)).for("update");
        if (memberList.length > 0) {
          activeMember = memberList[0];
        }
      }

      if (paymentMethod === "credit") {
        if (!activeMember) {
           throw new Error("การจ่ายเชื่อ (เงินเชื่อ) จำเป็นต้องระบุสมาชิก/ลูกหนี้");
        }
        if (!activeMember.isDebtor) {
           throw new Error(`สมาชิก ${activeMember.name} ไม่ได้เปิดใช้งานระบบลูกหนี้/เงินเชื่อ`);
        }
      }

      let computedTotal = 0;
      const resolvedLines = [];

      for (const line of items) {
        if (line.type === "unit") {
          const unit = dbUnits.find(u => u.id === line.id);
          const p = unit ? dbProducts.find(prod => prod.id === unit.productId) : null;
          if (!unit || !p) {
            throw new Error(`ไม่พบหน่วยสินค้าที่เลือกขาย (ID: ${line.id})`);
          }

          // Choose price depending on saleType
          const rawPrice = saleType === "wholesale" ? unit.wholesalePrice : unit.retailPrice;
          const finalPricePerUnit = line.overridePrice !== undefined ? line.overridePrice : parseFloat(rawPrice);
          const subtotalLine = finalPricePerUnit * line.qty;
          computedTotal += subtotalLine;

          resolvedLines.push({
            productId: p.id,
            productUnitId: unit.id,
            bundleId: null,
            unitName: `${p.name} [${unit.unitName}]`,
            quantity: line.qty,
            pricePerUnit: finalPricePerUnit.toFixed(2),
            subtotal: subtotalLine.toFixed(2),
            conversionFactor: unit.conversionFactor,
            totalBaseUnitDec: line.qty * unit.conversionFactor, // pieces to cut from products
          });

          // Check stock availability strictly to prevent negative stock and enforce real-time transactions with ACID rollback
          const newQty = p.stockQuantity - (line.qty * unit.conversionFactor);
          if (newQty < 0 && !allowNegative) {
            throw new Error(`สินค้า "${p.name}" ในคลังมีสต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${p.stockQuantity} ${p.baseUnit}, ขาดอีก ${Math.abs(newQty)} ${p.baseUnit})`);
          }
          await tx
            .update(products)
            .set({ stockQuantity: newQty, updatedAt: new Date() })
            .where(eq(products.id, p.id));

          // Log price overrides if occurred
          if (line.overridePrice !== undefined && line.overridePrice !== parseFloat(rawPrice)) {
            const authorizerId = line.overrideApprovedBy;
            if (authorizerId) {
              await tx.insert(auditLogs).values({
                actionType: "price_override",
                authorizedBy: authorizerId,
                performedBy: cashierId,
                details: `แก้ไขราคาสินค้า "${p.name} [${unit.unitName}]" จากเดิม ${rawPrice} เป็น ${line.overridePrice} (สิทธิ์อนุมัติสิทธิพนักงานพิเศษ)`,
              });
            }
          }

        } else if (line.type === "bundle") {
          const b = dbBundles.find(bundle => bundle.id === line.id);
          if (!b) {
            throw new Error(`ไม่พบเซ็ตโปรโมชั่น (ID: ${line.id})`);
          }

          const subtotalLine = parseFloat(b.price) * line.qty;
          computedTotal += subtotalLine;

          resolvedLines.push({
            productId: null,
            productUnitId: null,
            bundleId: b.id,
            unitName: `แคมเปญเซ็ต: ${b.name}`,
            quantity: line.qty,
            pricePerUnit: b.price,
            subtotal: subtotalLine.toFixed(2),
            conversionFactor: 1,
            totalBaseUnitDec: 0,
          });

          // Decrement stock for ALL nested products inside the bundle!
          const bundleMappers = await tx
            .select()
            .from(bundleItems)
            .where(eq(bundleItems.bundleId, b.id));

          for (const mapItem of bundleMappers) {
            const targetUnit = dbUnits.find(u => u.id === mapItem.productUnitId);
            const parentProd = targetUnit ? dbProducts.find(pd => pd.id === targetUnit.productId) : null;
            if (targetUnit && parentProd) {
              const baseUnitToCut = mapItem.quantity * targetUnit.conversionFactor * line.qty;
              const newQty = parentProd.stockQuantity - baseUnitToCut;
              if (newQty < 0 && !allowNegative) {
                throw new Error(`สินค้า "${parentProd.name}" (ในชุดคอมโบ) มีสต็อกในระบบไม่เพียงพอ (คงเหลือ ${parentProd.stockQuantity} ${parentProd.baseUnit}, ขาดอีก ${Math.abs(newQty)} ${parentProd.baseUnit})`);
              }
              await tx
                .update(products)
                .set({ stockQuantity: newQty, updatedAt: new Date() })
                .where(eq(products.id, parentProd.id));
            }
          }
        }
      }

      // Compute calculations
      const discountVal = parseFloat(discount || 0);
      let invoiceTotalBeforeRounding = computedTotal - discountVal;
      
      let vatAmountStr = null;
      let subtotalBeforeVatStr = null;
      const settings = settingsList[0];
      
      if (settings && settings.enableTaxInvoice && settings.vatRate) {
        const rate = parseFloat(settings.vatRate);
        if (settings.vatType === "exclude") {
           const vat = (invoiceTotalBeforeRounding * rate / 100);
           vatAmountStr = vat.toFixed(2);
           subtotalBeforeVatStr = invoiceTotalBeforeRounding.toFixed(2);
           invoiceTotalBeforeRounding += vat; // Add VAT to total
        } else {
           const vat = (invoiceTotalBeforeRounding * rate / (100 + rate));
           vatAmountStr = vat.toFixed(2);
           subtotalBeforeVatStr = (invoiceTotalBeforeRounding - vat).toFixed(2);
        }
      }

      let invoiceTotal = Math.round(invoiceTotalBeforeRounding * 100) / 100;
      const roundingMode = settings?.roundingMode || 'none';
      if (roundingMode === 'floor') {
        invoiceTotal = Math.floor(invoiceTotal);
      } else if (roundingMode === 'ceil') {
        invoiceTotal = Math.ceil(invoiceTotal);
      } else if (roundingMode === 'round') {
        invoiceTotal = Math.round(invoiceTotal);
      } else if (roundingMode === 'round_025') {
        invoiceTotal = Math.round(invoiceTotal * 4) / 4;
      }
      invoiceTotal = parseFloat(invoiceTotal.toFixed(2));
      const roundingDiff = parseFloat((invoiceTotal - (Math.round(invoiceTotalBeforeRounding * 100) / 100)).toFixed(2));
      
      const payVal = parseFloat(receivedAmount || 0);
      const changeVal = Math.max(0, payVal - invoiceTotal);

      // Validate debtor balance and update
      if (paymentMethod === "credit" && activeMember && activeMember.isDebtor) {
        const currentBal = parseFloat(activeMember.currentBalance);
        const limit = parseFloat(activeMember.creditLimit);
        if (currentBal + invoiceTotal > limit) {
          throw new Error(`ยอดหนี้เกินวงเงินสูงสุด! ค้างชำระเดิม ฿${currentBal.toFixed(2)} ยอดซื้อนี้ ฿${invoiceTotal.toFixed(2)} รวม ฿${(currentBal + invoiceTotal).toFixed(2)} เกินวงเงินสูงสุด ฿${limit.toFixed(2)}`);
        }
        await tx.update(members)
          .set({
            currentBalance: (currentBal + invoiceTotal).toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(members.id, activeMember.id));
      }

      // Validate and deduct member points, calculate points earned
      let ptsEarned = 0;
      const ptsRedeemed = pointsRedeemed ? parseInt(pointsRedeemed) : 0;
      if (activeMember) {
        if (ptsRedeemed > activeMember.points) {
          throw new Error(`คะแนนสมาชิกสะสมไม่พอ! มีอยู่ ${activeMember.points} คะแนน ต้องการแลก ${ptsRedeemed} คะแนน`);
        }
        
        // Calculate points earned from ratio
        const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
        if (earnRatio > 0) {
          ptsEarned = Math.floor(invoiceTotal / earnRatio);
        }
        
        const finalPtsBalance = activeMember.points - ptsRedeemed + ptsEarned;
        
        // Also if it's not credit, update points, else we already updated above, wait, if credit we also need to update points
        // It's safe to update members again here, but let's just do it in one go if possible, or two updates are fine since it's a transaction
        await tx.update(members)
          .set({
            points: finalPtsBalance,
            updatedAt: new Date()
          })
          .where(eq(members.id, activeMember.id));
      }

      // 2. Insert new billing
      const billNo = await generateBillNumber(tx);
      const orderTime = clientCreatedAt ? new Date(clientCreatedAt) : new Date();
      
      const [newOrder] = await tx
        .insert(orders)
        .values({
          billNumber: billNo,
          cashierId: cashierId,
          saleType: saleType || "retail",
          totalAmount: invoiceTotal.toFixed(2),
          discount: discountVal.toFixed(2),
          receivedAmount: payVal.toFixed(2),
          changeAmount: changeVal.toFixed(2),
          paymentMethod: paymentMethod || "cash",
          splitCashAmount: splitCashAmount ? parseFloat(splitCashAmount).toFixed(2) : null,
          splitTransferAmount: splitTransferAmount ? parseFloat(splitTransferAmount).toFixed(2) : null,
          splitWelfareAmount: splitWelfareAmount ? parseFloat(splitWelfareAmount).toFixed(2) : null,
          roundingDiff: roundingDiff.toFixed(2),
          vatAmount: vatAmountStr,
          subtotalBeforeVat: subtotalBeforeVatStr,
          status: "completed",
          memberId: memberId || null,
          pointsEarned: ptsEarned,
          pointsRedeemed: ptsRedeemed,
          debtorId: null,
          shiftId: shiftId || null,
          voidedBy: null,
          voidedAt: null,
          voidReason: null,
          createdAt: orderTime,
        })
        .returning();

      // 3. Insert items snapshot
      for (const resLine of resolvedLines) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: resLine.productId,
          productUnitId: resLine.productUnitId,
          bundleId: resLine.bundleId,
          unitName: resLine.unitName,
          quantity: resLine.quantity,
          pricePerUnit: resLine.pricePerUnit,
          subtotal: resLine.subtotal,
          conversionFactor: resLine.conversionFactor,
        });
      }

      const cashierList = await tx.select().from(users).where(eq(users.id, cashierId));
      const cashierName = cashierList[0]?.name || "พนักงานทั่วไป";

      return {
        ...newOrder,
        cashierName,
        memberName: activeMember?.name || null,
        items: resolvedLines.map(line => ({
          productId: line.productId,
          productUnitId: line.productUnitId,
          bundleId: line.bundleId,
          unitName: line.unitName,
          quantity: line.quantity,
          pricePerUnit: line.pricePerUnit,
          subtotal: line.subtotal,
          productName: line.unitName // fallback
        })),
      };
    });

    res.status(201).json(finalOrder);
  } catch (error: any) {
    console.error("Order checkout error:", error);
    const actualError = error.cause ? error.cause.message : error.message;
    res.status(500).json({ error: actualError });
  }
});

// VOID / CANCEL POS INVOICE
// Voiding cancels sales, updates status, and restores products base stock accurately!
app.post("/api/orders/:id/tax-invoice", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { taxInvoiceDetails } = req.body;
    
    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Generate Tax Invoice Number
    const now = new Date();
    const dateStr = getBangkokDateString(now).replace(/-/g, '');
    const prefix = `TAX${dateStr}`;
    const todaysTaxInvoices = await db.select().from(orders).where(
      and(
        like(orders.taxInvoiceNumber, `${prefix}%`),
        isNotNull(orders.taxInvoiceNumber)
      )
    );
    const count = todaysTaxInvoices.length + 1;
    const taxInvoiceNumber = `${prefix}${count.toString().padStart(4, '0')}`;
    
    // Calculate VAT details based on current settings if they don't exist
    let vatAmount = existing.vatAmount;
    let subtotalBeforeVat = existing.subtotalBeforeVat;
    
    if (!vatAmount) {
       // Lookup settings to calculate
       const [settings] = await db.select().from(storeSettings).limit(1);
       if (settings && settings.vatRate && settings.enableTaxInvoice) {
         const rate = parseFloat(settings.vatRate);
         const total = parseFloat(existing.totalAmount || "0");
         // Since the order is already paid, totalAmount includes the VAT (whether it was added at checkout or included in the price)
         vatAmount = (total * rate / (100 + rate)).toFixed(2);
         subtotalBeforeVat = (total - parseFloat(vatAmount)).toFixed(2);
       }
    }
    
    await db.update(orders)
      .set({ 
        taxInvoiceNumber,
        taxInvoiceDetails: JSON.stringify(taxInvoiceDetails),
        vatAmount,
        subtotalBeforeVat
      })
      .where(eq(orders.id, orderId));
      
    const [updated] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const parsedUpdated = {
      ...updated,
      taxInvoiceDetails: updated.taxInvoiceDetails ? (typeof updated.taxInvoiceDetails === "string" ? JSON.parse(updated.taxInvoiceDetails) : updated.taxInvoiceDetails) : null
    };
    res.json(parsedUpdated);
  } catch (error: any) {
    console.error("Error generating tax invoice:", error);
    res.status(500).json({ error: error.message || "Failed to generate tax invoice" });
  }
});

app.post("/api/orders/:id/void", async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { voidedBy, voidReason, performedBy } = req.body;

  try {
    const updatedOrder = await db.transaction(async (tx) => {
      // Find order
      const [orderRec] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!orderRec) {
        throw new Error("ไม่พบใบเสร็จดังกล่าวเพื่อทำการยกเลิก Void");
      }
      if (orderRec.status === "voided") {
        throw new Error("ใบเสร็จนี้ถูกยกเลิก (Voided) ไปแล้ว");
      }

      // Restores product stocks based on Order Items snapshot
      const orderLines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const dbUnits = await tx.select().from(productUnits);
      const dbProducts = await tx.select().from(products);

      for (const line of orderLines) {
        if (line.productId && line.productUnitId) {
          // Normal product item sold
          const p = dbProducts.find((item) => item.id === line.productId);
          if (p) {
            const addedStock = line.quantity * line.conversionFactor;
            await tx
              .update(products)
              .set({ stockQuantity: p.stockQuantity + addedStock, updatedAt: new Date() })
              .where(eq(products.id, p.id));
          }
        } else if (line.bundleId) {
          // Bundle promo item sold. We must loop through all ingredients inside bundle set.
          const bundlesItemsList = await tx
            .select()
            .from(bundleItems)
            .where(eq(bundleItems.bundleId, line.bundleId));

          for (const bLine of bundlesItemsList) {
            const unit = dbUnits.find((u) => u.id === bLine.productUnitId);
            const parentP = unit ? dbProducts.find((p) => p.id === unit.productId) : null;
            if (unit && parentP) {
              const addedStock = bLine.quantity * unit.conversionFactor * line.quantity;
              await tx
                .update(products)
                .set({ stockQuantity: parentP.stockQuantity + addedStock, updatedAt: new Date() })
                .where(eq(products.id, parentP.id));
            }
          }
        }
      }

      // Update Order Status to Voided
      const [changedOrder] = await tx
        .update(orders)
        .set({
          status: "voided",
          voidedBy: voidedBy,
          voidedAt: new Date(),
          voidReason: voidReason || "ยกเลิกการซื้อขายหน้าเคาน์เตอร์ POS",
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Log in audit table
      await tx.insert(auditLogs).values({
        actionType: "void_order",
        orderId: orderId,
        authorizedBy: voidedBy,
        performedBy: performedBy || voidedBy,
        details: `ยกเลิกบิลใบเสร็จเลขที่ #${orderRec.billNumber} ด้วยเหตุผล: ${voidReason || "ไม่มีระบุ"} (ยกสต็อกคืนคลังสินค้าเรียบร้อย)`,
      });

      return changedOrder;
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Void order failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET AUDIT LOGS FOR MONITORING
app.get("/api/logs", async (req, res) => {
  try {
    const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.id));
    const allUsers = await db.select().from(users);

    const logsWithNames = list.map((l) => {
      const authorizedName = allUsers.find((u) => u.id === l.authorizedBy)?.name || "พนักงานสมทบ";
      const performedName = allUsers.find((u) => u.id === l.performedBy)?.name || "พนักงานสมทบ";
      return {
        ...l,
        authorizedName,
        performedName,
      };
    });

    res.json(logsWithNames);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 0.5. PROMOTION SYSTEM ENDPOINTS (Automatic Promotion Engine)
// ==========================================

// GET all promotions with joined products/units details
app.get("/api/promotions", async (req, res) => {
  try {
    const list = await db.select().from(promotions).orderBy(desc(promotions.id));
    const allUnits = await db.select().from(productUnits);
    const allProducts = await db.select().from(products);
    const allCategories = await db.select().from(categories);

    const detailedPromo = list.map((p) => {
      let boughtName = "ไม่พบข้อมูลเป้าหมาย";
      let boughtBarcode = "";

      if (p.applyTo === "custom_set" && p.customProductUnitIds) {
        try {
          const ids = JSON.parse(p.customProductUnitIds);
          if (Array.isArray(ids) && ids.length > 0) {
            boughtName = `[Mix & Match] กลุ่มสินค้า ${ids.length} รายการ`;
          }
        } catch (e) {
          boughtName = "[Mix & Match] รูปแบบไม่ถูกต้อง";
        }
      } else if (p.applyTo === "category" && p.categoryId) {
        const cat = allCategories.find((c) => c.id === p.categoryId);
        boughtName = cat ? `[หมวดหมู่] ${cat.name}` : "หมวดหมู่ไม่พบ";
      } else if (p.productUnitId) {
        const u = allUnits.find((unit) => unit.id === p.productUnitId);
        const prod = u ? allProducts.find((item) => item.id === u.productId) : null;
        boughtName = u ? `${prod?.name} [${u.unitName}]` : "ไม่พบหน่วยสินค้า";
        boughtBarcode = u ? u.barcode : "";
      }
      
      const freeU = p.freeProductUnitId ? allUnits.find((unit) => unit.id === p.freeProductUnitId) : null;
      const freeProd = freeU ? allProducts.find((item) => item.id === freeU.productId) : null;

      return {
        ...p,
        boughtUnitName: boughtName,
        boughtBarcode: boughtBarcode,
        freeUnitName: freeU ? `${freeProd?.name} [${freeU.unitName}]` : "",
        freeBarcode: freeU ? freeU.barcode : "",
      };
    });

    res.json(detailedPromo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new promotion rule
app.post("/api/promotions", async (req, res) => {
  const { name, description, type, applyTo, productUnitId, categoryId, minQuantity, discountPerUnit, freeProductUnitId, freeQuantity, startDate, endDate, isActive } = req.body;
  
  if (!name || !type || !minQuantity) {
    return res.status(400).json({ error: "ข้อมูลเงื่อนไขโปรโมชั่นไม่ครบถ้วน" });
  }

  const promoApplyTo = applyTo || "product";
  let finalProductUnitId = null;
  let finalCategoryId = null;
  let finalCustomProductUnitIds = null;

  if (promoApplyTo === "category") {
    if (!categoryId) return res.status(400).json({ error: "ต้องระบุหมวดหมู่สำหรับการตั้งโปรโมชั่น" });
    finalCategoryId = parseInt(categoryId);
  } else if (promoApplyTo === "custom_set") {
    if (!req.body.customProductUnitIds || req.body.customProductUnitIds.length === 0) return res.status(400).json({ error: "ต้องระบุกลุ่มสินค้า Mix & Match สำหรับการตั้งโปรโมชั่น" });
    finalCustomProductUnitIds = JSON.stringify(req.body.customProductUnitIds);
  } else {
    if (!productUnitId) return res.status(400).json({ error: "ต้องระบุหน่วยสินค้าสำหรับการตั้งโปรโมชั่น" });
    finalProductUnitId = parseInt(productUnitId);
  }

  try {
    const [inserted] = await db.insert(promotions).values({
      name: name.trim(),
      description,
      type: type,
      applyTo: promoApplyTo,
      productUnitId: finalProductUnitId,
      categoryId: finalCategoryId,
      customProductUnitIds: finalCustomProductUnitIds,
      minQuantity: parseInt(minQuantity),
      discountPerUnit: discountPerUnit ? discountPerUnit.toString() : "0.00",
      freeProductUnitId: freeProductUnitId ? parseInt(freeProductUnitId) : null,
      freeQuantity: freeQuantity ? parseInt(freeQuantity) : 0,
      startDate: startDate === null ? null : (startDate ? new Date(startDate) : new Date()),
      endDate: endDate === null ? null : (endDate ? new Date(endDate) : new Date(Date.now() + 31536000000)),
      isActive: isActive !== undefined ? isActive : true,
    }).returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an existing promotion rule
app.put("/api/promotions/:id", async (req, res) => {
  const promoId = parseInt(req.params.id);
  const { name, description, type, applyTo, productUnitId, categoryId, minQuantity, discountPerUnit, freeProductUnitId, freeQuantity, startDate, endDate, isActive } = req.body;
  if (!name || !type || !minQuantity) {
    return res.status(400).json({ error: "ข้อมูลเงื่อนไขโปรโมชั่นไม่ครบถ้วนสำหรับการแก้ไข" });
  }

  const promoApplyTo = applyTo || "product";
  let finalProductUnitId = null;
  let finalCategoryId = null;
  let finalCustomProductUnitIds = null;

  if (promoApplyTo === "category") {
    if (!categoryId) return res.status(400).json({ error: "ต้องระบุหมวดหมู่สำหรับการตั้งโปรโมชั่น" });
    finalCategoryId = parseInt(categoryId);
  } else if (promoApplyTo === "custom_set") {
    if (!req.body.customProductUnitIds || req.body.customProductUnitIds.length === 0) return res.status(400).json({ error: "ต้องระบุกลุ่มสินค้า Mix & Match สำหรับการตั้งโปรโมชั่น" });
    finalCustomProductUnitIds = JSON.stringify(req.body.customProductUnitIds);
  } else {
    if (!productUnitId) return res.status(400).json({ error: "ต้องระบุหน่วยสินค้าสำหรับการตั้งโปรโมชั่น" });
    finalProductUnitId = parseInt(productUnitId);
  }

  try {
    const [updated] = await db.update(promotions).set({
      name: name.trim(),
      description,
      type: type,
      applyTo: promoApplyTo,
      productUnitId: finalProductUnitId,
      categoryId: finalCategoryId,
      customProductUnitIds: finalCustomProductUnitIds,
      minQuantity: parseInt(minQuantity),
      discountPerUnit: discountPerUnit ? discountPerUnit.toString() : "0.00",
      freeProductUnitId: freeProductUnitId ? parseInt(freeProductUnitId) : null,
      freeQuantity: freeQuantity ? parseInt(freeQuantity) : 0,
      startDate: startDate === null ? null : (startDate ? new Date(startDate) : new Date()),
      endDate: endDate === null ? null : (endDate ? new Date(endDate) : new Date()),
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date(),
    }).where(eq(promotions.id, promoId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a promotion rule
app.delete("/api/promotions/:id", async (req, res) => {
  const promoId = parseInt(req.params.id);
  try {
    await db.delete(promotions).where(eq(promotions.id, promoId));
    res.json({ success: true, message: "ลบเงื่อนไขโปรโมชั่นเรียบร้อยแล้ว" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1. PRODUCT CATEGORY MANAGEMENT APIs
// ==========================================

// GET all categories
app.get("/api/categories", async (req, res) => {
  try {
    const list = await db.select().from(categories).orderBy(categories.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create category
app.post("/api/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "กรุณาระบุชื่อประเภทสินค้า" });
  }
  try {
    const [newCategory] = await db
      .insert(categories)
      .values({ name: name.trim() })
      .returning();
    res.status(201).json(newCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update category name
app.put("/api/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "กรุณาระบุชื่อประเภทสินค้า" });
  }
  try {
    const [updated] = await db
      .update(categories)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE category
app.delete("/api/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(categories).where(eq(categories.id, id));
    res.json({ success: true, message: "ลบประเภทสินค้าสำเร็จ" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 1.8 SUPPLIERS CRUD APIs
// ==========================================

// GET all suppliers
app.get("/api/suppliers", async (req, res) => {
  try {
    const list = await db.select().from(suppliers).orderBy(suppliers.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create supplier
app.post("/api/suppliers", async (req, res) => {
  const { name, contactName, phone, address } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "กรุณาระบุชื่อซัพพลายเออร์" });
  }
  try {
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: name.trim(),
        contactName: contactName ? contactName.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
      })
      .returning();
    res.status(201).json(newSupplier);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update supplier
app.put("/api/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, contactName, phone, address } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "กรุณาระบุชื่อซัพพลายเออร์" });
  }
  try {
    const [updated] = await db
      .update(suppliers)
      .set({
        name: name.trim(),
        contactName: contactName ? contactName.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supplier
app.delete("/api/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    res.json({ success: true, message: "ลบผู้จำหน่ายสำเร็จ" });
  } catch (err: any) {
    if (err.code === "23503") {
      return res.status(400).json({ error: "ไม่สามารถลบผู้จำหน่ายนี้ได้เนื่องจากมีประวัติรับสินค้า" });
    }
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1.9 EMPLOYEE / USER CRUD APIs
// ==========================================

// POST create employee user
app.post("/api/users", async (req, res) => {
  const { name, username, password, role, isActive, canAccessPos, canManageBackend, canManageStock, canManagePromotions, canViewHistory, canViewReports, canVoidBill, canManualDiscount } = req.body;
  if (!name || !username) {
    return res.status(400).json({ error: "กรุณาระบุชื่อและชื่อล็อกอินพนักงาน" });
  }
  try {
    const uid = `user-${Date.now()}`;
    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        username: username.trim(),
        password: password || "1234",
        name: name.trim(),
        role: role || "cashier",
        isActive: isActive !== undefined ? isActive : true,
        canAccessPos: canAccessPos !== undefined ? canAccessPos : true,
        canManageBackend: canManageBackend !== undefined ? canManageBackend : false,
        canManageStock: canManageStock !== undefined ? canManageStock : false,
        canManagePromotions: canManagePromotions !== undefined ? canManagePromotions : false,
        canViewHistory: canViewHistory !== undefined ? canViewHistory : false,
        canViewReports: canViewReports !== undefined ? canViewReports : false,
        canVoidBill: canVoidBill !== undefined ? canVoidBill : false,
        canManualDiscount: canManualDiscount !== undefined ? canManualDiscount : false,
      })
      .returning();
    res.status(201).json(newUser);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "ชื่อล็อกอินนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update employee user
app.put("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, username, password, role, isActive, canAccessPos, canManageBackend, canManageStock, canManagePromotions, canViewHistory, canViewReports, canVoidBill, canManualDiscount } = req.body;
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (name) updateData.name = name.trim();
    if (username) updateData.username = username.trim();
    if (password) updateData.password = password.trim();
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (canAccessPos !== undefined) updateData.canAccessPos = canAccessPos;
    if (canManageBackend !== undefined) updateData.canManageBackend = canManageBackend;
    if (canManageStock !== undefined) updateData.canManageStock = canManageStock;
    if (canManagePromotions !== undefined) updateData.canManagePromotions = canManagePromotions;
    if (canViewHistory !== undefined) updateData.canViewHistory = canViewHistory;
    if (canViewReports !== undefined) updateData.canViewReports = canViewReports;
    if (canVoidBill !== undefined) updateData.canVoidBill = canVoidBill;
    if (canManualDiscount !== undefined) updateData.canManualDiscount = canManualDiscount;
    
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "ชื่อล็อกอินนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee user
app.delete("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }
    if (user.role === "owner") {
      return res.status(403).json({ error: "ไม่สามารถลบบัญชีผู้ดูแลระบบ (Owner) ได้" });
    }
    try {
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true, message: "ลบพนักงานสำเร็จ" });
    } catch (dbErr: any) {
      // If we cannot hard-delete due to foreign key constraints, soft-delete instead.
      console.log(`Hard delete failed for user id ${id}, falling back to soft delete:`, dbErr.message);
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id));
      res.json({ success: true, message: "ลบพนักงานสำเร็จ (ปิดการใช้งานเพื่อรักษาประวัติประวัติบิลเรียบร้อย)" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. STOCK-IN / INBOUND STOCK APIs
// ==========================================

// GET Stock In logs with joined detail snapshots
app.get("/api/stock-logs", async (req, res) => {
  try {
    const list = await db.select().from(stockInLogs).orderBy(desc(stockInLogs.id));
    const allProducts = await db.select().from(products);
    const allUsers = await db.select().from(users);
    const allSuppliers = await db.select().from(suppliers);

    const detailedLogs = list.map((l) => {
      const prod = allProducts.find((p) => p.id === l.productId);
      const userRec = allUsers.find((u) => u.id === l.receivedBy);
      const sup = allSuppliers.find((s) => s.id === l.supplierId);
      return {
        ...l,
        productName: prod ? prod.name : "สินค้าทั่วไป",
        receivedByName: userRec ? userRec.username : "ระบบ",
        supplierName: sup ? sup.name : "-",
      };
    });
    res.json(detailedLogs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST submit stock-in event and update base product inventory
app.post("/api/stock-logs", async (req, res) => {
  const { productId, productUnitId, supplierId, quantity, costPrice, lotNumber, expiryDate, receivedBy, receivedAt } = req.body;
  const prodIdInt = parseInt(productId);
  const qtyInt = parseInt(quantity);
  const recByInt = parseInt(receivedBy);

  if (!prodIdInt || isNaN(qtyInt) || qtyInt <= 0) {
    return res.status(400).json({ error: "ข้อมูลสินค้าหรือจำนวนไม่ถูกต้อง" });
  }
  if (!recByInt) {
    return res.status(400).json({ error: "กรุณาระบุชื่อพนักงานที่ทำรายการ" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Find product
      const [prod] = await tx.select().from(products).where(eq(products.id, prodIdInt));
      if (!prod) {
        throw new Error("ไม่พบสินค้าคลังที่เลือกระบุ");
      }

      let unitNameStr = prod.baseUnit;
      let cFactor = 1;

      if (productUnitId) {
        const [u] = await tx
          .select()
          .from(productUnits)
          .where(eq(productUnits.id, parseInt(productUnitId)));
        if (u) {
          unitNameStr = u.unitName;
          cFactor = u.conversionFactor;
        }
      }

      const baseQty = qtyInt * cFactor;
      const newStock = prod.stockQuantity + baseQty;

      // 1. Calculate Moving Average Cost for the base unit of this product (conversionFactor = 1)
      const [baseUnit] = await tx
        .select()
        .from(productUnits)
        .where(and(eq(productUnits.productId, prodIdInt), eq(productUnits.conversionFactor, 1)));

      let updatedBaseCost = "0.00";
      if (baseUnit) {
        const stockOld = Math.max(0, prod.stockQuantity);
        const costOld = parseFloat(baseUnit.costPrice || "0.00");
        const qtyNew = baseQty;
        // cost per base unit = incoming costPrice / conversionFactor
        const costNewPerBase = parseFloat(costPrice || "0.00") / cFactor;

        let avgCost = 0;
        if (stockOld + qtyNew > 0) {
          avgCost = ((stockOld * costOld) + (qtyNew * costNewPerBase)) / (stockOld + qtyNew);
        } else {
          avgCost = costNewPerBase;
        }
        updatedBaseCost = avgCost.toFixed(2);

        // Update the base unit's costPrice to the calculated moving average cost
        await tx
          .update(productUnits)
          .set({ costPrice: updatedBaseCost, updatedAt: new Date() })
          .where(eq(productUnits.id, baseUnit.id));
      }

      // 2. Update product base stock capacity
      await tx
        .update(products)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(products.id, prodIdInt));

      // 3. Log costPrice into productUnit if matching productUnitId was logged
      if (productUnitId && costPrice) {
        await tx
          .update(productUnits)
          .set({ costPrice: costPrice.toString(), updatedAt: new Date() })
          .where(eq(productUnits.id, parseInt(productUnitId)));
      }

      // 4. Insert detailed stock-in log
      let logPayload: any = {
        productId: prodIdInt,
        productUnitId: productUnitId ? parseInt(productUnitId) : null,
        supplierId: supplierId ? parseInt(supplierId) : null,
        quantity: qtyInt,
        unitName: unitNameStr,
        conversionFactor: cFactor,
        baseQuantityAdded: baseQty,
        costPrice: (costPrice || "0.00").toString(),
        receivedBy: recByInt,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      };
      
      if (lotNumber) {
        logPayload.lotNumber = lotNumber;
      }
      if (expiryDate) {
        logPayload.expiryDate = new Date(expiryDate);
      }

      const [newLog] = await tx
        .insert(stockInLogs)
        .values(logPayload)
        .returning();

      return { success: true, newStock, log: newLog };
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("Stock in submit failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST submit direct stock-in (without PO) for multiple products in a batch
app.post("/api/stock-logs/direct-bulk", async (req, res) => {
  const { supplierId, receivedBy, note, items } = req.body;
  const recByInt = parseInt(receivedBy);
  if (!recByInt) {
    return res.status(400).json({ error: "กรุณาระบุชื่อพนักงานที่ทำรายการ" });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "กรุณาระบุรายการสินค้าที่ต้องการรับเข้า" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const allProducts = await tx.select().from(products).for("update");
      const allUnits = await tx.select().from(productUnits);
      const insertedLogs = [];

      for (const item of items) {
        const prodIdInt = parseInt(item.productId);
        const qtyInt = parseInt(item.quantity);
        const unitIdInt = item.productUnitId ? parseInt(item.productUnitId) : null;
        
        if (!prodIdInt || isNaN(qtyInt) || qtyInt <= 0) {
          throw new Error(`ข้อมูลสินค้าหรือจำนวนไม่ถูกต้องสำหรับบางรายการ`);
        }

        const prod = allProducts.find(p => p.id === prodIdInt);
        if (!prod) {
          throw new Error(`ไม่พบสินค้าคลังรหัส ${prodIdInt}`);
        }

        let unitNameStr = prod.baseUnit;
        let cFactor = 1;
        let unitRecord = null;

        if (unitIdInt) {
          unitRecord = allUnits.find(u => u.id === unitIdInt);
          if (unitRecord) {
            unitNameStr = unitRecord.unitName;
            cFactor = unitRecord.conversionFactor;
          }
        }

        const baseQty = qtyInt * cFactor;
        const newStock = prod.stockQuantity + baseQty;

        // Calculate moving average cost on base unit (conversionFactor = 1)
        const baseUnit = allUnits.find(u => u.productId === prodIdInt && u.conversionFactor === 1);
        let updatedBaseCost = "0.00";
        if (baseUnit) {
          const stockOld = Math.max(0, prod.stockQuantity);
          const costOld = parseFloat(baseUnit.costPrice || "0.00");
          const qtyNew = baseQty;
          const costNewPerBase = parseFloat(item.costPrice || "0.00") / cFactor;

          let avgCost = 0;
          if (stockOld + qtyNew > 0) {
            avgCost = ((stockOld * costOld) + (qtyNew * costNewPerBase)) / (stockOld + qtyNew);
          } else {
            avgCost = costNewPerBase;
          }
          updatedBaseCost = avgCost.toFixed(2);

          // Update base unit costPrice
          await tx
            .update(productUnits)
            .set({ costPrice: updatedBaseCost, updatedAt: new Date() })
            .where(eq(productUnits.id, baseUnit.id));
        }

        // Update product stock
        await tx
          .update(products)
          .set({ stockQuantity: newStock, updatedAt: new Date() })
          .where(eq(products.id, prodIdInt));

        // Update specific unit cost if different from base
        if (unitIdInt && item.costPrice) {
          await tx
            .update(productUnits)
            .set({ costPrice: item.costPrice.toString(), updatedAt: new Date() })
            .where(eq(productUnits.id, unitIdInt));
        }

        // Insert log
        let logPayload: any = {
          productId: prodIdInt,
          productUnitId: unitIdInt,
          supplierId: supplierId ? parseInt(supplierId) : null,
          quantity: qtyInt,
          unitName: unitNameStr,
          conversionFactor: cFactor,
          baseQuantityAdded: baseQty,
          costPrice: (item.costPrice || "0.00").toString(),
          receivedBy: recByInt,
          receivedAt: new Date(),
        };

        if (item.lotNumber) {
          logPayload.lotNumber = item.lotNumber;
        } else if (note) {
          logPayload.lotNumber = note;
        }

        if (item.expiryDate) {
          logPayload.expiryDate = new Date(item.expiryDate);
        }

        const [newLog] = await tx
          .insert(stockInLogs)
          .values(logPayload)
          .returning();

        insertedLogs.push(newLog);

        // Update local stockQuantity so subsequent items in the same batch calculate correctly if duplicate
        prod.stockQuantity = newStock;
      }

      return insertedLogs;
    });

    res.json({ success: true, logs: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST non-sales stock-out (wastage, expired, gifts, etc.)
app.post("/api/stock-out", async (req, res) => {
  const { productId, productUnitId, quantity, reason, recordedBy } = req.body;
  const prodIdInt = parseInt(productId);
  const qtyInt = parseInt(quantity);
  const recByInt = recordedBy ? parseInt(recordedBy) : 1;

  if (!prodIdInt || isNaN(qtyInt) || qtyInt <= 0) {
    return res.status(400).json({ error: "ข้อมูลสินค้าหรือจำนวนตัดจ่ายไม่ถูกต้อง" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [prod] = await tx.select().from(products).where(eq(products.id, prodIdInt)).for("update");
      if (!prod) {
        throw new Error("ไม่พบสินค้าที่ระบุ");
      }

      let unitNameStr = prod.baseUnit;
      let cFactor = 1;

      if (productUnitId) {
        const [u] = await tx.select().from(productUnits).where(eq(productUnits.id, parseInt(productUnitId)));
        if (u) {
          unitNameStr = u.unitName;
          cFactor = u.conversionFactor;
        }
      }

      const baseQty = qtyInt * cFactor;
      const newStock = prod.stockQuantity - baseQty;

      // Update product stock
      await tx.update(products)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(products.id, prodIdInt));

      // Log into audit table
      const [newLog] = await tx.insert(auditLogs).values({
        actionType: "stock_out",
        authorizedBy: isNaN(recByInt) ? 1 : recByInt,
        performedBy: isNaN(recByInt) ? 1 : recByInt,
        details: `ตัดจ่ายสต็อกสินค้า (Stock-Out Non-Sales): สินค้า "${prod.name}" จำนวน ${qtyInt} ${unitNameStr} (แปลงเป็นหน่วยย่อย: ${baseQty} ${prod.baseUnit}) ด้วยเหตุผล: ${reason || "ชำรุด/หมดอายุ/ของแถม"}`,
      }).returning();

      return { success: true, newStock, auditLog: newLog };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST stock physical count adjustment
app.post("/api/stock-adjust", async (req, res) => {
  const { productId, productUnitId, actualQuantity, recordedBy } = req.body;
  const prodIdInt = parseInt(productId);
  const actualQtyInt = parseInt(actualQuantity);
  const recByInt = recordedBy ? parseInt(recordedBy) : 1;

  if (!prodIdInt || isNaN(actualQtyInt) || actualQtyInt < 0) {
    return res.status(400).json({ error: "ข้อมูลสินค้าหรือจำนวนนับจริงไม่ถูกต้อง" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [prod] = await tx.select().from(products).where(eq(products.id, prodIdInt)).for("update");
      if (!prod) {
        throw new Error("ไม่พบสินค้าที่ระบุ");
      }

      let unitNameStr = prod.baseUnit;
      let cFactor = 1;
      let costPriceStr = "0.00";

      if (productUnitId) {
        const [u] = await tx.select().from(productUnits).where(eq(productUnits.id, parseInt(productUnitId)));
        if (u) {
          unitNameStr = u.unitName;
          cFactor = u.conversionFactor;
          costPriceStr = u.costPrice;
        }
      }

      const systemUnitQty = prod.stockQuantity / cFactor;
      const diffInUnit = actualQtyInt - systemUnitQty;
      const diffInBase = diffInUnit * cFactor;
      const newStock = actualQtyInt * cFactor;

      const costPerUnit = parseFloat(costPriceStr) || 0;
      const costDifference = diffInUnit * costPerUnit;

      // Update product stock
      await tx.update(products)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(products.id, prodIdInt));

      // Log into audit table
      const [newLog] = await tx.insert(auditLogs).values({
        actionType: "stock_adjustment",
        authorizedBy: isNaN(recByInt) ? 1 : recByInt,
        performedBy: isNaN(recByInt) ? 1 : recByInt,
        details: `ปรับยอดสต็อกสินค้า (Stock Count & Adjustment): สินค้า "${prod.name}" นับได้จริง ${actualQtyInt} ${unitNameStr} (ยอดเดิมในระบบ: ${systemUnitQty.toFixed(2)} ${unitNameStr}) ส่วนต่าง: ${diffInUnit > 0 ? "+" : ""}${diffInUnit.toFixed(2)} ${unitNameStr} (${diffInBase > 0 ? "+" : ""}${diffInBase} ${prod.baseUnit}) มูลค่าต้นทุนสินค้าที่${costDifference >= 0 ? "เพิ่มขึ้น" : "สูญหาย"}: ${Math.abs(costDifference).toFixed(2)} บาท`,
      }).returning();

      return { success: true, newStock, auditLog: newLog };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST purchase orders supplier return (Credit Note / ใบลดหนี้)
app.post("/api/purchase-orders/return", async (req, res) => {
  const { productId, productUnitId, supplierId, quantity, reason, creditNoteNumber, recordedBy } = req.body;
  const prodIdInt = parseInt(productId);
  const qtyInt = parseInt(quantity);
  const supplierIdInt = supplierId ? parseInt(supplierId) : null;
  const recByInt = recordedBy ? parseInt(recordedBy) : 1;

  if (!prodIdInt || isNaN(qtyInt) || qtyInt <= 0) {
    return res.status(400).json({ error: "ข้อมูลสินค้าหรือจำนวนที่ส่งคืนไม่ถูกต้อง" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [prod] = await tx.select().from(products).where(eq(products.id, prodIdInt)).for("update");
      if (!prod) {
        throw new Error("ไม่พบสินค้าที่ระบุ");
      }

      let unitNameStr = prod.baseUnit;
      let cFactor = 1;

      if (productUnitId) {
        const [u] = await tx.select().from(productUnits).where(eq(productUnits.id, parseInt(productUnitId)));
        if (u) {
          unitNameStr = u.unitName;
          cFactor = u.conversionFactor;
        }
      }

      let supplierName = "ไม่ระบุซัพพลายเออร์";
      if (supplierIdInt) {
        const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierIdInt));
        if (sup) {
          supplierName = sup.name;
        }
      }

      const baseQty = qtyInt * cFactor;
      const newStock = prod.stockQuantity - baseQty;

      // Update product stock
      await tx.update(products)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(products.id, prodIdInt));

      // Log into audit table as supplier return / credit note
      const cnNum = creditNoteNumber || `CN-${new Date().getTime()}`;
      const [newLog] = await tx.insert(auditLogs).values({
        actionType: "supplier_return",
        authorizedBy: isNaN(recByInt) ? 1 : recByInt,
        performedBy: isNaN(recByInt) ? 1 : recByInt,
        details: `ส่งคืนสินค้าให้ซัพพลายเออร์ (Supplier Return): สินค้า "${prod.name}" จำนวน ${qtyInt} ${unitNameStr} (แปลงเป็นหน่วยย่อย: ${baseQty} ${prod.baseUnit}) ส่งคืนไปยัง: ${supplierName} (ID: ${supplierIdInt || "N/A"}) บันทึกใบลดหนี้ (Credit Note) เลขที่: ${cnNum} ด้วยเหตุผล: ${reason || "ส่งคืนซัพพลายเออร์"}`,
      }).returning();

      return { success: true, newStock, auditLog: newLog };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. STORE SETTINGS CONFIGURATION APIs
// ==========================================

// GET store settings configuration
app.get("/api/settings", async (req, res) => {
  try {
    const settingsList = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (settingsList.length === 0) {
      // Auto-insert default settings row
      const [defaults] = await db
        .insert(storeSettings)
        .values({
          id: 1,
          name: "POS OK",
          address: "123/45 ถนนรักแผ่นดิน ดินแดง กรุงเทพฯ 10400",
          phone: "02-123-4567",
          taxId: "1234567890123",
          logoUrl: "",
          receiptFooter: "*** ขอบคุณที่มาอุดหนุน ***\nระบบ POS OK Terminal-Ready",
          allowNegativeStock: false,
        })
        .returning();
      return res.json(defaults);
    }
    const currentSettings = settingsList[0];
    if (
      currentSettings.name === "EASY MINIMART" ||
      currentSettings.name === "NS EASY MINIMART" ||
      currentSettings.name.toUpperCase().includes("EASY MINIMART")
    ) {
      const updatedFooter = (currentSettings.receiptFooter || "")
        .replace(/Easy Minimart/g, "POS OK")
        .replace(/EASY MINIMART/g, "POS OK");
      const [updated] = await db
        .update(storeSettings)
        .set({
          name: "POS OK",
          receiptFooter: updatedFooter,
        })
        .where(eq(storeSettings.id, 1))
        .returning();
      return res.json(updated);
    }
    res.json(currentSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update store settings configuration
app.put("/api/settings", async (req, res) => {
  const { name, address, phone, taxId, logoUrl, alertSoundUrl, receiptFooter, allowNegativeStock, pointsToDiscountRatio, pointsEarnRatio, billPaymentFee, roundingMode, enableBillPayment, billRoundingMode, promptpayEnabled, promptpayNumber, promptpayName, enableAdvancedInventory, enableTaxInvoice, vatRate, vatType, enableWeightBarcode, weightBarcodePrefix, weightBarcodeType } = req.body;
  try {
    const [updated] = await db
      .update(storeSettings)
      .set({
        name: name || "POS OK",
        address: address || "",
        phone: phone || "",
        taxId: taxId || "",
        logoUrl: logoUrl || "",
        alertSoundUrl: alertSoundUrl || "",
        receiptFooter: receiptFooter || "",
        allowNegativeStock: allowNegativeStock === true,
        pointsToDiscountRatio: pointsToDiscountRatio || "10",
        pointsEarnRatio: pointsEarnRatio || "20",
        billPaymentFee: billPaymentFee || "10",
        roundingMode: roundingMode || "none",
        enableBillPayment: enableBillPayment !== false,
        billRoundingMode: billRoundingMode || "none",
        promptpayEnabled: promptpayEnabled === true,
        promptpayNumber: promptpayNumber || "",
        promptpayName: promptpayName || "",
        enableAdvancedInventory: enableAdvancedInventory === true,
        enableTaxInvoice: enableTaxInvoice === true,
        vatRate: vatRate || "7.00",
        vatType: vatType || "include",
        enableWeightBarcode: enableWeightBarcode === true,
        weightBarcodePrefix: weightBarcodePrefix || "20",
        weightBarcodeType: weightBarcodeType || "weight",
        updatedAt: new Date()
      })
      .where(eq(storeSettings.id, 1))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3.5 BILL PAYMENTS (Offline/Internal Recording)
// ==========================================

// POST submit a new bill payment
app.post("/api/bill-payments", async (req, res) => {
  const { cashierId, shiftId, billType, referenceNumber, customerName, amount, fee, paymentMethod, clientCreatedAt } = req.body;
  try {
    const amt = parseFloat(amount || "0");
    const f = parseFloat(fee || "0");
    const total = amt + f;
    
    if (amt <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    const receiptNo = `BP-${getBangkokDateString().replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const settingsList = await db.select().from(storeSettings).limit(1);
    const roundingMode = settingsList[0]?.billRoundingMode || 'none';
    
    let finalTotal = Math.round(total * 100) / 100;
    if (roundingMode === 'floor') {
      finalTotal = Math.floor(finalTotal);
    } else if (roundingMode === 'ceil') {
      finalTotal = Math.ceil(finalTotal);
    } else if (roundingMode === 'round') {
      finalTotal = Math.round(finalTotal);
    } else if (roundingMode === 'round_025') {
      finalTotal = Math.round(finalTotal * 4) / 4;
    }
    const roundingDiff = parseFloat((finalTotal - (Math.round(total * 100) / 100)).toFixed(2));

    const paymentTime = clientCreatedAt ? new Date(clientCreatedAt) : new Date();

    const [payment] = await db
      .insert(billPayments)
      .values({
        receiptNumber: receiptNo,
        billType,
        referenceNumber: referenceNumber || null,
        customerName: customerName.trim(),
        amount: amt.toFixed(2),
        fee: f.toFixed(2),
        totalAmount: finalTotal.toFixed(2),
        roundingDiff: roundingDiff.toFixed(2),
        paymentMethod: paymentMethod || 'cash',
        cashierId,
        shiftId: shiftId || null,
        status: 'completed',
        createdAt: paymentTime
      })
      .returning();
      
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all bill payments (optionally filtered by date)
app.get("/api/bill-payments", async (req, res) => {
  const { date } = req.query;
  try {
    let query = db
      .select({
        id: billPayments.id,
        receiptNumber: billPayments.receiptNumber,
        billType: billPayments.billType,
        referenceNumber: billPayments.referenceNumber,
        customerName: billPayments.customerName,
        amount: billPayments.amount,
        fee: billPayments.fee,
        totalAmount: billPayments.totalAmount,
        roundingDiff: billPayments.roundingDiff,
        paymentMethod: billPayments.paymentMethod,
        status: billPayments.status,
        voidedBy: billPayments.voidedBy,
        createdAt: billPayments.createdAt,
        cashierName: users.name,
      })
      .from(billPayments)
      .leftJoin(users, eq(billPayments.cashierId, users.id))
      .$dynamic();
      
    if (date && typeof date === 'string') {
      const { start, end } = getBangkokLocalStartAndEnd(date);
      query = query.where(and(gte(billPayments.createdAt, start), lte(billPayments.createdAt, end)));
    }
    
    const results = await query.orderBy(desc(billPayments.createdAt));
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST void/cancel a bill payment
app.post("/api/bill-payments/:id/void", async (req, res) => {
  const billPaymentId = parseInt(req.params.id);
  const { voidedBy } = req.body;
  try {
    const [billPaymentRec] = await db.select().from(billPayments).where(eq(billPayments.id, billPaymentId));
    if (!billPaymentRec) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการรับชำระบิลนี้" });
    }
    if (billPaymentRec.status === "voided") {
      return res.status(400).json({ error: "รายการรับชำระบิลนี้ได้ถูกยกเลิก (Voided) ไปแล้ว" });
    }

    const [updated] = await db
      .update(billPayments)
      .set({
        status: "voided",
        voidedBy: voidedBy || null,
        voidedAt: new Date()
      })
      .where(eq(billPayments.id, billPaymentId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. REPORTS & ADVANCED METRICS HANDLER (with dynamic filters)
// ==========================================
app.get("/api/reports", async (req, res) => {
  const { startDate, endDate, category, categoryId } = req.query;

  try {
    // 1. Core items lists
    let activeOrders = await db.select().from(orders).where(eq(orders.status, "completed"));
    let allOrders = await db.select().from(orders);
    const orderLines = await db.select().from(orderItems);
    const prodList = await db.select().from(products);
    const productUnitsList = await db.select().from(productUnits);
    let activeExpenses = await db.select().from(expenses);

    // Apply optional Date Range filters dynamically
    if (startDate) {
      const { start } = getBangkokLocalStartAndEnd(startDate as string);
      activeOrders = activeOrders.filter((o) => new Date(o.createdAt!) >= start);
      allOrders = allOrders.filter((o) => new Date(o.createdAt!) >= start);
      activeExpenses = activeExpenses.filter((e) => new Date(e.createdAt!) >= start);
    }
    if (endDate) {
      const { end } = getBangkokLocalStartAndEnd(endDate as string);
      activeOrders = activeOrders.filter((o) => new Date(o.createdAt!) <= end);
      allOrders = allOrders.filter((o) => new Date(o.createdAt!) <= end);
      activeExpenses = activeExpenses.filter((e) => new Date(e.createdAt!) <= end);
    }

    // Dynamic sales summation
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCost = 0; // calculated dynamically below
    let totalExpenses = 0;

    activeExpenses.forEach((e) => {
      totalExpenses += parseFloat(e.amount);
    });

    activeOrders.forEach((o) => {
      totalSales += parseFloat(o.totalAmount);
      totalDiscount += parseFloat(o.discount);
    });

    // Void metrics count
    const totalTransactions = allOrders.length;
    const completedTransactions = activeOrders.length;
    const voidedTransactions = allOrders.filter((o) => o.status === "voided").length;

    // 2. Sales Over Time (Day, Month, Year Grouping) & Payment Breakdown
    const salesByDay: Record<string, number> = {};
    const salesByMonth: Record<string, number> = {};
    const salesByYear: Record<string, number> = {};
    
    const paymentBreakdown = {
      cash: 0,
      transfer: 0,
      credit: 0,
      split: 0,
      card: 0,
      welfare: 0,
      other: 0,
    };

    activeOrders.forEach((o) => {
      const dayKey = getBangkokDateString(new Date(o.createdAt!)); // "YYYY-MM-DD" safely in Bangkok timezone
      const monthKey = dayKey.slice(0, 7); // "YYYY-MM"
      const yearKey = dayKey.slice(0, 4); // "YYYY"
      
      const amt = parseFloat(o.totalAmount);
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + amt;
      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + amt;
      salesByYear[yearKey] = (salesByYear[yearKey] || 0) + amt;
      
      const method = o.paymentMethod || "other";
      if (paymentBreakdown.hasOwnProperty(method)) {
        (paymentBreakdown as any)[method] += amt;
      } else {
        paymentBreakdown.other += amt;
      }
    });

    const dailySales = Object.entries(salesByDay)
      .map(([key, value]) => ({ date: key, amount: value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlySales = Object.entries(salesByMonth)
      .map(([key, value]) => ({ month: key, amount: value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const yearlySales = Object.entries(salesByYear)
      .map(([key, value]) => ({ year: key, amount: value }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // 3. Best sellers calculation with custom Category filtering
    const bestSellersMap: Record<string, { name: string; qty: number; salesSum: number; category: string; categoryId: number | null }> = {};

    orderLines.forEach((item) => {
      // Find parent order and verify it falls into the filtered active orders list
      const isAssociatedActive = activeOrders.some((o) => o.id === item.orderId);
      if (isAssociatedActive) {
        // Resolve item properties (category, costPrice)
        let itemCategory = "ทั่วไป";
        let itemCatId: number | null = null;

        if (item.productUnitId) {
          const matchedUnit = productUnitsList.find((u) => u.id === item.productUnitId);
          if (matchedUnit) {
            totalCost += parseFloat(matchedUnit.costPrice || "0.00") * item.quantity;
            const matchedProd = prodList.find((p) => p.id === matchedUnit.productId);
            if (matchedProd) {
              itemCategory = matchedProd.category || "ทั่วไป";
              itemCatId = matchedProd.categoryId;
            }
          }
        }

        // Apply filters if given by query parameter
        if (categoryId && itemCatId !== parseInt(categoryId as string)) {
          return; // skip this seller line
        }
        if (category && itemCategory !== (category as string)) {
          return; // skip
        }

        const key = item.unitName;
        const qVal = item.quantity;
        const itemSum = parseFloat(item.subtotal);

        if (bestSellersMap[key]) {
          bestSellersMap[key].qty += qVal;
          bestSellersMap[key].salesSum += itemSum;
        } else {
          bestSellersMap[key] = {
            name: item.unitName,
            qty: qVal,
            salesSum: itemSum,
            category: itemCategory,
            categoryId: itemCatId,
          };
        }
      }
    });

    const bestSellers = Object.values(bestSellersMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
      
    const itemSalesList = Object.values(bestSellersMap)
      .sort((a, b) => b.salesSum - a.salesSum);

    const totalProfit = totalSales - totalCost;
    const netProfit = totalProfit - totalExpenses;

    // 4. Category distribution stats
    const catsMap: Record<string, number> = {};
    prodList.forEach((p) => {
      const catName = p.category || "ทั่วไป";
      catsMap[catName] = (catsMap[catName] || 0) + 1;
    });

    const categoryStats = Object.entries(catsMap).map(([title, total]) => ({
      name: title,
      value: total,
    }));

    // 5. All Current Stock warning states list for inventory highlighting
    const stockReportList = prodList.map((p) => {
      const isCritical = p.stockQuantity <= p.minStock;
      const associatedUnits = productUnitsList.filter((u) => u.productId === p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        baseUnit: p.baseUnit,
        stockQuantity: p.stockQuantity,
        minStock: p.minStock,
        category: p.category,
        categoryId: p.categoryId,
        isCritical,
        unitsCount: associatedUnits.length,
      };
    });

    res.json({
      summary: {
        totalSales: totalSales.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalTransactions,
        completedTransactions,
        voidedTransactions,
      },
      paymentBreakdown,
      bestSellers,
      itemSalesList,
      lowStockProducts: stockReportList.filter(p => p.isCritical).sort((a,b) => a.stockQuantity - b.stockQuantity),
      stockReportList,
      categoryStats,
      charts: {
        dailySales,
        monthlySales,
        yearlySales,
      }
    });
  } catch (error: any) {
    console.error("Report statistics extraction error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NEW POS FUNCTIONAL ENDPOINTS: SHIFTS, MEMBERS, DEBTORS, BACKUP, EXPORT CSV
// ============================================================================

// 1. Shift Management Endpoints
app.get("/api/shifts/active/:cashierId", async (req, res) => {
  const cashierId = parseInt(req.params.cashierId);
  try {
    const list = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.cashierId, cashierId), eq(shifts.status, "open")))
      .orderBy(desc(shifts.startTime));
    res.json(list[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shifts/open", async (req, res) => {
  const { cashierId, startCash, clientCreatedAt } = req.body;
  try {
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.cashierId, cashierId), eq(shifts.status, "open")));
    if (existing.length > 0) {
      return res.status(400).json({ error: "มีกะของพนักงานท่านนี้ที่ยังไม่ได้ปิดกะ ไม่สามารถเปิดกะซ้ำได้" });
    }
    const startTimeVal = clientCreatedAt ? new Date(clientCreatedAt) : new Date();
    const [newShift] = await db
      .insert(shifts)
      .values({
        cashierId,
        startCash: parseFloat(startCash || 0).toFixed(2),
        status: "open",
        startTime: startTimeVal,
      })
      .returning();
    res.json(newShift);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/shifts", async (req, res) => {
  try {
    const list = await db
      .select({
        id: shifts.id,
        cashierId: shifts.cashierId,
        cashierName: users.name,
        startCash: shifts.startCash,
        endCash: shifts.endCash,
        actualCash: shifts.actualCash,
        difference: shifts.difference,
        status: shifts.status,
        startTime: shifts.startTime,
        endTime: shifts.endTime
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.cashierId, users.id))
      .orderBy(desc(shifts.startTime));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/shifts/:id/details", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [shiftRec] = await db
      .select({
        id: shifts.id,
        cashierId: shifts.cashierId,
        cashierName: users.name,
        startCash: shifts.startCash,
        endCash: shifts.endCash,
        actualCash: shifts.actualCash,
        difference: shifts.difference,
        status: shifts.status,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.cashierId, users.id))
      .where(eq(shifts.id, id));

    if (!shiftRec) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกะดังกล่าว" });
    }

    const shiftOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.shiftId, id));

    const shiftBillPayments = await db
      .select()
      .from(billPayments)
      .where(eq(billPayments.shiftId, id));

    const shiftExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.shiftId, id));

    res.json({
      shift: shiftRec,
      orders: shiftOrders,
      billPayments: shiftBillPayments,
      expenses: shiftExpenses,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shifts/:id/close", async (req, res) => {
  const id = parseInt(req.params.id);
  const { endCash, actualCash, clientCreatedAt } = req.body;
  try {
    const [shiftRec] = await db.select().from(shifts).where(eq(shifts.id, id));
    if (!shiftRec) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกะดังกล่าว" });
    }
    const startC = parseFloat(shiftRec.startCash);
    const endTimeVal = clientCreatedAt ? new Date(clientCreatedAt) : new Date();
    
    // Calculate total orders sales sum within this shift
    const shiftOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.shiftId, id), eq(orders.status, "completed")));
    
    let cashSales = 0;
    shiftOrders.forEach(o => {
      if (o.paymentMethod === "cash") {
        cashSales += parseFloat(o.totalAmount);
      } else if (o.paymentMethod === "split") {
        cashSales += parseFloat(o.splitCashAmount || "0");
      }
    });

    // Calculate total bill payments sum within this shift
    const shiftBillPayments = await db
      .select()
      .from(billPayments)
      .where(and(eq(billPayments.shiftId, id), eq(billPayments.status, "completed")));

    let billPaymentCashSales = 0;
    shiftBillPayments.forEach(b => {
      if (b.paymentMethod === "cash") {
        billPaymentCashSales += parseFloat(b.totalAmount);
      }
    });

    // Calculate total debtor payments sum with cash in this shift
    const shiftDebtorPayments = await db
      .select()
      .from(debtorPayments)
      .where(
        and(
          eq(debtorPayments.paymentMethod, "cash"),
          gte(debtorPayments.createdAt, shiftRec.startTime),
          lte(debtorPayments.createdAt, endTimeVal)
        )
      );

    let debtorCashPayments = 0;
    shiftDebtorPayments.forEach(p => {
      debtorCashPayments += parseFloat(p.amount);
    });

    // Calculate total expenses sum within this shift
    const shiftExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.shiftId, id));

    let cashExpenses = 0;
    shiftExpenses.forEach(e => {
      cashExpenses += parseFloat(e.amount);
    });

    const expectedCash = startC + cashSales + billPaymentCashSales + debtorCashPayments - cashExpenses;
    const actualC = parseFloat(actualCash || 0);
    const difference = actualC - expectedCash;

    const [updatedShift] = await db
      .update(shifts)
      .set({
        endTime: endTimeVal,
        endCash: expectedCash.toFixed(2),
        actualCash: actualC.toFixed(2),
        difference: difference.toFixed(2),
        status: "closed",
      })
      .where(eq(shifts.id, id))
      .returning();

    res.json(updatedShift);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER DISPLAY SERVER-SIDE STATE
const customerDisplayStates: Record<string, any> = {};

app.post("/api/customer-display/update", (req, res) => {
  const incoming = req.body;
  const terminalId = incoming.terminalId;
  
  if (!terminalId) {
    return res.status(400).json({ error: "Missing terminalId" });
  }

  if (!customerDisplayStates[terminalId]) {
    customerDisplayStates[terminalId] = {
      cart: [],
      saleType: "retail",
      manualDiscount: 0,
      paymentMethod: "cash",
      receivedAmount: "",
      changeAmount: "",
      totalAmount: 0,
      status: "idle",
      billNumber: "",
      splitCashAmount: null,
      splitTransferAmount: null,
      splitWelfareAmount: null,
      adUrl: "",
      adType: "folder",
      adEnabled: true,
      showAdDuringCart: true,
      lastUpdated: Date.now()
    };
  }

  const currentState = customerDisplayStates[terminalId];
  
  // Rule: If the display is currently showing a completed order ("completed") 
  // and the incoming status is "idle" (which happens when POS is cleared/reset),
  // we PRESERVE the completed order display. This keeps the receipt details on screen
  // until a new customer/active transaction starts (status becomes "active" or "paying").
  if (currentState.status === "completed" && incoming.status === "idle") {
    return res.json({ success: true, state: currentState });
  }

  customerDisplayStates[terminalId] = {
    ...currentState,
    ...incoming,
    lastUpdated: Date.now()
  };
  res.json({ success: true, state: customerDisplayStates[terminalId] });
});

app.get("/api/customer-display/state", (req, res) => {
  const terminalId = req.query.terminalId as string;
  if (!terminalId) {
    return res.status(400).json({ error: "Missing terminalId" });
  }
  
  if (!customerDisplayStates[terminalId]) {
    return res.json({
      cart: [],
      saleType: "retail",
      manualDiscount: 0,
      paymentMethod: "cash",
      receivedAmount: "",
      changeAmount: "",
      totalAmount: 0,
      status: "idle",
      billNumber: "",
      splitCashAmount: null,
      splitTransferAmount: null,
      splitWelfareAmount: null,
      adUrl: "",
      adType: "folder",
      adEnabled: true,
      showAdDuringCart: true,
      lastUpdated: Date.now()
    });
  }
  
  res.json(customerDisplayStates[terminalId]);
});

app.get("/api/customer-display/folder-files", (req, res) => {
  const folderPath = req.query.path as string;
  if (!folderPath) {
    return res.status(400).json({ error: "กรุณาระบุเส้นทางโฟลเดอร์" });
  }

  try {
    const resolvedPath = require('path').isAbsolute(folderPath) 
      ? folderPath 
      : require('path').resolve(process.cwd(), folderPath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: `ไม่พบโฟลเดอร์ตามเส้นทางที่ระบุ: ${folderPath}` });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "เส้นทางที่ระบุไม่ใช่โฟลเดอร์" });
    }

    const files = fs.readdirSync(resolvedPath);
    const mediaExtensions = [".mp4", ".webm", ".ogg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    
    const mediaFiles = files
      .filter(file => {
        const ext = require('path').extname(file).toLowerCase();
        return mediaExtensions.includes(ext);
      })
      .map(file => {
        const ext = require('path').extname(file).toLowerCase();
        const isVideo = [".mp4", ".webm", ".ogg"].includes(ext);
        return {
          filename: file,
          isVideo,
          url: `/api/customer-display/serve-file?path=${encodeURIComponent(folderPath)}&file=${encodeURIComponent(file)}`
        };
      });

    res.json({ success: true, folderPath, files: mediaFiles });
  } catch (err: any) {
    res.status(500).json({ error: `ไม่สามารถเปิดโฟลเดอร์ได้: ${err.message}` });
  }
});

app.get("/api/customer-display/serve-file", (req, res) => {
  const folderPath = req.query.path as string;
  const filename = req.query.file as string;

  if (!folderPath || !filename) {
    return res.status(400).send("Missing path or file parameter");
  }

  try {
    const resolvedFolder = require('path').isAbsolute(folderPath) 
      ? folderPath 
      : require('path').resolve(process.cwd(), folderPath);

    const fullPath = require('path').join(resolvedFolder, filename);

    const relative = require('path').relative(resolvedFolder, fullPath);
    if (relative.startsWith('..') || require('path').isAbsolute(relative)) {
      return res.status(403).send("Access denied (directory traversal detected)");
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("File not found");
    }

    const ext = require('path').extname(filename).toLowerCase();
    const mediaExtensions = [".mp4", ".webm", ".ogg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    if (!mediaExtensions.includes(ext)) {
      return res.status(403).send("Unsupported file type");
    }

    res.sendFile(fullPath);
  } catch (err: any) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// 1.7. Purchase Orders (PO) Endpoints
app.get("/api/purchase-orders", async (req, res) => {
  try {
    const list = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.id));
    
    // Fetch items for all POs and attach them
    const allItems = await db.select().from(purchaseOrderItems);
    
    const poListWithItems = list.map(po => {
      return {
        ...po,
        items: allItems.filter(item => item.poId === po.id)
      };
    });

    res.json(poListWithItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/purchase-orders", async (req, res) => {
  const { supplierId, totalAmount, createdBy, status, poNumber, items } = req.body;
  try {
    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(purchaseOrders).values({
        poNumber: poNumber || `PO-${new Date().getTime()}`,
        supplierId: supplierId || null,
        totalAmount: totalAmount || 0,
        createdBy: createdBy || 1,
        status: status || 'pending'
      }).returning();

      if (items && Array.isArray(items) && items.length > 0) {
        const insertItems = items.map(item => ({
          poId: inserted.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: item.subtotal
        }));
        await tx.insert(purchaseOrderItems).values(insertItems);
      }
      return inserted;
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/purchase-orders/:id/status", async (req, res) => {
  const { status } = req.body;
  try {
    const [updated] = await db.update(purchaseOrders).set({ status, updatedAt: new Date() }).where(eq(purchaseOrders.id, parseInt(req.params.id))).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/purchase-orders/:id/receive", async (req, res) => {
  const poId = parseInt(req.params.id);
  const { receivedBy, grNumber, note, items: receivedItems } = req.body;
  
  try {
    const result = await db.transaction(async (tx) => {
      // Get PO
      const poList = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).for("update");
      if (poList.length === 0) throw new Error("Purchase order not found");
      const po = poList[0];
      
      if (po.status === 'completed') throw new Error("This Purchase order is already completed");
      
      // Get PO Items
      const poItemsList = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, po.id));
      
      const allProducts = await tx.select().from(products).for("update");
      const allUnits = await tx.select().from(productUnits);
      
      const totalAmount = receivedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.costPrice), 0);
      
      const [gr] = await tx.insert(goodsReceipts).values({
        grNumber: grNumber || `GR-${new Date().getTime()}`,
        poId: po.id,
        supplierId: po.supplierId,
        receivedBy: receivedBy || 1,
        totalAmount: totalAmount.toString(),
        note: note,
        status: 'completed'
      }).returning();
      
      let allFullyReceived = true;
      
      for (const item of receivedItems) {
        if (item.quantity <= 0) {
           const poItem = poItemsList.find(pi => pi.id === item.poItemId);
           if (poItem && poItem.receivedQuantity + item.quantity < poItem.quantity) {
               allFullyReceived = false;
           }
           continue;
        }
        
        const prod = allProducts.find(p => p.id === item.productId);
        const unit = allUnits.find(u => u.id === item.productUnitId);
        const poItem = poItemsList.find(pi => pi.id === item.poItemId);
        
        if (prod && unit && poItem) {
          const newReceivedQty = poItem.receivedQuantity + item.quantity;
          if (newReceivedQty < poItem.quantity) {
             allFullyReceived = false;
          }
        
          await tx.insert(goodsReceiptItems).values({
            grId: gr.id,
            poItemId: item.poItemId,
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            costPrice: item.costPrice.toString(),
            subtotal: (item.quantity * item.costPrice).toString(),
          });
          
          await tx.update(purchaseOrderItems)
            .set({ receivedQuantity: newReceivedQty })
            .where(eq(purchaseOrderItems.id, poItem.id));
          
          const addedBaseQuantity = item.quantity * unit.conversionFactor;
          const currentQty = prod.stockQuantity;
          const newQty = currentQty + addedBaseQuantity;
          
          const oldUnitQty = currentQty / unit.conversionFactor;
          const oldTotalCost = oldUnitQty * parseFloat(unit.costPrice);
          const newTotalCost = item.quantity * parseFloat(item.costPrice);
          const newUnitQty = oldUnitQty + item.quantity;
          const newAvgCost = newUnitQty > 0 ? (oldTotalCost + newTotalCost) / newUnitQty : parseFloat(item.costPrice);

          await tx.update(productUnits)
            .set({ costPrice: newAvgCost.toFixed(2) })
            .where(eq(productUnits.id, unit.id));

          await tx.update(products)
            .set({ 
              stockQuantity: newQty, 
              updatedAt: new Date() 
            })
            .where(eq(products.id, prod.id));
            
          await tx.insert(stockInLogs).values({
            productId: prod.id,
            productUnitId: unit.id,
            supplierId: po.supplierId,
            quantity: item.quantity,
            unitName: unit.unitName,
            conversionFactor: unit.conversionFactor,
            baseQuantityAdded: addedBaseQuantity,
            costPrice: item.costPrice.toString(),
            lotNumber: gr.grNumber,
            receivedBy: receivedBy || 1,
            receivedAt: new Date(),
          });
        } else {
            allFullyReceived = false;
        }
      }
      
      let finalStatus = 'completed';
      for (const poItem of poItemsList) {
          const receivedItem = receivedItems.find((ri: any) => ri.poItemId === poItem.id);
          const additionalQty = receivedItem ? receivedItem.quantity : 0;
          if (poItem.receivedQuantity + additionalQty < poItem.quantity) {
              finalStatus = 'partial';
              break;
          }
      }
      
      const [updatedPo] = await tx.update(purchaseOrders)
        .set({ status: finalStatus, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, poId))
        .returning();
        
      return { po: updatedPo, gr };
    });
    
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1.6. Expenses & Payouts Endpoints (ค่าใช้จ่าย & นำเงินออกจากระบบ)

app.get("/api/reports/backorders", async (req, res) => {
  try {
    // We want to find PO items where ordered quantity > received quantity
    const pos = await db.select().from(purchaseOrders).where(
      or(
        eq(purchaseOrders.status, 'pending'),
        eq(purchaseOrders.status, 'partial')
      )
    );
    const poIds = pos.map(p => p.id);
    
    if (poIds.length === 0) {
      return res.json([]);
    }

    const items = await db.select().from(purchaseOrderItems).where(sql`${purchaseOrderItems.poId} IN ${poIds}`);
    const grItems = await db.select().from(goodsReceiptItems);
    
    const backorders = [];
    
    for (const po of pos) {
      const poItems = items.filter(i => i.poId === po.id);
      for (const item of poItems) {
        const receivedQty = grItems.filter(g => g.poItemId === item.id).reduce((sum, g) => sum + g.quantity, 0);
        if (item.quantity > receivedQty) {
          backorders.push({
            poNumber: po.poNumber,
            supplierId: po.supplierId,
            productId: item.productId,
            productUnitId: item.productUnitId,
            orderedQty: item.quantity,
            receivedQty: receivedQty,
            backorderQty: item.quantity - receivedQty
          });
        }
      }
    }
    
    res.json(backorders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/supplier-purchases", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let conditions = [];
    if (startDate) {
      const { start } = getBangkokLocalStartAndEnd(startDate as string);
      conditions.push(gte(goodsReceipts.receivedAt, start));
    }
    if (endDate) {
      const { end } = getBangkokLocalStartAndEnd(endDate as string);
      conditions.push(lte(goodsReceipts.receivedAt, end));
    }
    
    const query = conditions.length > 0 
      ? db.select().from(goodsReceipts).where(and(...conditions))
      : db.select().from(goodsReceipts);
      
    const grs = await query;
    
    const summary: Record<string, { totalAmount: number, grCount: number }> = {};
    
    for (const gr of grs) {
      const suppId = gr.supplierId?.toString() || 'unknown';
      if (!summary[suppId]) {
        summary[suppId] = { totalAmount: 0, grCount: 0 };
      }
      summary[suppId].totalAmount += parseFloat(gr.totalAmount || '0');
      summary[suppId].grCount += 1;
    }
    
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/stock-card", async (req, res) => {
  try {
    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    // Get stock in logs for the product
    const logs = await db.select()
      .from(stockInLogs)
      .where(eq(stockInLogs.productId, parseInt(productId as string)))
      .orderBy(desc(stockInLogs.receivedAt));
      
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/goods-receipts", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let conditions = [];
    if (startDate) {
      const { start } = getBangkokLocalStartAndEnd(startDate as string);
      conditions.push(gte(goodsReceipts.receivedAt, start));
    }
    if (endDate) {
      const { end } = getBangkokLocalStartAndEnd(endDate as string);
      conditions.push(lte(goodsReceipts.receivedAt, end));
    }

    const query = conditions.length > 0
      ? db.select().from(goodsReceipts).where(and(...conditions)).orderBy(desc(goodsReceipts.id))
      : db.select().from(goodsReceipts).orderBy(desc(goodsReceipts.id));

    const list = await query;
    const allSuppliers = await db.select().from(suppliers);
    const allUsers = await db.select().from(users);
    const allPos = await db.select().from(purchaseOrders);
    const allGrItems = await db.select().from(goodsReceiptItems);
    const allProducts = await db.select().from(products);

    const detailedGrs = list.map(g => {
      const supp = allSuppliers.find(s => s.id === g.supplierId);
      const userRec = allUsers.find(u => u.id === g.receivedBy);
      const poRec = allPos.find(p => p.id === g.poId);
      const items = allGrItems.filter(item => item.grId === g.id).map(item => {
        const prod = allProducts.find(p => p.id === item.productId);
        return {
          ...item,
          productName: prod ? prod.name : "สินค้าทั่วไป"
        };
      });

      return {
        ...g,
        supplierName: supp ? supp.name : "-",
        receivedByName: userRec ? userRec.username : "ระบบ",
        poNumber: poRec ? poRec.poNumber : "-",
        items
      };
    });

    res.json(detailedGrs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/purchase-orders", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let conditions = [];
    if (startDate) {
      const { start } = getBangkokLocalStartAndEnd(startDate as string);
      conditions.push(gte(purchaseOrders.createdAt, start));
    }
    if (endDate) {
      const { end } = getBangkokLocalStartAndEnd(endDate as string);
      conditions.push(lte(purchaseOrders.createdAt, end));
    }

    const query = conditions.length > 0
      ? db.select().from(purchaseOrders).where(and(...conditions)).orderBy(desc(purchaseOrders.id))
      : db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.id));

    const list = await query;
    const allSuppliers = await db.select().from(suppliers);
    const allUsers = await db.select().from(users);
    const allPoItems = await db.select().from(purchaseOrderItems);
    const allProducts = await db.select().from(products);

    const detailedPos = list.map(po => {
      const supp = allSuppliers.find(s => s.id === po.supplierId);
      const userCreator = allUsers.find(u => u.id === po.createdBy);
      const items = allPoItems.filter(item => item.poId === po.id).map(item => {
        const prod = allProducts.find(p => p.id === item.productId);
        return {
          ...item,
          productName: prod ? prod.name : "สินค้าทั่วไป"
        };
      });

      return {
        ...po,
        supplierName: supp ? supp.name : "-",
        createdByName: userCreator ? userCreator.username : "ระบบ",
        items
      };
    });

    res.json(detailedPos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/expenses", async (req, res) => {
  try {
    const list = await db
      .select({
        id: expenses.id,
        shiftId: expenses.shiftId,
        amount: expenses.amount,
        description: expenses.description,
        category: expenses.category,
        recordedBy: expenses.recordedBy,
        recorderName: users.name,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.recordedBy, users.id))
      .orderBy(desc(expenses.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", async (req, res) => {
  const { amount, description, category, shiftId, recordedBy } = req.body;
  if (parseFloat(amount || 0) < 0) {
    return res.status(400).json({ error: "Invalid value" });
  }
  try {
    const [newExpense] = await db
      .insert(expenses)
      .values({
        amount: parseFloat(amount || 0).toFixed(2),
        description,
        category: category || "general",
        shiftId: shiftId ? parseInt(shiftId) : null,
        recordedBy: parseInt(recordedBy),
      })
      .returning();

    if (recordedBy) {
      await db.insert(auditLogs).values({
        actionType: "expense_recorded",
        authorizedBy: parseInt(recordedBy),
        performedBy: parseInt(recordedBy),
        details: `บันทึกค่าใช้จ่าย/เอาเงินออก: ${description} จำนวน ${parseFloat(amount || 0).toFixed(2)} บาท (ประเภท: ${category || "ทั่วไป"})`,
      });
    }

    res.json(newExpense);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    res.json(deleted || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to log client audit logs (e.g. login, logout, forced tab/window closing)
app.post("/api/audit-logs", async (req, res) => {
  const { actionType, authorizedBy, performedBy, details } = req.body;
  try {
    const authId = authorizedBy ? parseInt(authorizedBy) : (performedBy ? parseInt(performedBy) : 1);
    const perfId = performedBy ? parseInt(performedBy) : 1;
    const [newLog] = await db
      .insert(auditLogs)
      .values({
        actionType: actionType || "system_event",
        authorizedBy: isNaN(authId) ? 1 : authId,
        performedBy: isNaN(perfId) ? 1 : perfId,
        details: details || "เหตุการณ์ระบบ",
      })
      .returning();
    res.json(newLog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Members Loyalty CRM Endpoints
app.get("/api/members", async (req, res) => {
  try {
    const list = await db.select().from(members).orderBy(desc(members.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/members/search", async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      const list = await db.select().from(members).orderBy(desc(members.createdAt));
      return res.json(list);
    }
    const cleanQuery = `%${String(query).toLowerCase()}%`;
    const matched = await db
      .select()
      .from(members)
      .where(sql`LOWER(name) LIKE ${cleanQuery} OR phone LIKE ${cleanQuery}`);
    res.json(matched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/members", async (req, res) => {
  const { name, phone, points } = req.body;
  try {
    const [newMem] = await db
      .insert(members)
      .values({
        name,
        phone,
        points: points || 0,
      })
      .returning();
    res.json(newMem);
  } catch (err: any) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return res.status(400).json({ error: "เบอร์โทรศัพท์นี้มีในระบบแล้ว กรุณาใช้เบอร์อื่น" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/members/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, points, isDebtor, creditLimit } = req.body;
  try {
    const [updated] = await db
      .update(members)
      .set({
        name,
        phone,
        points: points !== undefined ? points : undefined,
        isDebtor: isDebtor !== undefined ? isDebtor : undefined,
        creditLimit: creditLimit !== undefined ? creditLimit : undefined,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return res.status(400).json({ error: "เบอร์โทรศัพท์นี้มีในระบบแล้ว กรุณาใช้เบอร์อื่น" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/members/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(members).where(eq(members.id, id));
    res.json({ success: true, message: "ลบสมาชิกสำเร็จ" });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(400).json({ error: "ไม่สามารถลบสมาชิกนี้ได้เนื่องจากมีประวัติทำรายการ (โปรดแก้ไขข้อมูลแทนการลบ)" });
    }
    res.status(500).json({ error: err.message });
  }
});

// 3. Debtors Credit Sales Endpoints (Now mapped to Members)
app.get("/api/debtors", async (req, res) => {
  try {
    const list = await db.select().from(members).where(eq(members.isDebtor, true)).orderBy(desc(members.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/debtors", async (req, res) => {
  const { name, phone, creditLimit } = req.body;
  try {
    const [newDeb] = await db
      .insert(members)
      .values({
        name,
        phone,
        isDebtor: true,
        creditLimit: creditLimit || "10000.00",
        currentBalance: "0.00",
      })
      .returning();
    res.json(newDeb);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: "เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว" });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/debtors/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, creditLimit } = req.body;
  try {
    const [updated] = await db.update(members)
      .set({
        name,
        phone,
        creditLimit: creditLimit !== undefined ? creditLimit : undefined,
        updatedAt: new Date()
      })
      .where(eq(members.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/debtors/:id/pay", async (req, res) => {
  const debtorId = parseInt(req.params.id); // This is now memberId
  const { amount, paymentMethod, recordedBy } = req.body;
  try {
    const payAmt = parseFloat(amount || 0);
    if (payAmt <= 0) {
      return res.status(400).json({ error: "จำนวนเงินชำระหนี้ต้องมากกว่า 0 บาท" });
    }

    const result = await db.transaction(async (tx) => {
      const [debRec] = await tx.select().from(members).where(eq(members.id, debtorId)).for("update");
      if (!debRec) {
        throw new Error("ไม่พบข้อมูลลูกหนี้");
      }

      const balance = parseFloat(debRec.currentBalance);
      const newBalance = Math.max(0, balance - payAmt);

      await tx
        .update(members)
        .set({
          currentBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(members.id, debtorId));

      const receiptNo = `PAY-${Date.now()}`;
      const [payment] = await tx
        .insert(debtorPayments)
        .values({
          debtorId: null,
          memberId: debtorId,
          amount: payAmt.toFixed(2),
          paymentMethod: paymentMethod || "cash",
          recordedBy,
          receiptNumber: receiptNo,
        })
        .returning();

      return { payment, newBalance };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/debtors/:id/history", async (req, res) => {
  const debtorId = parseInt(req.params.id); // memberId
  try {
    const pays = await db
      .select({
        id: debtorPayments.id,
        memberId: debtorPayments.memberId,
        amount: debtorPayments.amount,
        paymentMethod: debtorPayments.paymentMethod,
        receiptNumber: debtorPayments.receiptNumber,
        createdAt: debtorPayments.createdAt,
        recordedBy: users.name,
      })
      .from(debtorPayments)
      .leftJoin(users, eq(debtorPayments.recordedBy, users.id))
      .where(eq(debtorPayments.memberId, debtorId))
      .orderBy(desc(debtorPayments.createdAt));

    const creditOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.memberId, debtorId), eq(orders.paymentMethod, "credit")))
      .orderBy(desc(orders.createdAt));

    res.json({ payments: pays, orders: creditOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Export Inventory & Products CSV with \uFEFF BOM for Microsoft Excel
app.get("/api/reports/export/products", async (req, res) => {
  try {
    const prodList = await db.select().from(products).orderBy(products.id);
    const unitsList = await db.select().from(productUnits);

    let csvContent = "\uFEFF"; // Byte Order Mark for Thai language support in Microsoft Excel
    csvContent += "รหัสสินค้า,ชื่อสินค้า,หมวดหมู่,สต็อกคงเหลือ (หน่วยหลัก),เกณฑ์ขั้นต่ำ,รายละเอียดสินค้า\n";

    prodList.forEach((p) => {
      const associatedUnits = unitsList.filter(u => u.productId === p.id);
      const barcodeStr = associatedUnits.map(u => `${u.unitName}:${u.barcode}`).join(" | ") || "ไม่มีบาร์โค้ด";
      
      const cleanName = p.name.replace(/"/g, '""');
      const cleanCategory = p.category.replace(/"/g, '""');
      const cleanDesc = (p.description || "").replace(/"/g, '""');
      csvContent += `"${p.id} (${barcodeStr})","${cleanName}","${cleanCategory}",${p.stockQuantity},${p.minStock},"${cleanDesc}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=minimart_stock_report.csv");
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Database Backup and Restore (JSON data dump)
app.get("/api/backup", async (req, res) => {
  try {
    const data = {
      users: await db.select().from(users),
      categories: await db.select().from(categories),
      suppliers: await db.select().from(suppliers),
      products: await db.select().from(products),
      productUnits: await db.select().from(productUnits),
      bundles: await db.select().from(bundles),
      bundleItems: await db.select().from(bundleItems),
      promotions: await db.select().from(promotions),
      storeSettings: await db.select().from(storeSettings),
      members: await db.select().from(members),
      debtors: await db.select().from(debtors),
      debtorPayments: await db.select().from(debtorPayments),
      shifts: await db.select().from(shifts),
      orders: await db.select().from(orders),
      orderItems: await db.select().from(orderItems),
      billPayments: await db.select().from(billPayments),
      stockInLogs: await db.select().from(stockInLogs),
      auditLogs: await db.select().from(auditLogs),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=pos_backup.json");
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/restore", async (req, res) => {
  const data = req.body;
  try {
    await db.transaction(async (tx) => {
      // Clean target tables systematically to bypass foreign key cascade order
      await tx.delete(auditLogs);
      await tx.delete(stockInLogs);
      await tx.delete(orderItems);
      await tx.delete(orders);
      await tx.delete(billPayments);
      await tx.delete(debtorPayments);
      await tx.delete(shifts);
      await tx.delete(members);
      await tx.delete(debtors);
      await tx.delete(promotions);
      await tx.delete(bundleItems);
      await tx.delete(bundles);
      await tx.delete(productUnits);
      await tx.delete(products);
      await tx.delete(categories);
      await tx.delete(suppliers);
      await tx.delete(users);

      // Re-insert backup sets in topological relational hierarchy
      if (data.users?.length) await tx.insert(users).values(data.users);
      if (data.categories?.length) await tx.insert(categories).values(data.categories);
      if (data.suppliers?.length) await tx.insert(suppliers).values(data.suppliers);
      if (data.products?.length) await tx.insert(products).values(data.products);
      if (data.productUnits?.length) await tx.insert(productUnits).values(data.productUnits);
      if (data.bundles?.length) await tx.insert(bundles).values(data.bundles);
      if (data.bundleItems?.length) await tx.insert(bundleItems).values(data.bundleItems);
      if (data.promotions?.length) await tx.insert(promotions).values(data.promotions);
      
      if (data.storeSettings?.length) {
        await tx.delete(storeSettings);
        await tx.insert(storeSettings).values(data.storeSettings);
      }
      
      if (data.debtors?.length) await tx.insert(debtors).values(data.debtors);
      if (data.members?.length) await tx.insert(members).values(data.members);
      if (data.debtorPayments?.length) await tx.insert(debtorPayments).values(data.debtorPayments);
      if (data.shifts?.length) await tx.insert(shifts).values(data.shifts);
      if (data.orders?.length) await tx.insert(orders).values(data.orders);
      if (data.orderItems?.length) await tx.insert(orderItems).values(data.orderItems);
      if (data.billPayments?.length) await tx.insert(billPayments).values(data.billPayments);
      if (data.stockInLogs?.length) await tx.insert(stockInLogs).values(data.stockInLogs);
      if (data.auditLogs?.length) await tx.insert(auditLogs).values(data.auditLogs);

      // Reset ID Sequence for tables with auto-increment IDs
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE(MAX(id), 1)) FROM orders;`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1)) FROM products;`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE(MAX(id), 1)) FROM order_items;`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;`);
    });

    res.json({ success: true, message: "นำข้อมูลและโครงสร้างระบบกู้คืนเรียบร้อยแล้ว!" });
  } catch (err: any) {
    console.error("Restore error:", err);
    res.status(500).json({ error: `เกิดข้อผิดพลาดในการกู้คืนระบบ: ${err.message}` });
  }
});

app.post("/api/clear-data", async (req, res) => {
  const { level } = req.body;
  try {
    await db.transaction(async (tx) => {
      // Level 1: Transactions
      if (level >= 1) {
        await tx.delete(auditLogs);
        await tx.delete(stockInLogs);
        await tx.delete(orderItems);
        await tx.delete(orders);
        await tx.delete(billPayments);
        await tx.delete(debtorPayments);
        await tx.delete(shifts);
      }
      // Level 2: Data & Members
      if (level >= 2) {
        await tx.delete(members);
        await tx.delete(debtors);
        await tx.delete(promotions);
        await tx.delete(bundleItems);
        await tx.delete(bundles);
        await tx.delete(productUnits);
        await tx.delete(products);
        await tx.delete(categories);
        await tx.delete(suppliers);
      }
      // Level 3: Factory Reset
      if (level >= 3) {
        await tx.delete(users);
        await tx.delete(storeSettings);
      }
    });
    res.json({ success: true, message: "ล้างข้อมูลเรียบร้อยแล้ว!" });
  } catch (err: any) {
    console.error("Clear data error:", err);
    res.status(500).json({ error: `เกิดข้อผิดพลาดในการล้างข้อมูล: ${err.message}` });
  }
});

app.post("/api/print-receipt", async (req, res) => {
  const { receiptBytes, receiptText } = req.body;
  if (!receiptBytes && !receiptText) {
    return res.status(400).json({ error: "กรุณาระบุข้อมูลใบเสร็จ (receiptBytes หรือ receiptText)" });
  }

  let fd: number | undefined;
  try {
    let buffer: Buffer;
    if (receiptBytes && Array.isArray(receiptBytes)) {
      buffer = Buffer.from(receiptBytes);
    } else {
      // Convert receipt text to TIS-620/CP874 encoding for GP Printer (Gprinter) Thai compatibility
      buffer = iconv.encode(receiptText, "tis-620");
    }

    // Write buffer directly to the LPT1 parallel port using synchronous file descriptor functions
    // This ensures precise opening, writing, and absolute closing of the resource to avoid "Port Busy" or locks.
    fd = fs.openSync("LPT1", "w");
    fs.writeSync(fd, buffer);
    console.log("Successfully printed receipt to LPT1");

    res.json({ success: true, message: "ส่งข้อมูลพิมพ์ไปยังพอร์ต LPT1 เรียบร้อยแล้ว" });
  } catch (err: any) {
    console.error("LPT1 printing error:", err);
    res.status(500).json({ error: `เกิดข้อผิดพลาดในการส่งข้อมูลไปยังพอร์ต LPT1: ${err.message}` });
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (closeErr) {
        console.error("Error closing LPT1 file descriptor:", closeErr);
      }
    }
  }
});

// Configure Vite middleware or serve static SPA folder for deployment
async function startServer() {
  await runMigrations();
  try {
    // Migrate store name if it's the old one
    const settingsList = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (settingsList.length > 0) {
      const currentSettings = settingsList[0];
      if (currentSettings.name.includes("System Pos") || currentSettings.name.includes("Mini Erp")) {
        console.log("Found old store name in database. Migrating to POS OK...");
        await db.update(storeSettings)
          .set({ 
            name: "POS OK",
            receiptFooter: currentSettings.receiptFooter.replace(/System Pos \/ Mini Erp/g, "POS OK")
          })
          .where(eq(storeSettings.id, 1));
        console.log("Store name migration completed.");
      }
    }
  } catch (err: any) {
    console.error("Error migrating store name:", err);
  }
  try {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      console.log("No users found in database. Auto-seeding default data...");
      await seedDatabase();
      console.log("Auto-seeding completed successfully!");
    }
  } catch (err: any) {
    console.error("Error checking/auto-seeding database:", err);
  }
  // Start DB warm up in background
  (async () => {
    console.log("Warming up database connection...");
  let dbOk = false;
  for (let i = 1; i <= 10; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log("Database connection warmed up successfully!");
      dbOk = true;
      break;
    } catch (err: any) {
      console.error(`Database warm-up attempt ${i} failed:`, err.message || err);
      if (i < 10) {
        console.log("Retrying database connection in 1.5s...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
    if (!dbOk) {
      console.error("Warning: Database connection could not be established during warm-up.");
    }
  })();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => { res.sendFile(path.join(distPath, "index.html")); }); }
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => { console.log(`Listening on port ${PORT}`); });
}

startServer();
