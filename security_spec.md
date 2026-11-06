# Security Specification: My Family AI

## 1. Data Invariants
1. **Family Code Format and Uniqueness**: Household documents are keyed by their exact Family Code (`AX-[3 letters]-[4 digits]`). No two households can have the same code.
2. **Member Profiles**: Must belong to an existing household. Roles are restricted to the allowed list (`Me`, `Mum`, `Dad`, `Brother`, `Sister`, `Grandparent`, `Other`). Nicknames are capped at 30 characters. No PII (no email, phone, physical address, password, or financial information) is permitted.
3. **Responses Subcollection**: Each person's response document is isolated under `/households/{householdId}/responses/{memberId}`.
4. **User Sessions**: Each authenticated user (including anonymous auth) can only write their own session document at `/userSessions/{userId}` matching `request.auth.uid`.
5. **Anonymous & Verified Access**: Application uses Firebase Anonymous Auth so family members can seamlessly join without passwords or email collection. All read/write operations require `request.auth != null`.

## 2. The Dirty Dozen Payloads (Negative Security Tests)
1. **Dirty 1: Malformed Family Code Document ID**: Attempting to create a household with an ID of `INVALID-123` instead of `AX-XXX-####`.
2. **Dirty 2: Shadow Fields Injection**: Injecting arbitrary root keys (e.g., `isAdmin: true`, `creditCard: "1234"`, `password: "secret"`) into household or member documents.
3. **Dirty 3: Oversized Nickname (DoS attack)**: Attempting to save a 50KB string as a nickname.
4. **Dirty 4: Illegal Member Role**: Attempting to write a member with role `SystemAdmin` or `Teacher` outside the allowed role set.
5. **Dirty 5: Unauthenticated Write**: Unauthenticated user attempting to create or read household data.
6. **Dirty 6: User Session Hijacking**: User A attempting to write to `/userSessions/{userB_uid}`.
7. **Dirty 7: Overwriting Existing Household Code**: Attempting to overwrite an existing household document without atomic checks.
8. **Dirty 8: PII Leak in Member Object**: Storing full address, phone number, or password in member record.
9. **Dirty 9: Modifying Creator UID**: Updating `createdBy` on an existing household document.
10. **Dirty 10: Injecting Malicious Code into Responses**: Writing responses to a non-existent member or unauthenticated household.
11. **Dirty 11: Junk String Document ID**: Attempting to inject a 10KB string into `{householdId}` or `{memberId}`.
12. **Dirty 12: Blanket Unfiltered List Scraping**: Attempting to list all user sessions of other devices.
