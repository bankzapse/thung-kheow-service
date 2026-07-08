import type {
  Bill, BillItem, Expense, Job, RewardDraw, RewardTicket, ScheduleSlot, User, WalletTxn,
  Cabinet, MeshBag, BagItem, PointTxn, Redemption, Franchise,
} from "./types";
import { bagQr } from "./types";
import { MATERIALS, MATERIAL_MAP } from "./materials";
import { currentMonth, uid } from "./utils";
import { computeSettlement } from "./fees";

export interface DB {
  users: User[];
  jobs: Job[];
  slots: ScheduleSlot[];
  tickets: RewardTicket[];
  draws: RewardDraw[];
  bills: Bill[];
  expenses: Expense[];
  wallet: WalletTxn[]; // ธุรกรรมเครดิตของผู้รับซื้อ
  franchises: Franchise[]; // เจ้าของแฟรนไชส์
  cabinets: Cabinet[]; // ตู้ Drop & Go
  bags: MeshBag[]; // ถุงตาข่าย
  pointTxns: PointTxn[]; // ธุรกรรมคะแนนของคนทิ้ง
  redemptions: Redemption[]; // คำขอแลกเงิน
  buyerPrices: Record<string, Record<string, number>>; // buyerId → materialId → ราคารับซื้อ
  centralPrices: Record<string, number>; // ราคากลาง (แอดมินตั้ง) → override ค่า default
  pricesUpdatedAt: string;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function item(id: string, qty: number) {
  const m = MATERIAL_MAP[id];
  return { materialId: id, name: m.name, unit: m.unit, pricePerUnit: m.pricePerUnit, qty };
}
function estTotal(items: { pricePerUnit: number; qty: number }[]) {
  return items.reduce((s, i) => s + i.pricePerUnit * i.qty, 0);
}

/** สร้างฐานข้อมูลตั้งต้น (dates สัมพันธ์กับวันนี้ เพื่อให้เดโมสมจริง) */
export function createInitialDB(): DB {
  const now = new Date();
  const month = currentMonth();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(
    lastMonthDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  const seller: User = {
    id: "u-seller",
    role: "seller",
    name: "คุณมานี ใจดี",
    phone: "0812345678",
    email: "seller@demo.com",
    lineConnected: true,
    lineUserId: "Uxxxxdemo1",
    points: 33,
    payout: { bankName: "กสิกรไทย", accountNo: "123-4-56789-0", accountName: "มานี ใจดี", status: "approved", submittedAt: addDays(now, -20).toISOString(), reviewedAt: addDays(now, -19).toISOString() },
    createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 3).toISOString(),
  };
  const seller2: User = {
    id: "u-seller2",
    role: "seller",
    name: "ร้านกาแฟบ้านสวน",
    phone: "0898887777",
    lineConnected: true,
    lineUserId: "Uxxxxdemo2",
    points: 20,
    createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString(),
  };
  const buyer: User = {
    id: "u-buyer",
    role: "buyer",
    name: "สมชาย รับซื้อของเก่า",
    phone: "0876543210",
    email: "buyer@demo.com",
    lineConnected: true,
    lineUserId: "Uxxxxdemo",
    baseLat: 13.7997,
    baseLng: 100.5537,
    credit: 520,
    partner: true,
    createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
  };
  const buyer2: User = {
    id: "u-buyer2",
    role: "buyer",
    name: "รุ่งเรืองรีไซเคิล",
    phone: "0801119999",
    lineConnected: false,
    baseLat: 13.7280,
    baseLng: 100.5241,
    credit: 150,
    partner: true,
    createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 20).toISOString(),
  };
  const admin: User = {
    id: "u-admin",
    role: "admin",
    name: "ผู้ดูแลระบบ",
    phone: "0900000000",
    email: "admin@demo.com",
    lineConnected: false,
    createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
  };
  const franchiseOwner: User = {
    id: "u-franchise",
    role: "franchise",
    name: "คุณเอกชัย (แฟรนไชส์ GLN)",
    phone: "0955550000",
    email: "franchise@demo.com",
    lineConnected: false,
    franchiseId: "fr-gln",
    payout: { bankName: "ไทยพาณิชย์", accountNo: "456-7-89012-3", accountName: "เอกชัย รักษ์โลก", status: "pending", submittedAt: addDays(now, -1).toISOString() },
    createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(),
  };

  const loc = (address: string): Job["location"] => ({
    lat: 13.7563 + (Math.random() - 0.5) * 0.05,
    lng: 100.5018 + (Math.random() - 0.5) * 0.05,
    address,
  });

