# VeriTrust AI Security Specification & Threat Model

## 1. Data Invariants & Access Control Policy
1. **User Identity Invariant**: A user can only create and edit their own `/users/{userId}` profile where `request.auth.uid == userId`.
2. **Organization Integrity**: An organization can only be created with `ownerId == request.auth.uid`. Only the owner or an admin can update or delete the organization.
3. **RBAC Membership Invariant**:
   - `roles` are limited to `['owner', 'admin', 'member', 'viewer']`.
   - Only the Org `owner` or `admin` can invite, alter roles, or remove members.
   - A member cannot elevate themselves to `owner` or `admin`.
4. **Scan Report Visibility & Sensitivity**:
   - Private scan (`isOrgShared == false`): readable strictly by the scan author (`userId == request.auth.uid`).
   - Shared non-sensitive scan (`isOrgShared == true && isSensitive == false`): readable by members of `orgId`.
   - Shared sensitive scan (`isOrgShared == true && isSensitive == true`): readable only by the scan author, or Org `owner` / `admin` (protecting classified legal clauses / vulnerabilities).
5. **Audit Log Immutability**:
   - Audit logs are append-only. No updates or deletions are permitted by standard users.

## 2. The Dirty Dozen Attack Payloads
1. **Spoofed User Registration**: Client sends `userId: "admin_victim"` while authenticated as `"attacker"`. -> REJECT
2. **Ghost Fields Injection**: Adding `isAdmin: true` or `bypassed: true` into user profile. -> REJECT
3. **Privilege Escalation in Org**: A member sending `role: "owner"` on their own member document. -> REJECT
4. **Unauthorized Org Takeover**: Non-owner sending `ownerId: "attacker"` update to `/organizations/{orgId}`. -> REJECT
5. **Sensitive Report Scraping**: A viewer/member attempting to list or read scans marked `isSensitive: true` that belong to someone else. -> REJECT
6. **Cross-Tenant Scan Read**: User in Org A querying scans from Org B without membership. -> REJECT
7. **Orphaned Member Insertion**: Adding member without an existing organization. -> REJECT
8. **Audit Trail Tampering**: Attempting to delete or update an audit record. -> REJECT
9. **Denial of Wallet Oversized String**: Submitting a 5MB payload in `targetValue` or `detailsJson`. -> REJECT
10. **ID Traversal Poisoning**: Injecting path characters `../../` or special characters in `{orgId}`. -> REJECT
11. **Client Fake Timestamp**: Falsifying `createdAt` far in the past/future instead of valid ISO/server timestamp. -> REJECT
12. **Unauthenticated Probe**: Accessing private scan endpoints without Firebase Auth token. -> REJECT
