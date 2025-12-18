// Sales-specific keyboard shortcuts
function setupSalesShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only trigger if we're on sales page
        const onSalesPage = document.getElementById('sales-page') && 
                           !document.getElementById('sales-page').classList.contains('d-none');
        
        if (!onSalesPage || 
            (e.target.tagName === 'INPUT' && !e.altKey) || 
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Alt + S - Already handled globally, but confirm
        if (e.altKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (salesManagement) {
                salesManagement.showCreateInvoice();
                keyboardShortcuts?.showShortcutFeedback('Creating new sale');
            }
        }
        
        // Alt + R - Refresh sales
        if (e.altKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            if (salesManagement) {
                salesManagement.loadSalesData();
                keyboardShortcuts?.showShortcutFeedback('Refreshing sales');
            }
        }
        
        // Alt + P - Print selected invoice
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.sale-checkbox:checked');
            if (selectedCheckbox) {
                const printBtn = selectedCheckbox.closest('tr').querySelector('[onclick*="print"]');
                if (printBtn) {
                    printBtn.click();
                }
            }
        }
        
        // Alt + E - Email selected invoice
        if (e.altKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.sale-checkbox:checked');
            if (selectedCheckbox) {
                const emailBtn = selectedCheckbox.closest('tr').querySelector('[onclick*="email"]');
                if (emailBtn) {
                    emailBtn.click();
                }
            }
        }
        
        // Space - Select/deselect hovered row
        if (e.key === ' ' && !e.altKey) {
            e.preventDefault();
            const hoveredRow = e.target.closest('.sale-row');
            if (hoveredRow) {
                const checkbox = hoveredRow.querySelector('.sale-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}

// Sales Management JavaScript
class SalesManagement {
    constructor() {
        this.currentPage = 'dashboard';
        this.salesData = [];
        this.invoiceItems = [];
        this.selectedSales = new Set();
        this.currentSaleId = null;
        this.customers = [];
        this.products = [];
        this.isLoading = false;
        this.previewInvoiceData = null;
        this.previewInvoiceNumber = '';
        this.searchTerm = '';
        this.filteredSalesData = [];
        this.isSearchActive = false;
        this.reportData = [];
        this.currentReportFilters = {};
        this.isReportView = false;
        this.hasUnsavedChanges = false;
        this.isConfirmingLeave = false;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadSalesData();
        await this.loadCustomers();
        await this.loadProducts();
        this.updateStats();
        this.addInvoicePreviewStyles();
        setupSalesShortcuts(); 
        this.setupInvoiceKeyboardNavigation();
        this.setupSearch();
        this.setupBrowserBackButton(); 
    setTimeout(() => this.setupChangeTracking(), 500);
    }

    setupChangeTracking() {
    // Track form changes
    const formInputs = document.querySelectorAll('#sales-invoice-page input, #sales-invoice-page select, #sales-invoice-page textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
        });
        
        input.addEventListener('change', () => {
            this.hasUnsavedChanges = true;
        });
    });
    
    // Track item additions/removals
    const originalRenderInvoiceItems = this.renderInvoiceItems.bind(this);
    this.renderInvoiceItems = () => {
        originalRenderInvoiceItems();
        this.hasUnsavedChanges = true;
    };
}

checkForUnsavedChanges() {
    // Check if we're in create/edit mode
    const isOnInvoicePage = document.getElementById('sales-invoice-page') && 
                           !document.getElementById('sales-invoice-page').classList.contains('d-none');
    
    if (!isOnInvoicePage) return true;
    
    // Check if there are unsaved changes
    if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
        this.showLeaveConfirmation();
        return false; // Don't proceed with navigation
    }
    
    return true; // Proceed with navigation
}

showLeaveConfirmation() {
    this.isConfirmingLeave = true;
    this.showModal('leave-invoice-modal');
}

hideLeaveConfirmation() {
    this.isConfirmingLeave = false;
    document.getElementById('leave-invoice-modal').classList.add('d-none');
}

confirmLeave() {
    this.hideLeaveConfirmation();
    this.clearAllInvoiceData();
    this.resetChangeTracking();
    
    // Force reset button to "Save Invoice"
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        saveBtn.onclick = () => this.saveInvoice();
    }
    
    this.showSalesList();
}