  const j1items = [item("glass-bottle", 20), item("cardboard", 15)];
  const j2items = [item("hdpe", 4), item("pet", 8)];
  const j3items = [item("aluminum-can", 5), item("pp5", 30)];
  const j4items = [item("cardboard", 40), item("pp5", 10)];
  const j5items = [item("pet", 12), item("pp5", 6)];
  const j7items = [item("cardboard", 25), item("glass-bottle", 20)];

  const jobs: Job[] = [
    {
      id: "j1",
      code: "RF-1042",
      sellerId: seller.id,
      sellerName: seller.name,
      items: j1items,
      estimatedTotal: estTotal(j1items),
      location: loc("ซ.ลาดพร้าว 15 แขวงจอมพล เขตจตุจักร"),
      houseNo: "88/12",
      landmark: "ตรงข้ามร้านสะดวกซื้อ",
      contactName: seller.name,
      contactPhone: seller.phone,
      scheduledDate: ymd(addDays(now, 1)),      note: "มีของเยอะ ช่วยเอารถกระบะมา",
      status: "submitted",
      history: [{ status: "submitted", at: new Date(now.getTime() - 2 * 3600e3).toISOString() }],
      createdAt: new Date(now.getTime() - 2 * 3600e3).toISOString(),
    },
    {
      id: "j2",
      code: "RF-1039",
      sellerId: seller.id,
      sellerName: seller.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      items: j2items,
      estimatedTotal: estTotal(j2items),
      location: loc("ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง"),
      houseNo: "45",
      landmark: "ปากซอยมีต้นมะม่วง",
      contactName: seller.name,
      contactPhone: seller.phone,
      scheduledDate: ymd(addDays(now, 1)),      status: "confirmed",
      history: [
        { status: "submitted", at: new Date(now.getTime() - 26 * 3600e3).toISOString() },
        { status: "confirmed", at: new Date(now.getTime() - 20 * 3600e3).toISOString(), note: "รับงานแล้ว เจอกันพรุ่งนี้บ่าย" },
      ],
      createdAt: new Date(now.getTime() - 26 * 3600e3).toISOString(),
    },
    {
      id: "j3",
      code: "RF-1035",
      sellerId: seller2.id,
      sellerName: seller2.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      items: j3items,
      estimatedTotal: estTotal(j3items),
      location: loc("ซ.อารีย์ แขวงสามเสนใน เขตพญาไท"),
      houseNo: "12/3",
      landmark: "ร้านกาแฟชั้นล่าง",
      contactName: seller2.name,
      contactPhone: seller2.phone,
      scheduledDate: ymd(now),      status: "en_route",
      history: [
        { status: "submitted", at: new Date(now.getTime() - 48 * 3600e3).toISOString() },
        { status: "confirmed", at: new Date(now.getTime() - 30 * 3600e3).toISOString() },
        { status: "en_route", at: new Date(now.getTime() - 1 * 3600e3).toISOString(), note: "กำลังเดินทางไปรับ" },
      ],
      createdAt: new Date(now.getTime() - 48 * 3600e3).toISOString(),
    },
    {
      id: "j4",
      code: "RF-1021",
      sellerId: seller.id,
      sellerName: seller.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      items: j4items,
      estimatedTotal: estTotal(j4items),
      location: loc("ซ.ลาดพร้าว 15"),
      houseNo: "88/12",
      landmark: "ตรงข้ามร้านสะดวกซื้อ",
      contactName: seller.name,
      contactPhone: seller.phone,
      scheduledDate: ymd(addDays(now, -3)),      status: "completed",
      finalAmount: 320,
      history: [
        { status: "submitted", at: new Date(now.getTime() - 96 * 3600e3).toISOString() },
        { status: "confirmed", at: new Date(now.getTime() - 90 * 3600e3).toISOString() },
        { status: "en_route", at: new Date(now.getTime() - 74 * 3600e3).toISOString() },
        { status: "completed", at: new Date(now.getTime() - 72 * 3600e3).toISOString(), note: "รับของเรียบร้อย จ่าย 320 บาท" },
      ],
      createdAt: new Date(now.getTime() - 96 * 3600e3).toISOString(),
    },
    {
      id: "j5",
      code: "RF-1018",
      sellerId: seller.id,
      sellerName: seller.name,
      buyerId: buyer2.id,
      buyerName: buyer2.name,
      items: j5items,
      estimatedTotal: estTotal(j5items),
      location: loc("ซ.ลาดพร้าว 15"),
      houseNo: "88/12",
      landmark: "-",
      contactName: seller.name,
      contactPhone: seller.phone,
      scheduledDate: ymd(addDays(now, -8)),      status: "completed",
      finalAmount: 150,
      history: [
        { status: "submitted", at: new Date(now.getTime() - 200 * 3600e3).toISOString() },
        { status: "completed", at: new Date(now.getTime() - 190 * 3600e3).toISOString(), note: "จ่าย 150 บาท" },
      ],
      createdAt: new Date(now.getTime() - 200 * 3600e3).toISOString(),
    },
    {
      id: "j7",
      code: "RF-1044",
      sellerId: seller2.id,
      sellerName: seller2.name,
      items: j7items,
      estimatedTotal: estTotal(j7items),
      location: loc("ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร"),
      houseNo: "199",
      landmark: "อาคารสำนักงานชั้น 1",
      contactName: seller2.name,
      contactPhone: seller2.phone,
      scheduledDate: ymd(addDays(now, 2)),      status: "submitted",
      history: [{ status: "submitted", at: new Date(now.getTime() - 5 * 3600e3).toISOString() }],
      createdAt: new Date(now.getTime() - 5 * 3600e3).toISOString(),
    },
  ];

