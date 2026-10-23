export const amenityOptions = [
  "WiFi",
  "AC",
  "Laundry",
  "CCTV",
  "Power Backup",
  "Hot Water",
  "Parking",
  "Lift",
  "Housekeeping",
  "Food Included",
  "Water Purifier",
  "Gym",
  "Study Room",
  "Common Kitchen",
  "Co-working Space",
];

export const shareTypeConfig = [
  { key: "double", label: "2 Share", beds: 2 },
  { key: "triple", label: "3 Share", beds: 3 },
  { key: "four", label: "4 Share", beds: 4 },
];

export const sidebarItems = [
  { id: "overview", label: "Dashboard" },
  { id: "edit", label: "Edit Hostel" },
  { id: "students", label: "Guests" },
  { id: "enquiries", label: "Booking Requests" },
  { id: "fees", label: "Fees" },
  { id: "menu", label: "Food Menu" },
  { id: "leaves", label: "Leave Requests" },
  { id: "complaints", label: "Complaints" },
  { id: "reviews", label: "Reviews" },
  { id: "settings", label: "Settings" },
];

export function formatDisplayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}
