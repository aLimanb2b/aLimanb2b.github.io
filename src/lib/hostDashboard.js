const MOCK_HOST_KEY = "boxtobox_mock_host";

const mockDashboard = {
  host_id: "mock-host-1",
  total_count: 4,
  results: [
    {
      content_type: "event",
      id: "event-fifa-lagos",
      title: "Lagos FIFA Knockout",
      status: "upcoming",
      starts_at: "2026-06-01T18:00:00.000Z",
      deadline: "2026-05-31T18:00:00.000Z",
      location: { address_name: "The Arena", city: "Lagos", country: "Nigeria" },
      capacity: 32,
      registered_count: 24,
      reserved_count: 2,
      remaining_count: 6,
      payment_required: true,
      currency: "NGN",
      entry_fee: 5000,
      payment_summary: { currency: "NGN", paid_count: 18, pending_count: 4, failed_count: 2, gross_paid_amount: 90000 },
      attendees: [
        { id: "u-1", name: "Tunde Adebayo", email: "tunde@example.com", payment_status: "paid" },
        { id: "u-2", name: "Ada Nwosu", email: "ada@example.com", payment_status: "pending" },
        { id: "u-3", name: "Kemi Lawal", email: "kemi@example.com", payment_status: "paid" },
      ],
    },
    {
      content_type: "session",
      id: "session-thursday",
      title: "Thursday 5-a-side",
      status: "upcoming",
      starts_at: "2026-06-04T19:00:00.000Z",
      deadline: "2026-06-04T12:00:00.000Z",
      location: { address_name: "Lekki Sports Park", city: "Lagos", country: "Nigeria" },
      capacity: 14,
      registered_count: 12,
      reserved_count: 1,
      remaining_count: 1,
      payment_required: true,
      currency: "NGN",
      entry_fee: 2500,
      payment_summary: { currency: "NGN", paid_count: 10, pending_count: 2, failed_count: 0, gross_paid_amount: 25000 },
      attendees: [
        { id: "u-4", name: "Ife Okoro", email: "ife@example.com", registration_status: "registered" },
        { id: "u-5", name: "Sola Martins", email: "sola@example.com", registration_status: "registered" },
      ],
    },
    {
      content_type: "event",
      id: "event-efootball",
      title: "eFootball Weekend Cup",
      status: "completed",
      starts_at: "2026-04-18T16:00:00.000Z",
      deadline: "2026-04-17T18:00:00.000Z",
      location: { address_name: "BoxToBox House", city: "Abuja", country: "Nigeria" },
      capacity: 16,
      registered_count: 16,
      reserved_count: 0,
      remaining_count: 0,
      payment_required: false,
      currency: "NGN",
      entry_fee: 0,
      payment_summary: { currency: "NGN", paid_count: 0, pending_count: 0, failed_count: 0, gross_paid_amount: 0 },
      attendees: [
        { id: "u-6", name: "Musa Bello", email: "musa@example.com", payment_status: "not_required" },
      ],
    },
    {
      content_type: "session",
      id: "session-archived",
      title: "Sunday Recovery Ball",
      status: "archived",
      starts_at: "2026-03-10T08:00:00.000Z",
      deadline: "2026-03-09T18:00:00.000Z",
      location: { address_name: "Mainland Turf", city: "Lagos", country: "Nigeria" },
      capacity: 20,
      registered_count: 17,
      reserved_count: 0,
      remaining_count: 3,
      payment_required: true,
      currency: "NGN",
      entry_fee: 2000,
      payment_summary: { currency: "NGN", paid_count: 16, pending_count: 0, failed_count: 1, gross_paid_amount: 32000 },
      attendees: [
        { id: "u-7", name: "Nora Eze", email: "nora@example.com", registration_status: "registered" },
      ],
    },
  ],
};

export function getMockHost() {
  try {
    const raw = window.localStorage.getItem(MOCK_HOST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function setMockHost(host) {
  window.localStorage.setItem(MOCK_HOST_KEY, JSON.stringify(host));
}

export function clearMockHost() {
  window.localStorage.removeItem(MOCK_HOST_KEY);
}

export async function fetchHostDashboard() {
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  return mockDashboard;
}