  // ตารางรอบเข้ารับของผู้ซื้อ (7 วันข้างหน้า)
  const slots: ScheduleSlot[] = [];
  const areas = ["จตุจักร / ลาดพร้าว", "พญาไท / อารีย์", "ดินแดง / ห้วยขวาง"];
  [buyer, buyer2].forEach((b, bi) => {
    for (let d = 0; d < 4; d++) {
      const date = ymd(addDays(now, d + 1));
      slots.push({
        id: `slot-${b.id}-${d}`,
        buyerId: b.id,
        buyerName: b.name,
        date,
        area: areas[(bi + d) % areas.length],
        capacity: 8,
        booked: d === 0 ? 3 : d % 3,
      });
    }
  });

  // สิทธิ์ลุ้นรางวัลของผู้ขายเดโม (จาก j4=320→3 สิทธิ์, j5=150→1 สิทธิ์)
  const tickets: RewardTicket[] = [
    { id: "t1", number: "480216", userId: seller.id, month, fromJobId: "j4" },
    { id: "t2", number: "480217", userId: seller.id, month, fromJobId: "j4" },
    { id: "t3", number: "480218", userId: seller.id, month, fromJobId: "j4" },
    { id: "t4", number: "551903", userId: seller.id, month, fromJobId: "j5" },
  ];

  const draws: RewardDraw[] = [
    {
      month: lastMonth,
      prizeName: "ทองคำ 1 สลึง",
      prizeValue: 8000,
      winningNumber: "217480",
      winnerName: "คุณสมศรี ธ. (กรุงเทพฯ)",
      announcedAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      status: "announced",
    },
    {
      month,
      prizeName: "ทองคำ 1 สลึง",
      prizeValue: 8000,
      winningNumber: "",
      status: "pending",
    },
  ];

  // ---- บิลรับซื้อ + รายจ่าย (ร้านของ u-buyer) ----
  const billItem = (id: string, qty: number): BillItem => {
    const m = MATERIAL_MAP[id];
    return { materialId: id, name: m.name, unit: m.unit, qty, pricePerUnit: m.pricePerUnit, subtotal: m.pricePerUnit * qty };
  };
  const mkBill = (
    code: string,
    dayOffset: number,
    sellerName: string,
    sellerPhone: string,
    items: BillItem[],
    method: "cash" | "transfer",
  ): Bill => {
    const goods = items.reduce((s, i) => s + i.subtotal, 0);
    const st = computeSettlement(goods);
    const dt = addDays(now, dayOffset);
    return {
      id: uid("bill-"),
      code,
      buyerId: buyer.id,
      source: "walk_in",
      sellerName,
      sellerPhone,
      date: dt.toISOString(),
      items,
      goodsTotal: st.goods,
      fee: st.fee,
      netPaid: st.sellerNet,
      paymentMethod: method,
      status: "paid",
      createdAt: dt.toISOString(),
    };
  };
  const bills: Bill[] = [
    mkBill("B-2051", 0, "ป้าสมจิต (walk-in)", "0891112222", [billItem("cardboard", 45), billItem("pp5", 12)], "cash"),
    mkBill("B-2050", 0, "ลุงมี (walk-in)", "0893334444", [billItem("aluminum-can", 8), billItem("pp5", 60)], "cash"),
    mkBill("B-2048", -1, "ร้านข้าวแกงป้านิด", "0895556666", [billItem("pet", 20), billItem("hdpe", 15)], "transfer"),
    mkBill("B-2045", -2, "คุณนภา", "0897778888", [billItem("glass-bottle", 30), billItem("hdpe", 6)], "cash"),
    mkBill("B-2040", -4, "หมู่บ้านสุขใจ", "0899990000", [billItem("cardboard", 80), billItem("aluminum-can", 5)], "transfer"),
  ];

