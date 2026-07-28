# Finance API

Base URL: `/api`

---

## Fee Structures

### GET /fee-structures

List fee structure templates.

**Permissions**: `finance.view`

**Query Parameters**: `page`, `per_page`, `q`, `sort_by`, `sort_direction`

### POST /fee-structures

Create a fee structure template.

**Permissions**: `finance.create`

**Body**:
```json
{
  "name": "Diploma IT - Year 1",
  "code": "DIT-Y1",
  "type": "per_session",
  "items": [
    { "name": "Tuition", "amount": 50000, "is_optional": false },
    { "name": "Library Fee", "amount": 5000, "is_optional": false },
    { "name": "Sports Fee", "amount": 2000, "is_optional": true }
  ]
}
```

---

## Invoices

### GET /invoices

List invoices.

**Permissions**: `finance.view`

**Query Parameters**: `page`, `per_page`, `q`, `status`, `student_id`

### POST /invoices

Generate an invoice for a student.

**Permissions**: `finance.create`

**Body**:
```json
{
  "student_id": "uuid",
  "fee_structure_id": "uuid",
  "academic_session_id": "uuid",
  "due_date": "2026-03-15"
}
```

The server computes invoice items from the fee structure and sets the total amount. If no session enrolment exists for the student, one is created automatically.

### GET /students/{student}/financial-statement

Get a student's full financial statement (invoices, payments, balance).

**Permissions**: `finance.view`

### GET /students/{student}/financial-statement/download

Download PDF financial statement.

---

## Payments

### POST /payments

Record a payment.

**Permissions**: `finance.create`

**Body**:
```json
{
  "student_id": "uuid",
  "amount": 50000,
  "payment_method": "bank_transfer",
  "reference": "BANK-REF-123",
  "payment_date": "2026-02-01",
  "notes": "January payment"
}
```

### FIFO Allocation

Payments are allocated to outstanding invoices in chronological order (FIFO — First In, First Out). Each allocation is recorded in the `payment_allocations` table. The `student_ledger_entries` table records the double-entry: a debit for the invoice and a credit for the payment.

---

## Refunds

### POST /refunds

Process a refund.

**Permissions**: `finance.create`

**Body**:
```json
{
  "student_id": "uuid",
  "amount": 10000,
  "reason": "Overpayment",
  "payment_method": "mpesa"
}
```

---

## Student Account

### GET /student-accounts/search

Search for a student account.

**Permissions**: `students.view`

**Query Parameters**: `q` (search by name or admission number)

### GET /student-accounts/{student}

Get student account overview (balances, recent activity, credit history).

**Permissions**: `students.view`

---

## Ledger

### GET /ledger

List all ledger entries with pagination and filtering.

**Permissions**: `finance.view`

**Query Parameters**: `page`, `per_page`, `student_id`, `type` (debit/credit), `date_from`, `date_to`

### GET /my/ledger

Student's own ledger entries.

**Auth**: Student role

---

## Finance Dashboard

### GET /finance/dashboard

Aggregated finance KPIs.

**Permissions**: `finance.view`

**Response**:
```json
{
  "stats": {
    "total_invoiced": 5000000,
    "total_collected": 3500000,
    "outstanding": 1500000,
    "total_students": 300,
    "payment_success_rate": 92.5
  },
  "monthly_collections": [
    { "month": "2026-01", "total": 500000 },
    { "month": "2026-02", "total": 750000 }
  ],
  "recent_transactions": [...]
}
```

### GET /finance/dashboard/export

Export dashboard data.

**Rate Limiting**: 6 requests per minute

---

## Cohort Billing

### POST /cohort-billing/process

Process billing for a cohort of students in a given academic session.

**Permissions**: `finance.create`

**Body**:
```json
{
  "academic_session_id": "uuid",
  "fee_structure_id": "uuid",
  "student_ids": ["uuid1", "uuid2", "..."]
}
```

---

## Finance Health

### GET /finance/health

Check financial data integrity.

**Permissions**: `finance.view`

Checks performed:
- Invoice totals match item totals
- Payment allocations sum to payment amounts
- Ledger entries balance (sum of debits = sum of credits)
- Student account balances match computed balances
- No orphaned records
