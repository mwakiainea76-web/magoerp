# Remove role:admin guard from finance routes

The finance controllers already have `abort_unless($request->user()?->can('finance.xxx'), 403)` in every method. The `role:admin` route guard is redundant and blocks finance users before they reach the controller.

## Changes to `backend/routes/api.php`

### Step 1: Delete finance routes from the `role:admin` group

Inside the `Route::middleware('role:admin')->group(function () {` block (starting line 75), delete these lines (currently ~118-173):

```
        Route::get('/finance/dashboard', FinanceReportsDashboardController::class);
        Route::get('/finance/reports', [FinanceReportsController::class, 'index']);
        Route::get('/finance/reports/export', [FinanceReportsController::class, 'export'])->middleware('throttle:6,1');
        Route::get('/finance/audit-logs', [FinanceAuditController::class, 'index'])->middleware('permission:finance.view');
        Route::get('/finance/audit-logs/{financeAuditLog}', [FinanceAuditController::class, 'show'])->middleware('permission:finance.view');
        Route::get('/finance/dashboard/export', [FinanceDataExportsController::class, 'dashboard'])->middleware('throttle:6,1');
        Route::get('/invoices/export', [FinanceDataExportsController::class, 'invoices'])->middleware('throttle:6,1');
        Route::get('/payments/export', [FinanceDataExportsController::class, 'payments'])->middleware('throttle:6,1');
        Route::get('/ledger/export', [FinanceDataExportsController::class, 'ledger'])->middleware('throttle:6,1');


        Route::apiResource('fee-structure-items', FeeStructureItemsController::class)
            ->parameters(['fee-structure-items' => 'fee_structure_item']);



        Route::get('/students/{student}/financial-statement/download', [InvoicesController::class, 'statementDownload']);
        Route::post('/invoices', [InvoicesController::class, 'store']);
        Route::get('/invoices', [InvoicesController::class, 'index']);
        Route::post('/finance/reconcile', [InvoicesController::class, 'reconcile']);
        Route::get('/finance/students-not-invoiced', [InvoicesController::class, 'studentsNotInvoiced']);
        Route::get('/invoices/{invoice}', [InvoicesController::class, 'show']);
        Route::get('/invoices/{invoice}/reversal-preview', [InvoicesController::class, 'reversalPreview']);
        Route::post('/invoices/{invoice}/reverse', [InvoicesController::class, 'reverse']);
        Route::get('/students/{student}/fee-structures', [InvoicesController::class, 'availableTemplates']);
        Route::get('/students/{student}/credit-balance', [InvoicesController::class, 'creditBalance']);
        Route::get('/students/{student}/financial-statement', [InvoicesController::class, 'studentStatement']);
        Route::post('/payments', [PaymentsController::class, 'store']);
        Route::get('/payments', [PaymentsController::class, 'index']);
        Route::get('/payments/{payment}/reversal-preview', [PaymentsController::class, 'reversalPreview']);
        Route::post('/payments/{payment}/reverse', [PaymentsController::class, 'reverse']);
        Route::post('/students/{student}/payment-preview', [PaymentsController::class, 'fifoPreview']);
        Route::post('/refunds', [RefundsController::class, 'store']);
        Route::post('/invoice-charges', [InvoicesController::class, 'storeCharge']);
        Route::get('/ledger', [StudentLedgerController::class, 'index']);

        // Fee Structure Wizard
        Route::get('/fee-structures', [FeeStructureController::class, 'index']);
        Route::post('/fee-structures', [FeeStructureController::class, 'store']);
        Route::get('/fee-structures/{fee_structure}', [FeeStructureController::class, 'show']);
        Route::post('/fee-structures/clone', [FeeStructureController::class, 'clone']);
        Route::post('/fee-structures/{fee_structure}/publish', [FeeStructureController::class, 'publish']);
        Route::post('/fee-structures/{fee_structure}/archive', [FeeStructureController::class, 'archive']);
        Route::post('/fee-structures/preview', [FeeStructureController::class, 'preview']);

        // Student Accounts
        Route::get('/student-accounts/search', [StudentAccountController::class, 'searchStudent']);
        Route::get('/student-accounts/{student}', [StudentAccountController::class, 'overview']);

        // Cohort Billing
        Route::post('/cohort-billing/preview', [CohortBillingController::class, 'preview']);
        Route::post('/cohort-billing/generate', [CohortBillingController::class, 'generate']);

        // Finance Health
        Route::get('/finance/health', FinanceHealthController::class);
        Route::get('/finance/readiness', [FinanceHealthController::class, 'readiness']);
```