  const mkExpense = (cat: string, amount: number, dayOffset: number, note?: string): Expense => {
    const dt = addDays(now, dayOffset);
    return { id: uid("exp-"), buyerId: buyer.id, category: cat, amount, date: dt.toISOString(), note, createdAt: dt.toISOString() };
  };
  const expenses: Expense[] = [
    mkExpense("น้ำมัน", 350, 0, "เติมรถกระบะ"),
    mkExpense("ค่าแรง", 500, 0, "ลูกน้อง 1 คน"),
    mkExpense("ค่าเช่าโกดัง", 3000, -2),
    mkExpense("น้ำมัน", 300, -3),
  ];

  const wallet: WalletTxn[] = [];
  const mkWallet = (b: User, entries: { type: WalletTxn["type"]; amount: number; note: string; day: number }[]) => {
    let bal = 0;
    for (const e of entries) {
      bal += e.amount;
      wallet.push({ id: uid("w-"), buyerId: b.id, type: e.type, amount: e.amount, balanceAfter: bal, note: e.note, date: addDays(now, e.day).toISOString() });
    }
  };
  mkWallet(buyer, [
    { type: "topup", amount: 1000, note: "เติมเครดิตครั้งแรก (PromptPay)", day: -6 },
    { type: "commission", amount: -260, note: "ค่าคอมเคลียร์ยอด", day: -4 },
    { type: "topup", amount: 200, note: "เติมเครดิต (PromptPay)", day: -2 },
    { type: "commission", amount: -420, note: "ค่าคอมเคลียร์ยอด", day: -1 },
  ]);
  mkWallet(buyer2, [
    { type: "topup", amount: 300, note: "เติมเครดิต (PromptPay)", day: -3 },
    { type: "commission", amount: -150, note: "ค่าคอมเคลียร์ยอด", day: -1 },
  ]);

  // ---- Drop & Go: แฟรนไชส์ + ตู้ + ถุงตาข่าย + คะแนน + แลกเงิน ----
  const franchises: Franchise[] = [
    { id: "fr-gln", code: "GLN", name: "Glean กรุงเทพเหนือ", ownerName: "คุณเอกชัย", phone: "0955550000", createdAt: addDays(now, -70).toISOString() },
    { id: "fr-bkk", code: "BKK", name: "รีไซเคิลบางกะปิ", ownerName: "คุณวิภา", phone: "0955551111", createdAt: addDays(now, -50).toISOString() },
  ];
  const cabinets: Cabinet[] = [
    { id: "cab-aa", code: "AA", franchiseId: "fr-gln", franchiseCode: "GLN", name: "Lotus's ลาดพร้าว", location: { lat: 13.8161, lng: 100.5613, address: "โลตัส ลาดพร้าว ชั้น G" }, province: "กรุงเทพมหานคร", district: "จตุจักร", subdistrict: "จอมพล", status: "active", createdAt: addDays(now, -60).toISOString() },
    { id: "cab-bb", code: "AB", franchiseId: "fr-gln", franchiseCode: "GLN", name: "Big C พระราม 4", location: { lat: 13.7231, lng: 100.5451, address: "บิ๊กซี พระราม 4 หน้าทางเข้า" }, province: "กรุงเทพมหานคร", district: "คลองเตย", subdistrict: "คลองเตย", status: "active", createdAt: addDays(now, -45).toISOString() },
    { id: "cab-cc", code: "AA", franchiseId: "fr-bkk", franchiseCode: "BKK", name: "โลตัส บางกะปิ", location: { lat: 13.7654, lng: 100.6432, address: "โลตัส บางกะปิ ลานจอดรถ" }, province: "กรุงเทพมหานคร", district: "บางกะปิ", subdistrict: "คลองจั่น", status: "active", createdAt: addDays(now, -30).toISOString() },
  ];

