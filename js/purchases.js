// Purchases-specific keyboard shortcuts
function setupPurchasesShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only trigger if we're on purchases page
        const onPurchasesPage = document.getElementById('purchases-page') && 
                               !document.getElementById('purchases-page').classList.contains('d-none');
        
        if (!onPurchasesPage || 
            (e.target.tagName === 'INPUT' && !e.altKey) || 
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Alt + P - Create new purchase (different from sales Alt+S)
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (purchasesManagement) {
                purchasesManagement.showCreatePurchase();
                keyboardShortcuts?.showShortcutFeedback('Creating new purchase');
            }
        }
        
        // Alt + R - Refresh purchases
        if (e.altKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            if (purchasesManagement) {
                purchasesManagement.loadPurchasesData();
                keyboardShortcuts?.showShortcutFeedback('Refreshing purchases');
            }
        }
        
        // Alt + L - Print selected purchase order
        if (e.altKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.purchase-checkbox:checked');
            if (selectedCheckbox) {
                const printBtn = selectedCheckbox.closest('tr').querySelector('[onclick*="print"]');
                if (printBtn) {
                    printBtn.click();
                }
            }
        }
        
        // Alt + E - Email selected purchase order
        if (e.altKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.purchase-checkbox:checked');
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
            const hoveredRow = e.target.closest('.purchase-row');
            if (hoveredRow) {
                const checkbox = hoveredRow.querySelector('.purchase-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}

// Purchases Management JavaScript
class PurchasesManagement {
    constructor() {
        this.currentPage = 'dashboard';
        this.purchasesData = [];
        this.purchaseOrderItems = [];
        this.selectedPurchases = new Set();
        this.currentPurchaseId = null;
        this.suppliers = [];
        this.products = [];
        this.isLoading = false;
        this.previewPurchaseData = null;
        this.previewOrderNumber = '';
        this.searchTerm = '';
        this.filteredPurchasesData = [];
        this.isSearchActive = false;
        this.reportData = [];
        this.currentReportFilters = {};
        this.isReportView = false;
        this.hasUnsavedChanges = false;
        this.isConfirmingLeave = false;
        this.editingPurchaseId = null;
        this.originalOrderNumber = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadPurchasesData();
        await this.loadSuppliers();
        await this.loadProducts();
        this.updateStats();
        this.addPurchasePreviewStyles();
        setupPurchasesShortcuts();
        this.setupPurchaseKeyboardNavigation();
        this.setupSearch();
        setupPurchasesActionDropdownListeners();
        this.setupBrowserBackButton();
        setTimeout(() => this.setupChangeTracking(), 500);
    }

    async updateProductStockOnPurchase(purchaseId) {
    try {
        // Fetch purchase items
        const { data: purchaseItems, error } = await supabase
            .from('purchase_items')
            .select('product_id, quantity')
            .eq('purchase_id', purchaseId);
        
        if (error) throw error;
        
        // Update stock for each product
        for (const item of purchaseItems) {
            // First, get current stock
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('current_stock')
                .eq('id', item.product_id)
                .single();
            
            if (productError) {
                console.error('Error fetching product stock:', productError);
                continue;
            }
            
            // Calculate new stock
            const newStock = (product.current_stock || 0) + item.quantity;
            
            // Update product stock
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    current_stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id);
            
            if (updateError) {
                console.error('Error updating product stock:', updateError);
            }
        }
        
        console.log('Product stock updated successfully');
        
    } catch (error) {
        console.error('Error updating product stock:', error);
    }
}

    setupChangeTracking() {
        // Track form changes
        const formInputs = document.querySelectorAll('#purchases-order-page input, #purchases-order-page select, #purchases-order-page textarea');
        
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
            });
            
            input.addEventListener('change', () => {
                this.hasUnsavedChanges = true;
            });
        });
        
        // Track item additions/removals
        const originalRenderPurchaseItems = this.renderPurchaseItems.bind(this);
        this.renderPurchaseItems = () => {
            originalRenderPurchaseItems();
            this.hasUnsavedChanges = true;
        };
    }

    checkForUnsavedChanges() {
        // Check if we're in create/edit mode
        const isOnOrderPage = document.getElementById('purchases-order-page') && 
                               !document.getElementById('purchases-order-page').classList.contains('d-none');
        
        if (!isOnOrderPage) return true;
        
        // Check if there are unsaved changes
        if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
            this.showLeaveConfirmation();
            return false; // Don't proceed with navigation
        }
        
        return true; // Proceed with navigation
    }

    showLeaveConfirmation() {
        this.isConfirmingLeave = true;
        this.showModal('leave-purchase-modal');
    }

    hideLeaveConfirmation() {
        this.isConfirmingLeave = false;
        document.getElementById('leave-purchase-modal').classList.add('d-none');
    }

    confirmLeave() {
        this.hideLeaveConfirmation();
        this.clearAllPurchaseData();
        this.resetChangeTracking();
        
        // Force reset button to "Save Order"
        const saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Purchase Order';
            saveBtn.onclick = () => this.savePurchase();
        }
        
        this.showPurchasesList();
    }

    // Clear all purchase data completely
    clearAllPurchaseData() {
        // Clear purchase items array
        this.purchaseOrderItems = [];
        
        // Reset form fields
        document.getElementById('purchase-order-number').value = '';
        document.getElementById('supplier-select').value = '';
        document.getElementById('purchase-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('expected-delivery-date').value = '';
        document.getElementById('purchase-notes').value = '';
        
        // Reset product form
        document.getElementById('purchase-item-select').value = '';
        document.getElementById('purchase-item-quantity').value = '1';
        document.getElementById('purchase-item-price').value = '0.00';
        document.getElementById('purchase-item-subtotal').value = '0.00';
        
        // Clear items table
        const tableBody = document.getElementById('purchase-items-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-box-open fa-2x mb-3"></i>
                        <p>No items added to purchase order</p>
                        <small>Add products to create your purchase order</small>
                    </div>
                </td>
            </tr>
        `;
        
        // Reset grand total
        document.getElementById('purchase-grand-total-amount').textContent = '₹0.00';
        
        // Reset edit mode if active
        if (this.editingPurchaseId) {
            this.resetEditMode();
        }
        
        // Force reset button to "Save Order"
        const saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Purchase Order';
            saveBtn.onclick = () => this.savePurchase();
        }
        
        // Refresh product list
        this.loadProducts();
    }

    resetChangeTracking() {
        this.hasUnsavedChanges = false;
        this.isConfirmingLeave = false;
    }

    setupSearch() {
        const searchInput = document.getElementById('purchases-search-input');
        const clearBtn = document.getElementById('clear-purchase-search-btn');
        
        if (searchInput) {
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
                    // Navigate to first result
                    this.highlightFirstResult();
                }
            });
            
            // Add global keyboard shortcut for focusing search
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key.toLowerCase() === 'f') {
                    const activePage = document.querySelector('.page-content:not(.d-none)');
                    if (activePage && activePage.id === 'purchases-page') {
                        e.preventDefault();
                        searchInput.focus();
                        searchInput.select();
                    }
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
            this.filteredPurchasesData = [...this.purchasesData];
            this.renderPurchasesTable();
            this.updateSearchResultsCount();
            return;
        }
        
        this.isSearchActive = true;
        
        // Filter purchases based on search term
        this.filteredPurchasesData = this.purchasesData.filter(purchase => {
            // Search in multiple fields
            return (
                (purchase.orderNo && purchase.orderNo.toLowerCase().includes(this.searchTerm)) ||
                (purchase.supplier && purchase.supplier.toLowerCase().includes(this.searchTerm)) ||
                (purchase.supplierEmail && purchase.supplierEmail.toLowerCase().includes(this.searchTerm)) ||
                (purchase.supplierPhone && purchase.supplierPhone.includes(this.searchTerm)) ||
                (purchase.displayDate && purchase.displayDate.toLowerCase().includes(this.searchTerm)) ||
                (purchase.status && purchase.status.toLowerCase().includes(this.searchTerm)) ||
                (purchase.payment && purchase.payment.toLowerCase().includes(this.searchTerm)) ||
                (purchase.amount && purchase.amount.toString().includes(this.searchTerm))
            );
        });
        
        this.renderPurchasesTable(true);
        this.updateSearchResultsCount();
        this.highlightSearchTerms();
    }

    setupPurchaseKeyboardNavigation() {
        // Define form fields in order
        this.formFields = [
            'purchase-item-select',
            'purchase-item-quantity',
            'purchase-item-price',
            'add-purchase-item-btn'
        ];
        
        // Add event listeners for Enter key navigation
        document.getElementById('purchase-item-select')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
        
        document.getElementById('purchase-item-quantity')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
        
        document.getElementById('purchase-item-price')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.focusNextField();
            }
        });
    }

    focusNextField() {
        this.currentFocusIndex++;
        
        if (this.currentFocusIndex >= this.formFields.length) {
            this.currentFocusIndex = 0;
        }
        
        const nextFieldId = this.formFields[this.currentFocusIndex];
        const nextField = document.getElementById(nextFieldId);
        
        if (nextField) {
            nextField.focus();
            
            if (nextFieldId === 'add-purchase-item-btn') {
                nextField.focus();
            } else if (nextField.tagName === 'INPUT') {
                nextField.select();
            }
        }
    }
    
    focusPreviousField() {
        this.currentFocusIndex--;
        
        if (this.currentFocusIndex < 0) {
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
        document.getElementById('create-purchase-btn')?.addEventListener('click', () => this.showCreatePurchase());
        document.getElementById('refresh-purchases-btn')?.addEventListener('click', () => this.loadPurchasesData());
        document.getElementById('bulk-print-purchase-btn')?.addEventListener('click', () => this.bulkPrintPurchaseOrders());
        document.getElementById('bulk-email-purchase-btn')?.addEventListener('click', () => this.bulkEmailPurchaseOrders());
        
        // Purchase Creation
        document.getElementById('clear-purchase-btn')?.addEventListener('click', () => this.clearPurchase());
        document.getElementById('save-purchase-btn')?.addEventListener('click', () => this.savePurchase());
        document.getElementById('add-supplier-btn')?.addEventListener('click', () => this.showAddSupplierModal());
        document.getElementById('add-purchase-item-btn')?.addEventListener('click', () => this.addItemToPurchase());
        
        // Form Inputs
        document.getElementById('purchase-item-select')?.addEventListener('input', (e) => this.updatePurchaseItemPrice(e.target.value));
        document.getElementById('purchase-item-quantity')?.addEventListener('input', () => this.calculatePurchaseSubtotal());
        document.getElementById('purchase-item-price')?.addEventListener('input', () => this.calculatePurchaseSubtotal());
        
        // Search
        document.getElementById('clear-purchase-search-btn')?.addEventListener('click', () => {
            this.clearSearch();
        });
        
        // Select All Checkbox
        document.getElementById('select-all-purchases')?.addEventListener('change', (e) => {
            this.toggleSelectAllPurchases(e.target.checked);
        });
        
        // Date Inputs
        const purchaseDate = document.getElementById('purchase-date');
        const expectedDate = document.getElementById('expected-delivery-date');
        
        if (purchaseDate) {
            const today = new Date().toISOString().split('T')[0];
            purchaseDate.value = today;
            purchaseDate.min = today;
        }
        
        if (expectedDate) {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            expectedDate.value = nextWeek.toISOString().split('T')[0];
            expectedDate.min = new Date().toISOString().split('T')[0];
        }
        
        // Back buttons
        document.querySelector('.back-to-purchases-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.checkForUnsavedChanges()) {
                this.showPurchasesList();
            }
        });
        
        // Event delegation for edit/delete buttons
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-purchase-btn');
            const deleteBtn = e.target.closest('.delete-purchase-btn');
            
            if (editBtn && editBtn.dataset.purchaseId) {
                e.preventDefault();
                this.editPurchase(editBtn.dataset.purchaseId);
            }
            
            if (deleteBtn && deleteBtn.dataset.purchaseId) {
                e.preventDefault();
                this.deletePurchase(deleteBtn.dataset.purchaseId);
            }
        });
        
        setTimeout(() => this.setupChangeTracking(), 100);
    }
    
    // Navigation Methods
    showDashboard() {
        if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
            this.showLeaveConfirmation();
            return;
        }
        
        this.showPage('purchases-page');
        this.currentPage = 'dashboard';
        this.resetChangeTracking();
    }
    
    showPurchasesList() {
        const isOnOrderPage = document.getElementById('purchases-order-page') && 
                               !document.getElementById('purchases-order-page').classList.contains('d-none');
        
        if (isOnOrderPage && this.hasUnsavedChanges && !this.isConfirmingLeave) {
            this.showLeaveConfirmation();
            return;
        }
        
        this.showPage('purchases-page');
        this.currentPage = 'dashboard';
        this.setPurchasesNavigationActive();
        this.resetChangeTracking();
    }

    setPurchasesNavigationActive() {
        console.log('🎯 Setting Purchases navigation as active');
        
        // Remove active class from all sidebar items
        document.querySelectorAll('.sidebar-menu a').forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });
        
        // Add active class to Purchases menu item
        const purchasesMenuItem = document.querySelector('.sidebar-menu a[data-page="purchases"]');
        if (purchasesMenuItem) {
            purchasesMenuItem.classList.add('active');
            purchasesMenuItem.setAttribute('aria-current', 'page');
            console.log('✅ Purchases navigation activated');
        }
        
        // Update current page
        currentPage = 'purchases';
        
        // Update URL
        if (window.history && window.history.pushState) {
            window.history.pushState({ page: 'purchases' }, 'Purchases', '#purchases');
        }
    }
    
    showCreatePurchase() {
        if (this.hasUnsavedChanges && !this.isConfirmingLeave) {
            this.showLeaveConfirmation();
            return;
        }
        
        // Reset edit mode first
        this.resetEditMode();
        
        this.showPage('purchases-order-page');
        this.currentPage = 'create-purchase';
        this.generatePurchaseOrderNumber();
        this.resetChangeTracking();
        
        // Reset form to clean state
        this.clearAllPurchaseData();
        
        // Ensure button says "Save Order" and is enabled
        const saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Purchase Order';
            saveBtn.onclick = () => this.savePurchase();
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
        }
        
        // Reset page title
        const pageTitle = document.querySelector('.purchase-header h2');
        if (pageTitle) {
            pageTitle.textContent = 'Create Purchase Order';
        }
        
        // Reset focus to product field
        setTimeout(() => {
            const productField = document.getElementById('purchase-item-select');
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
    
    // Purchases Data Management
    async loadPurchasesData() {
        if (!currentBusiness?.id) {
            this.showError('No business selected. Please select a business first.');
            return;
        }
        
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            // Show loading state
            const tableBody = document.getElementById('purchases-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                                <p>Loading purchase data...</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            console.log('Loading purchases for business:', currentBusiness.id);
            
            // Fetch purchases data
            const { data: purchases, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('Error loading purchases:', error);
                throw error;
            }
            
            console.log('Purchases data loaded:', purchases?.length || 0, 'records');
            
            if (!purchases || purchases.length === 0) {
                this.purchasesData = [];
                this.renderPurchasesTable();
                this.updateStats();
                return;
            }
            
            // Get all supplier IDs from purchases
            const supplierIds = [...new Set(purchases.map(purchase => purchase.supplier_id).filter(id => id))];
            
            // Fetch suppliers data
            let suppliersMap = {};
            if (supplierIds.length > 0) {
                const { data: suppliers, error: suppliersError } = await supabase
                    .from('parties')
                    .select('id, name, email, phone, address, type')
                    .in('id', supplierIds);
                
                if (suppliersError) {
                    console.error('Error loading suppliers:', suppliersError);
                } else if (suppliers) {
                    // Create a map for easy lookup
                    suppliers.forEach(supplier => {
                        suppliersMap[supplier.id] = supplier;
                    });
                }
            }
            
            // Transform data for easier use
            this.purchasesData = purchases.map(purchase => {
                const supplier = suppliersMap[purchase.supplier_id] || { 
                    name: 'Unknown Supplier', 
                    email: '', 
                    phone: '', 
                    type: 'supplier' 
                };
                
                // Format date
                let displayDate = 'N/A';
                try {
                    if (purchase.purchase_date) {
                        displayDate = this.formatDate(purchase.purchase_date);
                    } else if (purchase.created_at) {
                        displayDate = this.formatDate(purchase.created_at);
                    }
                } catch (e) {
                    console.error('Error formatting date:', e);
                }
                
                return {
                    id: purchase.id,
                    orderNo: purchase.order_number || `PO-${purchase.id.toString().slice(-4)}`,
                    date: purchase.purchase_date || purchase.created_at,
                    displayDate: displayDate,
                    supplier: supplier.name,
                    supplierEmail: supplier.email,
                    supplierPhone: supplier.phone,
                    supplierAddress: supplier.address,
                    partyType: supplier.type || 'supplier',
                    items: purchase.items_count || 0,
                    amount: purchase.total_amount || 0,
                    status: purchase.status || 'pending',
                    payment: purchase.payment_status || 'pending',
                    tax_amount: purchase.tax_amount || 0,
                    discount_amount: purchase.discount_amount || 0,
                    shipping_charges: purchase.shipping_charges || 0,
                    notes: purchase.notes || '',
                    expected_delivery: purchase.expected_delivery_date
                };
            });
            
            console.log('Transformed purchases data:', this.purchasesData.length, 'records');
            
            this.renderPurchasesTable();
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading purchases data:', error);
            this.showError('Failed to load purchases data: ' + error.message);
            
            // Show error state
            const tableBody = document.getElementById('purchases-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-exclamation-triangle fa-2x mb-3 text-danger"></i>
                                <p>Failed to load purchases data</p>
                                <p class="text-muted small">${error.message}</p>
                                <button class="btn btn-primary btn-sm mt-2" onclick="purchasesManagement.loadPurchasesData()">
                                    <i class="fas fa-redo"></i> Try Again
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } finally {
            this.isLoading = false;
            this.clearSearch();
        }
    }
    
    renderPurchasesTable(isSearchMode = false) {
        const tableBody = document.getElementById('purchases-table-body');
        if (!tableBody) return;
        
        const dataToRender = isSearchMode ? this.filteredPurchasesData : this.purchasesData;
        
        if (dataToRender.length === 0) {
            let emptyMessage = '';
            if (isSearchMode && this.searchTerm) {
                emptyMessage = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                                <h4>No Results Found</h4>
                                <p class="text-muted mb-4">No purchase orders found for "<strong>${this.searchTerm}</strong>"</p>
                                <button class="btn btn-outline" onclick="purchasesManagement.clearSearch()">
                                    <i class="fas fa-times"></i> Clear Search
                                </button>
                                <p class="text-muted mt-3" style="font-size: 0.9rem;">
                                    Try searching by order number, supplier name, email, or amount
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
                                <i class="fas fa-truck fa-3x mb-3 text-muted"></i>
                                <h4>No Purchase Orders Found</h4>
                                <p class="text-muted mb-4">You haven't created any purchase orders yet</p>
                                <button class="btn btn-primary" onclick="purchasesManagement.showCreatePurchase()">
                                    <i class="fas fa-plus"></i> Create Your First Purchase Order
                                </button>
                                <p class="text-muted mt-3" style="font-size: 0.9rem;">
                                    Start by creating your first purchase order to track your purchases
                                </p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = emptyMessage;
            return;
        }
        
        tableBody.innerHTML = dataToRender.map(purchase => {
            // Highlight search term in relevant fields
            const orderNo = this.highlightText(purchase.orderNo, this.searchTerm);
            const supplier = this.highlightText(purchase.supplier, this.searchTerm);
            const amount = this.highlightText(formatCurrency(purchase.amount), this.searchTerm);
            const status = this.highlightText(purchase.status, this.searchTerm);
            const payment = this.highlightText(purchase.payment, this.searchTerm);
            
            return `
                <tr class="purchase-row" data-purchase-id="${purchase.id}">
                    <td>
                        <input type="checkbox" class="purchase-checkbox" value="${purchase.id}" 
                               ${this.selectedPurchases.has(purchase.id) ? 'checked' : ''}>
                    </td>
                    <td>${orderNo}</td>
                    <td>${purchase.displayDate}</td>
                    <td>
                        <div>${supplier}</div>
                    </td>
                    <td>${amount}</td>
                    <td>
                        <span class="status-badge status-${purchase.status}">
                            ${purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <span class="payment-badge payment-${purchase.payment}">
                            ${purchase.payment.charAt(0).toUpperCase() + purchase.payment.slice(1)}
                        </span>
                    </td>
                    <td>
                        <div class="action-dropdown">
                        <button class="action-dots" onclick="event.stopPropagation(); togglePurchasesActionDropdown('${purchase.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="action-dropdown-menu" id="purchases-action-dropdown-${purchase.id}">
                            <button class="action-dropdown-item" onclick="event.stopPropagation(); purchasesManagement.editPurchase('${purchase.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-dropdown-item text-danger" onclick="event.stopPropagation(); purchasesManagement.deletePurchase('${purchase.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <button class="action-dropdown-item" onclick="event.stopPropagation(); purchasesManagement.showPurchasePreview('${purchase.id}', '${purchase.orderNo}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Make entire row clickable for preview
        document.querySelectorAll('.purchase-row').forEach(row => {
            const purchaseId = row.dataset.purchaseId;
            const orderNo = row.querySelector('td:nth-child(2)').textContent;
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or checkboxes
                if (!e.target.closest('button') && !e.target.closest('input[type="checkbox"]')) {
                    this.showPurchasePreview(purchaseId, orderNo);
                }
            });
        });
        
        // Re-bind checkbox events
        document.querySelectorAll('.purchase-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.togglePurchaseSelection(e.target.value, e.target.checked);
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
                
                .purchase-row:hover .search-highlight {
                    background-color: #ffeaa7 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    highlightFirstResult() {
        if (this.filteredPurchasesData.length > 0) {
            const firstRow = document.querySelector('.purchase-row');
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
        const searchInput = document.getElementById('purchases-search-input');
        const clearBtn = document.getElementById('clear-purchase-search-btn');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        this.searchTerm = '';
        this.isSearchActive = false;
        this.filteredPurchasesData = [...this.purchasesData];
        this.renderPurchasesTable();
        this.updateSearchResultsCount();
        
        // Focus back on search input for quick typing
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    updateSearchResultsCount() {
        const searchInfo = document.getElementById('purchases-search-info');
        if (!searchInfo) {
            // Create search info element if it doesn't exist
            const tableFooter = document.querySelector('.purchase-table-footer');
            if (tableFooter) {
                const infoDiv = document.createElement('div');
                infoDiv.id = 'purchases-search-info';
                infoDiv.className = 'text-muted small mt-2';
                tableFooter.appendChild(infoDiv);
            }
        }
        
        const infoElement = document.getElementById('purchases-search-info');
        if (infoElement) {
            if (this.isSearchActive && this.searchTerm) {
                infoElement.innerHTML = `
                    <i class="fas fa-search me-1"></i>
                    Found <strong>${this.filteredPurchasesData.length}</strong> of <strong>${this.purchasesData.length}</strong> purchase orders 
                    matching "<strong>${this.searchTerm}</strong>"
                    ${this.filteredPurchasesData.length > 0 ? 
                        `<button class="btn btn-sm btn-outline ms-2" onclick="purchasesManagement.clearSearch()">
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
        const totalPurchases = this.purchasesData.length;
        const totalAmount = this.purchasesData.reduce((sum, purchase) => sum + purchase.amount, 0);
        const pendingOrders = this.purchasesData.filter(purchase => purchase.status === 'pending').length;
        const avgPurchaseValue = totalPurchases > 0 ? totalAmount / totalPurchases : 0;
        
        // Update DOM elements if they exist
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('total-purchases-count', totalPurchases);
        updateElement('total-purchases-amount', formatCurrency(totalAmount));
        updateElement('pending-purchases', pendingOrders);
        updateElement('avg-purchase-value', formatCurrency(avgPurchaseValue));
    }
    
    // Purchase Order Creation Methods
    generatePurchaseOrderNumber() {
        if (!currentBusiness?.id) {
            document.getElementById('purchase-order-number').value = 'PO-0001';
            return;
        }
        
        // Show a temporary placeholder
        document.getElementById('purchase-order-number').value = 'PO-XXXXX';
        
        // Get the latest order number from database
        supabase
            .from('purchases')
            .select('order_number')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data, error }) => {
                let nextNumber = 1;
                
                if (!error && data?.order_number) {
                    // Extract number from existing order number
                    const match = data.order_number.match(/\d+/);
                    if (match) {
                        nextNumber = parseInt(match[0]) + 1;
                    } else {
                        // If no number found, count existing purchases
                        this.getPurchasesCount().then(count => {
                            nextNumber = count + 1;
                            document.getElementById('purchase-order-number').value = `PO-${nextNumber.toString().padStart(4, '0')}`;
                        });
                        return;
                    }
                } else if (error) {
                    // If error, count existing purchases
                    this.getPurchasesCount().then(count => {
                        nextNumber = count + 1;
                        document.getElementById('purchase-order-number').value = `PO-${nextNumber.toString().padStart(4, '0')}`;
                    });
                    return;
                }
                
                document.getElementById('purchase-order-number').value = `PO-${nextNumber.toString().padStart(4, '0')}`;
            })
            .catch(() => {
                // Fallback: Count from local data
                const nextNumber = this.purchasesData.length + 1;
                document.getElementById('purchase-order-number').value = `PO-${nextNumber.toString().padStart(4, '0')}`;
            });
    }
    
    async loadSuppliers() {
        if (!currentBusiness?.id) return;
        
        try {
            console.log('Loading suppliers for business:', currentBusiness.id);
            
            // Load parties - using 'type' column
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
            
            // Filter to only show suppliers (type = 'supplier' or 'both')
            this.suppliers = (parties || []).filter(party => 
                party.type === 'supplier' || party.type === 'both');
            
            this.populateSupplierSelect();
            
        } catch (error) {
            console.error('Error loading suppliers/parties:', error);
            this.suppliers = [];
            this.populateSupplierSelect();
        }
    }
    
    populateSupplierSelect() {
        const supplierSelect = document.getElementById('supplier-select');
        if (!supplierSelect) return;
        
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>' +
            this.suppliers.map(supplier => 
                `<option value="${supplier.id}">
                    ${supplier.name} 
                    ${supplier.type && supplier.type !== 'supplier' ? `(${supplier.type})` : ''}
                </option>`
            ).join('');
    }
    
    async loadProducts() {
        if (!currentBusiness?.id) return;
        
        try {
            console.log('Loading products for business:', currentBusiness.id);
            
            // Load products for purchase (including out of stock)
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, cost_price, current_stock, unit, sku, category')
                .eq('business_id', currentBusiness.id)
                .order('name');
            
            if (error) {
                console.error('Error loading products:', error);
                throw error;
            }
            
            this.products = products || [];
            console.log('Products loaded:', this.products.length);
            this.populatePurchaseProductDatalist();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [];
        }
    }
    
    populatePurchaseProductDatalist() {
        const itemList = document.getElementById('purchase-item-list');
        if (!itemList) return;
        
        // Clear existing options
        itemList.innerHTML = '';
        
        if (this.products.length === 0) {
            itemList.innerHTML = '<option value="">No products available</option>';
            return;
        }
        
        itemList.innerHTML = this.products.map(product => 
            `<option value="${product.name}">${product.name} - Cost: ${formatCurrency(product.cost_price)} (Stock: ${product.current_stock} ${product.unit})${product.sku ? ` [SKU: ${product.sku}]` : ''}</option>`
        ).join('');
    }
    
    updatePurchaseItemPrice(itemName) {
        // Find the selected product
        const selectedProduct = this.products.find(product => product.name === itemName);
        
        if (selectedProduct) {
            document.getElementById('purchase-item-price').value = selectedProduct.cost_price.toFixed(2);
            
            // Auto-select the quantity field after product is selected
            setTimeout(() => {
                document.getElementById('purchase-item-quantity')?.focus();
                document.getElementById('purchase-item-quantity')?.select();
            }, 50);
        } else {
            document.getElementById('purchase-item-price').value = '0.00';
        }
        
        this.calculatePurchaseSubtotal();
    }
    
    calculatePurchaseSubtotal() {
        const quantity = parseFloat(document.getElementById('purchase-item-quantity').value) || 0;
        const price = parseFloat(document.getElementById('purchase-item-price').value) || 0;
        const subtotal = quantity * price;
        
        document.getElementById('purchase-item-subtotal').value = subtotal.toFixed(2);
        
        // Auto-focus price field after quantity is entered
        if (quantity > 0 && this.currentFocusIndex === 1) {
            setTimeout(() => {
                document.getElementById('purchase-item-price')?.focus();
                document.getElementById('purchase-item-price')?.select();
            }, 50);
        }
    }
    
    addItemToPurchase() {
        const itemName = document.getElementById('purchase-item-select').value;
        const quantity = parseFloat(document.getElementById('purchase-item-quantity').value);
        const price = parseFloat(document.getElementById('purchase-item-price').value);
        
        if (!itemName || !quantity || quantity <= 0 || !price || price <= 0) {
            this.showError('Please fill all required fields with valid values');
            // Focus on the problematic field
            if (!itemName) {
                document.getElementById('purchase-item-select').focus();
            } else if (!quantity || quantity <= 0) {
                document.getElementById('purchase-item-quantity').focus();
            } else {
                document.getElementById('purchase-item-price').focus();
            }
            return;
        }
        
        // Check if product exists
        const selectedProduct = this.products.find(product => product.name === itemName);
        if (!selectedProduct) {
            this.showError('Selected product not found');
            return;
        }
        
        const subtotal = quantity * price;
        const tempId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const item = {
            id: null,
            tempId: tempId,
            product_id: selectedProduct.id,
            name: itemName,
            quantity: quantity,
            price: price,
            subtotal: subtotal,
            product: selectedProduct
        };
        
        console.log('Adding new purchase item:', item);
        
        this.purchaseOrderItems.push(item);
        
        // Clear the table first to avoid duplicate rendering
        const tableBody = document.getElementById('purchase-items-body');
        tableBody.innerHTML = '';
        
        this.renderPurchaseItems();
        this.updatePurchaseGrandTotal();
        
        // Reset form
        document.getElementById('purchase-item-select').value = '';
        document.getElementById('purchase-item-quantity').value = 1;
        document.getElementById('purchase-item-price').value = '0.00';
        document.getElementById('purchase-item-subtotal').value = '0.00';
        
        // Focus back on product selection
        setTimeout(() => {
            document.getElementById('purchase-item-select').focus();
            this.currentFocusIndex = 0;
        }, 100);
    }
    
    renderPurchaseItems() {
        const tableBody = document.getElementById('purchase-items-body');
        
        // Clear the table body completely first
        tableBody.innerHTML = '';
        
        if (this.purchaseOrderItems.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-box-open fa-2x mb-3"></i>
                            <p>No items added to purchase order</p>
                            <small>Add products to create your purchase order</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        this.purchaseOrderItems.forEach((item, index) => {
            const itemId = item.id || item.tempId || `item-${index}-${Date.now()}`;
            if (!item.tempId && !item.id) item.tempId = itemId;

            const row = document.createElement('tr');
            row.setAttribute('data-item-id', itemId);
            row.setAttribute('data-product-id', item.product_id);
            row.setAttribute('data-item-index', index);
            
            row.innerHTML = `
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
                           data-item-id="${itemId}"
                           style="width: 80px;">
                </td>
                <td class="item-price-cell">
                    <input type="number" 
                           class="form-control form-control-sm item-price-input" 
                           value="${item.price}" 
                           min="0" 
                           step="0.01"
                           data-original="${item.price}"
                           data-item-id="${itemId}"
                           style="width: 100px;">
                </td>
                <td class="item-subtotal-cell">
                    <span class="item-subtotal">${formatCurrency(item.subtotal || (item.quantity * item.price))}</span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm btn-danger remove-item-btn" 
                            data-item-id="${itemId}"
                            title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-success update-item-btn ms-1" 
                            data-item-id="${itemId}"
                            title="Update" style="display: none;">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            `;
            
            fragment.appendChild(row);
        });
        
        tableBody.appendChild(fragment);
        
        // Add inline editing event listeners
        this.bindPurchaseInlineEditingEvents();
    }

    bindPurchaseInlineEditingEvents() {
        // Remove any existing event listeners first
        document.querySelectorAll('.item-quantity-input, .item-price-input, .remove-item-btn').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        });
        
        // Quantity input change
        document.querySelectorAll('.item-quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handlePurchaseItemInputChange(e.target);
            });
            
            input.addEventListener('input', (e) => {
                this.handlePurchaseItemInputChange(e.target);
            });
            
            input.addEventListener('focus', (e) => {
                e.target.select();
            });
        });
        
        // Price input change
        document.querySelectorAll('.item-price-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handlePurchaseItemInputChange(e.target);
            });
            
            input.addEventListener('input', (e) => {
                this.handlePurchaseItemInputChange(e.target);
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
                this.removePurchaseItem(itemId);
            });
        });
    }

    handlePurchaseItemInputChange(input) {
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
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
                
                // Remove existing onclick handler and add new one
                updateBtn.onclick = null;
                updateBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.updatePurchaseItem(itemTempId, quantity, price);
                };
            }
        } else {
            if (updateBtn) {
                updateBtn.style.display = 'none';
            }
        }
        
        // Update grand total temporarily
        this.calculateTemporaryPurchaseGrandTotal();
    }

    calculateTemporaryPurchaseGrandTotal() {
        // Calculate from visible table rows
        let temporaryTotal = 0;
        
        document.querySelectorAll('#purchase-items-body tr[data-item-id]').forEach(row => {
            const quantityInput = row.querySelector('.item-quantity-input');
            const priceInput = row.querySelector('.item-price-input');
            
            if (quantityInput && priceInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                temporaryTotal += quantity * price;
            }
        });
        
        const grandTotalElement = document.getElementById('purchase-grand-total-amount');
        if (grandTotalElement) {
            grandTotalElement.textContent = formatCurrency(temporaryTotal);
        }
    }

    updatePurchaseItem(itemTempId, newQuantity, newPrice) {
        // Find the correct item
        const itemIndex = this.purchaseOrderItems.findIndex(item => 
            String(item.tempId) === String(itemTempId) || String(item.id) === String(itemTempId)
        );
        
        if (itemIndex === -1) {
            console.error('Item not found with tempId:', itemTempId);
            return;
        }
        
        const item = this.purchaseOrderItems[itemIndex];
        
        // Update item data in the array
        item.quantity = newQuantity;
        item.price = newPrice;
        item.subtotal = newQuantity * newPrice;
        
        console.log('Updated purchase item data:', item);
        
        // Update the specific row in the table
        const row = document.querySelector(`tr[data-item-id="${itemTempId}"]`);
        if (row) {
            const quantityInput = row.querySelector('.item-quantity-input');
            const priceInput = row.querySelector('.item-price-input');
            const updateBtn = row.querySelector('.update-item-btn');
            const subtotalSpan = row.querySelector('.item-subtotal');
            
            if (quantityInput && priceInput && updateBtn && subtotalSpan) {
                // Update input values
                quantityInput.value = newQuantity;
                priceInput.value = newPrice;
                
                // Update original values
                quantityInput.dataset.original = newQuantity;
                priceInput.dataset.original = newPrice;
                
                // Update subtotal display
                subtotalSpan.textContent = formatCurrency(item.subtotal);
                
                // Hide update button
                updateBtn.style.display = 'none';
            }
        } else {
            // If row not found, re-render the table
            this.renderPurchaseItems();
        }
        
        // Update grand total with updated items array
        this.updatePurchaseGrandTotal();
        
        // Mark changes
        this.hasUnsavedChanges = true;
        
        showNotification('Success', `"${item.name}" updated successfully`, 'success');
    }
    
    removePurchaseItem(itemTempId) {
        const itemIndex = this.purchaseOrderItems.findIndex(item => 
            (item.tempId == itemTempId || item.id == itemTempId)
        );
        
        if (itemIndex === -1) return;
        
        const itemToRemove = this.purchaseOrderItems[itemIndex];
        
        if (confirm('Are you sure you want to remove this item?')) {
            // Remove from array
            this.purchaseOrderItems.splice(itemIndex, 1);
            
            this.renderPurchaseItems();
            this.updatePurchaseGrandTotal();
            
            showNotification('Success', 'Item removed from purchase order', 'success');
        }
    }
    
    updatePurchaseGrandTotal() {
        // Calculate total from purchaseOrderItems array
        const grandTotal = this.purchaseOrderItems.reduce((sum, item) => {
            const itemSubtotal = item.subtotal || (item.quantity * item.price);
            return sum + itemSubtotal;
        }, 0);
        
        const grandTotalElement = document.getElementById('purchase-grand-total-amount');
        if (grandTotalElement) {
            grandTotalElement.textContent = formatCurrency(grandTotal);
        }
    }
    
    clearPurchase() {
        if (this.purchaseOrderItems.length === 0 && 
            !document.getElementById('supplier-select').value && 
            !document.getElementById('purchase-notes').value) {
            return;
        }
        
        if (confirm('Are you sure you want to clear the current purchase order? All items and data will be lost.')) {
            this.clearAllPurchaseData();
            this.resetChangeTracking();
            showNotification('Info', 'Purchase order cleared successfully', 'info');
        }
    }

    async savePurchase() {
    if (!currentBusiness?.id) {
        this.showError('No business selected. Please select a business first.');
        return;
    }
    
    const supplierId = document.getElementById('supplier-select').value;
    const purchaseDate = document.getElementById('purchase-date').value;
    const expectedDate = document.getElementById('expected-delivery-date').value;
    const notes = document.getElementById('purchase-notes').value;
    const orderNumber = document.getElementById('purchase-order-number').value;
    const status = document.getElementById('purchase-status').value; // Get status
    const paymentStatus = document.getElementById('purchase-payment-status').value; // Get payment status

    // Validate order number format
    if (!orderNumber || !orderNumber.trim()) {
        this.showError('Order number is required');
        return;
    }
    
    const orderNumberRegex = /^PO-\d+$/i;
    if (!orderNumberRegex.test(orderNumber)) {
        this.showError('Order number must be in format: PO-00001');
        return;
    }
    
    if (!supplierId) {
        this.showError('Please select a supplier');
        return;
    }
    
    if (this.purchaseOrderItems.length === 0) {
        this.showError('Please add at least one item to the purchase order');
        return;
    }
    
    let saveBtn = null;
    let originalText = '';
    
    try {
        // Show loading state
        saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }
        
        // Calculate totals
        const totalAmount = this.purchaseOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Check for duplicate order number
        if (!this.editingPurchaseId) {
            console.log('Checking for duplicate order number:', orderNumber);
            const { data: existingOrder, error: checkError } = await supabase
                .from('purchases')
                .select('id, order_number')
                .eq('business_id', currentBusiness.id)
                .eq('order_number', orderNumber)
                .maybeSingle();
            
            if (checkError) {
                console.error('Error checking duplicate order:', checkError);
            } else if (existingOrder) {
                this.showError(`Order number ${orderNumber} already exists. Please use a different order number.`);
                
                // Restore button state
                if (saveBtn) {
                    saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save Purchase Order';
                    saveBtn.disabled = false;
                }
                return;
            }
        }
        
        // Get selected supplier details
        const selectedSupplier = this.suppliers.find(s => s.id == supplierId);
        
        if (!selectedSupplier) {
            throw new Error('Selected supplier not found in parties table');
        }
        
        // Create purchase record
        const purchaseData = {
            business_id: currentBusiness.id,
            supplier_id: supplierId,
            order_number: orderNumber,
            purchase_date: purchaseDate,
            expected_delivery_date: expectedDate || null,
            total_amount: totalAmount,
            status: status, // Use selected status
            payment_status: paymentStatus, // Use selected payment status
            notes: notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Saving purchase data:', purchaseData);
        
        // If we're in edit mode, use updatePurchase instead
        if (this.editingPurchaseId) {
            console.log('In edit mode, redirecting to updatePurchase');
            // Restore button state
            if (saveBtn) {
                saveBtn.innerHTML = originalText || '<i class="fas fa-sync-alt"></i> Update Purchase Order';
                saveBtn.disabled = false;
            }
            
            // Call updatePurchase instead
            return this.updatePurchase();
        }
        
        // Insert purchase (only for new orders)
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .insert([purchaseData])
            .select()
            .single();
        
        if (purchaseError) {
            console.error('Purchase insert error:', purchaseError);
            
            if (purchaseError.code === '23505') {
                // Generate a new unique order number
                const newOrderNumber = await this.generateUniqueOrderNumber();
                document.getElementById('purchase-order-number').value = newOrderNumber;
                
                // Restore button and let user retry
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-redo"></i> Retry with new number';
                    saveBtn.disabled = false;
                    saveBtn.onclick = () => this.savePurchase();
                }
                return;
            } else {
                throw purchaseError;
            }
        }
        
        console.log('Purchase created with ID:', purchase.id);
        
        // Create purchase items
        const purchaseItems = this.purchaseOrderItems.map(item => {
            const totalPrice = item.quantity * item.price;
            
            return {
                purchase_id: purchase.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: totalPrice,
                created_at: new Date().toISOString()
            };
        });
        
        console.log('Saving purchase items:', purchaseItems);
        
        if (purchaseItems.length > 0) {
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems);
            
            if (itemsError) {
                console.error('Purchase items insert error:', itemsError);
                
                // If purchase items fail, we should delete the purchase record
                await supabase
                    .from('purchases')
                    .delete()
                    .eq('id', purchase.id);
                
                throw new Error('Failed to save purchase items: ' + itemsError.message);
            }
        }
        
        // Update product stock if status is "received"
        if (status === 'received') {
            await this.updateProductStockOnPurchase(purchase.id);
        }
        
        // Show success message
        showNotification('Success', `Purchase Order #${purchaseData.order_number} saved successfully for ${selectedSupplier?.name || 'supplier'}!`, 'success');
        
        // Reset form and go back to purchases list
        this.resetEditMode();
        this.resetChangeTracking();
        this.showPurchasesList();
        await this.loadPurchasesData();
        
    } catch (error) {
        console.error('Error saving purchase order:', error);
        
        // More specific error messages
        if (error.code === 'PGRST204') {
            const columnMatch = error.message.match(/'([^']+)'/);
            const columnName = columnMatch ? columnMatch[1] : 'unknown column';
            this.showError(`Database column error: Column '${columnName}' does not exist. Please check your database schema.`);
        } else if (error.code === '42703') {
            this.showError('Database column error. Please check your database schema.');
        } else {
            this.showError('Failed to save purchase order: ' + (error.message || 'Unknown error'));
        }
        
    } finally {
        // Restore button state only if not already restored
        if (saveBtn && !saveBtn.disabled) {
            saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save Purchase Order';
            saveBtn.disabled = false;
            // Ensure onclick handler is correct
            if (!this.editingPurchaseId) {
                saveBtn.onclick = () => this.savePurchase();
            }
        }
    }
}

    async generateUniqueOrderNumber() {
        try {
            // Get the latest order number
            const { data: latestPurchase, error } = await supabase
                .from('purchases')
                .select('order_number')
                .eq('business_id', currentBusiness.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) {
                // If no purchases exist, start from 1
                console.log('No existing purchases found, starting from PO-0001');
                return 'PO-0001';
            }
            
            if (latestPurchase?.order_number) {
                // Extract number from existing order number
                const match = latestPurchase.order_number.match(/\d+/);
                if (match) {
                    const nextNumber = parseInt(match[0]) + 1;
                    return `PO-${nextNumber.toString().padStart(4, '0')}`;
                }
            }
            
            // Default fallback
            const count = await this.getPurchasesCount();
            return `PO-${(count + 1).toString().padStart(4, '0')}`;
            
        } catch (error) {
            console.error('Error generating order number:', error);
            // Fallback to timestamp
            const timestamp = Date.now().toString().slice(-5);
            return `PO-${timestamp}`;
        }
    }

    async getPurchasesCount() {
        try {
            const { count, error } = await supabase
                .from('purchases')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', currentBusiness.id);
            
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting purchases count:', error);
            return 0;
        }
    }

    async showPurchasePreview(purchaseId, orderNumber) {
    try {
        const purchaseIdStr = purchaseId.toString();
        this.previewOrderNumber = orderNumber;
        
        // Switch to preview page
        this.showPage('purchase-preview-page');

        // Show loading in preview
        const previewContent = document.getElementById('purchase-preview-content');
        previewContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden"></span>
                </div>
                <h4>Loading purchase order preview...</h4>
                <p class="text-muted">Order #${orderNumber}</p>
            </div>
        `;
        
        // Update header title and number
        document.getElementById('purchase-preview-title').textContent = `Purchase Order`;
        document.getElementById('purchase-preview-number').textContent = `#${orderNumber}`;
        
        // Fetch fresh data from database
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', purchaseIdStr)
            .eq('business_id', currentBusiness.id)
            .single();
        
        if (purchaseError) throw purchaseError;
        
        // Fetch fresh supplier data
        let supplier = {};
        if (purchase.supplier_id) {
            const { data: party } = await supabase
                .from('parties')
                .select('*')
                .eq('id', purchase.supplier_id)
                .maybeSingle();
            
            if (party) supplier = party;
        }
        
        // Fetch purchase items
        const { data: purchaseItems, error: itemsError } = await supabase
            .from('purchase_items')
            .select(`
                *,
                products (id, name, unit, sku)
            `)
            .eq('purchase_id', purchaseIdStr);
        
        if (itemsError) {
            console.error('Error fetching purchase items:', itemsError);
        }
        
        // Store the fresh data
        this.previewPurchaseData = {
            ...purchase,
            parties: supplier,
            purchase_items: purchaseItems || []
        };
        
        // Render the purchase order preview
        this.renderPurchasePreview(this.previewPurchaseData);
        
    } catch (error) {
        console.error('Error loading purchase preview:', error);
        const previewContent = document.getElementById('purchase-preview-content');
        previewContent.innerHTML = `
            <div class="alert alert-danger m-4">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Failed to load purchase order preview</strong>
                <p class="mb-0 mt-2">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-3" onclick="purchasesManagement.hidePurchasePreview()">
                    <i class="fas fa-arrow-left me-1"></i> Back to Purchases
                </button>
            </div>
        `;
    }
}