After deletion, the next line should be:
```
        Route::get('/timetables', [AcademicTimetablesController::class, 'index']);
```

### Step 2: Insert finance routes after the `role:admin` group closes (after line 275)

After the closing `});` of the `role:admin` group at line 275, and BEFORE the next group `Route::middleware('role:admin|trainer')`, insert:

```php
    // Finance — permission-based at controller level
    Route::get('/finance/dashboard', FinanceReportsDashboardController::class);
    Route::get('/finance/reports', [FinanceReportsController::class, 'index']);
    Route::get('/finance/reports/export', [FinanceReportsController::class, 'export'])->middleware('throttle:6,1');
    Route::get('/finance/audit-logs', [FinanceAuditController::class, 'index']);
    Route::get('/finance/audit-logs/{financeAuditLog}', [FinanceAuditController::class, 'show']);
    Route::get('/finance/dashboard/export', [FinanceDataExportsController::class, 'dashboard'])->middleware('throttle:6,1');
    Route::get('/invoices/export', [FinanceDataExportsController::class, 'invoices'])->middleware('throttle:6,1');
    Route::get('/payments/export', [FinanceDataExportsController::class, 'payments'])->middleware('throttle:6,1');
    Route::get('/ledger/export', [FinanceDataExportsController::class, 'ledger'])->middleware('throttle:6,1');
    Route::apiResource('fee-structure-items', FeeStructureItemsController::class)
        ->parameters(['fee-structure-items' => 'fee_structure_item']);
    Route::get('/students/{student}/financial-statement/download', [InvoicesController::class, 'statementDownload']);
    Route::post('/invoices', [InvoicesController::class, 'store']);
    Route::get('/invoices', [InvoicesController::class, 'index']);
    Route::post('/finance/reconcile', [InvoicesController::class, 'reconcile']);
    Route::get('/finance/students-not-invoiced', [InvoicesController::class, 'studentsNotInvoiced']);
    Route::get('/invoices/{invoice}', [InvoicesController::class, 'show']);
    Route::get('/invoices/{invoice}/reversal-preview', [InvoicesController::class, 'reversalPreview']);
    Route::post('/invoices/{invoice}/reverse', [InvoicesController::class, 'reverse']);
    Route::get('/students/{student}/fee-structures', [InvoicesController::class, 'availableTemplates']);
    Route::get('/students/{student}/credit-balance', [InvoicesController::class, 'creditBalance']);
    Route::get('/students/{student}/financial-statement', [InvoicesController::class, 'studentStatement']);
    Route::post('/payments', [PaymentsController::class, 'store']);
    Route::get('/payments', [PaymentsController::class, 'index']);
    Route::get('/payments/{payment}/reversal-preview', [PaymentsController::class, 'reversalPreview']);
    Route::post('/payments/{payment}/reverse', [PaymentsController::class, 'reverse']);
    Route::post('/students/{student}/payment-preview', [PaymentsController::class, 'fifoPreview']);
    Route::post('/refunds', [RefundsController::class, 'store']);
    Route::post('/invoice-charges', [InvoicesController::class, 'storeCharge']);
    Route::get('/ledger', [StudentLedgerController::class, 'index']);
    Route::get('/fee-structures', [FeeStructureController::class, 'index']);
    Route::post('/fee-structures', [FeeStructureController::class, 'store']);
    Route::get('/fee-structures/{fee_structure}', [FeeStructureController::class, 'show']);
    Route::post('/fee-structures/clone', [FeeStructureController::class, 'clone']);
    Route::post('/fee-structures/{fee_structure}/publish', [FeeStructureController::class, 'publish']);
    Route::post('/fee-structures/{fee_structure}/archive', [FeeStructureController::class, 'archive']);
    Route::post('/fee-structures/preview', [FeeStructureController::class, 'preview']);
    Route::get('/student-accounts/search', [StudentAccountController::class, 'searchStudent']);
    Route::get('/student-accounts/{student}', [StudentAccountController::class, 'overview']);
    Route::post('/cohort-billing/preview', [CohortBillingController::class, 'preview']);
    Route::post('/cohort-billing/generate', [CohortBillingController::class, 'generate']);
    Route::get('/finance/health', FinanceHealthController::class);
    Route::get('/finance/readiness', [FinanceHealthController::class, 'readiness']);
```

### Step 3: Verify

Run these to confirm:
```bash
cd backend
php artisan route:list --path=finance
```

All finance routes should now show **without** the `role:admin` middleware. Each endpoint is protected solely by the `abort_unless($request->user()?->can(...), 403)` in its controller method.
