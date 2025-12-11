// Sales-specific keyboard shortcuts
function setupSalesShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only trigger if we're on sales page and not in an input
        const onSalesPage = document.getElementById('sales-page') && 
                           !document.getElementById('sales-page').classList.contains('d-none');
        
        if (!onSalesPage || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Ctrl/Cmd + Shift + N - New sale invoice
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            if (salesManagement) {
                salesManagement.showCreateInvoice();
                showNotification('Info', 'Creating new sale invoice...', 'info', 1500);
            }
        }
        
        // Ctrl/Cmd + R - Refresh sales
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            if (salesManagement) {
                salesManagement.loadSalesData();
                showNotification('Info', 'Refreshing sales data...', 'info', 1500);
            }
        }
        
        // Ctrl/Cmd + P - Print selected invoice
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.sale-checkbox:checked');
            if (selectedCheckbox) {
                const saleId = selectedCheckbox.value;
                // Find and trigger print for this sale
                const printBtn = selectedCheckbox.closest('tr').querySelector('[onclick*="print"]');
                if (printBtn) {
                    printBtn.click();
                }
            }
        }
        
        // Ctrl/Cmd + E - Email selected invoice
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const selectedCheckbox = document.querySelector('.sale-checkbox:checked');
            if (selectedCheckbox) {
                const saleId = selectedCheckbox.value;
                // Find and trigger email for this sale
                const emailBtn = selectedCheckbox.closest('tr').querySelector('[onclick*="email"]');
                if (emailBtn) {
                    emailBtn.click();
                }
            }
        }
        
        // Space - Select/deselect hovered row
        if (e.key === ' ') {
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
        
        // A - Select all (when not in input)
        if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const selectAll = document.getElementById('select-all-sales');
            if (selectAll) {
                selectAll.checked = !selectAll.checked;
                selectAll.dispatchEvent(new Event('change'));
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
    }
    
    bindEvents() {
        // Navigation
        document.querySelector('.back-btn')?.addEventListener('click', () => this.showDashboard());
        document.querySelector('.back-to-sales-btn')?.addEventListener('click', () => this.showSalesList());
        
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
    }
    
    // Navigation Methods
    showDashboard() {
        this.showPage('sales-page');
        this.currentPage = 'dashboard';
    }
    
    showSalesList() {
        this.showPage('sales-page');
        this.currentPage = 'dashboard';
    }
    
    showCreateInvoice() {
        this.showPage('sales-invoice-page');
        this.currentPage = 'create-invoice';
        this.generateInvoiceNumber();
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
    }
}
    
    renderSalesTable() {
    const tableBody = document.getElementById('sales-table-body');
    
    if (this.salesData.length === 0) {
        tableBody.innerHTML = `
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
        return;
    }
    
    tableBody.innerHTML = this.salesData.map(sale => `
        <tr class="sale-row" data-sale-id="${sale.id}">
            <td>
                <input type="checkbox" class="sale-checkbox" value="${sale.id}" 
                       ${this.selectedSales.has(sale.id) ? 'checked' : ''}>
            </td>
            <td>${sale.invoiceNo}</td>
            <td>${sale.displayDate}</td>
            <td>
                <div>${sale.customer}</div>
            </td>
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
            <td>
                <button class="btn btn-outline btn-sm" onclick="salesManagement.editSale(${sale.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline btn-sm btn-danger" onclick="salesManagement.deleteSale(${sale.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
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
        salesCount.textContent = `Showing ${this.salesData.length} sales invoices`;
    }
    
    // Re-bind checkbox events
    document.querySelectorAll('.sale-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            this.toggleSaleSelection(e.target.value, e.target.checked);
        });
    });
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
    }
    
    addItemToInvoice() {
    const itemName = document.getElementById('item-select').value;
    const quantity = parseFloat(document.getElementById('item-quantity').value);
    const price = parseFloat(document.getElementById('item-price').value);
    
    if (!itemName || !quantity || quantity <= 0 || !price || price <= 0) {
        this.showError('Please fill all required fields with valid values');
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
    }
}
    
    renderInvoiceItems() {
        const tableBody = document.getElementById('invoice-items-body');
        
        if (this.invoiceItems.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
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
        
        tableBody.innerHTML = this.invoiceItems.map(item => `
            <tr data-item-id="${item.id}">
                <td>${item.name}</td>
                <td>${item.quantity} ${item.product?.unit || 'pcs'}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
                <td>
                    <button class="btn btn-outline btn-sm btn-danger" onclick="salesManagement.removeInvoiceItem(${item.id})" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    removeInvoiceItem(itemId) {
    const itemToRemove = this.invoiceItems.find(item => item.id === itemId);
    if (itemToRemove) {
        // Restore stock to product list
        const productIndex = this.products.findIndex(p => p.id === itemToRemove.product_id);
        if (productIndex !== -1) {
            this.products[productIndex].current_stock += itemToRemove.quantity;
            this.populateProductDatalist();
        }
    }
    
    this.invoiceItems = this.invoiceItems.filter(item => item.id !== itemId);
    this.renderInvoiceItems();
    this.updateGrandTotal();
}
    
    updateGrandTotal() {
        const grandTotal = this.invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
        const grandTotalElement = document.getElementById('grand-total-amount');
        if (grandTotalElement) {
            grandTotalElement.textContent = formatCurrency(grandTotal);
        }
    }
    
    clearInvoice() {
    if (this.invoiceItems.length === 0) return;
    
    if (confirm('Are you sure you want to clear all items from the invoice?')) {
        // Restore stock for all items
        this.invoiceItems.forEach(item => {
            const productIndex = this.products.findIndex(p => p.id === item.product_id);
            if (productIndex !== -1) {
                this.products[productIndex].current_stock += item.quantity;
            }
        });
        
        this.invoiceItems = [];
        this.renderInvoiceItems();
        this.updateGrandTotal();
        document.getElementById('invoice-notes').value = '';
        document.getElementById('customer-select').value = '';
        document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
        
        // Refresh product list
        this.populateProductDatalist();
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
                    <div class="section-title">From:</div>
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
                    <div class="section-title">To:</div>
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
            const invoiceNumber = document.getElementById('invoice-number').value;
            
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
            
            // Check for duplicate invoice number
            const { data: existingInvoice } = await supabase
                .from('sales')
                .select('id')
                .eq('business_id', currentBusiness.id)
                .eq('invoice_number', invoiceNumber)
                .maybeSingle();
            
            if (existingInvoice) {
                this.showError(`Invoice number ${invoiceNumber} already exists. Generating new number...`);
                this.generateInvoiceNumber();
                saleData.invoice_number = document.getElementById('invoice-number').value;
                console.log('Using new invoice number:', saleData.invoice_number);
            }
            
            // Insert sale
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
            
            // Create sale items - Based on your actual schema:
            // id, sale_id, product_id, quantity, unit_price, total_price, created_at
            const saleItems = this.invoiceItems.map(item => {
                const totalPrice = item.quantity * item.price;
                
                // Only include columns that exist in your table
                return {
                    sale_id: sale.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: totalPrice,
                    created_at: new Date().toISOString()
                    // NO updated_at column in your table
                };
            });
            
            console.log('Saving sale items:', saleItems);
            
            if (saleItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('sale_items')
                    .insert(saleItems);
                
                if (itemsError) {
                    console.error('Sale items insert error:', itemsError);
                    
                    // If error is about updated_at, try without it
                    if (itemsError.message && itemsError.message.includes('updated_at')) {
                        console.log('Retrying without updated_at column...');
                        
                        // Remove updated_at from all items
                        const saleItemsWithoutUpdatedAt = saleItems.map(item => {
                            // Create new object without updated_at
                            const { updated_at, ...rest } = item;
                            return rest;
                        });
                        
                        console.log('Sale items without updated_at:', saleItemsWithoutUpdatedAt);
                        
                        const { error: retryError } = await supabase
                            .from('sale_items')
                            .insert(saleItemsWithoutUpdatedAt);
                        
                        if (retryError) throw retryError;
                    } else {
                        throw itemsError;
                    }
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
            this.clearInvoice();
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
                this.showError(`Database column error: Column '${columnName}' does not exist in sale_items table. 
                Your table has: id, sale_id, product_id, quantity, unit_price, total_price, created_at`);
            } else if (error.code === '23503') {
                this.showError('Foreign key violation. Check if customer or products exist.');
            } else if (error.code === '23505') {
                this.showError('Duplicate invoice number. Please try again with a different invoice number.');
            } else if (error.code === '42703') {
                this.showError('Database column error. Please check your database schema.');
            } else {
                this.showError('Failed to save invoice: ' + (error.message || 'Unknown error'));
            }
            
        } finally {
            // Restore button state
            if (saveBtn) {
                saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save Invoice';
                saveBtn.disabled = false;
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
        
        .section-title {
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
        
        // Hide modal first
        this.hideSaleDetails();
        
        // Show edit interface
        this.showCreateInvoice();
        
        try {
            // Load sale data for editing
            const { data: sale, error } = await supabase
                .from('sales')
                .select('*')
                .eq('id', saleIdToEdit)
                .eq('business_id', currentBusiness.id)
                .single();
            
            if (error) throw error;
            
            if (sale) {
                // Fetch sale items
                const { data: saleItems } = await supabase
    .from('sale_items')
    .select(`
        *,
        products (*)
    `)
    .eq('sale_id', saleIdToEdit);
                
                // Populate form with sale data
                document.getElementById('invoice-number').value = sale.invoice_number;
                document.getElementById('customer-select').value = sale.customer_id;
                document.getElementById('invoice-date').value = sale.sale_date?.split('T')[0] || '';
                document.getElementById('invoice-notes').value = sale.notes || '';
                
                // Load items
                this.invoiceItems = (saleItems || []).map(item => ({
        id: Date.now(),
        product_id: item.product_id,
        name: item.products?.name || 'Unknown',
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: item.total_price || item.quantity * item.unit_price, // Use total_price
        product: item.products
    }));
                
                this.renderInvoiceItems();
                this.updateGrandTotal();
            }
            
        } catch (error) {
            console.error('Error loading sale for edit:', error);
            this.showError('Failed to load sale for editing');
        }
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
    
    showAddCustomerModal() {
        showNotification('Info', 'Open customer management to add new customer...', 'info');
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