  const bagItem = (id: string, qty: number): BagItem => {
    const m = MATERIAL_MAP[id];
    return { materialId: id, name: m.name, qty, pricePerUnit: m.pricePerUnit, subtotal: Math.round(m.pricePerUnit * qty) };
  };
  const bags: MeshBag[] = [];
  const mkBag = (
    code: string, cab: Cabinet, user: User, status: MeshBag["status"], dayOffset: number,
    items?: BagItem[],
  ): MeshBag => {
    const valueBaht = items ? items.reduce((s, i) => s + i.subtotal, 0) : undefined;
    const dropped = addDays(now, dayOffset).toISOString();
    const b: MeshBag = {
      id: uid("bag-"), code, qr: bagQr(cab.franchiseCode, cab.code, code), cabinetId: cab.id, cabinetCode: cab.code,
      userId: user.id, userName: user.name, status,
      items, valueBaht, points: valueBaht != null ? valueBaht : undefined, // 1 คะแนน = ฿1
      droppedAt: dropped, creditedAt: status === "credited" ? addDays(now, dayOffset + 1).toISOString() : undefined,
    };
    bags.push(b);
    return b;
  };
  mkBag("0000001", cabinets[0], seller, "credited", -5, [bagItem("aluminum-can", 0.6), bagItem("pet", 1.8)]);   // 27+18 = 45 → 450 pts
  mkBag("0000002", cabinets[0], seller, "credited", -4, [bagItem("pet", 1.4), bagItem("cardboard", 3.5)]);       // 14+14 = 28 → 280
  mkBag("0000003", cabinets[0], seller, "credited", -2, [bagItem("aluminum-can", 1.0), bagItem("hdpe", 1.2)]);   // 45+15.6≈60 → 600
  mkBag("0000015", cabinets[1], seller, "sorting", -1);                                                          // กำลังคัดแยก
  mkBag("0000008", cabinets[0], seller, "dropped", 0);                                                           // รอคัดแยก (ผู้ดูแลตีราคา)
  mkBag("0000001", cabinets[2], seller2, "credited", -3, [bagItem("aluminum-can", 2.0), bagItem("pet", 3.0)]);   // 90+30 = 120 → 1200
  mkBag("0000003", cabinets[2], seller2, "dropped", 0);                                                          // รอคัดแยก

  // ธุรกรรมคะแนน (running balance ต่อคน)
  const pointTxns: PointTxn[] = [];
  const mkPts = (u: User, entries: { type: PointTxn["type"]; points: number; note: string; day: number; hour?: number }[]) => {
    let bal = 0;
    for (const e of entries) {
      bal += e.points;
      const d = addDays(now, e.day); if (e.hour != null) d.setHours(e.hour);
      pointTxns.push({ id: uid("pt-"), userId: u.id, type: e.type, points: e.points, balanceAfter: bal, note: e.note, date: d.toISOString() });
    }
  };
  mkPts(seller, [
    { type: "earn", points: 45, note: "ถุง GLN-AA-0000001", day: -4 },
    { type: "earn", points: 28, note: "ถุง GLN-AA-0000002", day: -3 },
    { type: "earn", points: 60, note: "ถุง GLN-AA-0000003", day: -1 },
    { type: "redeem", points: -100, note: "แลกเงิน ฿100", day: -1, hour: 20 },
  ]); // → 33
  mkPts(seller2, [
    { type: "earn", points: 120, note: "ถุง BKK-AA-0000001", day: -2 },
    { type: "redeem", points: -100, note: "แลกเงิน ฿100", day: 0 },
  ]); // → 20

  const redemptions: Redemption[] = [
    { id: uid("r-"), code: "R-3012", userId: seller.id, userName: seller.name, amountBaht: 100, points: 100, method: "promptpay", account: "0812345678", status: "paid", requestedAt: addDays(now, -1).toISOString(), paidAt: addDays(now, 0).toISOString() },
    { id: uid("r-"), code: "R-3015", userId: seller2.id, userName: seller2.name, amountBaht: 100, points: 100, method: "promptpay", account: "0898887777", status: "pending", requestedAt: addDays(now, 0).toISOString() },
  ];

  return {
    users: [seller, seller2, buyer, buyer2, admin, franchiseOwner],
    jobs,
    slots,
    tickets,
    draws,
    bills,
    expenses,
    wallet,
    franchises,
    cabinets,
    bags,
    pointTxns,
    redemptions,
    buyerPrices: {
      "u-buyer2": { cardboard: 5, pet: 12, "aluminum-can": 40 },
    },
    centralPrices: {},
    pricesUpdatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0).toISOString(),
  };
}

/** ราค่ากลาง (แอดมินแก้ได้ใน production; MVP ใช้จาก catalog) */
export const SEED_PRICES = MATERIALS;