renderPurchasePreview(purchase) {
    if (!purchase) return;
    
    const supplier = purchase.parties || {};
    const items = purchase.purchase_items || [];
    const totalAmount = purchase.total_amount || items.reduce((sum, item) => 
        sum + (item.total_price || item.quantity * item.unit_price), 0);
    
    const previewContent = document.getElementById('purchase-preview-content');
    
    // Format dates
    const purchaseDate = this.formatDate(purchase.purchase_date || purchase.created_at);
    const expectedDate = purchase.expected_delivery_date ? this.formatDate(purchase.expected_delivery_date) : 'Not specified';
    
    // Get business details
    const businessName = currentBusiness?.name || 'Your Company Name';
    const businessAddress = currentBusiness?.address || '123 Business Street, City, Country';
    const businessPhone = currentBusiness?.phone || '+1 (555) 123-4567';
    const businessEmail = currentBusiness?.email || 'info@yourcompany.com';
    
    // Supplier details
    const supplierName = supplier.name || 'Supplier Company';
    const supplierAddress = supplier.address || '456 Supplier Avenue, Another City, Country';
    const supplierPhone = supplier.phone || '+1 (555) 987-6543';
    const supplierEmail = supplier.email || 'sales@suppliercompany.com';
    
    previewContent.innerHTML = `
        <div class="invoice-container">
            <!-- Purchase Order Header -->
            <div class="invoice-header">
                <div class="invoice-header-content">
                    <h1 class="invoice-title">PURCHASE ORDER</h1>
                    <div class="business-details">
                        <h2 class="business-name">${businessName}</h2>
                        <div class="business-info">
                            <div>${businessAddress}</div>
                            <div>${businessPhone}</div>
                            <div>${businessEmail}</div>
                        </div>
                    </div>
                </div>
                <!-- Order Details Section -->
                <div class="invoice-details-section">
                    <div class="invoice-meta">
                        <div class="meta-item">
                            <span class="meta-label">Order #:</span>
                            <span class="meta-value">${purchase.order_number || 'PO-2023-087'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Order Date:</span>
                            <span class="meta-value">${purchaseDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Expected Delivery:</span>
                            <span class="meta-value">${expectedDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value">
                                <span class="status-badge status-${purchase.status}">
                                    ${purchase.status ? purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1) : 'Pending'}
                                </span>
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Payment Status:</span>
                            <span class="meta-value">
                                <span class="payment-badge payment-${purchase.payment_status}">
                                    ${purchase.payment_status ? purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1) : 'Pending'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="invoice-body">
                <!-- From & To Sections -->
                <div class="parties-section">
                    <!-- From Section -->
                    <div class="party-card from-section">
                        <div class="section-title-invoice">To:</div>
                        <div class="party-details">
                            <div class="party-name">${supplierName}</div>
                            <div class="party-info">
                                <div>${supplierAddress}</div>
                                <div>${supplierPhone}</div>
                                <div>${supplierEmail}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- To Section -->
                    <div class="party-card to-section">
                        <div class="section-title-invoice">From:</div>
                        <div class="party-details">
                            <div class="party-name">${businessName}</div>
                            <div class="party-info">
                                <div>${businessAddress}</div>
                                <div>${businessPhone}</div>
                                <div>${businessEmail}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Purchase Items Table -->
                ${items.length > 0 ? `
                <div class="invoice-items-section">
                    <table class="invoice-items-table">
                        <thead>
                            <tr>
                                <th class="text-start">Item Name</th>
                                <th class="text-end">Quantity</th>
                                <th class="text-end">Unit Price</th>
                                <th class="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => {
                                const itemTotal = item.total_price || (item.quantity * item.unit_price);
                                const productName = item.products?.name || 'Product';
                                const unit = item.products?.unit || 'pcs';
                                
                                return `
                                    <tr>
                                        <td class="text-start">
                                            <div class="item-name">${productName}</div>
                                            ${item.products?.sku ? `<small class="text-muted">SKU: ${item.products.sku}</small>` : ''}
                                        </td>
                                        <td class="text-end">${item.quantity} ${unit}</td>
                                        <td class="text-end">${formatCurrency(item.unit_price)}</td>
                                        <td class="text-end">${formatCurrency(itemTotal)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <!-- Order Summary -->
                <div class="invoice-summary-section">
                    <div class="summary-grid">
                        <div class="summary-item grand-total">
                            <span>Total Order Value:</span>
                            <span>${formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Notes and Footer -->
                <div class="invoice-footer-section">
                    ${purchase.notes ? `
                    <div class="invoice-notes">
                        <div class="notes-title">Notes:</div>
                        <div class="notes-content">${purchase.notes}</div>
                    </div>
                    ` : ''}
                    
                    <div class="invoice-footer">
                        <div class="footer-text">
                            <p>Thank you for your service!</p>
                            <small class="text-muted">
                                Purchase order generated on ${this.formatDate(new Date())} | 
                                ${businessName}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async markPurchaseAsReceived(purchaseId) {
    if (!confirm('Mark this purchase order as received? This will update product stock quantities.')) {
        return;
    }
    
    try {
        // Update purchase status
        const { error: updateError } = await supabase
            .from('purchases')
            .update({
                status: 'received',
                updated_at: new Date().toISOString()
            })
            .eq('id', purchaseId)
            .eq('business_id', currentBusiness.id);
        
        if (updateError) throw updateError;
        
        // Update product stock
        await this.updateProductStockOnPurchase(purchaseId);
        
        showNotification('Success', 'Purchase marked as received and stock updated', 'success');
        
        // Refresh data
        await this.loadPurchasesData();
        
    } catch (error) {
        console.error('Error marking purchase as received:', error);
        this.showError('Failed to mark purchase as received: ' + error.message);
    }
}
    
    hidePurchasePreview() {
        this.showPurchasesList();
        this.previewPurchaseData = null;
        this.previewOrderNumber = '';
    }

    async editPurchase(purchaseId = null) {
    const purchaseIdToEdit = purchaseId || this.currentPurchaseId;
    if (!purchaseIdToEdit) return;
    
    console.log('Editing purchase ID:', purchaseIdToEdit);
    
    // Store the purchase ID being edited
    this.editingPurchaseId = purchaseIdToEdit.toString();
    
    // Show create purchase page but change title
    this.showPage('purchases-order-page');
    this.currentPage = 'update-purchase';
    
    try {
        // Change button text to "Update Order"
        const saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Purchase Order';
            saveBtn.onclick = () => this.updatePurchase();
            saveBtn.disabled = false;
        }
        
        // Update page title
        const pageTitle = document.querySelector('.purchase-header h2');
        if (pageTitle) {
            pageTitle.textContent = 'Update Purchase Order';
        }
        
        // Load purchase data for editing
        const { data: purchase, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', purchaseIdToEdit)
            .eq('business_id', currentBusiness.id)
            .single();
        
        if (error) throw error;
        
        if (purchase) {
            // Store original order number for validation
            this.originalOrderNumber = purchase.order_number;
            
            // Populate form with purchase data
            const orderNumberField = document.getElementById('purchase-order-number');
            orderNumberField.value = purchase.order_number;
            orderNumberField.readOnly = true;
            orderNumberField.title = "Order number cannot be changed when editing";
            orderNumberField.classList.add('bg-light');
            
            document.getElementById('supplier-select').value = purchase.supplier_id;
            document.getElementById('purchase-date').value = purchase.purchase_date?.split('T')[0] || '';
            document.getElementById('expected-delivery-date').value = purchase.expected_delivery_date?.split('T')[0] || '';
            document.getElementById('purchase-notes').value = purchase.notes || '';
            
            // Populate status fields
            document.getElementById('purchase-status').value = purchase.status || 'ordered';
            document.getElementById('purchase-payment-status').value = purchase.payment_status || 'pending';
            
            // Fetch purchase items
            const { data: purchaseItems, error: itemsError } = await supabase
                .from('purchase_items')
                .select(`
                    *,
                    products (*)
                `)
                .eq('purchase_id', purchaseIdToEdit);
            
            if (itemsError) {
                console.error('Error loading purchase items:', itemsError);
            }
            
            // Clear current items array
            this.purchaseOrderItems = [];
            
            if (purchaseItems && purchaseItems.length > 0) {
                purchaseItems.forEach(item => {
                    const productData = item.products || {};
                    const tempId = `edit-item-${item.id}-${Date.now()}`;
                    
                    const purchaseItem = {
                        id: item.id,
                        tempId: tempId,
                        purchase_id: item.purchase_id,
                        product_id: item.product_id,
                        name: productData.name || 'Unknown Product',
                        quantity: item.quantity,
                        price: item.unit_price,
                        subtotal: item.total_price || (item.quantity * item.unit_price),
                        product: productData
                    };
                    this.purchaseOrderItems.push(purchaseItem);
                });
                
                console.log('Loaded items for editing:', this.purchaseOrderItems);
            }
            
            // Clear table and render items
            const tableBody = document.getElementById('purchase-items-body');
            tableBody.innerHTML = '';
            this.renderPurchaseItems();
            this.updatePurchaseGrandTotal();
            
            // Show edit mode indicator
            this.showEditModeIndicator();
            
            // Reset change tracking since we loaded existing data
            this.hasUnsavedChanges = false;
        }
        
    } catch (error) {
        console.error('Error loading purchase for edit:', error);
        this.showError('Failed to load purchase for editing: ' + error.message);
        // Reset editing mode on error
        this.resetEditMode();
    }
}

    async updatePurchase() {
    if (!this.editingPurchaseId) {
        this.showError('No purchase selected for update');
        return;
    }

    const purchaseIdToUpdate = this.editingPurchaseId.toString();
    
    if (!currentBusiness?.id) {
        this.showError('No business selected');
        return;
    }
    
    const supplierId = document.getElementById('supplier-select').value;
    const purchaseDate = document.getElementById('purchase-date').value;
    const expectedDate = document.getElementById('expected-delivery-date').value;
    const notes = document.getElementById('purchase-notes').value;
    const orderNumber = document.getElementById('purchase-order-number').value;
    const status = document.getElementById('purchase-status').value;
    const paymentStatus = document.getElementById('purchase-payment-status').value;

    if (orderNumber !== this.originalOrderNumber) {
        this.showError('Order number cannot be changed. Please use the original order number.');
        document.getElementById('purchase-order-number').value = this.originalOrderNumber;
        return;
    }
    
    if (!supplierId) {
        this.showError('Please select a supplier');
        return;
    }
    
    if (this.purchaseOrderItems.length === 0) {
        this.showError('Please add at least one item to the purchase order');
        return;
    }
    
    let updateBtn = null;
    let originalText = '';
    
    try {
        // Show loading state
        updateBtn = document.getElementById('save-purchase-btn');
        if (updateBtn) {
            originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updateBtn.disabled = true;
        }
        
        console.log('Starting update for purchase ID:', purchaseIdToUpdate);
        
        // Calculate totals
        const totalAmount = this.purchaseOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Update the purchase record
        const { error: purchaseError } = await supabase
            .from('purchases')
            .update({
                supplier_id: supplierId,
                order_number: orderNumber,
                purchase_date: purchaseDate,
                expected_delivery_date: expectedDate || null,
                total_amount: totalAmount,
                status: status,
                payment_status: paymentStatus,
                notes: notes || '',
                updated_at: new Date().toISOString()
            })
            .eq('id', purchaseIdToUpdate)
            .eq('business_id', currentBusiness.id);
        
        if (purchaseError) {
            console.error('Purchase update error:', purchaseError);
            throw purchaseError;
        }
        
        console.log('Purchase record updated successfully');
        
        // If status changed to "received", update product stock
        // You might want to check the previous status before updating stock
        if (status === 'received') {
            await this.updateProductStockOnPurchase(purchaseIdToUpdate);
        }
        
        // Show success message
        this.resetChangeTracking();
        showNotification('Success', `Purchase Order #${orderNumber} updated successfully!`, 'success');
        
        console.log('Purchase update completed successfully');
        
        // Reset and go back to purchases list
        this.resetEditMode();
        this.showPurchasesList();
        await this.loadPurchasesData();
        
    } catch (error) {
        console.error('Error updating purchase order:', error);
        this.showError('Failed to update purchase order: ' + (error.message || 'Unknown error'));
        
    } finally {
        // Restore button state
        if (updateBtn) {
            updateBtn.innerHTML = originalText || '<i class="fas fa-sync-alt"></i> Update Purchase Order';
            updateBtn.disabled = false;
        }
    }
}

    resetEditMode() {
        this.editingPurchaseId = null;
        this.originalOrderNumber = null;
        
        // Reset button to "Save Order" and enable it
        const saveBtn = document.getElementById('save-purchase-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Purchase Order';
            saveBtn.onclick = () => this.savePurchase();
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
        }
        
        // Re-enable order number field
        const orderNumberField = document.getElementById('purchase-order-number');
        if (orderNumberField) {
            orderNumberField.readOnly = false;
            orderNumberField.classList.remove('bg-light');
            orderNumberField.title = "";
        }
        
        // Remove edit indicator
        const indicator = document.querySelector('.badge.bg-warning');
        if (indicator) {
            indicator.remove();
        }
        
        // Reset page title
        const pageTitle = document.querySelector('.purchase-header h2');
        if (pageTitle && pageTitle.textContent.includes('Update')) {
            pageTitle.textContent = 'Create Purchase Order';
        }
        
        // Update page title
        document.title = 'Create New Purchase Order - Purchases';
    }

    showEditModeIndicator() {
        // Add a visual indicator that we're in edit mode
        const purchaseHeader = document.querySelector('.purchase-header h2');
        if (purchaseHeader) {
            const indicator = document.createElement('span');
            indicator.className = 'badge bg-warning ms-2';
            indicator.textContent = 'Editing';
            purchaseHeader.appendChild(indicator);
        }
        
        // Update page title
        document.title = `Editing Order ${this.originalOrderNumber} - Purchases`;
    }

    async deletePurchase(purchaseId) {
        if (!confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
            return;
        }
        
        try {
            const purchaseIdStr = purchaseId.toString();
            
            // First delete purchase items
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .delete()
                .eq('purchase_id', purchaseIdStr);
            
            if (itemsError) throw itemsError;
            
            // Then delete the purchase
            const { error } = await supabase
                .from('purchases')
                .delete()
                .eq('id', purchaseIdStr)
                .eq('business_id', currentBusiness.id);
            
            if (error) throw error;
            
            // Remove from local data
            this.purchasesData = this.purchasesData.filter(purchase => purchase.id !== purchaseId);
            this.selectedPurchases.delete(purchaseId);
            
            this.renderPurchasesTable();
            this.updateStats();
            
            showNotification('Success', 'Purchase order deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting purchase:', error);
            this.showError('Failed to delete purchase order');
        }
    }
    
    // Bulk Operations
    toggleSelectAllPurchases(checked) {
        const checkboxes = document.querySelectorAll('.purchase-checkbox');
        this.selectedPurchases.clear();
        
        if (checked) {
            this.purchasesData.forEach(purchase => this.selectedPurchases.add(purchase.id));
            checkboxes.forEach(checkbox => checkbox.checked = true);
        } else {
            checkboxes.forEach(checkbox => checkbox.checked = false);
        }
    }
    
    togglePurchaseSelection(purchaseId, checked) {
        if (checked) {
            this.selectedPurchases.add(purchaseId);
        } else {
            this.selectedPurchases.delete(purchaseId);
            document.getElementById('select-all-purchases').checked = false;
        }
    }
    
    bulkPrintPurchaseOrders() {
        if (this.selectedPurchases.size === 0) {
            this.showError('Please select at least one purchase order to print');
            return;
        }
        
        showNotification('Info', `Preparing to print ${this.selectedPurchases.size} selected purchase orders...`, 'info');
    }
    
    bulkEmailPurchaseOrders() {
        if (this.selectedPurchases.size === 0) {
            this.showError('Please select at least one purchase order to email');
            return;
        }
        
        showNotification('Info', `Preparing to email ${this.selectedPurchases.size} selected purchase orders...`, 'info');
    }

    // Show Add Supplier Modal
    showAddSupplierModal() {
        // This function should trigger the parties modal for adding a supplier
        if (window.showAddPartyModal) {
            showAddPartyModal();
        } else {
            this.showError('Parties module not available');
        }
    }

    // Modal Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('d-none');
        }
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

    addPurchasePreviewStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Purchase Order specific styles */
            .purchase-header {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .purchase-status-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .status-ordered {
                background: #96f4ac;
                color: #1c5129;
            }
            
            .status-pending {
                background: #ffc107;
                color: #856404;
            }
            
            .status-received {
                background: #17a2b8;
                color: white;
            }
            
            .status-cancelled {
                background: #f8d7da;
                color: #721c24;
            }
            
            .expected-delivery {
                color: #6c757d;
                font-size: 0.9rem;
            }
        `;
        document.head.appendChild(style);
    }

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
}

// Initialize Purchases Management
let purchasesManagement = null;

// Function to initialize purchases management when page loads
function initializePurchasesManagement() {
    console.log('📦 Initializing purchases management for business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ Cannot initialize purchases management: No business selected');
        return;
    }
    
    if (!purchasesManagement) {
        purchasesManagement = new PurchasesManagement();
        window.purchasesManagement = purchasesManagement;
    } else {
        // If already initialized, reload data for new business
        reloadPurchasesForCurrentBusiness();
    }
}

async function reloadPurchasesForCurrentBusiness() {
    console.log('🔄 Reloading purchases for current business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected');
        return;
    }
    
    if (purchasesManagement) {
        // Clear purchases data
        purchasesManagement.purchasesData = [];
        purchasesManagement.purchaseOrderItems = [];
        purchasesManagement.selectedPurchases.clear();
        purchasesManagement.currentPurchaseId = null;
        purchasesManagement.suppliers = [];
        purchasesManagement.products = [];
        
        // Reload data
        await purchasesManagement.loadPurchasesData();
        await purchasesManagement.loadSuppliers();
        await purchasesManagement.loadProducts();
        purchasesManagement.updateStats();
        
        console.log('✅ Purchases data reloaded for business:', currentBusiness.name);
    } else {
        console.warn('⚠️ purchasesManagement not initialized yet');
    }
}

// Add business change event listener
if (window.addEventListener) {
    window.addEventListener('businessChanged', async function() {
        console.log('🏢 Business changed event received in purchases.js');
        if (purchasesManagement) {
            await reloadPurchasesForCurrentBusiness();
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the purchases page
    const purchasesPage = document.getElementById('purchases-page');
    if (purchasesPage && !purchasesPage.classList.contains('d-none')) {
        initializePurchasesManagement();
    }
});

// Also initialize when navigating to purchases page
document.addEventListener('click', function(e) {
    const navLink = e.target.closest('.sidebar-menu a[data-page]');
    if (navLink && navLink.getAttribute('data-page') === 'purchases') {
        // Small delay to ensure page is visible
        setTimeout(() => {
            if (document.getElementById('purchases-page') && !document.getElementById('purchases-page').classList.contains('d-none')) {
                if (!purchasesManagement) {
                    initializePurchasesManagement();
                } else {
                    // Refresh data if already initialized
                    purchasesManagement.loadPurchasesData();
                    purchasesManagement.loadSuppliers();
                    purchasesManagement.loadProducts();
                }
            }
        }, 300);
    }
});

// Add this function to purchases.js
function togglePurchasesActionDropdown(purchaseId) {
    // Close all other dropdowns first
    document.querySelectorAll('.action-dropdown-menu.show').forEach(dropdown => {
        if (!dropdown.id.includes(`purchases-action-dropdown-${purchaseId}`)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Toggle current dropdown
    const dropdown = document.getElementById(`purchases-action-dropdown-${purchaseId}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Add this function:
function setupPurchasesActionDropdownListeners() {
    // Close dropdowns when clicking anywhere else
    document.addEventListener('click', function(event) {
        // Check if click is outside dropdown
        if (!event.target.closest('.action-dropdown') && 
            !event.target.closest('.action-dropdown-menu')) {
            document.querySelectorAll('.action-dropdown-menu.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
    
    // Stop row click when clicking on dropdown buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.action-dropdown-item') || 
            event.target.closest('.action-dots')) {
            event.stopPropagation();
        }
    });
}

// Export for global access
window.purchasesManagement = purchasesManagement;