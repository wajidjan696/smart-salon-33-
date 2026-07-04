import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { SalonService, StaffMember, StaffLeave, Booking, MonthlyArchive, Expense, Product, ProductSale, KhataAccount, KhataLog, StaffAttendance, ShopTiming } from "./types";
import { INITIAL_SERVICES, INITIAL_STAFF, INITIAL_LEAVES, INITIAL_BOOKINGS } from "./data";

// Helper to seed data if empty or missing major parts
export async function seedDatabaseIfEmpty() {
  if (localStorage.getItem("smartsalon_prevent_seeding") === "true") {
    console.log("Database auto-seeding skipped because Fresh Start is enabled.");
    return;
  }
  try {
    // Check if seeded flag exists in Firestore metadata collection
    const metaSnap = await getDocs(collection(db, "metadata"));
    let isAlreadySeeded = false;
    metaSnap.forEach((doc) => {
      if (doc.id === "seeding" && doc.data().seeded === true) {
        isAlreadySeeded = true;
      }
    });

    if (isAlreadySeeded) {
      console.log("Database already seeded on Firestore. Auto-seeding skipped.");
      return;
    }

    const servicesSnap = await getDocs(collection(db, "services"));
    const staffSnap = await getDocs(collection(db, "staff"));
    const leavesSnap = await getDocs(collection(db, "leaves"));
    const bookingsSnap = await getDocs(collection(db, "bookings"));

    // If there is already substantial data in the db, we mark it as seeded to prevent overwrites on deletion
    if (servicesSnap.size > 0 || staffSnap.size > 0 || !leavesSnap.empty || !bookingsSnap.empty) {
      console.log("Existing data found. Marking database as seeded to prevent overwrites.");
      await setDoc(doc(db, "metadata", "seeding"), { seeded: true, seededAt: new Date().toISOString() });
      return;
    }

    console.log("Seeding/Refilling official services menu (112 items)...");
    for (const service of INITIAL_SERVICES) {
      await setDoc(doc(db, "services", service.id), service);
    }

    console.log("Seeding staff (4 members)...");
    for (const st of INITIAL_STAFF) {
      await setDoc(doc(db, "staff", st.id), st);
    }

    console.log("Seeding leaves...");
    for (const leave of INITIAL_LEAVES) {
      await setDoc(doc(db, "leaves", leave.id), leave);
    }

    console.log("Seeding bookings...");
    for (const b of INITIAL_BOOKINGS) {
      await setDoc(doc(db, "bookings", b.id), b);
    }

    // Set the metadata seeding flag
    await setDoc(doc(db, "metadata", "seeding"), { seeded: true, seededAt: new Date().toISOString() });
    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
}

// 1. SERVICES
export async function getServices(): Promise<SalonService[]> {
  const q = query(collection(db, "services"), orderBy("name"));
  const snap = await getDocs(q);
  const services: SalonService[] = [];
  snap.forEach((doc) => {
    services.push({ ...doc.data() } as SalonService);
  });
  return services;
}

export async function addService(service: SalonService): Promise<void> {
  await setDoc(doc(db, "services", service.id), service);
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, "services", id));
}

// Reset services to default/official menu list from data.ts
export async function resetServicesToDefault(): Promise<void> {
  // Fetch existing services to delete them
  const snap = await getDocs(collection(db, "services"));
  for (const sDoc of snap.docs) {
    await deleteDoc(doc(db, "services", sDoc.id));
  }
  // Re-add default services
  for (const service of INITIAL_SERVICES) {
    await setDoc(doc(db, "services", service.id), service);
  }
  console.log("Services reset to official menu list successfully.");
}

// 2. STAFF
export async function getStaff(): Promise<StaffMember[]> {
  const snap = await getDocs(collection(db, "staff"));
  const staff: StaffMember[] = [];
  snap.forEach((doc) => {
    staff.push({ ...doc.data() } as StaffMember);
  });
  return staff;
}

export async function addStaff(staffMember: StaffMember): Promise<void> {
  await setDoc(doc(db, "staff", staffMember.id), staffMember);
}

export async function updateStaff(staffMember: StaffMember): Promise<void> {
  await setDoc(doc(db, "staff", staffMember.id), staffMember);
}

export async function deleteStaff(id: string): Promise<void> {
  await deleteDoc(doc(db, "staff", id));
}

export async function updateStaffStatus(id: string, status: "active" | "inactive"): Promise<void> {
  await updateDoc(doc(db, "staff", id), { status });
}

// 3. LEAVES
export async function getLeaves(): Promise<StaffLeave[]> {
  const snap = await getDocs(collection(db, "leaves"));
  const leaves: StaffLeave[] = [];
  snap.forEach((doc) => {
    leaves.push({ ...doc.data() } as StaffLeave);
  });
  return leaves;
}

export async function addLeave(leave: StaffLeave): Promise<void> {
  await setDoc(doc(db, "leaves", leave.id), leave);
}

export async function deleteLeave(id: string): Promise<void> {
  await deleteDoc(doc(db, "leaves", id));
}

// 4. BOOKINGS
export async function getBookings(): Promise<Booking[]> {
  // Order by date descending, or by createdAt descending
  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const bookings: Booking[] = [];
  snap.forEach((doc) => {
    bookings.push({ ...doc.data() } as Booking);
  });
  return bookings;
}

