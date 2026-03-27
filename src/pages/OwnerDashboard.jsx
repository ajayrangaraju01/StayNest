import { useEffect, useMemo, useState } from "react";
import {
  createComplaint,
  createFeeLedger,
  createFeePayment,
  createMenu,
  createWalkinStudent,
  downloadOwnerFeeLedgerExport,
  fetchComplaints,
  fetchFeeLedgers,
  fetchLeaves,
  fetchMenus,
  fetchOwnerAnalytics,
  fetchOwnerDefaulters,
  fetchOwnerStudents,
  fetchReviews,
  fetchTrustSummary,
  sendOwnerFeeReminders,
  updateLeave,
  updateBooking,
  updateMenu,
  updateOwnerGuest,
  updateReview,
} from "../api/staynestApi";
import { createRoomDetails, updateHostelDetails, updateRoomDetails } from "../data/appStore";

const sidebarItems = [
  { id: "overview", label: "Overview" },
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

export default function OwnerDashboard({
  ownerName = "Owner",
  ownerPhone = "",
  ownerRole = "owner",
  ownerStatus,
  hostels,
  requests,
  onRequestStatusChange,
  onBack,
  onToast,
  onLogout,
  onRefreshHostels,
}) {
  const shareTypeConfig = [
    { key: "double", label: "2 Share", beds: 2 },
    { key: "triple", label: "3 Share", beds: 3 },
    { key: "four", label: "4 Share", beds: 4 },
    { key: "five", label: "5 Share", beds: 5 },
    { key: "six", label: "6 Share", beds: 6 },
  ];
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedHostelId, setSelectedHostelId] = useState(
    hostels[0]?.id || null,
  );
  const [editForm, setEditForm] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [guestSortBy, setGuestSortBy] = useState("name");
  const [guestDetailId, setGuestDetailId] = useState(null);
  const [guestEditForms, setGuestEditForms] = useState({});
  const [feeLedgers, setFeeLedgers] = useState([]);
  const [menus, setMenus] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trustSummary, setTrustSummary] = useState(null);
  const [ownerAnalytics, setOwnerAnalytics] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [feeForm, setFeeForm] = useState({
    hostelId: "",
    studentId: "",
    month: "",
    amountDue: "",
    dueDate: "",
    lateFee: "0",
  });
  const [paymentForm, setPaymentForm] = useState({ ledgerId: "", amount: "", mode: "upi", referenceId: "" });
  const [menuForm, setMenuForm] = useState({
    hostelId: "",
    date: "",
    breakfast: "",
    lunch: "",
    dinner: "",
    isOverride: false,
  });
  const [complaintForm, setComplaintForm] = useState({
    hostelId: "",
    studentId: "",
    reason: "",
    evidenceUrl: "",
  });
  const [ownerReplies, setOwnerReplies] = useState({});
  const [walkinForm, setWalkinForm] = useState({
    name: "",
    phone: "",
    email: "",
    hostelId: hostels[0]?.id ? String(hostels[0].id) : "",
    roomNumber: "",
    roomType: "double",
    moveInDate: "",
    joiningFeeStatus: "unpaid",
    joiningFeePaid: "",
    joiningFeeMode: "cash",
    joiningFeeReference: "",
    collegeCompany: "",
    emergencyContact: "",
  });

  const summarizeHostelRooms = (hostel) =>
    (hostel?.rooms || []).reduce((acc, room) => {
      const hasManualRoomNumber = Boolean((room.roomNumber || "").trim());
      const existing = acc.find((item) => item.type === room.type);
      if (!existing && !hasManualRoomNumber) {
        acc.push(room);
        return acc;
      }
      if (!existing && hasManualRoomNumber) {
        acc.push({
          ...room,
          id: null,
        });
      }
      return acc;
    }, []);

  const stats = useMemo(() => {
    const totalBeds = hostels.reduce(
      (count, hostel) => count + summarizeHostelRooms(hostel).reduce((roomCount, room) => roomCount + room.total, 0),
      0,
    );
    const availableBeds = hostels.reduce(
      (count, hostel) =>
        count + summarizeHostelRooms(hostel).reduce((roomCount, room) => roomCount + room.available, 0),
      0,
    );
    return {
      totalHostels: hostels.length,
      totalBeds,
      availableBeds,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
    };
  }, [hostels, requests]);

  const floorTypeLabel = {
    double: "2 Share",
    triple: "3 Share",
    four: "4 Share",
    five: "5 Share",
    six: "6 Share",
  };

  const selectedHostel = useMemo(
    () => hostels.find((hostel) => hostel.id === selectedHostelId) || null,
    [hostels, selectedHostelId],
  );
  const selectedGuest = useMemo(
    () => students.find((guest) => guest.student_id === guestDetailId) || null,
    [students, guestDetailId],
  );

  const calculatedRoomTotals = useMemo(() => {
    if (!editForm?.floorRoomCounts?.length) return {};
    return editForm.floorRoomCounts.reduce((acc, floor) => {
      shareTypeConfig.forEach((item) => {
        const roomCount = Number(floor[item.key] || 0);
        acc[item.label] = (acc[item.label] || 0) + (roomCount * item.beds);
      });
      return acc;
    }, {});
  }, [editForm, shareTypeConfig]);

  const calculatedTotalRooms = useMemo(() => {
    if (!editForm?.floorRoomCounts?.length) return Number(editForm?.totalRooms || 0);
    return editForm.floorRoomCounts.reduce(
      (sum, floor) => sum + Object.keys(floorTypeLabel).reduce((count, key) => count + Number(floor[key] || 0), 0),
      0,
    );
  }, [editForm, floorTypeLabel]);

  const calculatedTotalBeds = useMemo(
    () => Object.values(calculatedRoomTotals).reduce((sum, value) => sum + Number(value || 0), 0),
    [calculatedRoomTotals],
  );

  const loadEditForm = (hostel) => {
    if (!hostel) {
      setEditForm(null);
      return;
    }
    setPhotoIndex(0);
    const summaryRooms = summarizeHostelRooms(hostel).map((room) => ({
      id: room.id,
      type: room.type,
      price: room.price,
      bookingAdvance: room.bookingAdvance || 0,
      securityDeposit: room.securityDeposit || 0,
      total: room.total,
      available: room.available,
    }));
    setEditForm({
      id: hostel.id,
      name: hostel.name || "",
      area: hostel.location || "",
      city: hostel.city || "",
      address: hostel.address || "",
      pincode: hostel.pincode || "",
      gender: hostel.gender || "Boys",
      contact_number: hostel.contact_number || "",
      description: hostel.description || "",
      rules: hostel.rules || "",
      amenitiesText: (hostel.amenities || []).join(", "),
      existingPhotos: hostel.images || [],
      newPhotoFiles: [],
      totalFloors: hostel.total_floors || "",
      totalRooms: hostel.total_rooms || "",
      floorRoomCounts: hostel.floor_room_counts || [],
      rooms: summaryRooms,
    });
  };

  const mergedPhotosPreview = useMemo(() => {
    if (!editForm) return [];
    return [
      ...(editForm.existingPhotos || []),
      ...(editForm.newPhotoFiles || []),
    ];
  }, [editForm]);

  const hasPhotos = mergedPhotosPreview.length > 0;
  const activePhoto = hasPhotos ? mergedPhotosPreview[photoIndex % mergedPhotosPreview.length] : null;

  const handleRoomChange = (roomId, field, value, roomType = null) => {
    setEditForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        (room.id === roomId || (!roomId && room.type === roomType)) ? { ...room, [field]: value } : room,
      ),
    }));
  };

  const handleSharePriceChange = (roomTypeLabel, value) => {
    setEditForm((prev) => {
      const existingRoom = prev.rooms.find((room) => room.type === roomTypeLabel);
      const currentCalculatedTotal = Number(calculatedRoomTotals[roomTypeLabel] || 0);
      if (existingRoom) {
        return {
          ...prev,
          rooms: prev.rooms.map((room) =>
            room.type === roomTypeLabel
              ? {
                ...room,
                price: value,
                bookingAdvance: room.bookingAdvance ?? 0,
                securityDeposit: room.securityDeposit ?? 0,
                total: currentCalculatedTotal || room.total,
                available: room.available > 0 ? room.available : (currentCalculatedTotal || room.available),
              }
              : room,
          ),
        };
      }
      return {
        ...prev,
        rooms: [
          ...prev.rooms,
          {
            id: null,
            type: roomTypeLabel,
            price: value,
            bookingAdvance: 0,
            securityDeposit: 0,
            total: currentCalculatedTotal,
            available: currentCalculatedTotal,
          },
        ],
      };
    });
  };

  const normalizeFloorCounts = (floors) =>
    Array.from({ length: floors }, (_, index) => {
      const existing = editForm?.floorRoomCounts?.find((item) => item.floor === index + 1);
      return {
        floor: index + 1,
        double: existing?.double ?? 0,
        triple: existing?.triple ?? 0,
        four: existing?.four ?? 0,
        five: existing?.five ?? 0,
        six: existing?.six ?? 0,
      };
    });

  const handleFloorsChange = (value) => {
    const floors = Number(value || 0);
    setEditForm((prev) => ({
      ...prev,
      totalFloors: value,
      floorRoomCounts: floors > 0 ? normalizeFloorCounts(floors) : [],
    }));
  };

  const handleFloorRoomChange = (floor, field, value) => {
    setEditForm((prev) => {
      const nextFloorRoomCounts = prev.floorRoomCounts.map((item) =>
        item.floor === floor ? { ...item, [field]: Number(value || 0) } : item,
      );

      const nextCalculatedTotals = nextFloorRoomCounts.reduce((acc, floorItem) => {
        shareTypeConfig.forEach((item) => {
          const roomCount = Number(floorItem[item.key] || 0);
          acc[item.label] = (acc[item.label] || 0) + (roomCount * item.beds);
        });
        return acc;
      }, {});

      return {
        ...prev,
        floorRoomCounts: nextFloorRoomCounts,
        rooms: prev.rooms.map((room) => {
          const nextTotal = Number((nextCalculatedTotals[room.type] ?? room.total) || 0);
          return {
            ...room,
            total: nextTotal,
            available: nextTotal,
          };
        }),
      };
    });
  };

  const handleEditPhotoFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setEditForm((prev) => ({ ...prev, newPhotoFiles: [] }));
      return;
    }
    const readers = files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    }));
    try {
      const results = await Promise.all(readers);
      setEditForm((prev) => ({ ...prev, newPhotoFiles: results }));
      setPhotoIndex(0);
    } catch {
      onToast("Unable to read one or more images.");
    }
  };

  const handleSaveEdits = async () => {
    if (!editForm) return;
    try {
      const mergedPhotosPreview = [
        ...(editForm.existingPhotos || []),
        ...(editForm.newPhotoFiles || []),
      ];
      const floorTotals = editForm.floorRoomCounts.reduce(
        (acc, floor) => {
          Object.keys(floorTypeLabel).forEach((key) => {
            acc[key] += Number(floor[key] || 0);
          });
          return acc;
        },
        { double: 0, triple: 0, four: 0, five: 0, six: 0 },
      );

      const missingTypes = Object.entries(floorTotals)
        .filter(([, count]) => count > 0)
        .filter(([key]) => {
          const label = floorTypeLabel[key];
          const room = editForm.rooms.find((item) => item.type === label);
          return !room || Number(room.price || 0) <= 0;
        })
        .map(([key]) => floorTypeLabel[key]);

      if (missingTypes.length > 0) {
        onToast(`Set price for room types: ${missingTypes.join(", ")}.`);
        return;
      }

      const shareMap = {
        double: 2,
        triple: 3,
        four: 4,
        five: 5,
        six: 6,
      };

      const bedMismatch = Object.entries(floorTotals).find(([key, count]) => {
        if (count === 0) return false;
        const label = floorTypeLabel[key];
        const expectedBeds = count * shareMap[key];
        const derivedBeds = Number(calculatedRoomTotals[label] || 0);
        return derivedBeds !== expectedBeds;
      });

      if (bedMismatch) {
        const [key, count] = bedMismatch;
        const label = floorTypeLabel[key];
        const expectedBeds = count * shareMap[key];
        onToast(
          `${label}: total beds must be ${expectedBeds} (rooms ${count} x ${shareMap[key]} share).`,
        );
        return;
      }

      const amenities = editForm.amenitiesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const photos = mergedPhotosPreview.map((url, index) => ({
        url,
        display_order: index,
      }));

      const payload = {
        name: editForm.name,
        area: editForm.area,
        city: editForm.city,
        address: editForm.address,
        pincode: editForm.pincode,
        gender_type: editForm.gender === "Boys" ? "boys" : editForm.gender === "Girls" ? "girls" : "coed",
        contact_number: editForm.contact_number,
        description: editForm.description,
        rules: editForm.rules,
        amenities,
        total_floors: editForm.totalFloors ? Number(editForm.totalFloors) : null,
        total_rooms: calculatedTotalRooms || null,
        floor_room_counts: editForm.floorRoomCounts || [],
      };
      if (photos.length > 0) {
        payload.photos = photos;
      }

      await updateHostelDetails(editForm.id, payload);

      await Promise.all(
        editForm.rooms.map((room) => {
          const total = Number((calculatedRoomTotals[room.type] ?? room.total) || 0);
          const available = Number(room.available || 0);
          const occupied = Math.max(0, total - available);
          const roomPayload = {
            monthly_rent: Number(room.price || 0),
            booking_advance: Number(room.bookingAdvance || 0),
            security_deposit: Number(room.securityDeposit || 0),
            total_beds: total,
            occupied_beds: occupied,
          };
          if (room.id) {
            return updateRoomDetails(room.id, roomPayload);
          }
          if (Number(room.price || 0) > 0 || total > 0) {
            return createRoomDetails({
              hostel: editForm.id,
              type:
                room.type === "2 Share" ? "double"
                : room.type === "3 Share" ? "triple"
                : room.type === "4 Share" ? "four"
                : room.type === "5 Share" ? "five"
                : "six",
              ...roomPayload,
              is_maintenance: false,
            });
          }
          return Promise.resolve(null);
        }),
      );

      onToast("Hostel details updated.");
      if (onRefreshHostels) {
        await onRefreshHostels();
      }
    } catch (error) {
      onToast(error.message || "Unable to update hostel details.");
    }
  };

  useEffect(() => {
    if (!selectedHostelId && hostels.length > 0) {
      setSelectedHostelId(hostels[0].id);
    }
  }, [hostels, selectedHostelId]);

  useEffect(() => {
    const defaultHostelId = hostels[0]?.id ? String(hostels[0].id) : "";
    setFeeForm((prev) => ({ ...prev, hostelId: defaultHostelId }));
    setMenuForm((prev) => ({ ...prev, hostelId: defaultHostelId }));
    setComplaintForm((prev) => ({ ...prev, hostelId: defaultHostelId }));
    setWalkinForm((prev) => ({ ...prev, hostelId: defaultHostelId }));
  }, [hostels]);

  useEffect(() => {
    if (selectedHostel) {
      loadEditForm(selectedHostel);
    }
  }, [selectedHostel]);

  useEffect(() => {
    const loadStudents = async () => {
      if (activeTab !== "students") return;
      setStudentsLoading(true);
      try {
        const data = await fetchOwnerStudents();
        setStudents(data);
        setGuestEditForms(
          (data || []).reduce((acc, guest) => {
            acc[guest.student_id] = {
              name: guest.student_name || "",
              phone: guest.student_phone || "",
              email: guest.student_email || "",
              age: guest.age || "",
              gender: guest.gender || "",
              college_company: guest.college_company || "",
              emergency_contact: guest.emergency_contact || "",
            };
            return acc;
          }, {}),
        );
      } catch (error) {
        onToast(error.message || "Unable to load guests.");
      } finally {
        setStudentsLoading(false);
      }
    };
    loadStudents();
  }, [activeTab, onToast]);

  useEffect(() => {
    const loadOpsData = async () => {
      if (!["fees", "menu", "leaves", "complaints", "reviews"].includes(activeTab)) return;
      try {
        const [ledgerData, menuData, leaveData, complaintData, reviewData, trustData, analyticsData, defaulterData] = await Promise.all([
          fetchFeeLedgers(),
          fetchMenus(),
          fetchLeaves(),
          fetchComplaints(),
          fetchReviews(),
          fetchTrustSummary(),
          fetchOwnerAnalytics(),
          fetchOwnerDefaulters(),
        ]);
        setFeeLedgers(ledgerData || []);
        setMenus(menuData || []);
        setLeaves(leaveData || []);
        setComplaints(complaintData || []);
        setReviews(reviewData || []);
        setTrustSummary(trustData);
        setOwnerAnalytics(analyticsData);
        setDefaulters(defaulterData || []);
      } catch (error) {
        onToast(error.message || "Unable to load owner operations.");
      }
    };
    loadOpsData();
  }, [activeTab, onToast]);

  const approvedStudents = students.filter((student) => student.status === "approved" || student.status === "checked_in");
  const formatDisplayDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const formatDisplayDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${formatDisplayDate(value)} ${hours}:${minutes}`;
  };
  const sortedStudents = useMemo(() => {
    const list = [...students];
    const dateValue = (value) => {
      if (!value) return Number.POSITIVE_INFINITY;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
    };

    if (guestSortBy === "join_date") {
      return list.sort((a, b) => {
        const diff = dateValue(a.move_in_date) - dateValue(b.move_in_date);
        if (diff !== 0) return diff;
        return (a.student_name || "").localeCompare(b.student_name || "");
      });
    }

    if (guestSortBy === "due_date") {
      return list.sort((a, b) => {
        const diff = dateValue(a.upcoming_fee_due_date) - dateValue(b.upcoming_fee_due_date);
        if (diff !== 0) return diff;
        return (a.student_name || "").localeCompare(b.student_name || "");
      });
    }

    return list.sort((a, b) => (a.student_name || "").localeCompare(b.student_name || ""));
  }, [students, guestSortBy]);
  const activeGuests = sortedStudents.filter((student) => student.status !== "checked_out");
  const checkedOutGuests = sortedStudents.filter((student) => student.status === "checked_out");

  const handleGuestFieldChange = (guestId, field, value) => {
    setGuestEditForms((prev) => ({
      ...prev,
      [guestId]: {
        ...(prev[guestId] || {}),
        [field]: value,
      },
    }));
  };

  const handleGuestSave = async (guestId) => {
    const form = guestEditForms[guestId];
    if (!form) return;
    try {
      await updateOwnerGuest(guestId, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        college_company: form.college_company,
        emergency_contact: form.emergency_contact,
        room_number: form.room_number,
        room_type: form.room_type,
      });
      const data = await fetchOwnerStudents();
      setStudents(data);
      onToast("Guest details updated.");
    } catch (error) {
      onToast(error.message || "Unable to update guest.");
    }
  };

  const handleGuestStatusChange = async (bookingId, nextStatus) => {
    try {
      await updateBooking(bookingId, { status: nextStatus });
      const data = await fetchOwnerStudents();
      setStudents(data);
      onToast(nextStatus === "checked_in" ? "Guest checked in." : "Guest checked out.");
    } catch (error) {
      onToast(error.message || "Unable to update guest status.");
    }
  };
  const handleCreateFee = async () => {
    try {
      await createFeeLedger({
        hostel: Number(feeForm.hostelId),
        student: Number(feeForm.studentId),
        month: feeForm.month,
        amount_due: Number(feeForm.amountDue || 0),
        amount_paid: 0,
        due_date: feeForm.dueDate,
        late_fee: Number(feeForm.lateFee || 0),
        status: "pending",
      });
      onToast("Fee ledger created.");
      setFeeForm({ hostelId: hostels[0]?.id ? String(hostels[0].id) : "", studentId: "", month: "", amountDue: "", dueDate: "", lateFee: "0" });
      setFeeLedgers(await fetchFeeLedgers());
    } catch (error) {
      onToast(error.message || "Unable to create fee ledger.");
    }
  };

  const handleRecordPayment = async () => {
    try {
      await createFeePayment({
        ledger: Number(paymentForm.ledgerId),
        amount: Number(paymentForm.amount || 0),
        mode: paymentForm.mode,
        reference_id: paymentForm.referenceId,
      });
      onToast("Payment recorded.");
      setPaymentForm({ ledgerId: "", amount: "", mode: "upi", referenceId: "" });
      setFeeLedgers(await fetchFeeLedgers());
      setOwnerAnalytics(await fetchOwnerAnalytics());
      setDefaulters(await fetchOwnerDefaulters());
    } catch (error) {
      onToast(error.message || "Unable to record payment.");
    }
  };

  const handleSendReminders = async () => {
    try {
      const result = await sendOwnerFeeReminders({ only_overdue: true });
      onToast(result.detail || "Fee reminders sent.");
    } catch (error) {
      onToast(error.message || "Unable to send fee reminders.");
    }
  };

  const handleExportLedgers = async () => {
    try {
      await downloadOwnerFeeLedgerExport();
      onToast("Fee ledger export downloaded.");
    } catch (error) {
      onToast(error.message || "Unable to export fee ledgers.");
    }
  };

  const handleSaveMenu = async () => {
    try {
      const existing = menus.find(
        (menu) => menu.hostel === Number(menuForm.hostelId) && menu.date === menuForm.date && menu.is_override === menuForm.isOverride,
      );
      const payload = {
        hostel: Number(menuForm.hostelId),
        date: menuForm.date,
        breakfast: menuForm.breakfast,
        lunch: menuForm.lunch,
        dinner: menuForm.dinner,
        is_override: menuForm.isOverride,
      };
      if (existing) {
        await updateMenu(existing.id, payload);
      } else {
        await createMenu(payload);
      }
      onToast("Menu saved.");
      setMenus(await fetchMenus());
    } catch (error) {
      onToast(error.message || "Unable to save menu.");
    }
  };

  const handleLeaveStatus = async (leaveId, status) => {
    try {
      await updateLeave(leaveId, { status });
      onToast(`Leave ${status}.`);
      setLeaves(await fetchLeaves());
    } catch (error) {
      onToast(error.message || "Unable to update leave.");
    }
  };

  const handleCreateComplaint = async () => {
    try {
      await createComplaint({
        hostel: Number(complaintForm.hostelId),
        student: Number(complaintForm.studentId),
        reason: complaintForm.reason,
        evidence_urls: complaintForm.evidenceUrl ? [complaintForm.evidenceUrl] : [],
      });
      onToast("Complaint submitted for admin review.");
      setComplaintForm({ hostelId: hostels[0]?.id ? String(hostels[0].id) : "", studentId: "", reason: "", evidenceUrl: "" });
      setComplaints(await fetchComplaints());
      setTrustSummary(await fetchTrustSummary());
    } catch (error) {
      onToast(error.message || "Unable to create complaint.");
    }
  };

  const handleOwnerReply = async (reviewId) => {
    try {
      await updateReview(reviewId, { owner_reply: ownerReplies[reviewId] || "" });
      onToast("Reply saved.");
      setReviews(await fetchReviews());
    } catch (error) {
      onToast(error.message || "Unable to save reply.");
    }
  };

  const handleAddWalkinStudent = async () => {
    try {
      await createWalkinStudent({
        name: walkinForm.name,
        phone: walkinForm.phone,
        email: walkinForm.email || null,
        hostel: Number(walkinForm.hostelId),
        room_number: walkinForm.roomNumber,
        room_type: walkinForm.roomType,
        move_in_date: walkinForm.moveInDate,
        joining_fee_status: walkinForm.joiningFeeStatus,
        joining_fee_paid: walkinForm.joiningFeePaid || 0,
        joining_fee_mode: walkinForm.joiningFeeMode,
        joining_fee_reference: walkinForm.joiningFeeReference,
        college_company: walkinForm.collegeCompany,
        emergency_contact: walkinForm.emergencyContact,
      });
      onToast("Walk-in guest added and checked in.");
      setWalkinForm({
        name: "",
        phone: "",
        email: "",
        hostelId: hostels[0]?.id ? String(hostels[0].id) : "",
        roomNumber: "",
        roomType: "double",
        moveInDate: "",
        joiningFeeStatus: "unpaid",
        joiningFeePaid: "",
        joiningFeeMode: "cash",
        joiningFeeReference: "",
        collegeCompany: "",
        emergencyContact: "",
      });
      setStudents(await fetchOwnerStudents());
      if (onRefreshHostels) {
        await onRefreshHostels();
      }
    } catch (error) {
      onToast(error.message || "Unable to add walk-in guest.");
    }
  };

  const walkinJoinDate = walkinForm.moveInDate ? new Date(`${walkinForm.moveInDate}T00:00:00`) : null;
  const todayDate = new Date();
  const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const isWalkinJoiningToday = Boolean(walkinJoinDate) && walkinJoinDate.getTime() === startOfToday.getTime();
  const isWalkinBackdated = Boolean(walkinJoinDate) && walkinJoinDate.getTime() < startOfToday.getTime();
  const ownerActionItems = [
    {
      title: "Complete Listing",
      desc: "Finish pricing, amenities, floors, and fee breakup so guests see a reliable profile.",
      cta: "Edit Hostel",
      tab: "edit",
    },
    {
      title: "Add or Check In Guests",
      desc: "Use walk-in entry or manage approved requests to keep occupancy accurate.",
      cta: "Open Guests",
      tab: "students",
    },
    {
      title: "Collect Monthly Fees",
      desc: "Create ledgers, record payments, and keep overdue amounts under control.",
      cta: "Open Fees",
      tab: "fees",
    },
  ];
  const ownerHighlights = [
    `${stats.availableBeds} beds currently open`,
    `${requests.length} booking requests tracked`,
    `${students.length} guests in active records`,
  ];


  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          Stay
          <span>Nest</span>
          {" "}
          Owner
        </div>
        <div className="sidebar-section">Management</div>
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item${activeTab === item.id ? " active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </div>
        ))}
        <div className="sidebar-section">Account</div>
        <div className="sidebar-item" onClick={onLogout}>Logout</div>
      </div>

      <div className="dash-main">
        {ownerStatus !== "active" && (
          <div className="form-section" style={{ marginBottom: 20, background: "#fff7ed" }}>
            <div className="form-section-title">Verification Status</div>
            <p style={{ color: "#9a3412", fontSize: 14 }}>
              Your owner account is pending admin verification. You can submit listings now; they stay
              hidden until approved.
            </p>
          </div>
        )}

        <div className="dash-header">
          <div className="dash-greeting">Welcome back, {ownerName}</div>
          <div className="dash-title">
            {sidebarItems.find((item) => item.id === activeTab)?.label}
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="form-section" style={{ marginBottom: 18 }}>
              <div className="form-section-title">Next Best Actions</div>
              <div className="workflow-grid">
                {ownerActionItems.map((item) => (
                  <div key={item.title} className="workflow-card">
                    <div className="workflow-card-title">{item.title}</div>
                    <p className="workflow-card-desc">{item.desc}</p>
                    <button className="card-cta" onClick={() => setActiveTab(item.tab)}>
                      {item.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-section" style={{ marginBottom: 18 }}>
              <div className="form-section-title">Owner Profile</div>
              <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                <div>
                  Name:
                  {" "}
                  <strong>{ownerName}</strong>
                </div>
                <div>
                  Phone:
                  {" "}
                  <strong>{ownerPhone || "Not provided"}</strong>
                </div>
                <div>
                  Role:
                  {" "}
                  <strong>{ownerRole}</strong>
                </div>
                <div>
                  Status:
                  {" "}
                  <strong>{ownerStatus}</strong>
                </div>
                {trustSummary && (
                  <div>
                    Published Reviews:
                    {" "}
                    <strong>{trustSummary.published_reviews_count}</strong>
                  </div>
                )}
              </div>
              <div className="card-signal-row" style={{ marginTop: 16 }}>
                {ownerHighlights.map((item) => (
                  <span key={item} className="card-signal">{item}</span>
                ))}
              </div>
            </div>
            <div className="stats-row">
              {[
                { label: "Your Hostels", num: stats.totalHostels },
                { label: "Total Beds", num: stats.totalBeds },
                { label: "Available Beds", num: stats.availableBeds },
                { label: "Pending Requests", num: stats.pendingRequests },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num">{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="form-section">
              <div className="form-section-title">Your Listings</div>
              {hostels.length === 0 && (
                <div className="empty-state" style={{ padding: "28px 12px" }}>
                  <span className="empty-icon">Listing</span>
                  <div className="empty-title">Your listing will appear here</div>
                  <p className="empty-sub">Once your hostel is approved, this section becomes your command center for pricing, occupancy, and guest operations.</p>
                </div>
              )}
              {hostels.map((hostel) => (
                <div
                  key={hostel.id}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{hostel.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 2 }}>
                  {hostel.location}
                    ,{" "}
                    {hostel.city}
                    {" "}
                    -
                    {" "}
                    {hostel.gender}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {hostel.address}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Contact:
                    {" "}
                    <strong>{hostel.contact_number || "Not provided"}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Amenities:
                    {" "}
                    {(hostel.amenities && hostel.amenities.length > 0)
                      ? hostel.amenities.join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Rooms:
                    {" "}
                    {(hostel.rooms && hostel.rooms.length > 0)
                      ? hostel.rooms.map((room) =>
                        `${room.type} - INR ${room.price} (${room.available}/${room.total} beds)`).join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Photos:
                    {" "}
                    {hostel.images ? hostel.images.length : 0}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Listing Status:
                    {" "}
                    <strong>{hostel.moderationStatus}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "edit" && (
          <div className="form-section">
            <div className="form-section-title">Edit Hostel / PG Details</div>
            {hostels.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No hostels available.
              </p>
            )}
            {hostels.length > 0 && editForm && (
              <>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Hostel Name</label>
                    <input
                      className="form-input"
                      value={editForm.name}
                      onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Area / Location</label>
                    <input
                      className="form-input"
                      value={editForm.area}
                      onChange={(event) => setEditForm({ ...editForm, area: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-input"
                      value={editForm.city}
                      onChange={(event) => setEditForm({ ...editForm, city: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hostel Type</label>
                    <select
                      className="form-select"
                      value={editForm.gender}
                      onChange={(event) => setEditForm({ ...editForm, gender: event.target.value })}
                    >
                      <option>Boys</option>
                      <option>Girls</option>
                      <option>Co-Live</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input
                      className="form-input"
                      value={editForm.contact_number}
                      onChange={(event) => setEditForm({ ...editForm, contact_number: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Floors</label>
                    <input
                      className="form-input"
                      type="number"
                      value={editForm.totalFloors}
                      onChange={(event) => handleFloorsChange(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Rooms</label>
                    <input
                      className="form-input"
                      value={calculatedTotalRooms}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Beds</label>
                    <input className="form-input" value={calculatedTotalBeds} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      className="form-input"
                      value={editForm.pincode}
                      onChange={(event) => setEditForm({ ...editForm, pincode: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      value={editForm.address}
                      onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.description}
                      onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Rules / Other Details</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.rules}
                      onChange={(event) => setEditForm({ ...editForm, rules: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Amenities (comma separated)</label>
                    <input
                      className="form-input"
                      value={editForm.amenitiesText}
                      onChange={(event) => setEditForm({ ...editForm, amenitiesText: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Hostel/PG Photos</label>
                    <input
                      className="form-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditPhotoFiles}
                    />
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      Existing photos:
                      {" "}
                      {editForm.existingPhotos?.length || 0}
                      {" "}
                      | New selected:
                      {" "}
                      {editForm.newPhotoFiles?.length || 0}
                    </div>
                    {hasPhotos && (
                      <div
                        style={{
                          marginTop: 12,
                          border: "1px solid var(--cream-dark)",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "white",
                        }}
                      >
                        <div style={{ position: "relative" }}>
                          <img
                            src={activePhoto}
                            alt={`Hostel photo ${photoIndex + 1}`}
                            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                          />
                          {mergedPhotosPreview.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === 0 ? mergedPhotosPreview.length - 1 : prev - 1)}
                                style={{
                                  position: "absolute",
                                  left: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === mergedPhotosPreview.length - 1 ? 0 : prev + 1)}
                                style={{
                                  position: "absolute",
                                  right: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Next
                              </button>
                            </>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap" }}>
                          {mergedPhotosPreview.map((photo, index) => (
                            <button
                              key={`${photo}-${index}`}
                              type="button"
                              onClick={() => setPhotoIndex(index)}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: index === photoIndex ? "2px solid var(--terra)" : "1px solid var(--cream-dark)",
                                padding: 0,
                                overflow: "hidden",
                                background: "white",
                                cursor: "pointer",
                              }}
                            >
                              <img
                                src={photo}
                                alt={`Thumb ${index + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section-title">Fee, Booking Advance & Security Deposit</div>
                  <p style={{ margin: "0 0 12px", color: "var(--warm-gray)", fontSize: 13 }}>
                    Set the monthly fee, one-time booking advance, and refundable security deposit for each share type.
                  </p>
                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                    {shareTypeConfig.map((item) => {
                      const room = editForm.rooms.find((entry) => entry.type === item.label);
                      return (
                        <div key={`share-price-${item.key}`} style={{ display: "grid", gap: 10 }}>
                          <div className="form-group">
                            <label className="form-label">{item.label} Monthly Fee</label>
                            <input
                              className="form-input"
                              type="number"
                              value={room?.price ?? ""}
                              onChange={(event) => handleSharePriceChange(item.label, event.target.value)}
                              placeholder={`Enter fee for ${item.label}`}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">{item.label} Booking Advance</label>
                            <input
                              className="form-input"
                              type="number"
                              value={room?.bookingAdvance ?? ""}
                              onChange={(event) => handleRoomChange(room?.id, "bookingAdvance", event.target.value, item.label)}
                              placeholder={`Advance for ${item.label}`}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">{item.label} Security Deposit</label>
                            <input
                              className="form-input"
                              type="number"
                              value={room?.securityDeposit ?? ""}
                              onChange={(event) => handleRoomChange(room?.id, "securityDeposit", event.target.value, item.label)}
                              placeholder={`Deposit for ${item.label}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section-title">Rooms</div>
                  {editForm.rooms.map((room) => (
                    <div className="form-grid" key={room.id || room.type} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                      <div className="form-group">
                        <label className="form-label">{room.type} Price</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.price}
                          onChange={(event) => handleRoomChange(room.id, "price", event.target.value, room.type)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Total Beds</label>
                        <input
                          className="form-input"
                          value={calculatedRoomTotals[room.type] ?? room.total}
                          disabled
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Available Beds</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.available}
                          onChange={(event) => handleRoomChange(room.id, "available", event.target.value, room.type)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section-title">Rooms Per Floor</div>
                  {editForm.floorRoomCounts.length === 0 && (
                    <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                      Enter total floors to define per-floor room counts.
                    </p>
                  )}
                  {editForm.floorRoomCounts.map((floor) => (
                    <div key={floor.floor} className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
                      <div className="form-group">
                        <label className="form-label">Floor</label>
                        <input className="form-input" value={`Floor ${floor.floor}`} disabled />
                      </div>
                      {[
                        ["double", "2 Share"],
                        ["triple", "3 Share"],
                        ["four", "4 Share"],
                        ["five", "5 Share"],
                        ["six", "6 Share"],
                      ].map(([key, label]) => (
                        <div className="form-group" key={`${floor.floor}-${key}`}>
                          <label className="form-label">{label}</label>
                          <input
                            className="form-input"
                            type="number"
                            value={floor[key]}
                            onChange={(event) => handleFloorRoomChange(floor.floor, key, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <button className="submit-btn" onClick={handleSaveEdits} style={{ marginTop: 12 }}>
                  Save Changes
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === "students" && guestDetailId && selectedGuest && (
          <div className="form-section">
            <button className="back-btn" onClick={() => setGuestDetailId(null)}>
              Back to Guests
            </button>
            <div className="form-section-title" style={{ marginTop: 12 }}>Guest Details</div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{selectedGuest.student_name}</div>
                <div style={{ color: "var(--warm-gray)", marginTop: 6 }}>{selectedGuest.hostel_name}</div>
                <div style={{ color: "var(--warm-gray)", marginTop: 6 }}>
                  {selectedGuest.room_number ? `${selectedGuest.room_number} - ` : ""}
                  {selectedGuest.room_type || "Not assigned"}
                </div>
              </div>
              <div style={{ minWidth: 220, textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--warm-gray)" }}>Upcoming Payment</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  INR {selectedGuest.upcoming_fee_amount || "0"}
                </div>
                <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 4 }}>
                  {selectedGuest.upcoming_fee_due_date ? `Due ${formatDisplayDate(selectedGuest.upcoming_fee_due_date)}` : "No pending fee"}
                </div>
                <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 8 }}>
                  Trust {selectedGuest.trust_score ?? 0} | {selectedGuest.verification_state || "unverified"}
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Guest Name</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.name || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "name", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.phone || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "phone", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.email || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "email", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  value={guestEditForms[selectedGuest.student_id]?.age || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "age", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={guestEditForms[selectedGuest.student_id]?.gender || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "gender", event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">College / Company</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.college_company || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "college_company", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Transfer Room Number</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.room_number || selectedGuest.room_number || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "room_number", event.target.value)}
                  placeholder="101 / A-2"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Transfer Share Type</label>
                <select
                  className="form-select"
                  value={guestEditForms[selectedGuest.student_id]?.room_type || selectedGuest.room_type || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "room_type", event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="2 Share">2 Share</option>
                  <option value="3 Share">3 Share</option>
                  <option value="4 Share">4 Share</option>
                  <option value="5 Share">5 Share</option>
                  <option value="6 Share">6 Share</option>
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Emergency Contact</label>
                <input
                  className="form-input"
                  value={guestEditForms[selectedGuest.student_id]?.emergency_contact || ""}
                  onChange={(event) => handleGuestFieldChange(selectedGuest.student_id, "emergency_contact", event.target.value)}
                />
              </div>
            </div>
            <button className="submit-btn" style={{ marginTop: 12 }} onClick={() => handleGuestSave(selectedGuest.student_id)}>
              Save Guest Details
            </button>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {selectedGuest.status !== "checked_in" && (
                <button
                  className="card-cta"
                  type="button"
                  onClick={() => handleGuestStatusChange(selectedGuest.booking_id, "checked_in")}
                >
                  Check In Guest
                </button>
              )}
              {selectedGuest.status === "checked_in" && (
                <button
                  className="nav-btn"
                  type="button"
                  onClick={() => handleGuestStatusChange(selectedGuest.booking_id, "checked_out")}
                >
                  Check Out Guest
                </button>
              )}
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section-title">Fee Summary & Payment History</div>
              {selectedGuest.fee_history?.length ? selectedGuest.fee_history.map((ledger) => (
                <div key={ledger.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 12, background: "white", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{formatDisplayDate(ledger.month)}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Due {formatDisplayDate(ledger.due_date)} | Amount INR {ledger.amount_due} | Paid INR {ledger.amount_paid}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Status: <strong>{ledger.status}</strong>
                  </div>
                  {ledger.payments?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--warm-gray)" }}>
                      {ledger.payments.map((payment) => `INR ${payment.amount} via ${payment.mode} on ${formatDisplayDateTime(payment.paid_at)}`).join(" | ")}
                    </div>
                  )}
                </div>
              )) : (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No fee history yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "students" && !guestDetailId && (
          <>
            <div className="form-section">
              <div className="form-section-title">Add Walk-in Guest</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={walkinForm.name} onChange={(event) => setWalkinForm({ ...walkinForm, name: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={walkinForm.phone} onChange={(event) => setWalkinForm({ ...walkinForm, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={walkinForm.email} onChange={(event) => setWalkinForm({ ...walkinForm, email: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input
                    className="form-input"
                    value={walkinForm.roomNumber}
                    onChange={(event) => setWalkinForm({ ...walkinForm, roomNumber: event.target.value })}
                    placeholder="Enter room number like 101 or A-2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type of Share</label>
                  <select
                    className="form-select"
                    value={walkinForm.roomType}
                    onChange={(event) => setWalkinForm({ ...walkinForm, roomType: event.target.value })}
                  >
                    <option value="single">Single</option>
                    <option value="double">2 Share</option>
                    <option value="triple">3 Share</option>
                    <option value="four">4 Share</option>
                    <option value="five">5 Share</option>
                    <option value="six">6 Share</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Move-in Date</label>
                  <input className="form-input" type="date" value={walkinForm.moveInDate} onChange={(event) => setWalkinForm({ ...walkinForm, moveInDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Fee Status</label>
                  <select
                    className="form-select"
                    value={walkinForm.joiningFeeStatus}
                    onChange={(event) => setWalkinForm({ ...walkinForm, joiningFeeStatus: event.target.value })}
                    disabled={!isWalkinJoiningToday}
                  >
                    <option value="unpaid">Not Paid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Fee Paid Amount</label>
                  <input
                    className="form-input"
                    type="number"
                    value={walkinForm.joiningFeePaid}
                    onChange={(event) => setWalkinForm({ ...walkinForm, joiningFeePaid: event.target.value })}
                    placeholder={isWalkinJoiningToday ? "Enter paid amount for today" : "Auto-handled from join date"}
                    disabled={!isWalkinJoiningToday || walkinForm.joiningFeeStatus === "unpaid"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-select"
                    value={walkinForm.joiningFeeMode}
                    onChange={(event) => setWalkinForm({ ...walkinForm, joiningFeeMode: event.target.value })}
                    disabled={!isWalkinJoiningToday || walkinForm.joiningFeeStatus === "unpaid"}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Reference</label>
                  <input
                    className="form-input"
                    value={walkinForm.joiningFeeReference}
                    onChange={(event) => setWalkinForm({ ...walkinForm, joiningFeeReference: event.target.value })}
                    placeholder={isWalkinJoiningToday ? "Optional reference" : "Auto-paid for backdated joins"}
                    disabled={!isWalkinJoiningToday || walkinForm.joiningFeeStatus === "unpaid"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">College / Company</label>
                  <input className="form-input" value={walkinForm.collegeCompany} onChange={(event) => setWalkinForm({ ...walkinForm, collegeCompany: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <input className="form-input" value={walkinForm.emergencyContact} onChange={(event) => setWalkinForm({ ...walkinForm, emergencyContact: event.target.value })} />
                </div>
              </div>
              {isWalkinBackdated && (
                <p style={{ marginTop: 12, color: "var(--warm-gray)", fontSize: 13 }}>
                  This is a backdated join. Monthly fee ledger entries up to today will be auto-created as paid.
                </p>
              )}
              {isWalkinJoiningToday && (
                <p style={{ marginTop: 12, color: "var(--warm-gray)", fontSize: 13 }}>
                  For today&apos;s join, choose whether the current month fee is unpaid, partially paid, or fully paid.
                </p>
              )}
              <button className="submit-btn" onClick={handleAddWalkinStudent} style={{ marginTop: 12 }}>
                Add Walk-in Guest
              </button>
            </div>

            <div className="form-section">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <div className="form-section-title" style={{ marginBottom: 0 }}>Guests</div>
                <div className="form-group" style={{ minWidth: 220, marginBottom: 0 }}>
                  <label className="form-label">Sort Guests By</label>
                  <select
                    className="form-select"
                    value={guestSortBy}
                    onChange={(event) => setGuestSortBy(event.target.value)}
                  >
                    <option value="name">Name</option>
                    <option value="join_date">Date of Join</option>
                    <option value="due_date">Upcoming Due Date</option>
                  </select>
                </div>
              </div>
              {studentsLoading && (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>Loading guests...</p>
              )}
              {!studentsLoading && students.length === 0 && (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                  No guests found yet.
                </p>
              )}
              {!studentsLoading && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 16 }}>Active Guests</div>
                  {activeGuests.length === 0 && (
                    <p style={{ color: "var(--warm-gray)", fontSize: 14, marginBottom: 16 }}>
                      No active guests right now.
                    </p>
                  )}
                  {activeGuests.map((student) => (
                    <div
                      key={student.booking_id}
                      style={{
                        border: "1px solid var(--cream-dark)",
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 10,
                        background: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{student.student_name}</div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Phone:
                          {" "}
                          {student.student_phone}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Hostel:
                          {" "}
                          {student.hostel_name}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Room Type:
                          {" "}
                          {student.room_number ? `${student.room_number} - ` : ""}
                          {student.room_type || "Not assigned"}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                          Status:
                          {" "}
                          <strong>{student.status}</strong>
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "var(--warm-gray)" }}>
                          Joined:
                          {" "}
                          <strong>{student.move_in_date ? formatDisplayDate(student.move_in_date) : "Not set"}</strong>
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "var(--warm-gray)" }}>
                          Trust: <strong>{student.trust_score ?? 0}</strong> | Verification: <strong>{student.verification_state || "unverified"}</strong>
                        </div>
                      </div>
                      <div style={{ minWidth: 190, textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "var(--warm-gray)" }}>Upcoming Payment</div>
                        {student.upcoming_fee_due_date ? (
                          <>
                            <div style={{ fontWeight: 700, marginTop: 4 }}>
                              INR {student.upcoming_fee_amount || "0"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 4 }}>
                              Due {formatDisplayDate(student.upcoming_fee_due_date)}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 6 }}>
                            No pending fee
                          </div>
                        )}
                        <button
                          className="nav-btn"
                          type="button"
                          style={{ marginTop: 12 }}
                          onClick={() => setGuestDetailId(student.student_id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{ fontWeight: 700, margin: "20px 0 10px", fontSize: 16 }}>Checked Out Guests</div>
                  {checkedOutGuests.length === 0 && (
                    <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                      No checked out guests yet.
                    </p>
                  )}
                  {checkedOutGuests.map((student) => (
                    <div
                      key={student.booking_id}
                      style={{
                        border: "1px solid var(--cream-dark)",
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 10,
                        background: "#faf6ef",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{student.student_name}</div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Phone:
                          {" "}
                          {student.student_phone}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Hostel:
                          {" "}
                          {student.hostel_name}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                          Last Room:
                          {" "}
                          {student.room_number ? `${student.room_number} - ` : ""}
                          {student.room_type || "Not assigned"}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                          Status:
                          {" "}
                          <strong>{student.status}</strong>
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "var(--warm-gray)" }}>
                          Joined:
                          {" "}
                          <strong>{student.move_in_date ? formatDisplayDate(student.move_in_date) : "Not set"}</strong>
                        </div>
                      </div>
                      <div style={{ minWidth: 190, textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "var(--warm-gray)" }}>Fee Status</div>
                        <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 6 }}>
                          Historical record only
                        </div>
                        <button
                          className="nav-btn"
                          type="button"
                          style={{ marginTop: 12 }}
                          onClick={() => setGuestDetailId(student.student_id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}


        {activeTab === "enquiries" && (
          <div className="form-section">
            <div className="form-section-title">Booking Requests</div>
            {requests.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No booking requests yet.
              </p>
            )}
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {request.studentName}
                  {" "}
                  requested
                  {" "}
                  {request.roomType}
                </div>
                {request.studentPhone && (
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Phone:
                    {" "}
                    {request.studentPhone}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Hostel:
                  {" "}
                  {request.hostelName}
                  {" "}
                  - Move-in:
                  {" "}
                  {request.moveInDate ? formatDisplayDate(request.moveInDate) : "Not set"}
                </div>
                {request.message && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>"{request.message}"</div>
                )}
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  Status:
                  {" "}
                  <strong>{request.status}</strong>
                </div>

                {request.status === "pending" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="card-cta"
                      onClick={() => onRequestStatusChange(request.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => onRequestStatusChange(request.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Profile Settings</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" defaultValue={ownerName} />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" placeholder="name@upi" />
                </div>
              </div>
            </div>
            <button className="submit-btn" onClick={() => onToast("Settings saved.")}>
              Save Settings
            </button>
          </>
        )}

        {activeTab === "fees" && (
          <>
            <div className="stats-row">
              {[
                { label: "Fee Collected Till Date", num: `INR ${ownerAnalytics?.fee_collected_till_date ?? ownerAnalytics?.revenue_collected ?? 0}` },
                { label: "Pending / Overdue Amount", num: `INR ${ownerAnalytics?.fee_pending_or_overdue_amount ?? ownerAnalytics?.outstanding_amount ?? 0}` },
                { label: "Monthly Collected", num: `INR ${ownerAnalytics?.monthly_collected ?? 0}` },
                { label: "Monthly Overdue", num: `INR ${ownerAnalytics?.monthly_overdue ?? 0}` },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num" style={{ fontSize: 24 }}>{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">Collections Toolkit</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="submit-btn" onClick={handleSendReminders}>
                  Send Overdue Reminders
                </button>
                <button className="nav-btn" onClick={handleExportLedgers}>
                  Export Fee Ledger CSV
                </button>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Defaulters</div>
              {defaulters.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No overdue guests right now.</p>}
              {defaulters.map((item) => (
                <div key={item.ledger_id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{item.student_name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {item.hostel_name} | Due {formatDisplayDate(item.due_date)} | {item.days_overdue} day(s) overdue
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Outstanding: <strong>INR {item.outstanding_amount}</strong> | Status: <strong>{item.status}</strong>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--warm-gray)" }}>
                    Phone: {item.student_phone || "Not provided"}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">Create Fee Ledger</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Guest</label>
                  <select className="form-select" value={feeForm.studentId} onChange={(event) => setFeeForm({ ...feeForm, studentId: event.target.value })}>
                    <option value="">Select guest</option>
                    {approvedStudents.map((student) => <option key={student.booking_id} value={student.student_id}>{student.student_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <input className="form-input" type="date" value={feeForm.month} onChange={(event) => setFeeForm({ ...feeForm, month: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Due</label>
                  <input className="form-input" type="number" value={feeForm.amountDue} onChange={(event) => setFeeForm({ ...feeForm, amountDue: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={feeForm.dueDate} onChange={(event) => setFeeForm({ ...feeForm, dueDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Late Fee</label>
                  <input className="form-input" type="number" value={feeForm.lateFee} onChange={(event) => setFeeForm({ ...feeForm, lateFee: event.target.value })} />
                </div>
              </div>
              <button className="submit-btn" onClick={handleCreateFee} style={{ marginTop: 12 }}>Create Fee</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Record Payment</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Ledger</label>
                  <select className="form-select" value={paymentForm.ledgerId} onChange={(event) => setPaymentForm({ ...paymentForm, ledgerId: event.target.value })}>
                    <option value="">Select ledger</option>
                    {feeLedgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.student_name} - {formatDisplayDate(ledger.month)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={paymentForm.mode} onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference</label>
                  <input className="form-input" value={paymentForm.referenceId} onChange={(event) => setPaymentForm({ ...paymentForm, referenceId: event.target.value })} />
                </div>
              </div>
              <button className="submit-btn" onClick={handleRecordPayment} style={{ marginTop: 12 }}>Record Payment</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Fee Ledger History</div>
              {feeLedgers.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No fee ledgers yet.</p>}
              {feeLedgers.map((ledger) => (
                <div key={ledger.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{ledger.student_name} - {ledger.hostel_name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Due {formatDisplayDate(ledger.due_date)} | Amount Due INR {ledger.amount_due} | Paid INR {ledger.amount_paid}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{ledger.status}</strong></div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "menu" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Plan or Override Menu</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={menuForm.date} onChange={(event) => setMenuForm({ ...menuForm, date: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Breakfast</label>
                  <input className="form-input" value={menuForm.breakfast} onChange={(event) => setMenuForm({ ...menuForm, breakfast: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lunch</label>
                  <input className="form-input" value={menuForm.lunch} onChange={(event) => setMenuForm({ ...menuForm, lunch: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dinner</label>
                  <input className="form-input" value={menuForm.dinner} onChange={(event) => setMenuForm({ ...menuForm, dinner: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Today's Override</label>
                  <select className="form-select" value={menuForm.isOverride ? "yes" : "no"} onChange={(event) => setMenuForm({ ...menuForm, isOverride: event.target.value === "yes" })}>
                    <option value="no">Weekly Plan</option>
                    <option value="yes">Today Override</option>
                  </select>
                </div>
              </div>
              <button className="submit-btn" onClick={handleSaveMenu} style={{ marginTop: 12 }}>Save Menu</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Saved Menus</div>
              {menus.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No menus saved yet.</p>}
              {menus.map((menu) => (
                <div key={menu.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{menu.hostel_name} - {formatDisplayDate(menu.date)}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Breakfast: {menu.breakfast || "-"} | Lunch: {menu.lunch || "-"} | Dinner: {menu.dinner || "-"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Type: <strong>{menu.is_override ? "Today Override" : "Planned Menu"}</strong></div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "leaves" && (
          <div className="form-section">
            <div className="form-section-title">Guest Leave Requests</div>
            {leaves.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No leave requests yet.</p>}
            {leaves.map((leave) => (
              <div key={leave.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                <div style={{ fontWeight: 700 }}>{leave.student_name}</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  {formatDisplayDate(leave.start_date)} to {formatDisplayDate(leave.end_date)}
                </div>
                {leave.reason && <div style={{ marginTop: 8, fontSize: 13 }}>"{leave.reason}"</div>}
                <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{leave.status}</strong></div>
                {leave.status === "requested" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button className="card-cta" onClick={() => handleLeaveStatus(leave.id, "approved")}>Approve</button>
                    <button className="nav-btn" onClick={() => handleLeaveStatus(leave.id, "rejected")}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "complaints" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Raise Complaint</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Guest</label>
                  <select className="form-select" value={complaintForm.studentId} onChange={(event) => setComplaintForm({ ...complaintForm, studentId: event.target.value })}>
                    <option value="">Select guest</option>
                    {approvedStudents.map((student) => <option key={student.booking_id} value={student.student_id}>{student.student_name}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Reason</label>
                  <textarea className="form-textarea" value={complaintForm.reason} onChange={(event) => setComplaintForm({ ...complaintForm, reason: event.target.value })} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Evidence URL</label>
                  <input className="form-input" value={complaintForm.evidenceUrl} onChange={(event) => setComplaintForm({ ...complaintForm, evidenceUrl: event.target.value })} />
                </div>
              </div>
              <button className="submit-btn" onClick={handleCreateComplaint} style={{ marginTop: 12 }}>Submit Complaint</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Complaint History</div>
              {complaints.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No complaints filed yet.</p>}
              {complaints.map((complaint) => (
                <div key={complaint.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{complaint.student_name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {complaint.hostel_name} | {complaint.student_phone || "No phone"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>{complaint.reason}</div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{complaint.status}</strong></div>
                  {complaint.admin_decision && <div style={{ marginTop: 6, fontSize: 13 }}>Admin Note: {complaint.admin_decision}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "reviews" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Review Summary</div>
              {trustSummary?.hostel_review_summary?.length ? (
                trustSummary.hostel_review_summary.map((item) => (
                  <div key={item.hostel_id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                    <div style={{ fontWeight: 700 }}>{item.hostel_name}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                      Reviews: {item.reviews_count} | Average Rating: {item.average_rating ?? "Not enough data"} | Open Complaints: {item.open_complaints}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No published reviews yet.</p>
              )}
            </div>

            <div className="form-section">
              <div className="form-section-title">Review Replies</div>
              {reviews.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{review.hostel_name}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                    {review.student_name} | Avg Rating: {review.average_rating} | Status: {review.status}
                  </div>
                  {review.text && <div style={{ marginTop: 8, fontSize: 13 }}>{review.text}</div>}
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <textarea
                      className="form-textarea"
                      value={ownerReplies[review.id] ?? review.owner_reply ?? ""}
                      onChange={(event) => setOwnerReplies({ ...ownerReplies, [review.id]: event.target.value })}
                    />
                    <button className="submit-btn" onClick={() => handleOwnerReply(review.id)}>Save Reply</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