// Clear all invoice data completely
clearAllInvoiceData() {
    // Clear invoice items array
    this.invoiceItems = [];
    
    // Reset form fields
    document.getElementById('invoice-number').value = '';
    document.getElementById('customer-select').value = '';
    document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-notes').value = '';
    
    // Reset product form
    document.getElementById('item-select').value = '';
    document.getElementById('item-quantity').value = '1';
    document.getElementById('item-price').value = '0.00';
    document.getElementById('item-subtotal').value = '0.00';
    document.getElementById('stock-info').style.display = 'none';
    
    // Clear items table
    const tableBody = document.getElementById('invoice-items-body');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5">
                <div class="text-muted">
                    <i class="fas fa-box-open fa-2x mb-3"></i>
                    <p>No items added to invoice</p>
                    <small>Add products to create your invoice</small>
                </div>
            </td>
        </tr>
    `;
    
    // Reset grand total
    document.getElementById('grand-total-amount').textContent = '₹0.00';
    
    // Reset edit mode if active
    if (this.editingSaleId) {
        this.resetEditMode();
    }
    
    // Force reset button to "Save Invoice"
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        saveBtn.onclick = () => this.saveInvoice();
    }
    
    // Refresh product list
    this.loadProducts().then(() => {
        this.populateProductDatalist();
    });
}

resetChangeTracking() {
    this.hasUnsavedChanges = false;
    this.isConfirmingLeave = false;
}

    setupSearch() {
        const searchInput = document.getElementById('sales-search-input');
        const clearBtn = document.getElementById('clear-search-btn');
        
        if (searchInput) {
            // Add keyboard shortcut indicator
            searchInput.setAttribute('title', 'Search invoices (Alt+F)');
            
            // Add search event listener
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                this.applySearch();
                
                // Show/hide clear button
                if (clearBtn) {
                    clearBtn.style.display = this.searchTerm ? 'block' : 'none';
                }
            });
            
            // Add keyboard shortcuts for search
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.clearSearch();
                }
                
                if (e.key === 'Enter' && this.isSearchActive) {
                    // Navigate to first result or show all results
                    this.highlightFirstResult();
                }
            });
            
            // Add global keyboard shortcut for focusing search
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    searchInput.focus();
                    searchInput.select();
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }
    
    applySearch() {
        if (!this.searchTerm) {
            this.isSearchActive = false;
            this.filteredSalesData = [...this.salesData];
            this.renderSalesTable();
            this.updateSearchResultsCount();
            return;
        }
        
        this.isSearchActive = true;
        
        // Filter sales based on search term
        this.filteredSalesData = this.salesData.filter(sale => {
            // Search in multiple fields
            return (
                (sale.invoiceNo && sale.invoiceNo.toLowerCase().includes(this.searchTerm)) ||
                (sale.customer && sale.customer.toLowerCase().includes(this.searchTerm)) ||
                (sale.customerEmail && sale.customerEmail.toLowerCase().includes(this.searchTerm)) ||
                (sale.customerPhone && sale.customerPhone.includes(this.searchTerm)) ||
                (sale.displayDate && sale.displayDate.toLowerCase().includes(this.searchTerm)) ||
                (sale.status && sale.status.toLowerCase().includes(this.searchTerm)) ||
                (sale.payment && sale.payment.toLowerCase().includes(this.searchTerm)) ||
                (sale.amount && sale.amount.toString().includes(this.searchTerm))
            );
        });
        
        this.renderSalesTable(true); // Pass true to indicate search mode
        this.updateSearchResultsCount();
        this.highlightSearchTerms();
    }

    setupInvoiceKeyboardNavigation() {
        // Define form fields in order
        this.formFields = [
            'item-select',      // 0 - Product field
            'item-quantity',    // 1 - Quantity field
            'item-price',       // 2 - Price field
            'add-item-btn'      // 3 - Add button
        ];
        
        // Add event listeners for Enter key navigation
        document.getElementById('item-select')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
        
        document.getElementById('item-quantity')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
        
        document.getElementById('item-price')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
        
        // Also allow Escape to go to previous field
        document.getElementById('item-quantity')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.focusPreviousField();
            }
        });
        
        document.getElementById('item-price')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.focusPreviousField();
            }
        });
        
        // When Add Item button is focused, pressing Enter should click it
        const addBtn = document.getElementById('add-item-btn');
        if (addBtn) {
            addBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addBtn.click();
                }
            });
        }
        
        // Also set up for customer selection
        document.getElementById('customer-select')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('item-select')?.focus();
            }
        });
    }

    focusNextField() {
        this.currentFocusIndex++;
        
        if (this.currentFocusIndex >= this.formFields.length) {
            // Loop back to first field
            this.currentFocusIndex = 0;
        }
        
        const nextFieldId = this.formFields[this.currentFocusIndex];
        const nextField = document.getElementById(nextFieldId);
        
        if (nextField) {
            nextField.focus();
            
            // If it's the add button, just focus it (Enter will trigger click)
            if (nextFieldId === 'add-item-btn') {
                nextField.focus();
            } else if (nextField.tagName === 'INPUT') {
                nextField.select(); // Select text for easy editing
            }
        }
    }
    
    focusPreviousField() {
        this.currentFocusIndex--;
        
        if (this.currentFocusIndex < 0) {
            // Loop to last field
            this.currentFocusIndex = this.formFields.length - 1;
        }
        
        const prevFieldId = this.formFields[this.currentFocusIndex];
        const prevField = document.getElementById(prevFieldId);
        
        if (prevField) {
            prevField.focus();
            
            if (prevField.tagName === 'INPUT') {
                prevField.select();
            }
        }
    }
    
    bindEvents() {
        // Navigation
        document.querySelector('.back-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.checkForUnsavedChanges()) {
            this.showDashboard();
        }
    });
    
    document.querySelector('.back-to-sales-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.checkForUnsavedChanges()) {
            this.showSalesList();
        }
    });
        
        // Sales Dashboard
        document.getElementById('create-sale-btn')?.addEventListener('click', () => this.showCreateInvoice());
        document.getElementById('refresh-sales-btn')?.addEventListener('click', () => this.loadSalesData());
        document.getElementById('bulk-print-btn')?.addEventListener('click', () => this.bulkPrintInvoices());
        document.getElementById('bulk-email-btn')?.addEventListener('click', () => this.bulkEmailInvoices());
        
        // Invoice Creation
        document.getElementById('clear-invoice-btn')?.addEventListener('click', () => this.clearInvoice());
        document.getElementById('save-invoice-btn')?.addEventListener('click', () => this.saveInvoice());
        document.getElementById('add-customer-btn')?.addEventListener('click', () => this.showAddCustomerModal());
        document.getElementById('add-item-btn')?.addEventListener('click', () => this.addItemToInvoice());
        
        // Form Inputs
        document.getElementById('item-select')?.addEventListener('input', (e) => this.updateItemPrice(e.target.value));
        document.getElementById('item-quantity')?.addEventListener('input', () => this.calculateSubtotal());
        document.getElementById('item-price')?.addEventListener('input', () => this.calculateSubtotal());
        
        // Modal
        document.getElementById('close-details-modal')?.addEventListener('click', () => this.hideSaleDetails());
        document.getElementById('close-modal-btn')?.addEventListener('click', () => this.hideSaleDetails());
        document.getElementById('print-invoice-btn')?.addEventListener('click', () => this.printInvoice());
        document.getElementById('email-invoice-btn')?.addEventListener('click', () => this.emailInvoice());
        document.getElementById('edit-sale-btn')?.addEventListener('click', () => this.editSale());
        
        // Stats Cards
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const filter = card.dataset.filter;
                this.filterSalesByStatus(filter);
            });
        document.getElementById('generate-report-btn')?.addEventListener('click', () => this.openReportModal());
        });
        
        // Select All Checkbox
        document.getElementById('select-all-sales')?.addEventListener('change', (e) => {
            this.toggleSelectAllSales(e.target.checked);
        });
        
        // Date Input
        const invoiceDate = document.getElementById('invoice-date');
        if (invoiceDate) {
            const today = new Date().toISOString().split('T')[0];
            invoiceDate.value = today;
            invoiceDate.max = today;
        }

         // Search clear button
        document.getElementById('clear-search-btn')?.addEventListener('click', () => {
            this.clearSearch();
        });
        document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-sale-btn');
        const deleteBtn = e.target.closest('.delete-sale-btn');
        
        if (editBtn && editBtn.dataset.saleId) {
            e.preventDefault();
            this.editSale(editBtn.dataset.saleId);
        }
        
        if (deleteBtn && deleteBtn.dataset.saleId) {
            e.preventDefault();
            this.deleteSale(deleteBtn.dataset.saleId);
        }
    });
     setTimeout(() => this.setupChangeTracking(), 100);
    }
    
    // Navigation Methods
    showDashboard() {
    // Check if there are unsaved changes
    if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
        this.showLeaveConfirmation();
        return;
    }
    
    this.showPage('sales-page');
    this.currentPage = 'dashboard';
    this.resetChangeTracking();
}
    
    showSalesList() {
    // Check if there are unsaved changes on invoice page
    const isOnInvoicePage = document.getElementById('sales-invoice-page') && 
                           !document.getElementById('sales-invoice-page').classList.contains('d-none');
    
    if (isOnInvoicePage && this.hasUnsavedChanges && !this.isConfirmingLeave) {
        this.showLeaveConfirmation();
        return;
    }
    
    this.showPage('sales-page');
    this.currentPage = 'dashboard';
    this.resetChangeTracking();
}
    
    showCreateInvoice() {
    // Check if there are unsaved changes
    if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
        this.showLeaveConfirmation();
        return;
    }
    
    // Reset edit mode first
    this.resetEditMode();
    
    this.showPage('sales-invoice-page');
    this.currentPage = 'create-invoice';
    this.generateInvoiceNumber();
    this.resetChangeTracking();
    
    // Reset form to clean state
    this.clearAllInvoiceData();
    
    // Ensure button says "Save Invoice" and is enabled
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        saveBtn.onclick = () => this.saveInvoice();
        saveBtn.disabled = false;
        saveBtn.classList.remove('disabled');
    }
    
    // Reset page title
    const pageTitle = document.querySelector('.invoice-header h2');
    if (pageTitle) {
        pageTitle.textContent = 'Create Sale Invoice';
    }
    
    // Reset focus to product field
    setTimeout(() => {
        const productField = document.getElementById('item-select');
        if (productField) {
            productField.focus();
            this.currentFocusIndex = 0;
        }
    }, 100);
}
    
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('d-none');
        });
        
        // Show requested page
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('d-none');
        }
    }
    
    // Sales Data Management
    async loadSalesData() {
    if (!currentBusiness?.id) {
        this.showError('No business selected. Please select a business first.');
        return;
    }
    
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
        // Show loading state
        const tableBody = document.getElementById('sales-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                        <p>Loading sales data...</p>
                    </div>
                </td>
            </tr>
        `;
        
        console.log('Loading sales for business:', currentBusiness.id);
        
        // Fetch sales data
        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading sales:', error);
            throw error;
        }
        
        console.log('Sales data loaded:', sales?.length || 0, 'records');
        
        if (!sales || sales.length === 0) {
            this.salesData = [];
            this.renderSalesTable();
            this.updateStats();
            return;
        }
        
        // Get all customer IDs from sales
        const customerIds = [...new Set(sales.map(sale => sale.customer_id).filter(id => id))];
        console.log('Customer IDs to fetch:', customerIds);
        
        // Fetch parties data separately
        let partiesMap = {};
        if (customerIds.length > 0) {
            const { data: parties, error: partiesError } = await supabase
                .from('parties')
                .select('id, name, email, phone, address, type')
                .in('id', customerIds);
            
            if (partiesError) {
                console.error('Error loading parties:', partiesError);
            } else if (parties) {
                console.log('Parties loaded:', parties.length);
                // Create a map for easy lookup
                parties.forEach(party => {
                    partiesMap[party.id] = party;
                });
            }
        }
        
        // Fetch sale items separately
        const saleIds = sales.map(sale => sale.id);
        let saleItemsMap = {};
        
        if (saleIds.length > 0) {
            const { data: saleItems, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    products (id, name, selling_price, unit)
                `)
                .in('sale_id', saleIds);
            
            if (itemsError) {
                console.error('Error loading sale items:', itemsError);
            } else if (saleItems) {
                console.log('Sale items loaded:', saleItems.length);
                // Group items by sale_id
                saleItems.forEach(item => {
                    if (!saleItemsMap[item.sale_id]) {
                        saleItemsMap[item.sale_id] = [];
                    }
                    saleItemsMap[item.sale_id].push(item);
                });
            }
        }
        
        // Transform data for easier use
        this.salesData = sales.map(sale => {
            const items = saleItemsMap[sale.id] || [];
            
            // Calculate total amount correctly from sale items
            // First check if total_amount exists in sale record
            let totalAmount = sale.total_amount || 0;
            
            // If total_amount is 0 or not present, calculate from sale items
            if (totalAmount === 0 && items.length > 0) {
                totalAmount = items.reduce((sum, item) => {
                    // Use total_price if available, otherwise calculate
                    const itemTotal = item.total_price || (item.quantity * item.unit_price);
                    return sum + itemTotal;
                }, 0);
            }
            
            // If still 0 and sale.total_amount exists, use it
            if (totalAmount === 0 && sale.total_amount) {
                totalAmount = sale.total_amount;
            }
            
            const itemsCount = items.reduce((sum, item) => 
                sum + item.quantity, 0);
            
            const customer = partiesMap[sale.customer_id] || { 
                name: 'Unknown Customer', 
                email: '', 
                phone: '', 
                type: 'customer' 
            };
            
            // Format date - handle different date formats
            let displayDate = 'N/A';
            try {
                if (sale.sale_date) {
                    displayDate = this.formatDate(sale.sale_date);
                } else if (sale.created_at) {
                    displayDate = this.formatDate(sale.created_at);
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
            
            return {
                id: sale.id,
                invoiceNo: sale.invoice_number || `INV-${sale.id.toString().padStart(4, '0')}`,
                date: sale.sale_date || sale.created_at,
                displayDate: displayDate,
                customer: customer.name,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                customerAddress: customer.address,
                partyType: customer.type || 'customer',
                items: itemsCount,
                amount: totalAmount, // Use the calculated totalAmount
                status: sale.status || 'pending',
                payment: sale.payment_status || 'pending',
                tax_amount: sale.tax_amount || 0,
                discount_amount: sale.discount_amount || 0,
                shipping_charges: sale.shipping_charges || 0,
                notes: sale.notes || '',
                details: {
                    items: items.map(item => ({
                        name: item.products?.name || 'Unknown Product',
                        qty: item.quantity,
                        price: item.unit_price,
                        subtotal: item.total_price || item.quantity * item.unit_price,
                        unit: item.products?.unit || 'pcs'
                    })),
                    notes: sale.notes || ''
                }
            };
        });
        
        console.log('Transformed sales data:', this.salesData);
        
        this.renderSalesTable();
        this.updateStats();
        
    } catch (error) {
        console.error('Error loading sales data:', error);
        this.showError('Failed to load sales data: ' + error.message);
        
        // Show error state
        const tableBody = document.getElementById('sales-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3 text-danger"></i>
                        <p>Failed to load sales data</p>
                        <p class="text-muted small">${error.message}</p>
                        <button class="btn btn-primary btn-sm mt-2" onclick="salesManagement.loadSalesData()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
    } finally {
        this.isLoading = false;
         this.clearSearch();
    }
}
    
    renderSalesTable(isSearchMode = false) {
        const tableBody = document.getElementById('sales-table-body');
        const dataToRender = isSearchMode ? this.filteredSalesData : this.salesData;
        
        if (dataToRender.length === 0) {
            let emptyMessage = '';
            if (isSearchMode && this.searchTerm) {
                emptyMessage = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                                <h4>No Results Found</h4>
                                <p class="text-muted mb-4">No sales invoices found for "<strong>${this.searchTerm}</strong>"</p>
                                <button class="btn btn-outline" onclick="salesManagement.clearSearch()">
                                    <i class="fas fa-times"></i> Clear Search
                                </button>
                                <p class="text-muted mt-3" style="font-size: 0.9rem;">
                                    Try searching by invoice number, customer name, email, or amount
                                </p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                emptyMessage = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-shopping-cart fa-3x mb-3 text-muted"></i>
                                <h4>No Sales Invoices Found</h4>
                                <p class="text-muted mb-4">You haven't created any sales invoices yet</p>
                                <button class="btn btn-primary" onclick="salesManagement.showCreateInvoice()">
                                    <i class="fas fa-plus"></i> Create Your First Invoice
                                </button>
                                <p class="text-muted mt-3" style="font-size: 0.9rem;">
                                    Start by creating your first sales invoice to track your sales
                                </p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = emptyMessage;
            return;
        }
        
        tableBody.innerHTML = dataToRender.map(sale => {
            // Highlight search term in relevant fields
            const invoiceNo = this.highlightText(sale.invoiceNo, this.searchTerm);
            const customer = this.highlightText(sale.customer, this.searchTerm);
            const amount = this.highlightText(formatCurrency(sale.amount), this.searchTerm);
            const status = this.highlightText(sale.status, this.searchTerm);
            const payment = this.highlightText(sale.payment, this.searchTerm);
            
            return `
                <tr class="sale-row" data-sale-id="${sale.id}">
                <td>
                    <input type="checkbox" class="sale-checkbox" value="${sale.id}" 
                           ${this.selectedSales.has(sale.id) ? 'checked' : ''}>
                </td>
                <td>${invoiceNo}</td>
                <td>${sale.displayDate}</td>
                <td>
                    <div>${customer}</div>
                    ${sale.customerEmail ? `<small class="text-muted">${this.highlightText(sale.customerEmail, this.searchTerm)}</small>` : ''}
                </td>
                <td>${amount}</td>
                <td>
                    <span class="status-badge status-${sale.status}">
                        ${sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                </td>
                <td>
                    <span class="payment-badge payment-${sale.payment}">
                        ${sale.payment.charAt(0).toUpperCase() + sale.payment.slice(1)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm edit-sale-btn" 
                            data-sale-id="${sale.id}" 
                            title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-danger delete-sale-btn" 
                            data-sale-id="${sale.id}" 
                            title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
        
        // Make entire row clickable for preview (optional)
        document.querySelectorAll('.sale-row').forEach(row => {
            const saleId = row.dataset.saleId;
            const invoiceNo = row.querySelector('td:nth-child(2)').textContent;
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or checkboxes
                if (!e.target.closest('button') && !e.target.closest('input[type="checkbox"]')) {
                    this.showInvoicePreview(saleId, invoiceNo);
                }
            });
        });
        
        // Update sales count info
        const salesCount = document.getElementById('sales-count-info');
        if (salesCount) {
            const totalCount = isSearchMode ? this.filteredSalesData.length : this.salesData.length;
            const searchInfo = isSearchMode ? ` (${totalCount} results for "${this.searchTerm}")` : '';
            salesCount.textContent = `Showing ${totalCount} sales invoices${searchInfo}`;
        }
        
        // Re-bind checkbox events
        document.querySelectorAll('.sale-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleSaleSelection(e.target.value, e.target.checked);
            });
        });
    }
    
     highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.toString().replace(regex, '<mark class="search-highlight">$1</mark>');
    }

     highlightSearchTerms() {
        if (!this.searchTerm) return;
        
        // Add CSS for search highlights if not already added
        if (!document.getElementById('search-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'search-highlight-styles';
            style.textContent = `
                .search-highlight {
                    background-color: #fff3cd !important;
                    color: #856404 !important;
                    padding: 1px 3px;
                    border-radius: 2px;
                    font-weight: bold;
                }
                
                .sale-row:hover .search-highlight {
                    background-color: #ffeaa7 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    highlightFirstResult() {
        if (this.filteredSalesData.length > 0) {
            const firstRow = document.querySelector('.sale-row');
            if (firstRow) {
                firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstRow.classList.add('selected-row');
                
                // Remove highlight after 2 seconds
                setTimeout(() => {
                    firstRow.classList.remove('selected-row');
                }, 2000);
            }
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById('sales-search-input');
        const clearBtn = document.getElementById('clear-search-btn');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        this.searchTerm = '';
        this.isSearchActive = false;
        this.filteredSalesData = [...this.salesData];
        this.renderSalesTable();
        this.updateSearchResultsCount();
        
        // Focus back on search input for quick typing
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    updateSearchResultsCount() {
        const searchInfo = document.getElementById('sales-search-info');
        if (!searchInfo) {
            // Create search info element if it doesn't exist
            const tableFooter = document.querySelector('.table-footer');
            if (tableFooter) {
                const infoDiv = document.createElement('div');
                infoDiv.id = 'sales-search-info';
                infoDiv.className = 'text-muted small mt-2';
                tableFooter.appendChild(infoDiv);
            }
        }
        
        const infoElement = document.getElementById('sales-search-info');
        if (infoElement) {
            if (this.isSearchActive && this.searchTerm) {
                infoElement.innerHTML = `
                    <i class="fas fa-search me-1"></i>
                    Found <strong>${this.filteredSalesData.length}</strong> of <strong>${this.salesData.length}</strong> invoices 
                    matching "<strong>${this.searchTerm}</strong>"
                    ${this.filteredSalesData.length > 0 ? 
                        `<button class="btn btn-sm btn-outline ms-2" onclick="salesManagement.clearSearch()">
                            <i class="fas fa-times"></i> Clear
                        </button>` : 
                        ''
                    }
                `;
                infoElement.style.display = 'block';
            } else {
                infoElement.style.display = 'none';
            }
        }
    }
    
    updateStats() {
        const totalSales = this.salesData.length;
        const totalAmount = this.salesData.reduce((sum, sale) => sum + sale.amount, 0);
        const pendingInvoices = this.salesData.filter(sale => sale.status === 'pending').length;
        const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;
        
        // Update DOM elements if they exist
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('total-sales-count', totalSales);
        updateElement('total-sales-amount', formatCurrency(totalAmount));
        updateElement('pending-invoices', pendingInvoices);
        updateElement('avg-sale-value', formatCurrency(avgSaleValue));
    }
    
    // Invoice Creation Methods
    generateInvoiceNumber() {
        if (!currentBusiness?.id) {
            document.getElementById('invoice-number').value = 'INV-0001';
            return;
        }
        
        // Get the latest invoice number from database
        supabase
            .from('sales')
            .select('invoice_number')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => {
                if (data?.invoice_number) {
                    // Extract number from existing invoice number
                    const match = data.invoice_number.match(/\d+/);
                    const nextNumber = match ? parseInt(match[0]) + 1 : this.salesData.length + 1;
                    document.getElementById('invoice-number').value = `INV-${nextNumber.toString().padStart(5, '0')}`;
                } else {
                    document.getElementById('invoice-number').value = 'INV-0001';
                }
            })
            .catch(() => {
                document.getElementById('invoice-number').value = 'INV-0001';
            });
    }
    
    async loadCustomers() {
        if (!currentBusiness?.id) return;
        
        try {
            console.log('Loading customers for business:', currentBusiness.id);
            
            // Load parties - using 'type' column instead of 'party_type'
            // Remove is_active and status filters if columns don't exist
            const { data: parties, error } = await supabase
                .from('parties')
                .select('id, name, email, phone, address, type')
                .eq('business_id', currentBusiness.id)
                .order('name');
            
            if (error) {
                console.error('Error loading parties:', error);
                throw error;
            }
            
            console.log('Parties loaded:', parties?.length || 0);
            
            // Filter to only show customers (type = 'customer' or undefined)
            this.customers = (parties || []).filter(party => 
                !party.type || party.type === 'customer' || party.type === 'both');
            
            this.populateCustomerSelect();
            
        } catch (error) {
            console.error('Error loading customers/parties:', error);
            this.customers = [];
            // Still try to populate with empty list
            this.populateCustomerSelect();
        }
    }
    
    populateCustomerSelect() {
        const customerSelect = document.getElementById('customer-select');
        if (!customerSelect) return;
        
        customerSelect.innerHTML = '<option value="">Select Customer</option>' +
            this.customers.map(customer => 
                `<option value="${customer.id}">
                    ${customer.name} 
                    ${customer.type && customer.type !== 'customer' ? `(${customer.type})` : ''}
                </option>`
            ).join('');
    }
    
    async loadProducts() {
    if (!currentBusiness?.id) return;
    
    try {
        console.log('Loading products for business:', currentBusiness.id);
        
        // Load only active products with stock > 0
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, selling_price, current_stock, unit, sku, category, is_active')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true) // Only active products
            .gt('current_stock', 0) // Only products with stock > 0
            .order('name');
        
        if (error) {
            console.error('Error loading products:', error);
            
            // If is_active column doesn't exist, try without it
            if (error.message.includes('is_active')) {
                console.log('is_active column not found, loading all products');
                const { data: allProducts, error: allError } = await supabase
                    .from('products')
                    .select('id, name, selling_price, current_stock, unit, sku, category')
                    .eq('business_id', currentBusiness.id)
                    .gt('current_stock', 0) // Only products with stock > 0
                    .order('name');
                
                if (allError) throw allError;
                this.products = allProducts || [];
            } else {
                throw error;
            }
        } else {
            this.products = products || [];
        }
        
        console.log('Products loaded:', this.products.length);
        this.populateProductDatalist();
        
    } catch (error) {
        console.error('Error loading products:', error);
        this.products = [];
    }
}
    
    populateProductDatalist() {
    const itemList = document.getElementById('item-list');
    if (!itemList) return;
    
    // Clear existing options
    itemList.innerHTML = '';
    
    // Add current stock filter to only show products with stock > 0
    const availableProducts = this.products.filter(product => product.current_stock > 0);
    
    if (availableProducts.length === 0) {
        itemList.innerHTML = '<option value="">No products available</option>';
        return;
    }
    
    itemList.innerHTML = availableProducts.map(product => 
        `<option value="${product.name}">${product.name} - ${formatCurrency(product.selling_price)} (Stock: ${product.current_stock} ${product.unit})${product.sku ? ` [SKU: ${product.sku}]` : ''}</option>`
    ).join('');
}
    
    updateItemPrice(itemName) {
    // Find the selected product
    const selectedProduct = this.products.find(product => product.name === itemName);
    
    if (selectedProduct) {
        document.getElementById('item-price').value = selectedProduct.selling_price.toFixed(2);
        
        // Update stock info with appropriate styling
        const stockInfo = document.getElementById('stock-info');
        if (selectedProduct.current_stock > 0) {
            stockInfo.innerHTML = 
                `<span class="text-success">
                    <i class="fas fa-check-circle me-1"></i>
                    Stock: ${selectedProduct.current_stock} ${selectedProduct.unit}
                </span>`;
        } else {
            stockInfo.innerHTML = 
                `<span class="text-danger">
                    <i class="fas fa-exclamation-circle me-1"></i>
                    Out of stock
                </span>`;
        }
        stockInfo.style.display = 'block';
         // Auto-select the quantity field after product is selected
            setTimeout(() => {
                document.getElementById('item-quantity')?.focus();
                document.getElementById('item-quantity')?.select();
            }, 50);
    } else {
        document.getElementById('stock-info').style.display = 'none';
        document.getElementById('item-price').value = '0.00';
    }
    
    this.calculateSubtotal();
}
    
    calculateSubtotal() {
        const quantity = parseFloat(document.getElementById('item-quantity').value) || 0;
        const price = parseFloat(document.getElementById('item-price').value) || 0;
        const subtotal = quantity * price;
        
        document.getElementById('item-subtotal').value = subtotal.toFixed(2);
        
        // Auto-focus price field after quantity is entered
        if (quantity > 0 && this.currentFocusIndex === 1) {
            setTimeout(() => {
                document.getElementById('item-price')?.focus();
                document.getElementById('item-price')?.select();
            }, 50);
        }
    }
    
    addItemToInvoice() {
    const itemName = document.getElementById('item-select').value;
    const quantity = parseFloat(document.getElementById('item-quantity').value);
    const price = parseFloat(document.getElementById('item-price').value);
    
    if (!itemName || !quantity || quantity <= 0 || !price || price <= 0) {
        this.showError('Please fill all required fields with valid values');
        // Focus on the problematic field
            if (!itemName) {
                document.getElementById('item-select').focus();
            } else if (!quantity || quantity <= 0) {
                document.getElementById('item-quantity').focus();
            } else {
                document.getElementById('item-price').focus();
            }
            return;
    }
    
    // Check if product exists
    const selectedProduct = this.products.find(product => product.name === itemName);
    if (!selectedProduct) {
        this.showError('Selected product not found');
        return;
    }
    
    // Check stock availability
    if (selectedProduct.current_stock < quantity) {
        this.showError(`Insufficient stock. Only ${selectedProduct.current_stock} ${selectedProduct.unit} available.`);
        return;
    }
    
    const subtotal = quantity * price;
    const item = {
        id: Date.now(), // Temporary ID
        product_id: selectedProduct.id,
        name: itemName,
        quantity: quantity,
        price: price,
        subtotal: subtotal,
        product: selectedProduct
    };
    
    this.invoiceItems.push(item);
    this.renderInvoiceItems();
    this.updateGrandTotal();
    
    // Reset form
    document.getElementById('item-select').value = '';
    document.getElementById('item-quantity').value = 1;
    document.getElementById('item-price').value = '0.00';
    document.getElementById('item-subtotal').value = '0.00';
    document.getElementById('stock-info').style.display = 'none';
    
    // Update product list to reflect reduced stock (for next selection)
    const updatedProduct = { ...selectedProduct };
    updatedProduct.current_stock = updatedProduct.current_stock - quantity;
    const index = this.products.findIndex(p => p.id === selectedProduct.id);
    if (index !== -1) {
        this.products[index] = updatedProduct;
        this.populateProductDatalist();
        setTimeout(() => {
            document.getElementById('item-select').focus();
            this.currentFocusIndex = 0;
        }, 100);
    }
}
    
    renderInvoiceItems() {
    const tableBody = document.getElementById('invoice-items-body');
    
    if (this.invoiceItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-box-open fa-2x mb-3"></i>
                        <p>No items added to invoice</p>
                        <small>Add products to create your invoice</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = this.invoiceItems.map((item, index) => {
        // Generate a unique ID for each item
        const itemTempId = item.tempId || `item-${index}-${Date.now()}`;
        if (!item.tempId) item.tempId = itemTempId;
        
        return `
        <tr data-item-id="${itemTempId}" data-product-id="${item.product_id}" data-item-index="${index}">
            <td class="item-name-cell">
                <div class="item-name">${item.name}</div>
                <small class="text-muted item-unit">${item.product?.unit || 'pcs'}</small>
            </td>
            <td class="item-quantity-cell">
                <input type="number" 
                       class="form-control form-control-sm item-quantity-input" 
                       value="${item.quantity}" 
                       min="0.01" 
                       step="0.01"
                       data-original="${item.quantity}"
                       data-item-id="${itemTempId}"
                       style="width: 80px;">
            </td>
            <td class="item-price-cell">
                <input type="number" 
                       class="form-control form-control-sm item-price-input" 
                       value="${item.price}" 
                       min="0" 
                       step="0.01"
                       data-original="${item.price}"
                       data-item-id="${itemTempId}"
                       style="width: 100px;">
            </td>
            <td class="item-subtotal-cell">
                <span class="item-subtotal">${formatCurrency(item.subtotal)}</span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm btn-danger remove-item-btn" 
                        data-item-id="${itemTempId}"
                        title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-outline btn-sm btn-success update-item-btn ms-1" 
                        data-item-id="${itemTempId}"
                        title="Update" style="display: none;">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        </tr>
    `}).join('');
    
    // Add inline editing event listeners
    this.bindInlineEditingEvents();
}

bindInlineEditingEvents() {
    // Quantity input change
    document.querySelectorAll('.item-quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            this.handleItemInputChange(e.target);
        });
        
        input.addEventListener('input', (e) => {
            this.handleItemInputChange(e.target);
        });
        
        input.addEventListener('focus', (e) => {
            e.target.select();
        });
    });
    
    // Price input change
    document.querySelectorAll('.item-price-input').forEach(input => {
        input.addEventListener('change', (e) => {
            this.handleItemInputChange(e.target);
        });
        
        input.addEventListener('input', (e) => {
            this.handleItemInputChange(e.target);
        });
        
        input.addEventListener('focus', (e) => {
            e.target.select();
        });
    });
    
    // Remove button
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const itemId = row.dataset.itemId;
            this.removeInvoiceItem(itemId);
        });
    });
}

handleItemInputChange(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const itemTempId = row.dataset.itemId;
    const quantityInput = row.querySelector('.item-quantity-input');
    const priceInput = row.querySelector('.item-price-input');
    const subtotalSpan = row.querySelector('.item-subtotal');
    const updateBtn = row.querySelector('.update-item-btn');
    
    if (!itemTempId || !quantityInput || !priceInput || !subtotalSpan) return;
    
    const quantity = parseFloat(quantityInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const subtotal = quantity * price;
    
    // Update subtotal display
    subtotalSpan.textContent = formatCurrency(subtotal);
    
    // Show update button if value changed
    const originalQuantity = parseFloat(quantityInput.dataset.original) || 0;
    const originalPrice = parseFloat(priceInput.dataset.original) || 0;
    
    if (quantity !== originalQuantity || price !== originalPrice) {
        updateBtn.style.display = 'inline-block';
        
        // Clear any existing click handlers and add new one
        updateBtn.replaceWith(updateBtn.cloneNode(true));
        const newUpdateBtn = row.querySelector('.update-item-btn');
        newUpdateBtn.style.display = 'inline-block';
        
        // Use proper closure to capture the current values
        newUpdateBtn.onclick = () => {
            this.updateInvoiceItem(itemTempId, quantity, price);
        };
    } else {
        updateBtn.style.display = 'none';
    }
    
    // Update grand total
    this.updateGrandTotal();
}

 updateInvoiceItem(itemTempId, newQuantity, newPrice) {
    // Find the correct item using tempId
    const itemIndex = this.invoiceItems.findIndex(item => 
        String(item.tempId) === String(itemTempId)
    );
    
    if (itemIndex === -1) {
        console.error('Item not found with tempId:', itemTempId);
        return;
    }
    
    const item = this.invoiceItems[itemIndex];
    const oldQuantity = item.quantity;
    const oldPrice = item.price;
    
    console.log('Updating item:', {
        itemIndex,
        itemTempId,
        oldQuantity,
        newQuantity,
        oldPrice,
        newPrice,
        itemName: item.name
    });
    
    // Update item data
    item.quantity = newQuantity;
    item.price = newPrice;
    item.subtotal = newQuantity * newPrice;
    
    // Update UI
    const row = document.querySelector(`tr[data-item-id="${itemTempId}"]`);
    if (row) {
        const quantityInput = row.querySelector('.item-quantity-input');
        const priceInput = row.querySelector('.item-price-input');
        const updateBtn = row.querySelector('.update-item-btn');
        const subtotalSpan = row.querySelector('.item-subtotal');
        
        if (quantityInput && priceInput && updateBtn && subtotalSpan) {
            // Update original values
            quantityInput.dataset.original = newQuantity;
            priceInput.dataset.original = newPrice;
            
            // Update subtotal display
            subtotalSpan.textContent = formatCurrency(item.subtotal);
            
            // Hide update button
            updateBtn.style.display = 'none';
        }
    }
    
    // Update grand total without re-rendering entire table
    this.updateGrandTotal();
    
    // Mark changes
    this.hasUnsavedChanges = true;
    
    showNotification('Success', `"${item.name}" updated successfully`, 'success');
} 
    removeInvoiceItem(itemTempId) {
    const itemIndex = this.invoiceItems.findIndex(item => 
        (item.tempId == itemTempId || item.id == itemTempId)
    );
    
    if (itemIndex === -1) return;
    
    const itemToRemove = this.invoiceItems[itemIndex];
    
    if (confirm('Are you sure you want to remove this item?')) {
        // If editing an existing invoice, restore stock
        if (this.editingSaleId && itemToRemove.product_id && itemToRemove.quantity) {
            // Stock will be handled during the update process
            console.log('Item to be removed during edit:', itemToRemove);
        }
        
        // Remove from array
        this.invoiceItems.splice(itemIndex, 1);
        
        // Refresh product list if not in edit mode
        if (!this.editingSaleId && itemToRemove.product) {
            const productIndex = this.products.findIndex(p => p.id === itemToRemove.product_id);
            if (productIndex !== -1) {
                this.products[productIndex].current_stock += itemToRemove.quantity;
                this.populateProductDatalist();
            }
        }
        
        this.renderInvoiceItems();
        this.updateGrandTotal();
        
        showNotification('Success', 'Item removed from invoice', 'success');
    }
}
    
    updateGrandTotal() {
        const grandTotal = this.invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
        const grandTotalElement = document.getElementById('grand-total-amount');
        if (grandTotalElement) {
            grandTotalElement.textContent = formatCurrency(grandTotal);
        }
    }
    
    clearInvoice() {
    if (this.invoiceItems.length === 0 && 
        !document.getElementById('customer-select').value && 
        !document.getElementById('invoice-notes').value) {
        return;
    }
    
    if (confirm('Are you sure you want to clear the current invoice? All items and data will be lost.')) {
        this.clearAllInvoiceData();
        this.resetChangeTracking();
        showNotification('Info', 'Invoice cleared successfully', 'info');
    }
}

    async showInvoicePreview(invoiceId, invoiceNumber) {
        try {
            this.previewInvoiceNumber = invoiceNumber;
            
            // Switch to preview page
            this.showPage('invoice-preview-page');
            
            // Show loading in preview
            const previewContent = document.getElementById('invoice-preview-content');
            previewContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden"></span>
                    </div>
                    <h4>Loading invoice preview...</h4>
                    <p class="text-muted">Invoice #${invoiceNumber}</p>
                </div>
            `;
            
            // Update header title and number
        document.getElementById('invoice-preview-title').textContent = `Sales Invoice`;
        document.getElementById('invoice-preview-number').textContent = `#${invoiceNumber}`;
            
            // Fetch data separately
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .select('*')
                .eq('id', invoiceId)
                .eq('business_id', currentBusiness.id)
                .single();
            
            if (saleError) throw saleError;
            
            // Fetch customer/party data
            let customer = {};
            if (sale.customer_id) {
                const { data: party } = await supabase
                    .from('parties')
                    .select('*')
                    .eq('id', sale.customer_id)
                    .maybeSingle();
                
                if (party) customer = party;
            }
            
            // Fetch sale items
            const { data: saleItems, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    products (*)
                `)
                .eq('sale_id', invoiceId);
            
            if (itemsError) {
                console.error('Error fetching sale items:', itemsError);
            }
            
            // Combine all data
            const completeSale = {
                ...sale,
                parties: customer,
                sale_items: saleItems || []
            };
            
            // Store the data for later use
            this.previewInvoiceData = completeSale;
            
            // Update status badges in header
            this.updateInvoiceStatusBadges(sale);
            
            // Render the invoice preview
            this.renderInvoicePreview(completeSale);
            
        } catch (error) {
            console.error('Error loading invoice preview:', error);
            const previewContent = document.getElementById('invoice-preview-content');
            previewContent.innerHTML = `
                <div class="alert alert-danger m-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Failed to load invoice preview</strong>
                    <p class="mb-0 mt-2">${error.message}</p>
                    <button class="btn btn-sm btn-outline-danger mt-3" onclick="salesManagement.hideInvoicePreview()">
                        <i class="fas fa-arrow-left me-1"></i> Back to Sales
                    </button>
                </div>
            `;
        }
    }

    updateInvoiceStatusBadges(sale) {
        const statusBadge = document.getElementById('invoice-status-badge');
        const paymentBadge = document.getElementById('invoice-payment-badge');
        
        // Update status badge
        if (sale.status) {
            statusBadge.textContent = sale.status.charAt(0).toUpperCase() + sale.status.slice(1);
            statusBadge.className = 'badge ' + this.getStatusBadgeClass(sale.status);
        }
        
        // Update payment badge
        if (sale.payment_status) {
            paymentBadge.textContent = sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1);
            paymentBadge.className = 'badge ' + this.getPaymentBadgeClass(sale.payment_status);
        }
    }
    
    getStatusBadgeClass(status) {
        switch(status) {
            case 'completed': return 'bg-success';
            case 'pending': return 'bg-warning';
            case 'cancelled': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }
    
    getPaymentBadgeClass(paymentStatus) {
        switch(paymentStatus) {
            case 'paid': return 'bg-success';
            case 'pending': return 'bg-warning';
            case 'overdue': return 'bg-danger';
            case 'partial': return 'bg-info';
            default: return 'bg-secondary';
        }
    }
    
    renderInvoicePreview(sale) {
    if (!sale) return;
    
    const customer = sale.parties || {};
    const items = sale.sale_items || [];
    const totalAmount = sale.total_amount || items.reduce((sum, item) => 
        sum + (item.total_price || item.quantity * item.unit_price), 0);
    
    const previewContent = document.getElementById('invoice-preview-content');
    
    // Format dates
    const invoiceDate = this.formatDate(sale.sale_date || sale.created_at);
    const dueDate = sale.due_date ? this.formatDate(sale.due_date) : invoiceDate;
    
    // Calculate totals
    const subtotal = totalAmount;
    const taxAmount = sale.tax_amount || 0;
    const taxRate = sale.tax_rate || 0;
    const discountAmount = sale.discount_amount || 0;
    const shippingAmount = sale.shipping_charges || 0;
    const grandTotal = subtotal + taxAmount + shippingAmount - discountAmount;
    const amountPaid = sale.amount_paid || 0;
    const balanceDue = grandTotal - amountPaid;
    
    // Get business details
    const businessName = currentBusiness?.name || 'Your Company Name';
    const businessAddress = currentBusiness?.address || '123 Business Street, City, Country';
    const businessPhone = currentBusiness?.phone || '+1 (555) 123-4567';
    const businessEmail = currentBusiness?.email || 'info@yourcompany.com';
    const businessWebsite = currentBusiness?.website || 'www.yourcompany.com';
    const businessTaxId = currentBusiness?.tax_id || 'US-123456789';
    
    // Customer details
    const customerName = customer.name || 'Client / Supplier Company';
    const customerContact = customer.contact_person || '';
    const customerAddress = customer.address || '456 Client Avenue, Another City, Country';
    const customerPhone = customer.phone || '+1 (555) 987-6543';
    const customerEmail = customer.email || 'procurement@clientcompany.com';
    const customerTaxId = customer.tax_id || 'US-987654321';
    
    previewContent.innerHTML = `
        <div class="invoice-container">
            <!-- Invoice Header -->
            <div class="invoice-header">
                <div class="invoice-header-content">
                    <h1 class="invoice-title">SALES INVOICE</h1>
                    <div class="business-details">
                        <h2 class="business-name">${businessName}</h2>
                        <div class="business-info">
                            <div>${businessAddress}</div>
                            <div>${businessPhone}</div>
                            <div>${businessEmail}</div>
                            <div>${businessWebsite}</div>
                        </div>
                    </div>
                </div>
                <!-- Invoice Details Section -->
            <div class="invoice-details-section">
                <div class="invoice-meta">
                    <div class="meta-item">
                        <span class="meta-label">Invoice #:</span>
                        <span class="meta-value">${sale.invoice_number || 'INV-2023-087'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Issue Date:</span>
                        <span class="meta-value">${invoiceDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Due Date:</span>
                        <span class="meta-value">${dueDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Transaction Type:</span>
                        <span class="meta-value">Sale Invoice</span>
                    </div>
                </div>
            </div>
            </div>
            
            <div class="invoice-body">
            <!-- From & To Sections -->
            <div class="parties-section">
                <!-- From Section -->
                <div class="party-card from-section">
                    <div class="section-title-invoice">From:</div>
                    <div class="party-details">
                        <div class="party-name">${businessName}</div>
                        <div class="party-contact"></div>
                        <div class="party-info">
                            <div>${businessAddress}</div>
                            <div>${businessPhone}</div>
                            <div>${businessEmail}</div>
                            <div>Tax ID: ${businessTaxId}</div>
                        </div>
                    </div>
                </div>
                
                <!-- To Section -->
                <div class="party-card to-section">
                    <div class="section-title-invoice">To:</div>
                    <div class="party-details">
                        <div class="party-name">${customerName}</div>
                        <div class="party-contact">${customerContact}</div>
                        <div class="party-info">
                            <div>${customerAddress}</div>
                            <div>${customerPhone}</div>
                            <div>${customerEmail}</div>
                            <div>Tax ID: ${customerTaxId}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Invoice Items Table -->
            <div class="invoice-items-section">
                <table class="invoice-items-table">
                    <thead>
                        <tr>
                            <th class="text-start">Item Name</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-end">Unit Price</th>
                            <th class="text-end">Tax</th>
                            <th class="text-end">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => {
                            const itemTotal = item.total_price || (item.quantity * item.unit_price);
                            const productName = item.products?.name || 'Product';
                            const description = item.products?.description || '';
                            const unit = item.products?.unit || 'pcs';
                            const itemTax = item.tax_amount || (itemTotal * (taxRate / 100));
                            
                            return `
                                <tr>
                                    <td class="text-start">
                                        <div class="item-name">${productName}</div>
                                        ${description ? `<small class="item-description">${description}</small>` : ''}
                                    </td>
                                    <td class="text-center">${item.quantity} ${unit}</td>
                                    <td class="text-end">${formatCurrency(item.unit_price)}</td>
                                    <td class="text-end">${formatCurrency(itemTax)}</td>
                                    <td class="text-end">${formatCurrency(itemTotal)}</td>
                                </tr>
                            `;
                        }).join('')}
                        
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="5" class="text-center py-4 text-muted">
                                    <i class="fas fa-box-open fa-2x mb-3"></i>
                                    <p>No items found in this invoice</p>
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            
            <!-- Invoice Summary -->
            <div class="invoice-summary-section">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Subtotal:</span>
                        <span class="summary-value">${formatCurrency(subtotal)}</span>
                    </div>
                    
                    ${taxAmount > 0 ? `
                    <div class="summary-item">
                        <span class="summary-label">Tax (${taxRate}%):</span>
                        <span class="summary-value">${formatCurrency(taxAmount)}</span>
                    </div>
                    ` : ''}
                    
                    ${discountAmount > 0 ? `
                    <div class="summary-item">
                        <span class="summary-label">Discount:</span>
                        <span class="summary-value">-${formatCurrency(discountAmount)}</span>
                    </div>
                    ` : ''}
                    
                    ${shippingAmount > 0 ? `
                    <div class="summary-item">
                        <span class="summary-label">Shipping:</span>
                        <span class="summary-value">${formatCurrency(shippingAmount)}</span>
                    </div>
                    ` : ''}
                    
                    <div class="summary-item grand-total">
                        <span>Grand Total:</span>
                        <span>${formatCurrency(grandTotal)}</span>
                    </div>
                </div>
                
                ${amountPaid > 0 ? `
                <div class="payment-summary">
                    <div class="summary-item">
                        <span class="summary-label">Amount Paid:</span>
                        <span class="summary-value text-success">${formatCurrency(amountPaid)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Balance Due:</span>
                        <span class="summary-value fw-bold">${formatCurrency(balanceDue)}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <!-- Notes and Footer -->
            <div class="invoice-footer-section">
                ${sale.notes ? `
                <div class="invoice-notes">
                    <div class="notes-title">Notes:</div>
                    <div class="notes-content">${sale.notes}</div>
                </div>
                ` : ''}
                
                <div class="invoice-footer">
                    <div class="footer-text">
                        <p>Thank you for your business!</p>
                        <small class="text-muted">
                            Invoice generated on ${this.formatDate(new Date())} | 
                            ${businessName}
                        </small>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;
}
    
    hideInvoicePreview() {
        this.showSalesList(); // Go back to sales list
        this.previewInvoiceData = null;
        this.previewInvoiceNumber = '';
    }
    
    async downloadInvoice() {
        if (!this.previewInvoiceData) {
            this.showError('No invoice data available for download');
            return;
        }
        
        try {
            showNotification('Info', 'Generating PDF... This might take a moment.', 'info');
            
            // You can implement PDF generation here
            // Options:
            // 1. Use jsPDF library
            // 2. Generate HTML and use browser print to PDF
            // 3. Use a PDF generation service
            
            // For now, let's use the browser's print to PDF
            this.printInvoice(true);
            
        } catch (error) {
            console.error('Error downloading invoice:', error);
            this.showError('Failed to generate PDF');
        }
    }
    
    printInvoice(asPDF = false) {
        if (!this.previewInvoiceData) {
            this.showError('No invoice data available for printing');
            return;
        }
        
        // Store the current modal state
        const previewModal = document.getElementById('invoice-preview-modal');
        const wasVisible = !previewModal.classList.contains('d-none');
        
        // Hide modal temporarily for printing
        if (wasVisible) {
            previewModal.classList.add('d-none');
        }
        
        // Create a print-friendly version
        const printWindow = window.open('', '_blank');
        const invoice = this.previewInvoiceData;
        const customer = invoice.parties || {};
        const items = invoice.sale_items || [];
        const totalAmount = invoice.total_amount || items.reduce((sum, item) => 
            sum + (item.total_price || item.quantity * item.unit_price), 0);
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number || ''}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
                    .invoice-container { max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #2c3e50; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .from-info, .to-info { width: 45%; }
                    .info-title { font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
                    .details { margin-bottom: 30px; }
                    .details table { width: 100%; border-collapse: collapse; }
                    .details th { background-color: #f8f9fa; text-align: left; padding: 10px; border: 1px solid #dee2e6; }
                    .details td { padding: 10px; border: 1px solid #dee2e6; }
                    .totals { float: right; width: 300px; margin-top: 20px; }
                    .totals table { width: 100%; }
                    .totals td { padding: 5px 0; }
                    .total-row { border-top: 2px solid #333; font-weight: bold; }
                    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    <div class="header">
                        <h1>INVOICE</h1>
                        <p>#${invoice.invoice_number || 'N/A'}</p>
                    </div>
                    
                    <div class="info-section">
                        <div class="from-info">
                            <div class="info-title">From:</div>
                            <div><strong>${currentBusiness?.name || 'Your Business'}</strong></div>
                            ${currentBusiness?.address ? `<div>${currentBusiness.address}</div>` : ''}
                            ${currentBusiness?.phone ? `<div>Phone: ${currentBusiness.phone}</div>` : ''}
                            ${currentBusiness?.email ? `<div>Email: ${currentBusiness.email}</div>` : ''}
                        </div>
                        
                        <div class="to-info">
                            <div class="info-title">Bill To:</div>
                            <div><strong>${customer.name || 'Customer'}</strong></div>
                            ${customer.address ? `<div>${customer.address}</div>` : ''}
                            ${customer.phone ? `<div>Phone: ${customer.phone}</div>` : ''}
                            ${customer.email ? `<div>Email: ${customer.email}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="details">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Description</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((item, index) => {
                                    const itemTotal = item.total_price || (item.quantity * item.unit_price);
                                    return `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${item.products?.name || 'Product'}</td>
                                            <td>${item.quantity} ${item.products?.unit || 'pcs'}</td>
                                            <td>${formatCurrency(item.unit_price)}</td>
                                            <td>${formatCurrency(itemTotal)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="totals">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Subtotal:</td>
                                    <td class="text-end">${formatCurrency(totalAmount)}</td>
                                </tr>
                                ${invoice.tax_amount && invoice.tax_amount > 0 ? `
                                <tr>
                                    <td>Tax:</td>
                                    <td class="text-end">${formatCurrency(invoice.tax_amount)}</td>
                                </tr>
                                ` : ''}
                                ${invoice.discount_amount && invoice.discount_amount > 0 ? `
                                <tr>
                                    <td>Discount:</td>
                                    <td class="text-end">-${formatCurrency(invoice.discount_amount)}</td>
                                </tr>
                                ` : ''}
                                <tr class="total-row">
                                    <td>TOTAL:</td>
                                    <td class="text-end">${formatCurrency(totalAmount + (invoice.tax_amount || 0) - (invoice.discount_amount || 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    ${invoice.notes ? `
                    <div style="margin-top: 100px;">
                        <div class="info-title">Notes:</div>
                        <p>${invoice.notes}</p>
                    </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                        <p>Generated on ${this.formatDate(new Date())}</p>
                    </div>
                </div>
                
                <script>
                    // Auto-print when PDF is ready
                    ${asPDF ? 'window.print();' : ''}
                    // Close window after printing
                    window.onafterprint = function() {
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Restore modal if it was visible
        if (wasVisible) {
            setTimeout(() => {
                previewModal.classList.remove('d-none');
            }, 100);
        }
    }
    
    printThermalInvoice() {
        if (!this.previewInvoiceData) {
            this.showError('No invoice data available for thermal printing');
            return;
        }
        
        // Thermal printers typically use ESC/POS commands
        // This is a simplified version - you'd need to implement based on your printer
        
        const invoice = this.previewInvoiceData;
        const customer = invoice.parties || {};
        const items = invoice.sale_items || [];
        
        let thermalContent = `
================================
        ${currentBusiness?.name || 'BUSINESS'}
================================
Invoice: ${invoice.invoice_number || 'N/A'}
Date: ${this.formatDate(invoice.sale_date || invoice.created_at)}
--------------------------------
BILL TO:
${customer.name || 'Customer'}
${customer.phone ? 'Phone: ' + customer.phone : ''}
${customer.address ? customer.address.substring(0, 32) : ''}
--------------------------------
ITEMS:
`;
        
        items.forEach((item, index) => {
            const itemTotal = item.total_price || (item.quantity * item.unit_price);
            const productName = item.products?.name || 'Product';
            const shortName = productName.length > 20 ? productName.substring(0, 17) + '...' : productName;
            
            thermalContent += `
${shortName}
${item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(itemTotal)}
`;
        });
        
        const totalAmount = invoice.total_amount || items.reduce((sum, item) => 
            sum + (item.total_price || item.quantity * item.unit_price), 0);
        
        thermalContent += `
--------------------------------
Subtotal: ${formatCurrency(totalAmount)}
${invoice.tax_amount ? 'Tax: ' + formatCurrency(invoice.tax_amount) : ''}
${invoice.discount_amount ? 'Discount: -' + formatCurrency(invoice.discount_amount) : ''}
TOTAL: ${formatCurrency(totalAmount + (invoice.tax_amount || 0) - (invoice.discount_amount || 0))}
================================
Thank you for your business!
        `;
        
        // Show thermal content for debugging
        console.log('Thermal print content:', thermalContent);
        
        // For actual printing, you would:
        // 1. Use WebUSB API for USB thermal printers
        // 2. Use WebSocket for network thermal printers
        // 3. Use platform-specific APIs
        
        showNotification('Info', 'Thermal print content generated. Connect to your thermal printer to print.', 'info');
        
        // Example: Open in new window for testing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Thermal Print Preview</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        white-space: pre; 
                        margin: 20px;
                        font-size: 12px;
                        line-height: 1.2;
                    }
                </style>
            </head>
            <body>
                ${thermalContent}
                <script>
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    emailInvoiceFromPreview() {
        if (!this.previewInvoiceData) {
            this.showError('No invoice data available for email');
            return;
        }
        
        const customer = this.previewInvoiceData.parties || {};
        if (!customer.email) {
            this.showError('Customer email address not found');
            return;
        }
        
        // Create email content
        const subject = `Invoice ${this.previewInvoiceData.invoice_number || ''} from ${currentBusiness?.name || 'Your Business'}`;
        const body = `
Dear ${customer.name || 'Customer'},

Please find attached your invoice #${this.previewInvoiceData.invoice_number || ''}.

Invoice Details:
- Invoice #: ${this.previewInvoiceData.invoice_number || 'N/A'}
- Date: ${this.formatDate(this.previewInvoiceData.sale_date || this.previewInvoiceData.created_at)}
- Total Amount: ${formatCurrency(this.previewInvoiceData.total_amount || 0)}

You can also view this invoice online at: [Your Invoice URL]

Thank you for your business!

Best regards,
${currentBusiness?.name || 'Your Business'}
${currentBusiness?.phone ? 'Phone: ' + currentBusiness.phone : ''}
${currentBusiness?.email ? 'Email: ' + currentBusiness.email : ''}
        `.trim();
        
        // Open default email client
        const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
        
        showNotification('Info', 'Opening email client...', 'info');
    }
    
    shareInvoice() {
        if (!this.previewInvoiceData) {
            this.showError('No invoice data available for sharing');
            return;
        }
        
        // Create shareable content
        const shareData = {
            title: `Invoice ${this.previewInvoiceData.invoice_number || ''}`,
            text: `Invoice #${this.previewInvoiceData.invoice_number || 'N/A'} from ${currentBusiness?.name || 'Your Business'}`,
            url: window.location.href, // You might want to generate a shareable link
        };
        
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => console.log('Invoice shared successfully'))
                .catch(error => console.error('Error sharing invoice:', error));
        } else {
            // Fallback: Copy to clipboard
            const textToCopy = `Invoice Details:\n\n` +
                `Invoice #: ${this.previewInvoiceData.invoice_number || 'N/A'}\n` +
                `Customer: ${this.previewInvoiceData.parties?.name || 'Customer'}\n` +
                `Date: ${this.formatDate(this.previewInvoiceData.sale_date || this.previewInvoiceData.created_at)}\n` +
                `Amount: ${formatCurrency(this.previewInvoiceData.total_amount || 0)}\n\n` +
                `View invoice: ${window.location.href}`;
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    showNotification('Success', 'Invoice details copied to clipboard!', 'success');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    this.showError('Failed to copy to clipboard');
                });
        }
    }
    
    async saveInvoice() {
    if (!currentBusiness?.id) {
        this.showError('No business selected. Please select a business first.');
        return;
    }
    
    const customerId = document.getElementById('customer-select').value;
    const invoiceDate = document.getElementById('invoice-date').value;
    const notes = document.getElementById('invoice-notes').value;
    const invoiceNumber = document.getElementById('invoice-number').value;
    
    if (!customerId) {
        this.showError('Please select a customer');
        return;
    }
    
    if (this.invoiceItems.length === 0) {
        this.showError('Please add at least one item to the invoice');
        return;
    }
    
    let saveBtn = null;
    let originalText = '';
    
    try {
        // Show loading state
        saveBtn = document.getElementById('save-invoice-btn');
        if (saveBtn) {
            originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }
        
        // Calculate totals
        const totalAmount = this.invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Get selected customer details
        const selectedCustomer = this.customers.find(c => c.id == customerId);
        
        if (!selectedCustomer) {
            throw new Error('Selected customer not found in parties table');
        }
        
        // Verify the customer exists
        const { data: partyCheck, error: partyError } = await supabase
            .from('parties')
            .select('id')
            .eq('id', customerId)
            .eq('business_id', currentBusiness.id)
            .single();
        
        if (partyError || !partyCheck) {
            throw new Error('Customer/Party not found in database. Please select a valid customer.');
        }
        
        // Create sale record
        const saleData = {
            business_id: currentBusiness.id,
            customer_id: customerId,
            invoice_number: invoiceNumber,
            sale_date: invoiceDate,
            total_amount: totalAmount,
            status: 'completed',
            payment_status: 'paid',
            notes: notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Saving sale data:', saleData);
        
        // Check for duplicate invoice number (only if not in edit mode)
        if (!this.editingSaleId) {
            const { data: existingInvoice } = await supabase
                .from('sales')
                .select('id')
                .eq('business_id', currentBusiness.id)
                .eq('invoice_number', invoiceNumber)
                .maybeSingle();
            
            if (existingInvoice) {
                this.showError(`Invoice number ${invoiceNumber} already exists. Generating new number...`);
                
                // Generate a new unique invoice number
                const newInvoiceNumber = await this.generateUniqueInvoiceNumber();
                document.getElementById('invoice-number').value = newInvoiceNumber;
                saleData.invoice_number = newInvoiceNumber;
                
                console.log('Using new invoice number:', saleData.invoice_number);
                
                // Update the button text to reflect we're still saving
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving with new number...';
                }
            }
        }
        
        // If we're in edit mode, use updateInvoice instead
        if (this.editingSaleId) {
            console.log('In edit mode, redirecting to updateInvoice');
            // Restore button state
            if (saveBtn) {
                saveBtn.innerHTML = originalText || '<i class="fas fa-sync-alt"></i> Update Invoice';
                saveBtn.disabled = false;
            }
            
            // Call updateInvoice instead
            return this.updateInvoice();
        }
        
        // Insert sale (only for new invoices)
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([saleData])
            .select()
            .single();
        
        if (saleError) {
            console.error('Sale insert error:', saleError);
            throw saleError;
        }
        
        console.log('Sale created with ID:', sale.id);
        
        // Create sale items
        const saleItems = this.invoiceItems.map(item => {
            const totalPrice = item.quantity * item.price;
            
            return {
                sale_id: sale.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: totalPrice,
                created_at: new Date().toISOString()
            };
        });
        
        console.log('Saving sale items:', saleItems);
        
        if (saleItems.length > 0) {
            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);
            
            if (itemsError) {
                console.error('Sale items insert error:', itemsError);
                throw itemsError;
            }
        }
        
        // Update product stock
        for (const item of this.invoiceItems) {
            const newStock = item.product.current_stock - item.quantity;
            console.log(`Updating product ${item.product_id} stock from ${item.product.current_stock} to ${newStock}`);
            
            const { error: stockError } = await supabase
                .from('products')
                .update({
                    current_stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id);
            
            if (stockError) {
                console.error('Error updating stock:', stockError);
                // Continue with other products even if one fails
            }
        }
        
        // Show success message
        showNotification('Success', `Invoice #${saleData.invoice_number} saved successfully for ${selectedCustomer?.name || 'customer'}!`, 'success');
        
        // Reset form and go back to sales list
        this.resetEditMode();
        this.resetChangeTracking();
        this.showSalesList();
        await this.loadSalesData();
        
        if (sale && sale.id) {
            // Show the invoice preview
            await this.showInvoicePreview(sale.id, saleData.invoice_number);
        }
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        
        // More specific error messages
        if (error.code === 'PGRST204') {
            const columnMatch = error.message.match(/'([^']+)'/);
            const columnName = columnMatch ? columnMatch[1] : 'unknown column';
            this.showError(`Database column error: Column '${columnName}' does not exist in sale_items table.`);
        } else if (error.code === '23503') {
            this.showError('Foreign key violation. Check if customer or products exist.');
        } else if (error.code === '23505') {
            // This is the duplicate invoice number error
            // Generate a new number and retry
            try {
                const newInvoiceNumber = await this.generateUniqueInvoiceNumber();
                this.showError(`Invoice number already exists. Generated new number: ${newInvoiceNumber}`);
                document.getElementById('invoice-number').value = newInvoiceNumber;
                
                // Retry save with new number
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-redo"></i> Retry with new number';
                    saveBtn.disabled = false;
                    saveBtn.onclick = () => {
                        this.saveInvoice();
                    };
                }
            } catch (retryError) {  
            }
        } else if (error.code === '42703') {
            this.showError('Database column error. Please check your database schema.');
        } else {
            this.showError('Failed to save invoice: ' + (error.message || 'Unknown error'));
        }
        
    } finally {
        // Restore button state only if not already restored
        if (saveBtn && !saveBtn.disabled) {
            saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save Invoice';
            saveBtn.disabled = false;
            // Ensure onclick handler is correct
            if (!this.editingSaleId) {
                saveBtn.onclick = () => this.saveInvoice();
            }
        }
    }
}
    
    addInvoicePreviewStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Invoice Container */
         .invoice-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            position: relative;
        }
        
        /* Invoice Header */
        .invoice-header {
            background: linear-gradient(135deg, #4f6df5 0%, #3a56d5 100%);
            color: white;
            padding: 30px 40px;
            position: relative;
            border-radius: 12px 12px 0 0;
        }
        
        .invoice-header::after {
            content: "";
            position: absolute;
            bottom: -20px;
            left: 0;
            width: 100%;
            height: 40px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M1200 120L0 16.48 0 0 1200 0 1200 120z' fill='%23ffffff'/%3E%3C/svg%3E");
            background-size: 100% 100%;
        }
        
         .invoice-title {
            font-size: 32px;
            font-weight: 700;
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        
         .invoice-meta {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px 20px;
            border-radius: 8px;
            min-width: 250px;
        }
        
         .meta-label {
            font-weight: 500;
        }
        
        .parties-section {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-bottom: 40px;
            padding-bottom: 25px;
            border-bottom: 1px dashed #e0e0e0;
        }
        
        .section-title-invoice {
            font-size: 14px;
            font-weight: 700;
            color: #4f6df5;
            text-transform: uppercase;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .party-card {
            flex: 1;
            min-width: 250px;
            margin: 0 10px 20px;
        }
        
        /* Items Table */
        .invoice-items-section {
            margin-bottom: 30px;
        }
        
        .invoice-items-table {
             width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.03);
        }
        
        .invoice-items-table thead {
           background-color: #f8f9ff;
        }
        
        .invoice-items-table th {
            padding: 16px 15px;
            text-align: left;
            font-weight: 600;
            color: #4f6df5;
            border-bottom: 2px solid #eaeaea;
            font-size:14px;
        }
        
        .invoice-items-table tbody tr {
            border-bottom: 1px solid #e9ecef;
        }
        
        .invoice-items-table tbody tr:hover {
            background-color: rgba(0, 123, 255, 0.02);
        }
        
        .invoice-items-table td {
            padding: 15px;
            vertical-align: top;
            font-size:14px;
        }
        
        .item-name {
            font-weight: 500;
            color: #495057;
            margin-bottom: 3px;
        }
        
        .item-description {
            color: #6c757d;
            font-size: 11px;
        }
        
        /* Summary Section */
        .invoice-summary-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 4px;
            margin-bottom: 30px;
        }
        
        .summary-grid {
            max-width: 300px;
            margin-left: auto;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .summary-item:last-child {
            border-bottom: none;
        }
        
        .summary-item.grand-total {
            border-top: 2px solid #dee2e6;
            margin-top: 8px;
            padding-top: 12px;
            font-size: 15px;
            font-weight: 700;
            color: #4f6df5 !important;
        }
        
        .summary-label {
            color: #495057;
            font-weight: 500;
        }
        
        .summary-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .payment-summary {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        
        /* Footer Section */
        .invoice-footer-section {
            margin-top: 40px;
        }
        
        .invoice-notes {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #007bff;
        }
        
        .notes-title {
            font-weight: 600;
            color: #495057;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .notes-content {
            color: #6c757d;
            font-size: 13px;
            line-height: 1.6;
        }
        
        .invoice-footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-text p {
            font-weight: 500;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .footer-text small {
            color: #6c757d;
            font-size: 11px;
        }
        
        /* Responsive Styles */
        @media (max-width: 768px) {
            .invoice-container {
                padding: 20px;
            }
            
            .invoice-meta {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .invoice-parties-section {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .invoice-items-table {
                font-size: 12px;
            }
            
            .invoice-items-table th,
            .invoice-items-table td {
                padding: 10px 8px;
            }
            
            .summary-grid {
                max-width: 100%;
            }
        }
        
        @media (max-width: 576px) {
            .invoice-title {
                font-size: 22px;
            }
            
            .business-name {
                font-size: 16px;
            }
            
            .invoice-items-table {
                display: block;
                overflow-x: auto;
            }
        }
        
        /* Print Styles */
        @media print {
            .invoice-container {
                padding: 0;
                margin: 0;
                max-width: 100%;
            }
            
            .invoice-header {
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            
            .invoice-title {
                font-size: 24px;
            }
            
            .invoice-items-table {
                font-size: 12px;
            }
            
            .invoice-items-table th,
            .invoice-items-table td {
                padding: 10px 8px;
            }
            
            /* Hide print button in print */
            .print-button {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

    // Sale Details Methods
    async viewSale(saleId) {
        this.currentSaleId = saleId;
        
        try {
            // Show loading state
            const modalContent = document.getElementById('sale-details-content');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Loading sale details...</p>
                </div>
            `;
            
            this.showModal('sale-details-modal');
            
            // Fetch sale data
            const { data: sale, error } = await supabase
                .from('sales')
                .select('*')
                .eq('id', saleId)
                .eq('business_id', currentBusiness.id)
                .single();
            
            if (error) throw error;
            
            if (!sale) {
                modalContent.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning"></i>
                        <p>Sale not found</p>
                    </div>
                `;
                return;
            }
            
            // Fetch customer/party data
            let customer = { name: 'Unknown Customer', type: 'customer' };
            if (sale.customer_id) {
                const { data: party } = await supabase
                    .from('parties')
                    .select('*')
                    .eq('id', sale.customer_id)
                    .single();
                
                if (party) customer = party;
            }
            
            // Fetch sale items
            const { data: saleItems } = await supabase
    .from('sale_items')
    .select(`
        *,
        products (*)
    `)
    .eq('sale_id', saleId);
            
            const items = saleItems || [];
            const totalAmount = items.reduce((sum, item) => 
                sum + (item.quantity * item.unit_price), 0);
            
            modalContent.innerHTML = `
                <div class="sale-details">
                    <div class="detail-section">
                        <h4>Invoice Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Invoice Number:</span>
                                <span class="detail-value">${sale.invoice_number || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${this.formatDate(sale.sale_date || sale.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Customer:</span>
                                <span class="detail-value">${customer.name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Customer Type:</span>
                                <span class="detail-value">${customer.type || 'customer'}</span>
                            </div>
                            ${customer.phone ? `
                            <div class="detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${customer.phone}</span>
                            </div>
                            ` : ''}
                            ${customer.email ? `
                            <div class="detail-item">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${customer.email}</span>
                            </div>
                            ` : ''}
                            ${customer.address ? `
                            <div class="detail-item">
                                <span class="detail-label">Address:</span>
                                <span class="detail-value">${customer.address}</span>
                            </div>
                            ` : ''}
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">
                                    <span class="status-badge status-${sale.status}">
                                        ${sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'Unknown'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Payment Status:</span>
                                <span class="detail-value">
                                    <span class="payment-badge payment-${sale.payment_status}">
                                        ${sale.payment_status ? sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1) : 'Unknown'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Items (${items.length || 0})</h4>
                        ${items.length ? `
                        <table class="details-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                 ${items.map(item => {
        const itemTotal = item.total_price || (item.quantity * item.unit_price);
        return `
            <tr>
                <td>${item.products?.name || 'Unknown Product'}</td>
                <td>${item.quantity} ${item.products?.unit || 'pcs'}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(itemTotal)}</td>
            </tr>
        `;
    }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end"><strong>Total Amount:</strong></td>
                                    <td><strong>${formatCurrency(totalAmount)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        ` : `
                        <div class="text-center py-3 text-muted">
                            <i class="fas fa-box-open fa-2x mb-2"></i>
                            <p>No items found for this sale</p>
                        </div>
                        `}
                    </div>
                    
                    ${sale.notes ? `
                    <div class="detail-section">
                        <h4>Notes</h4>
                        <p class="notes">${sale.notes}</p>
                    </div>
                    ` : ''}
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading sale details:', error);
            const modalContent = document.getElementById('sale-details-content');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
                    <p>Failed to load sale details</p>
                    <p class="text-muted">${error.message}</p>
                </div>
            `;
        }
    }
    
    async editSale(saleId = null) {
    const saleIdToEdit = saleId || this.currentSaleId;
    if (!saleIdToEdit) return;
    
    console.log('Editing sale ID:', saleIdToEdit);
    
    // Store the sale ID being edited
    this.editingSaleId = parseInt(saleIdToEdit);
    
    // Hide modal first if open
    this.hideSaleDetails();
    
    // Show create invoice page but change title
    this.showPage('sales-invoice-page');
    this.currentPage = 'update-invoice'; // Change this
    
    try {
        // Change button text to "Update Invoice"
        const saveBtn = document.getElementById('save-invoice-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Invoice';
            saveBtn.onclick = () => this.updateInvoice();
            saveBtn.disabled = false; // Ensure button is enabled
        }
        
        // Update page title
        const pageTitle = document.querySelector('.sale-invoice-header h1');
        if (pageTitle) {
            pageTitle.textContent = 'Update Sale Invoice';
        }
        
        // Load sale data for editing
        const { data: sale, error } = await supabase
            .from('sales')
            .select('*')
            .eq('id', saleIdToEdit)
            .eq('business_id', currentBusiness.id)
            .single();
        
        if (error) throw error;
        
        if (sale) {
            // Store original invoice number for validation
            this.originalInvoiceNumber = sale.invoice_number;
            
            // Populate form with sale data - DISABLE invoice number field for editing
            const invoiceNumberField = document.getElementById('invoice-number');
            invoiceNumberField.value = sale.invoice_number;
            invoiceNumberField.readOnly = true; // Make it read-only
            invoiceNumberField.title = "Invoice number cannot be changed when editing";
            invoiceNumberField.classList.add('bg-light');
            
            document.getElementById('customer-select').value = sale.customer_id;
            document.getElementById('invoice-date').value = sale.sale_date?.split('T')[0] || '';
            document.getElementById('invoice-notes').value = sale.notes || '';
            
            // Fetch sale items
            const { data: saleItems, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    products (*)
                `)
                .eq('sale_id', saleIdToEdit);
            
            if (itemsError) {
                console.error('Error loading sale items:', itemsError);
            }
            
            // Clear current items and load items for editing
            this.invoiceItems = [];
            
            if (saleItems && saleItems.length > 0) {
                saleItems.forEach(item => {
                    const productData = item.products || {};
                    const saleItem = {
                        id: item.id, // Use actual item ID for editing
                        tempId: Date.now() + Math.random(), // Unique temporary ID for UI
                        sale_id: item.sale_id,
                        product_id: item.product_id,
                        name: productData.name || 'Unknown Product',
                        quantity: item.quantity,
                        price: item.unit_price,
                        subtotal: item.total_price || (item.quantity * item.unit_price),
                        product: productData,
                        originalQuantity: item.quantity // Store original for stock restoration
                    };
                    this.invoiceItems.push(saleItem);
                });
            }
            
            this.renderInvoiceItems();
            this.updateGrandTotal();
            
            // Show edit mode indicator
            this.showEditModeIndicator();
            
            // Reset change tracking since we loaded existing data
            this.hasUnsavedChanges = false;
        }
        
    } catch (error) {
        console.error('Error loading sale for edit:', error);
        this.showError('Failed to load sale for editing: ' + error.message);
        // Reset editing mode on error
        this.resetEditMode();
    }
}

async updateInvoice() {
    if (!this.editingSaleId) {
        this.showError('No sale selected for update');
        return;
    }
    
    if (!currentBusiness?.id) {
        this.showError('No business selected');
        return;
    }
    
    const customerId = document.getElementById('customer-select').value;
    const invoiceDate = document.getElementById('invoice-date').value;
    const notes = document.getElementById('invoice-notes').value;
    const invoiceNumber = document.getElementById('invoice-number').value;

     if (invoiceNumber !== this.originalInvoiceNumber) {
        this.showError('Invoice number cannot be changed. Please use the original invoice number.');
        document.getElementById('invoice-number').value = this.originalInvoiceNumber;
        return;
    }
    
    if (!customerId) {
        this.showError('Please select a customer');
        return;
    }
    
    if (this.invoiceItems.length === 0) {
        this.showError('Please add at least one item to the invoice');
        return;
    }
    
    // Validate invoice number uniqueness (excluding current invoice)
    if (invoiceNumber !== this.originalInvoiceNumber) {
        const { data: existingInvoice } = await supabase
            .from('sales')
            .select('id')
            .eq('business_id', currentBusiness.id)
            .eq('invoice_number', invoiceNumber)
            .neq('id', this.editingSaleId)
            .maybeSingle();
        
        if (existingInvoice) {
            this.showError(`Invoice number ${invoiceNumber} already exists. Please use a different number.`);
            return;
        }
    }
    
    let updateBtn = null;
    let originalText = '';
    
    try {
        // Show loading state
        updateBtn = document.getElementById('save-invoice-btn');
        if (updateBtn) {
            originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updateBtn.disabled = true;
        }
        
        // Calculate totals
        const totalAmount = this.invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // 1. Update the sale record
        const { error: saleError } = await supabase
            .from('sales')
            .update({
                customer_id: customerId,
                invoice_number: invoiceNumber,
                sale_date: invoiceDate,
                total_amount: totalAmount,
                notes: notes || '',
                updated_at: new Date().toISOString()
            })
            .eq('id', this.editingSaleId)
            .eq('business_id', currentBusiness.id);
        
        if (saleError) throw saleError;
        
        // 2. Handle sale items update
        // First, get existing items to compare
        const { data: existingItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', this.editingSaleId);
        
        if (itemsError) throw itemsError;
        
        const existingItemsMap = new Map();
        existingItems?.forEach(item => {
            existingItemsMap.set(item.id, item);
        });
        
        // Arrays to track items for update, insert, and delete
        const itemsToUpdate = [];
        const itemsToInsert = [];
        const itemsToDelete = [];
        
        // Process current items
        for (const item of this.invoiceItems) {
            const totalPrice = item.quantity * item.price;
            
            if (item.id && existingItemsMap.has(item.id)) {
                // Update existing item
                itemsToUpdate.push({
                    id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: totalPrice,
                    updated_at: new Date().toISOString()
                });
                existingItemsMap.delete(item.id); // Remove from map to track deletions
            } else {
                // Insert new item
                itemsToInsert.push({
                    sale_id: this.editingSaleId,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: totalPrice,
                    created_at: new Date().toISOString()
                });
            }
        }
        
        // Items remaining in existingItemsMap need to be deleted
        existingItemsMap.forEach(item => {
            itemsToDelete.push(item.id);
        });
        
        // 3. Update product stock
        // First, restore stock from deleted items
        for (const deletedItemId of itemsToDelete) {
            const itemToDelete = existingItems.find(item => item.id === deletedItemId);
            if (itemToDelete) {
                const { error: stockRestoreError } = await supabase
                    .from('products')
                    .update({
                        current_stock: supabase.raw(`current_stock + ${itemToDelete.quantity}`),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', itemToDelete.product_id);
                
                if (stockRestoreError) {
                    console.error('Error restoring stock:', stockRestoreError);
                }
            }
        }
        
        // Then update stock for updated items
        for (const item of itemsToUpdate) {
            const originalItem = existingItems.find(i => i.id === item.id);
            if (originalItem) {
                const quantityDiff = item.quantity - originalItem.quantity;
                if (quantityDiff !== 0) {
                    const { error: stockUpdateError } = await supabase
                        .from('products')
                        .update({
                            current_stock: supabase.raw(`current_stock - ${quantityDiff}`),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', originalItem.product_id);
                    
                    if (stockUpdateError) {
                        console.error('Error updating stock:', stockUpdateError);
                    }
                }
            }
        }
        
        // Update stock for new items
        for (const item of itemsToInsert) {
            const { error: stockUpdateError } = await supabase
                .from('products')
                .update({
                    current_stock: supabase.raw(`current_stock - ${item.quantity}`),
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id);
            
            if (stockUpdateError) {
                console.error('Error updating stock for new item:', stockUpdateError);
            }
        }
        
        // 4. Perform database operations
        // Update existing items
        if (itemsToUpdate.length > 0) {
            for (const item of itemsToUpdate) {
                const { error: updateError } = await supabase
                    .from('sale_items')
                    .update({
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        updated_at: item.updated_at
                    })
                    .eq('id', item.id);
                
                if (updateError) {
                    console.error('Error updating sale item:', updateError);
                }
            }
        }
        
        // Insert new items
        if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('sale_items')
                .insert(itemsToInsert);
            
            if (insertError) throw insertError;
        }
        
        // Delete removed items
        if (itemsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('sale_items')
                .delete()
                .in('id', itemsToDelete);
            
            if (deleteError) throw deleteError;
        }
        
        // Show success message
         this.resetChangeTracking();
        showNotification('Success', `Invoice #${invoiceNumber} updated successfully!`, 'success');
        
        // Reset and go back to sales list
        this.resetEditMode();
        this.showSalesList();
        await this.loadSalesData();
        
    } catch (error) {
        console.error('Error updating invoice:', error);
        this.showError('Failed to update invoice: ' + (error.message || 'Unknown error'));
        
    } finally {
        // Restore button state
        if (updateBtn) {
            updateBtn.innerHTML = originalText || '<i class="fas fa-sync-alt"></i> Update Invoice';
            updateBtn.disabled = false;
        }
    }
}

// Add method to handle browser back button
setupBrowserBackButton() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
            this.showLeaveConfirmation();
            // Push state back to prevent navigation
            history.pushState(null, document.title, window.location.href);
        }
    });
    
    // Prevent accidental page refresh
    window.addEventListener('beforeunload', (e) => {
        if (this.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}

resetEditMode() {
    this.editingSaleId = null;
    this.originalInvoiceNumber = null;
    
    // Reset button to "Save Invoice" and enable it
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        saveBtn.onclick = () => this.saveInvoice();
        saveBtn.disabled = false;
        saveBtn.classList.remove('disabled');
    }
    
    // Re-enable invoice number field
    const invoiceNumberField = document.getElementById('invoice-number');
    if (invoiceNumberField) {
        invoiceNumberField.readOnly = false;
        invoiceNumberField.classList.remove('bg-light');
        invoiceNumberField.title = "";
    }
    
    // Remove edit indicator
    const indicator = document.querySelector('.badge.bg-warning');
    if (indicator) {
        indicator.remove();
    }
    
    // Reset page title
    const pageTitle = document.querySelector('.invoice-header h2');
    if (pageTitle && pageTitle.textContent.includes('Update')) {
        pageTitle.textContent = 'Create Sale Invoice';
    }
    
    // Update page title
    document.title = 'Create New Invoice - Sales';
}

showEditModeIndicator() {
    // Add a visual indicator that we're in edit mode
    const invoiceHeader = document.querySelector('.invoice-header h2');
    if (invoiceHeader) {
        const indicator = document.createElement('span');
        indicator.className = 'badge bg-warning ms-2';
        indicator.textContent = 'Editing';
        invoiceHeader.appendChild(indicator);
    }
    
    // Update page title
    document.title = `Editing Invoice ${this.originalInvoiceNumber} - Sales`;
}
    
    async deleteSale(saleId) {
        if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Instead of soft delete, we'll actually delete since no is_active column
            // First delete sale items
            const { error: itemsError } = await supabase
                .from('sale_items')
                .delete()
                .eq('sale_id', saleId);
            
            if (itemsError) throw itemsError;
            
            // Then delete the sale
            const { error } = await supabase
                .from('sales')
                .delete()
                .eq('id', saleId)
                .eq('business_id', currentBusiness.id);
            
            if (error) throw error;
            
            // Remove from local data
            this.salesData = this.salesData.filter(sale => sale.id !== saleId);
            this.selectedSales.delete(saleId);
            
            this.renderSalesTable();
            this.updateStats();
            
            showNotification('Success', 'Sale deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting sale:', error);
            this.showError('Failed to delete sale');
        }
    }
    
    // Bulk Operations
    toggleSelectAllSales(checked) {
        const checkboxes = document.querySelectorAll('.sale-checkbox');
        this.selectedSales.clear();
        
        if (checked) {
            this.salesData.forEach(sale => this.selectedSales.add(sale.id));
            checkboxes.forEach(checkbox => checkbox.checked = true);
        } else {
            checkboxes.forEach(checkbox => checkbox.checked = false);
        }
    }
    
    toggleSaleSelection(saleId, checked) {
        if (checked) {
            this.selectedSales.add(parseInt(saleId));
        } else {
            this.selectedSales.delete(parseInt(saleId));
            document.getElementById('select-all-sales').checked = false;
        }
    }
    
    bulkPrintInvoices() {
        if (this.selectedSales.size === 0) {
            this.showError('Please select at least one sale to print');
            return;
        }
        
        showNotification('Info', `Preparing to print ${this.selectedSales.size} selected invoices...`, 'info');
    }
    
    bulkEmailInvoices() {
        if (this.selectedSales.size === 0) {
            this.showError('Please select at least one sale to email');
            return;
        }
        
        showNotification('Info', `Preparing to email ${this.selectedSales.size} selected invoices...`, 'info');
    }
    
    // Filtering
    filterSalesByStatus(filter) {
        let filteredData = [...this.salesData];
        
        switch(filter) {
            case 'completed':
                filteredData = filteredData.filter(sale => sale.status === 'completed');
                break;
            case 'pending':
                filteredData = filteredData.filter(sale => sale.status === 'pending');
                break;
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                filteredData = filteredData.filter(sale => {
                    try {
                        const saleDate = new Date(sale.date).toISOString().split('T')[0];
                        return saleDate === today;
                    } catch (e) {
                        return false;
                    }
                });
                break;
            case 'unpaid':
                filteredData = filteredData.filter(sale => sale.payment === 'pending');
                break;
            // 'all' shows all data
        }
        
        // Temporarily show filtered data
        const originalData = this.salesData;
        this.salesData = filteredData;
        this.renderSalesTable();
        this.salesData = originalData;
    }
    
    // Modal Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('d-none');
        }
    }
    
    hideSaleDetails() {
        const modal = document.getElementById('sale-details-modal');
        if (modal) {
            modal.classList.add('d-none');
        }
        this.currentSaleId = null;
    }
    
    // Utility Methods
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return 'Invalid Date';
        }
    }
    
    showError(message) {
        showNotification('Error', message, 'error');
    }
    
    showSuccess(message) {
        showNotification('Success', message, 'success');
    }
    
    printInvoice() {
        if (!this.currentSaleId) return;
        
        showNotification('Info', 'Preparing invoice for printing...', 'info');
    }
    
    emailInvoice() {
        if (!this.currentSaleId) return;
        
        const sale = this.salesData.find(s => s.id === this.currentSaleId);
        if (!sale || !sale.customerEmail) {
            this.showError('No email address found for this customer');
            return;
        }
        
        showNotification('Info', `Preparing to email invoice to ${sale.customerEmail}...`, 'info');
    }
    openReportModal() {
    this.showModal('sales-report-modal');
    this.populateCustomerFilter();
    this.setDefaultDateRange();
}

closeReportModal() {
    document.getElementById('sales-report-modal').classList.add('d-none');
}

populateCustomerFilter() {
    const customerFilter = document.getElementById('report-customer-filter');
    if (!customerFilter) return;
    
    customerFilter.innerHTML = '<option value="">All Customers</option>' +
        this.customers.map(customer => 
            `<option value="${customer.id}">${customer.name}</option>`
        ).join('');
}

setDefaultDateRange() {
    // Set default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('report-start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('report-end-date').value = lastDay.toISOString().split('T')[0];
}

setReportDateRange(rangeType) {
    const today = new Date();
    let startDate, endDate;
    
    switch(rangeType) {
        case 'today':
            startDate = today;
            endDate = today;
            break;
            
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = yesterday;
            endDate = yesterday;
            break;
            
        case 'thisWeek':
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay());
            startDate = firstDayOfWeek;
            endDate = today;
            break;
            
        case 'lastWeek':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            startDate = lastWeekStart;
            endDate = lastWeekEnd;
            break;
            
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
            
        case 'lastMonth':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
            
        case 'thisQuarter':
            const quarter = Math.floor((today.getMonth() / 3));
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today.getFullYear(), (quarter * 3) + 3, 0);
            break;
            
        case 'lastQuarter':
            const lastQuarter = Math.floor((today.getMonth() / 3)) - 1;
            startDate = new Date(today.getFullYear(), lastQuarter * 3, 1);
            endDate = new Date(today.getFullYear(), (lastQuarter * 3) + 3, 0);
            break;
            
        case 'thisYear':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
            
        case 'lastYear':
            startDate = new Date(today.getFullYear() - 1, 0, 1);
            endDate = new Date(today.getFullYear() - 1, 11, 31);
            break;
            
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
    }
    
    document.getElementById('report-start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('report-end-date').value = endDate.toISOString().split('T')[0];
}

generateReport() {
    // Get filter values
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const customerId = document.getElementById('report-customer-filter').value;
    const status = document.getElementById('report-status-filter').value;
    const paymentStatus = document.getElementById('report-payment-filter').value;
    const sortBy = document.getElementById('report-sort-by').value;
    
    if (!startDate || !endDate) {
        this.showError('Please select a date range');
        return;
    }
    
    // Store filters
    this.currentReportFilters = {
        startDate,
        endDate,
        customerId,
        status,
        paymentStatus,
        sortBy
    };
    
    // Filter sales data
    this.reportData = this.filterSalesForReport(this.salesData);
    
    // Calculate report summary
    this.calculateReportSummary();
    
    // Render report results
    this.renderReportResults();
    
    // Close modal and show report
    this.closeReportModal();
    this.showReportResults();
}

filterSalesForReport(salesData) {
    const { startDate, endDate, customerId, status, paymentStatus, sortBy } = this.currentReportFilters;
    
    let filteredData = salesData.filter(sale => {
        // Filter by date
        const saleDate = new Date(sale.date).toISOString().split('T')[0];
        if (saleDate < startDate || saleDate > endDate) return false;
        
        // Filter by customer
        if (customerId && sale.customerId != customerId) return false;
        
        // Filter by status
        if (status && sale.status !== status) return false;
        
        // Filter by payment status
        if (paymentStatus && sale.payment !== paymentStatus) return false;
        
        return true;
    });
    
    // Sort data
    filteredData = this.sortReportData(filteredData, sortBy);
    
    return filteredData;
}

sortReportData(data, sortBy) {
    return data.sort((a, b) => {
        switch(sortBy) {
            case 'date_desc':
                return new Date(b.date) - new Date(a.date);
            case 'date_asc':
                return new Date(a.date) - new Date(b.date);
            case 'amount_desc':
                return b.amount - a.amount;
            case 'amount_asc':
                return a.amount - b.amount;
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });
}

calculateReportSummary() {
    if (this.reportData.length === 0) {
        this.updateReportSummary(0, 0, 0, 0);
        return;
    }
    
    const totalInvoices = this.reportData.length;
    const totalAmount = this.reportData.reduce((sum, sale) => sum + sale.amount, 0);
    
    // Count unique customers
    const uniqueCustomers = new Set(this.reportData.map(sale => sale.customerId)).size;
    
    // Calculate total items
    const totalItems = this.reportData.reduce((sum, sale) => sum + (sale.items || 0), 0);
    
    this.updateReportSummary(totalInvoices, totalAmount, uniqueCustomers, totalItems);
}

updateReportSummary(invoices, amount, customers, items) {
    document.getElementById('report-total-invoices').textContent = invoices;
    document.getElementById('report-total-amount').textContent = formatCurrency(amount);
    document.getElementById('report-total-customers').textContent = customers;
    document.getElementById('report-total-items').textContent = items;
    document.getElementById('report-summary-amount').textContent = formatCurrency(amount);
    
    // Update period text
    const { startDate, endDate } = this.currentReportFilters;
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    document.getElementById('report-period-text').textContent = 
        `Showing sales from ${start} to ${end} (${this.reportData.length} records)`;
}

renderReportResults() {
    const tableBody = document.getElementById('report-table-body');
    
    if (this.reportData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-chart-line fa-3x mb-3 text-muted"></i>
                        <h4>No Sales Data Found</h4>
                        <p class="text-muted">No sales match the selected criteria</p>
                        <button class="btn btn-outline" onclick="salesManagement.openReportModal()">
                            <i class="fas fa-filter"></i> Change Filters
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = this.reportData.map(sale => `
        <tr>
            <td>
                <a href="javascript:void(0)" onclick="salesManagement.showInvoicePreview(${sale.id}, '${sale.invoiceNo}')">
                    ${sale.invoiceNo}
                </a>
            </td>
            <td>${sale.displayDate}</td>
            <td>
                <div>${sale.customer}</div>
                ${sale.customerEmail ? `<small class="text-muted">${sale.customerEmail}</small>` : ''}
            </td>
            <td>${sale.items || 0}</td>
            <td>${formatCurrency(sale.amount)}</td>
            <td>
                <span class="status-badge status-${sale.status}">
                    ${sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                </span>
            </td>
            <td>
                <span class="payment-badge payment-${sale.payment}">
                    ${sale.payment.charAt(0).toUpperCase() + sale.payment.slice(1)}
                </span>
            </td>
        </tr>
    `).join('');
}

showReportResults() {
    this.showPage('sales-report-results');
    this.isReportView = true;
}

exportReport() {
    if (this.reportData.length === 0) {
        this.showError('No data to export');
        return;
    }
    
    const { startDate, endDate } = this.currentReportFilters;
    const filename = `sales_report_${startDate}_to_${endDate}.csv`;
    
    // Prepare CSV content
    const headers = ['Invoice No', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Amount', 'Status', 'Payment Status'];
    
    const rows = this.reportData.map(sale => [
        sale.invoiceNo,
        sale.displayDate,
        sale.customer,
        sale.customerEmail || '',
        sale.customerPhone || '',
        sale.items || 0,
        sale.amount,
        sale.status,
        sale.payment
    ]);
    
    // Add summary row
    const totalAmount = this.reportData.reduce((sum, sale) => sum + sale.amount, 0);
    rows.push(['', '', '', '', '', 'TOTAL:', totalAmount, '', '']);
    
    // Convert to CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Success', 'Report exported successfully', 'success');
}

printReport() {
    if (this.reportData.length === 0) {
        this.showError('No data to print');
        return;
    }
    
    const printContent = this.generatePrintContent();
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

generatePrintContent() {
    const { startDate, endDate } = this.currentReportFilters;
    const businessName = currentBusiness?.name || 'Your Business';
    const reportDate = new Date().toLocaleDateString();
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    const totalAmount = this.reportData.reduce((sum, sale) => sum + sale.amount, 0);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Report - ${businessName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                @media print {
                    body { margin: 0; padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <h2>Sales Report</h2>
                <p>Period: ${start} to ${end}</p>
                <p>Generated on: ${reportDate}</p>
            </div>
            
            <div class="summary">
                <strong>Summary:</strong><br>
                Total Invoices: ${this.reportData.length}<br>
                Total Amount: ${formatCurrency(totalAmount)}<br>
                Customers: ${new Set(this.reportData.map(sale => sale.customerId)).size}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.reportData.map(sale => `
                        <tr>
                            <td>${sale.invoiceNo}</td>
                            <td>${sale.displayDate}</td>
                            <td>${sale.customer}</td>
                            <td>${formatCurrency(sale.amount)}</td>
                            <td>${sale.status}</td>
                            <td>${sale.payment}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                        <td><strong>${formatCurrency(totalAmount)}</strong></td>
                        <td colspan="2"></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated by Sales Management System</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
}
}

// Initialize Sales Management
let salesManagement = null;

// Function to initialize sales management when page loads
function initializeSalesManagement() {
    console.log('🛒 Initializing sales management for business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ Cannot initialize sales management: No business selected');
        return;
    }
    
    if (!salesManagement) {
        salesManagement = new SalesManagement();
        window.salesManagement = salesManagement;
    } else {
        // If already initialized, reload data for new business
        reloadSalesForCurrentBusiness();
    }
}

async function reloadSalesForCurrentBusiness() {
    console.log('🔄 Reloading sales for current business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected');
        return;
    }
    
    if (salesManagement) {
        // Clear sales data
        salesManagement.salesData = [];
        salesManagement.invoiceItems = [];
        salesManagement.selectedSales.clear();
        salesManagement.currentSaleId = null;
        salesManagement.customers = [];
        salesManagement.products = [];
        
        // Reload data
        await salesManagement.loadSalesData();
        await salesManagement.loadCustomers();
        await salesManagement.loadProducts();
        salesManagement.updateStats();
        
        console.log('✅ Sales data reloaded for business:', currentBusiness.name);
    } else {
        console.warn('⚠️ salesManagement not initialized yet');
    }
}

// Add business change event listener
if (window.addEventListener) {
    window.addEventListener('businessChanged', async function() {
        console.log('🏢 Business changed event received in sales.js');
        if (salesManagement) {
            await reloadSalesForCurrentBusiness();
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the sales page
    const salesPage = document.getElementById('sales-page');
    if (salesPage && !salesPage.classList.contains('d-none')) {
        initializeSalesManagement();
    }
});

// Also initialize when navigating to sales page
document.addEventListener('click', function(e) {
    const navLink = e.target.closest('.sidebar-menu a[data-page]');
    if (navLink && navLink.getAttribute('data-page') === 'sales') {
        // Small delay to ensure page is visible
        setTimeout(() => {
            if (document.getElementById('sales-page') && !document.getElementById('sales-page').classList.contains('d-none')) {
                if (!salesManagement) {
                    initializeSalesManagement();
                } else {
                    // Refresh data if already initialized
                    salesManagement.loadSalesData();
                    salesManagement.loadCustomers();
                    salesManagement.loadProducts();
                }
            }
        }, 300);
    }
});

// Export for global access
window.salesManagement = salesManagement;