export async function addBooking(booking: Booking): Promise<void> {
  await setDoc(doc(db, "bookings", booking.id), booking);
}

export async function updateBookingStatus(id: string, status: "completed" | "pending" | "cancelled"): Promise<void> {
  await updateDoc(doc(db, "bookings", id), { status });
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, "bookings", id));
}

// 5. MONTHLY ARCHIVES
export async function getMonthlyArchives(): Promise<MonthlyArchive[]> {
  const q = query(collection(db, "monthly_archives"), orderBy("savedAt", "desc"));
  const snap = await getDocs(q);
  const archives: MonthlyArchive[] = [];
  snap.forEach((doc) => {
    archives.push({ ...doc.data() } as MonthlyArchive);
  });
  return archives;
}

export async function saveMonthlyArchive(archive: MonthlyArchive): Promise<void> {
  await setDoc(doc(db, "monthly_archives", archive.id), archive);
}

export async function deleteMonthlyArchive(id: string): Promise<void> {
  await deleteDoc(doc(db, "monthly_archives", id));
}

// 6. EXPENSES (KHARCHA)
export async function getExpenses(): Promise<Expense[]> {
  const q = query(collection(db, "expenses"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  const items: Expense[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as Expense);
  });
  return items;
}

export async function addExpense(expense: Expense): Promise<void> {
  await setDoc(doc(db, "expenses", expense.id), expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "expenses", id));
}

// 7. PRODUCTS INVENTORY
export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  const items: Product[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as Product);
  });
  return items;
}

export async function addProduct(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function updateProduct(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// 8. PRODUCT SALES
export async function getProductSales(): Promise<ProductSale[]> {
  const q = query(collection(db, "product_sales"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const items: ProductSale[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as ProductSale);
  });
  return items;
}

export async function addProductSale(sale: ProductSale): Promise<void> {
  await setDoc(doc(db, "product_sales", sale.id), sale);
  // Deduct product stock automatically
  try {
    const productRef = doc(db, "products", sale.productId);
    await updateDoc(productRef, {
      stock: Math.max(0, Number(sale.quantity) ? -Number(sale.quantity) : 0) // note: direct stock adjustment helper below
    });
  } catch (err) {
    console.error("Stock adjust failed, adjusting fully manually inside component.");
  }
}

export async function deleteProductSale(id: string): Promise<void> {
  await deleteDoc(doc(db, "product_sales", id));
}

// 9. KHATA & LEDGER
export async function getKhataAccounts(): Promise<KhataAccount[]> {
  const snap = await getDocs(collection(db, "khata_accounts"));
  const items: KhataAccount[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as KhataAccount);
  });
  return items;
}

export async function saveKhataAccount(account: KhataAccount): Promise<void> {
  await setDoc(doc(db, "khata_accounts", account.id), account);
}

export async function deleteKhataAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, "khata_accounts", id));
}

export async function getKhataLogs(): Promise<KhataLog[]> {
  const q = query(collection(db, "khata_logs"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const items: KhataLog[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as KhataLog);
  });
  return items;
}

export async function addKhataLog(log: KhataLog): Promise<void> {
  await setDoc(doc(db, "khata_logs", log.id), log);
}

export async function deleteKhataLog(id: string): Promise<void> {
  await deleteDoc(doc(db, "khata_logs", id));
}

// Clear all database collections for a fresh start
export async function clearAllDatabase(): Promise<void> {
  // Set flag in localStorage to prevent seedDatabaseIfEmpty from auto-filling
  localStorage.setItem("smartsalon_prevent_seeding", "true");

  const collections = ["services", "staff", "leaves", "bookings", "monthly_archives", "expenses", "products", "product_sales", "khata_accounts", "khata_logs", "metadata", "staff_attendance", "shop_timings"];
  
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, col, d.id));
      }
    } catch (e) {
      console.error(`Error clearing collection ${col}:`, e);
    }
  }

  console.log("All salon collections cleared successfully for a fresh start.");
}

// 10. STAFF ATTENDANCE
export async function getStaffAttendance(): Promise<StaffAttendance[]> {
  const q = query(collection(db, "staff_attendance"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  const items: StaffAttendance[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as StaffAttendance);
  });
  return items;
}

export async function saveStaffAttendance(attendance: StaffAttendance): Promise<void> {
  await setDoc(doc(db, "staff_attendance", attendance.id), attendance);
}

export async function deleteStaffAttendance(id: string): Promise<void> {
  await deleteDoc(doc(db, "staff_attendance", id));
}

// 11. SHOP OPEN / CLOSE TIMINGS
export async function getShopTimings(): Promise<ShopTiming[]> {
  const q = query(collection(db, "shop_timings"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  const items: ShopTiming[] = [];
  snap.forEach((doc) => {
    items.push({ ...doc.data() } as ShopTiming);
  });
  return items;
}

export async function saveShopTiming(timing: ShopTiming): Promise<void> {
  await setDoc(doc(db, "shop_timings", timing.id), timing);
}

export async function deleteShopTiming(id: string): Promise<void> {
  await deleteDoc(doc(db, "shop_timings", id));
}


