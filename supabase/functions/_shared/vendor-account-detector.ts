// vendor-account-detector — pure function used by employee sync paths
// (sync-toast-employees, sync-seven-shifts, employee-matching) to identify
// non-human integration / service accounts. See mem://architecture/vendor-account-handling.

export interface VendorDetectionInput {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  employee_name?: string | null;
  role_primary?: string | null;
}

export interface VendorDetectionResult {
  isVendor: boolean;
  reason: string | null; // diagnostic only — DB stores 'vendor_account' in exempt_reason
}

const VENDOR_DOMAINS = [
  "sculpturehospitality.com",
  "bevinco.com",
  "bevintel.com",
];

const VENDOR_NAME_PREFIX = /^(bevintel|bev intel|bevinco|bevinco-r|terminal login|sculpture)( |$)/i;
const VENDOR_FIRST_NAME = /^(bevintel|bevinco|sculpture|bev intel)/i;
const VENDOR_LAST_NAME = /^(bevintel|bevinco|sculpture|inventory|r-inventory)/i;
const PRIVILEGED_ROLE = /(owner|general manager)/i;
const VENDOR_NAME_ANY = /(bevintel|bevinco|sculpture)/i;

export function detectVendorAccount(input: VendorDetectionInput): VendorDetectionResult {
  const email = (input.email ?? "").toLowerCase().trim();
  const first = (input.first_name ?? "").trim();
  const last = (input.last_name ?? "").trim();
  const fullName = (input.employee_name ?? `${first} ${last}`).trim();
  const role = input.role_primary ?? "";

  // Rule 2 (cheapest, runs first): name-token match — catches @example.com Toast
  // placeholders and any vendor row regardless of email.
  if (VENDOR_NAME_PREFIX.test(fullName)) {
    return { isVendor: true, reason: "name_prefix" };
  }

  // Rule 1: vendor email domain AND vendor-shaped name parts. Excludes real
  // consultants who happen to be employed by the vendor (e.g. ty.reed@sculpture
  // hospitality.com → "Tyler Reed" stays human).
  const domainMatch = VENDOR_DOMAINS.some((d) => email.endsWith(`@${d}`));
  if (domainMatch) {
    const nameLooksVendor =
      (first.length > 0 && first.toLowerCase() === last.toLowerCase()) ||
      VENDOR_FIRST_NAME.test(first) ||
      VENDOR_LAST_NAME.test(last);
    if (nameLooksVendor) {
      return { isVendor: true, reason: "domain+name" };
    }
  }

  // Rule 3: @example.com placeholder + privileged role + vendor-y name token.
  if (/@example\.com$/i.test(email) && PRIVILEGED_ROLE.test(role) && VENDOR_NAME_ANY.test(fullName)) {
    return { isVendor: true, reason: "example_email_vendor_name" };
  }

  return { isVendor: false, reason: null };
}
