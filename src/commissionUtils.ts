import { StaffMember, Booking } from "./types";

/**
 * Converts "HH:MM" string to minutes from the start of the day (00:00).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Determines if a booking time falls into "Late Night Duty" for a staff member.
 * e.g., if staff.endTime is "00:00" (midnight) and booking is at "00:30" or "01:00" AM.
 */
export function isLateNightBooking(bookingTime: string, endTime?: string, startTime?: string): boolean {
  if (!endTime) return false;

  const bookingMin = timeToMinutes(bookingTime);
  const endMin = timeToMinutes(endTime);
  const startMin = timeToMinutes(startTime || "10:00");

  let normalizedEndMin = endMin;
  if (endMin === 0 && startMin > 360) {
    normalizedEndMin = 1440; // 12:00 AM Midnight is 1440 minutes
  }

  let normalizedBookingMin = bookingMin;
  // If the booking is at midnight (00:00) and shift started in daytime, it's midnight
  if (bookingMin === 0 && startMin > 360) {
    normalizedBookingMin = 1440;
  }

  // If bookingMin is early morning (e.g., 12:30 AM is 30 mins, 1:00 AM is 60 mins),
  // and the shift started in the day (e.g., 11:00 AM / 660 mins),
  // then we treat it as part of the previous day's late night.
  if (normalizedBookingMin < 300 && startMin > 300) {
    normalizedBookingMin += 1440;
  }

  return normalizedBookingMin > normalizedEndMin;
}

/**
 * Checks if a service is considered a facial.
 * Includes any service containing "facial" in the name or category, 
 * or belonging to the "Luxury Skin Treatment" category.
 */
export function isFacialService(svcName: string, svcCategory?: string): boolean {
  const nameLower = svcName.toLowerCase();
  const catLower = (svcCategory || "").toLowerCase();
  return (
    nameLower.includes("facial") ||
    catLower.includes("facial") ||
    catLower === "luxury skin treatment"
  );
}

/**
 * Calculates commission for a booking.
 * 20% if late night commission is enabled and it is a late night booking.
 * 15% for facial services with amount > 1500 (if staff.facial15Enabled is active).
 * Otherwise, standard 10% commission.
 */
export function calculateBookingCommission(
  bookingOrAmount: Booking | number,
  bookingTime: string,
  staff?: StaffMember
): number {
  const totalAmount = typeof bookingOrAmount === "number" ? bookingOrAmount : bookingOrAmount.totalAmount;
  const tip = typeof bookingOrAmount === "number" ? 0 : (bookingOrAmount.tip || 0);
  const baseAmount = totalAmount - tip;

  if (!staff) {
    return Math.round(baseAmount * 0.10); // Default to 10% if staff not found
  }

  // Late Night Overtime takes precedence (20% commission on baseAmount)
  // "jub wahi staff late night duty krega tw phir bhale 1500 se ziada ka facial q na kare tub uski comistion 20% he hogi"
  if (staff.lateNight20Enabled && isLateNightBooking(bookingTime, staff.endTime, staff.startTime)) {
    return Math.round(baseAmount * 0.20);
  }

  // If Booking object is provided and staff has facial 15% enabled, calculate per-service
  // "agr koi staff facial krta hai aur wo facial yani us facial ki amount 1500 se ziada hai tw us amount ka comistion 15% me hoga... baki amount pr 10% he rahega"
  if (
    typeof bookingOrAmount !== "number" && 
    staff.facial15Enabled && 
    bookingOrAmount.services && 
    bookingOrAmount.services.length > 0
  ) {
    const servicesSum = bookingOrAmount.services.reduce((sum, svc) => sum + svc.price, 0);
    if (servicesSum > 0) {
      const scale = baseAmount / servicesSum;
      let commissionSum = 0;
      for (const svc of bookingOrAmount.services) {
        const isFacial = isFacialService(svc.name, svc.category);
        const isExpensiveFacial = isFacial && svc.price > 1500;
        const rate = isExpensiveFacial ? 0.15 : 0.10;
        commissionSum += svc.price * scale * rate;
      }
      return Math.round(commissionSum);
    }
  }

  // Regular 10% commission on baseAmount
  return Math.round(baseAmount * 0.10);
}
