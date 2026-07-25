# Finance Routes: Role-based → Permission-based

## Changes to `backend/routes/api.php`

### Step 1: Remove all finance routes from the `role:admin` group (lines 118-173)

Delete lines 118 through 173 completely. These are all the routes between (and including):

```
        Route::get('/finance/dashboard', FinanceReportsDashboardController::class);
```
down through:
```
        Route::get('/finance/readiness', [FinanceHealthController::class, 'readiness']);
```

After removing them, the remaining route immediately after should be:
```
        Route::get('/timetables', [AcademicTimetablesController::class, 'index']);
```

### Step 2: Add permission-based finance routes after the `role:admin` group closes (after line 275)

Insert this block after the closing `});` of the `role:admin` group (the one on line 275 that closes the group starting at line 75):

```php
    // === Finance: Read (finance.view) ===
    Route::middleware('permission:finance.view')->group(function () {
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
            ->parameters(['fee-structure-items' => 'fee_structure_item'])
            ->only(['index', 'show']);

        Route::get('/students/{student}/financial-statement/download', [InvoicesController::class, 'statementDownload']);
        Route::get('/invoices', [InvoicesController::class, 'index']);
        Route::get('/finance/students-not-invoiced', [InvoicesController::class, 'studentsNotInvoiced']);
        Route::get('/invoices/{invoice}', [InvoicesController::class, 'show']);
        Route::get('/invoices/{invoice}/reversal-preview', [InvoicesController::class, 'reversalPreview']);
        Route::get('/students/{student}/fee-structures', [InvoicesController::class, 'availableTemplates']);
        Route::get('/students/{student}/credit-balance', [InvoicesController::class, 'creditBalance']);
        Route::get('/students/{student}/financial-statement', [InvoicesController::class, 'studentStatement']);
        Route::get('/payments', [PaymentsController::class, 'index']);
        Route::get('/payments/{payment}/reversal-preview', [PaymentsController::class, 'reversalPreview']);
        Route::get('/ledger', [StudentLedgerController::class, 'index']);
        Route::get('/fee-structures', [FeeStructureController::class, 'index']);
        Route::get('/fee-structures/{fee_structure}', [FeeStructureController::class, 'show']);
        Route::get('/student-accounts/search', [StudentAccountController::class, 'searchStudent']);
        Route::get('/student-accounts/{student}', [StudentAccountController::class, 'overview']);
        Route::get('/finance/health', FinanceHealthController::class);
        Route::get('/finance/readiness', [FinanceHealthController::class, 'readiness']);
    });

    // === Finance: Create (finance.create) ===
    Route::middleware('permission:finance.create')->group(function () {
        Route::apiResource('fee-structure-items', FeeStructureItemsController::class)
            ->parameters(['fee-structure-items' => 'fee_structure_item'])
            ->only(['store']);

        Route::post('/invoices', [InvoicesController::class, 'store']);
        Route::post('/finance/reconcile', [InvoicesController::class, 'reconcile']);
        Route::post('/invoices/{invoice}/reverse', [InvoicesController::class, 'reverse']);
        Route::post('/payments', [PaymentsController::class, 'store']);
        Route::post('/payments/{payment}/reverse', [PaymentsController::class, 'reverse']);
        Route::post('/students/{student}/payment-preview', [PaymentsController::class, 'fifoPreview']);
        Route::post('/refunds', [RefundsController::class, 'store']);
        Route::post('/invoice-charges', [InvoicesController::class, 'storeCharge']);
        Route::post('/fee-structures', [FeeStructureController::class, 'store']);
        Route::post('/fee-structures/clone', [FeeStructureController::class, 'clone']);
        Route::post('/fee-structures/{fee_structure}/publish', [FeeStructureController::class, 'publish']);
        Route::post('/fee-structures/{fee_structure}/archive', [FeeStructureController::class, 'archive']);
        Route::post('/fee-structures/preview', [FeeStructureController::class, 'preview']);
        Route::post('/cohort-billing/preview', [CohortBillingController::class, 'preview']);
        Route::post('/cohort-billing/generate', [CohortBillingController::class, 'generate']);
    });

    // === Finance: Update (finance.update) ===
    Route::middleware('permission:finance.update')->group(function () {
        Route::apiResource('fee-structure-items', FeeStructureItemsController::class)
            ->parameters(['fee-structure-items' => 'fee_structure_item'])
            ->only(['update']);
    });

    // === Finance: Delete (finance.delete) ===
    Route::middleware('permission:finance.delete')->group(function () {
        Route::apiResource('fee-structure-items', FeeStructureItemsController::class)
            ->parameters(['fee-structure-items' => 'fee_structure_item'])
            ->only(['destroy']);
    });
```

### Step 3: Verify the file

After these changes, the file should have this structure at the top level:

1. Login/logo routes (lines 54-55)
2. Auth middleware group (lines 57-73)
3. `role:admin` group (lines 75-275) — WITHOUT finance routes
4. **NEW: Finance permission groups (4 groups)**
5. `role:admin|trainer` group (lines 277-312)
6. Student routes (lines 314+)

### Step 4: Test

```bash
cd backend
php artisan route:list --path=finance
```

This should show all finance routes without the `role:admin` middleware, each with its appropriate `permission:finance.*` middleware instead.
