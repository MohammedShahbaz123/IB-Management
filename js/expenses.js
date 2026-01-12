// Expense Management System
class ExpenseManagement {
    constructor() {
        this.expenses = [];
        this.categories = [];
        this.vendors = [];
        this.selectedExpenses = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 0;
        this.isLoading = false;
        this.currentFilters = {
            dateRange: 'month',
            category: 'all',
            status: 'all',
            search: ''
        };
         this.selectedFile = null;
    this.filePreviewUrl = null;
        this.editingExpense = null;
        this.makeMethodsGlobal();
        
        this.init();
    }

    async init() {
        console.log('💰 Initializing Expense Management for business:', currentBusiness?.name);
        this.bindEvents();
        await this.loadCategories();
        await this.loadExpenses();
        await this.loadVendors();
        this.updateStats();
        this.setupFilters();
        this.setupKeyboardShortcuts();
        this.setupFileDrop();
        setupExpensesActionDropdownListeners();
    }

    makeMethodsGlobal() {
        // Make commonly used methods available globally
        window.hideAddExpenseModal = () => this.hideAddExpenseModal();
        window.showAddExpenseModal = () => this.showAddExpenseModal();
        window.saveExpense = (e) => this.saveExpense(e);
    }

    bindEvents() {
        // Expense buttons
        document.getElementById('add-expense-btn')?.addEventListener('click', () => this.showAddExpenseModal());
        document.getElementById('export-expenses-btn')?.addEventListener('click', () => this.exportExpenses());
        document.getElementById('print-expenses-btn')?.addEventListener('click', () => this.printExpenses());
        document.getElementById('refresh-expense-btn')?.addEventListener('click', () => this.loadExpenses());

        // Filter events
        document.getElementById('expense-search')?.addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('expense-date-filter')?.addEventListener('change', (e) => this.handleDateFilterChange(e));
        document.getElementById('expense-category-filter')?.addEventListener('change', (e) => this.handleCategoryFilter(e));
        document.getElementById('expense-status-filter')?.addEventListener('change', (e) => this.handleStatusFilter(e));

        // Custom date range
        document.getElementById('start-date')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('end-date')?.addEventListener('change', () => this.applyFilters());

        // Expense form submission
        document.getElementById('add-expense-form')?.addEventListener('submit', (e) => this.saveExpense(e));

        // Real-time form preview
        document.getElementById('expense-description')?.addEventListener('input', () => this.updateExpensePreview());
        document.getElementById('expense-category')?.addEventListener('change', () => this.updateExpensePreview());
        document.getElementById('expense-amount')?.addEventListener('input', () => this.updateExpensePreview());
        document.getElementById('expense-date')?.addEventListener('change', () => this.updateExpensePreview());
    }

    handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        this.showError('File size must be less than 5MB');
        return;
    }
    
    // Validate file type
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        this.showError('File type not supported. Please upload PDF, JPG, PNG, DOC, or TXT files.');
        return;
    }
    
    // Store the file
    this.selectedFile = file;
    
    // Show file preview
    this.showFilePreview(file);
    
    // Auto-upload the file
    this.uploadFile(file);
}

// Show file preview
showFilePreview(file) {
    const filePreview = document.getElementById('file-preview');
    const uploadArea = document.getElementById('file-upload-area');
    const fileName = document.getElementById('selected-file-name');
    const fileSize = document.getElementById('selected-file-size');
    
    // Update file info
    fileName.textContent = file.name;
    fileSize.textContent = this.formatFileSize(file.size);
    
    // Update icon based on file type
    const fileIcon = document.querySelector('.file-icon');
    if (file.type === 'application/pdf') {
        fileIcon.className = 'fas fa-file-pdf file-icon text-danger';
    } else if (file.type.startsWith('image/')) {
        fileIcon.className = 'fas fa-file-image file-icon text-success';
    } else if (file.type.includes('word')) {
        fileIcon.className = 'fas fa-file-word file-icon text-primary';
    } else if (file.type.includes('excel')) {
        fileIcon.className = 'fas fa-file-excel file-icon text-success';
    } else {
        fileIcon.className = 'fas fa-file-alt file-icon text-muted';
    }
    
    // Show preview, hide upload area
    uploadArea.classList.add('d-none');
    filePreview.classList.remove('d-none');
}

// Format file size
formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload file to Supabase Storage
async uploadFile(file) {
    if (!currentBusiness?.id) {
        this.showError('No business selected');
        return;
    }
    
    // Show upload progress
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');
    progressBar.classList.remove('d-none');
    
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${randomString}.${fileExt}`;
        const filePath = `${currentBusiness.id}/expense_receipts/${fileName}`;
        
        // Show uploading state
        progressText.textContent = 'Uploading...';
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('expense-receipts')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        // Update progress
        document.getElementById('progress-bar').style.width = '100%';
        progressText.textContent = 'Processing...';
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('expense-receipts')
            .getPublicUrl(filePath);
        
        // Store the URL in hidden field
        document.getElementById('expense-attachment-url').value = publicUrl;
        
        // Update progress
        progressText.textContent = 'Upload complete!';
        
        // Hide progress after 2 seconds
        setTimeout(() => {
            progressBar.classList.add('d-none');
            document.getElementById('progress-bar').style.width = '0%';
        }, 2000);
        
        console.log('File uploaded successfully:', publicUrl);
        return publicUrl;
        
    } catch (error) {
        console.error('Error uploading file:', error);
        progressBar.classList.add('d-none');
        this.showError('Failed to upload file: ' + error.message);
        this.removeFile(); // Remove the file preview
        return null;
    }
}

// Preview file (opens in new tab)
previewFile() {
    if (!this.selectedFile && !this.filePreviewUrl) {
        this.showError('No file to preview');
        return;
    }
    
    // If we have a URL, open it
    const url = document.getElementById('expense-attachment-url').value;
    if (url) {
        window.open(url, '_blank');
        return;
    }
    
    // If we have a file but no URL (uploading or not uploaded yet)
    if (this.selectedFile) {
        // For images, create object URL
        if (this.selectedFile.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(this.selectedFile);
            window.open(objectUrl, '_blank');
            // Clean up URL after use
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        } else {
            this.showError('Please wait for file upload to complete before previewing.');
        }
    }
}

// Remove selected file
removeFile() {
    const fileInput = document.getElementById('expense-attachment-file');
    const filePreview = document.getElementById('file-preview');
    const uploadArea = document.getElementById('file-upload-area');
    const urlField = document.getElementById('expense-attachment-url');
    
    // Reset file input
    fileInput.value = '';
    
    // Reset UI
    uploadArea.classList.remove('d-none');
    filePreview.classList.add('d-none');
    
    // Clear stored file and URL
    this.selectedFile = null;
    this.filePreviewUrl = null;
    urlField.value = '';
    
    // Hide progress if visible
    document.getElementById('upload-progress').classList.add('d-none');
}

// Set up drag and drop
setupFileDrop() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('expense-attachment-file');
    
    if (!uploadArea) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        uploadArea.classList.add('dragover');
    }
    
    function unhighlight() {
        uploadArea.classList.remove('dragover');
    }
    
    // Handle dropped files
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // Simulate file input change
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            fileInput.files = dataTransfer.files;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }, false);
}

    setupFilters() {
        const dateFilter = document.getElementById('expense-date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    document.getElementById('custom-date-range').style.display = 'block';
                } else {
                    document.getElementById('custom-date-range').style.display = 'none';
                    this.applyFilters();
                }
            });
        }

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('expense-date');
        if (dateInput) dateInput.value = today;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const onExpensePage = document.getElementById('expenses-page') && 
                                 !document.getElementById('expenses-page').classList.contains('d-none');
            
            if (!onExpensePage || 
                (e.target.tagName === 'INPUT' && !e.altKey) || 
                e.target.tagName === 'TEXTAREA' ||
                e.target.tagName === 'SELECT') {
                return;
            }

            // Alt + E - Add Expense
            if (e.altKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                this.showAddExpenseModal();
            }

            // Alt + R - Refresh
            if (e.altKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                this.loadExpenses();
            }

            // Alt + F - Focus Search
            if (e.altKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('expense-search')?.focus();
            }
        });
    }

    resetExpenseForm() {
    const form = document.getElementById('add-expense-form');
    if (form) {
        form.reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-status').value = 'pending';
    }
    
    // Reset file upload
    this.removeFile();
    
    this.updateExpensePreview();
}

hideAddExpenseModal() {
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.add('d-none');
    }
    this.resetExpenseForm();
    this.editingExpense = null;
}

    async loadCategories() {
    if (!currentBusiness?.id) return;

    try {
        // Load only categories that exist in expenses table for the filter
        const { data: existingExpenses, error } = await supabase
            .from('expenses')
            .select('category')
            .eq('business_id', currentBusiness.id)
            .not('category', 'is', null);

        if (error) {
            console.error('Error loading expense categories:', error);
            return;
        }

        // Extract unique categories from expenses table
        const uniqueCategories = [...new Set(existingExpenses.map(e => e.category).filter(Boolean))];
        uniqueCategories.sort();

        this.categories = uniqueCategories;

        // Populate category filter with only existing categories
        const categoryFilter = document.getElementById('expense-category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
                this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }

        // 🔥 NEW: Load default categories for the add expense modal
        // This will be populated when showing the modal
        this.loadDefaultCategoriesForModal();

    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

loadDefaultCategoriesForModal() {
    const defaultCategories = [
        'Office Supplies',
        'Utilities',
        'Rent',
        'Salaries',
        'Marketing',
        'Travel',
        'Equipment',
        'Software',
        'Maintenance',
        'Other'
    ];
    
    // Combine default categories with existing categories from expenses
    const allCategories = [...new Set([...defaultCategories, ...this.categories])];
    allCategories.sort();
    
    this.allCategoriesForModal = allCategories; // Store for modal use
}

    async loadVendors() {
        if (!currentBusiness?.id) return;

        try {
            // Get vendors from expenses table
            const { data: expenses, error } = await supabase
                .from('expenses')
                .select('vendor')
                .eq('business_id', currentBusiness.id)
                .not('vendor', 'is', null);

            if (error) {
                console.error('Error loading vendors:', error);
                return;
            }

            // Extract unique vendors
            this.vendors = [...new Set(expenses.map(e => e.vendor).filter(Boolean))].sort();

        } catch (error) {
            console.error('Error loading vendors:', error);
        }
    }

    async loadExpenses() {
        if (!currentBusiness?.id) {
            showNotification('Error', 'No business selected', 'error');
            return;
        }

        if (this.isLoading) return;
        this.isLoading = true;

        try {
            // Show loading state
            const tableBody = document.getElementById('expenses-table-body');
            tableBody.innerHTML = `
                <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                                <p>Loading expenses...</p>
                            </div>
                        </td>
                    </tr>
            `;

            console.log('Loading expenses for business:', currentBusiness.id);

            // Build query
            let query = supabase
                .from('expenses')
                .select('*')
                .eq('business_id', currentBusiness.id);

            // Apply date filter
            const { startDate, endDate } = this.getDateRange();
            if (startDate && endDate) {
                query = query.gte('expense_date', startDate)
                            .lte('expense_date', endDate);
            }

            // Apply category filter
            if (this.currentFilters.category && this.currentFilters.category !== 'all') {
                query = query.eq('category', this.currentFilters.category);
            }

            // Apply status filter
            if (this.currentFilters.status && this.currentFilters.status !== 'all') {
                query = query.eq('status', this.currentFilters.status);
            }

            // Apply search filter
            if (this.currentFilters.search) {
                query = query.or(`description.ilike.%${this.currentFilters.search}%,vendor.ilike.%${this.currentFilters.search}%`);
            }

            // Order by date (newest first)
            query = query.order('expense_date', { ascending: false });

            const { data: expenses, error, count } = await query;

            if (error) {
                console.error('Error loading expenses:', error);
                throw error;
            }

            console.log('Expenses loaded:', expenses?.length || 0, 'records');
            this.expenses = expenses || [];
            this.totalPages = Math.ceil(this.expenses.length / this.itemsPerPage);

            this.renderExpensesTable();
            this.updateStats();
            this.updateCategoryBreakdown();
            this.updatePagination();

        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showError('Failed to load expenses: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    getDateRange() {
        const today = new Date();
        let startDate, endDate;

        switch (this.currentFilters.dateRange) {
            case 'today':
                startDate = today.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = yesterday.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                startDate = weekStart.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                break;
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
                endDate = new Date(today.getFullYear(), (quarter * 3) + 3, 0).toISOString().split('T')[0];
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
                endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
                break;
            case 'custom':
                startDate = document.getElementById('start-date')?.value;
                endDate = document.getElementById('end-date')?.value;
                break;
            default:
                startDate = null;
                endDate = null;
        }

        return { startDate, endDate };
    }

    renderExpensesTable() {
        const tableBody = document.getElementById('expenses-table-body');
        
        if (this.expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="empty-state">
                            <i class="fas fa-money-bill-wave fa-3x mb-3 text-muted"></i>
                            <h4>No Expenses Found</h4>
                            <p class="text-muted mb-4">${this.currentFilters.search ? 'No expenses match your search' : 'You haven\'t added any expenses yet'}</p>
                            <button class="btn btn-primary" onclick="expenseManagement.showAddExpenseModal()">
                                <i class="fas fa-plus"></i> Add Your First Expense
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            this.updateFilteredSummary(0, 0, 0);
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.expenses.length);
        const currentExpenses = this.expenses.slice(startIndex, endIndex);

        tableBody.innerHTML = currentExpenses.map(expense => {
            const formattedDate = this.formatDate(expense.expense_date);
            const formattedAmount = formatCurrency(expense.amount);
            
            return `
                <tr class="expense-row" data-expense-id="${expense.id}">
                    <td>
                        <div class="expense-description">${expense.description}</div>
                        ${expense.notes ? `<small class="text-muted">${expense.notes.substring(0, 50)}${expense.notes.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="category-badge">${expense.category || 'Uncategorized'}</span>
                    </td>
                    <td>${expense.vendor || '-'}</td>
                    <td class="text-end">${formattedAmount}</td>
                    <td>
                        <span class="status-badge status-${expense.status}">
                            ${this.getStatusText(expense.status)}
                        </span>
                    </td>
                    <td>
                        ${expense.payment_method ? `<span class="payment-method">${this.getPaymentMethodText(expense.payment_method)}</span>` : '-'}
                    </td>
                    <td>
                        <div class="action-dropdown">
                        <button class="action-dots" onclick="event.stopPropagation(); toggleExpensesActionDropdown('${expense.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="action-dropdown-menu" id="expenses-action-dropdown-${expense.id}">
                            <button class="action-dropdown-item" onclick="event.stopPropagation(); expenseManagement.editExpense('${expense.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-dropdown-item text-danger" onclick="event.stopPropagation(); expenseManagement.deleteExpense('${expense.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <button class="action-dropdown-item" onclick="event.stopPropagation(); expenseManagement.viewExpenseDetails('${expense.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${expense.receipt_url ? `
                            <a href="${expense.receipt_url}" target="_blank" class="action-dropdown-item" onclick="event.stopPropagation();">
                                <i class="fas fa-receipt"></i> Receipt
                            </a>
                            ` : ''}
                        </div>
                    </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to rows
        document.querySelectorAll('.edit-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expenseId = btn.dataset.expenseId;
                this.editExpense(expenseId);
            });
        });

        document.querySelectorAll('.delete-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expenseId = btn.dataset.expenseId;
                this.deleteExpense(expenseId);
            });
        });

        // Make rows clickable for quick view
        document.querySelectorAll('.expense-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('a')) {
                    const expenseId = row.dataset.expenseId;
                    this.viewExpenseDetails(expenseId);
                }
            });
        });

        // Update filtered summary
        const totalAmount = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const averageAmount = this.expenses.length > 0 ? totalAmount / this.expenses.length : 0;
        this.updateFilteredSummary(this.expenses.length, totalAmount, averageAmount);
    }

    updateFilteredSummary(count, total, average) {
        document.getElementById('filtered-count').textContent = count;
        document.getElementById('filtered-total').textContent = formatCurrency(total);
        document.getElementById('filtered-average').textContent = formatCurrency(average);
    }

    updateStats() {
        if (this.expenses.length === 0) {
            this.resetStats();
            return;
        }

        // Total expenses
        const totalAmount = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('total-expenses-amount').textContent = formatCurrency(totalAmount);
        document.getElementById('expenses-count').textContent = this.expenses.length;

        // Monthly expenses
        const thisMonth = new Date().getMonth();
        const monthlyExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.expense_date);
            return expDate.getMonth() === thisMonth;
        });
        const monthlyAmount = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('monthly-expenses-amount').textContent = formatCurrency(monthlyAmount);

        // Average expense
        const averageAmount = totalAmount / this.expenses.length;
        document.getElementById('average-expense-amount').textContent = formatCurrency(averageAmount);
    }

    resetStats() {
        document.getElementById('total-expenses-amount').textContent = formatCurrency(0);
        document.getElementById('monthly-expenses-amount').textContent = formatCurrency(0);
        document.getElementById('average-expense-amount').textContent = formatCurrency(0);
        document.getElementById('expenses-count').textContent = '0';
    }

    async updateCategoryBreakdown() {
        const breakdownContainer = document.getElementById('expense-category-breakdown');
        if (!breakdownContainer) return;

        if (this.expenses.length === 0) {
            breakdownContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No expense data available</p>
                </div>
            `;
            return;
        }

        // Group by category
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            const category = expense.category || 'Uncategorized';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += expense.amount;
        });

        // Sort by amount descending
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a);

        const totalAmount = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);

        breakdownContainer.innerHTML = sortedCategories.map(([category, amount]) => {
            const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0;
            
            return `
                <div class="category-item">
                    <div class="category-header">
                        <span class="category-name">${category}</span>
                        <span class="category-amount">${formatCurrency(amount)}</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${percentage}%; background-color: ${this.getCategoryColor(category)};">
                        </div>
                    </div>
                    <div class="category-footer">
                        <small class="text-muted">${percentage}% of total</small>
                        <small class="text-muted">${this.expenses.filter(e => (e.category || 'Uncategorized') === category).length} expenses</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCategoryColor(category) {
        // Generate consistent color based on category name
        const colors = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#858796', '#6f42c1', '#fd7e14', '#20c9a6', '#e83e8c'
        ];
        
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
            hash = category.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }

    async showAddExpenseModal() {
    this.editingExpense = null;
    this.resetExpenseForm();
    
    const modal = document.getElementById('add-expense-modal');
    modal.classList.remove('d-none');
    document.getElementById('expense-modal-title').textContent = 'Add New Expense';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = today;
    document.getElementById('expense-date').max = today;
    
    // 🔥 NEW: Populate category dropdown with all available categories + Create New option
    await this.populateExpenseCategoryDropdown();
    
    // Focus on description field
    setTimeout(() => {
        document.getElementById('expense-description').focus();
    }, 100);
}

populateExpenseCategoryDropdown() {
    const expenseCategory = document.getElementById('expense-category');
    if (!expenseCategory) return;
    
    // Ensure we have categories for modal
    if (!this.allCategoriesForModal || this.allCategoriesForModal.length === 0) {
        this.loadDefaultCategoriesForModal();
    }
    
    // Clear existing options
    expenseCategory.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Category';
    expenseCategory.appendChild(defaultOption);
    
    // Add existing categories
    this.allCategoriesForModal.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        expenseCategory.appendChild(option);
    });
    
    // 🔥 NEW: Add "Create New Category" option
    const createOption = document.createElement('option');
    createOption.value = 'create_new';
    createOption.textContent = '+ Create New Category';
    createOption.style.color = '#0d6efd';
    createOption.style.fontWeight = '600';
    expenseCategory.appendChild(createOption);
    
    // Add event listener for when user selects "Create New Category"
    expenseCategory.removeEventListener('change', this.handleCategoryChange);
    this.handleCategoryChange = (e) => {
        if (e.target.value === 'create_new') {
            this.showCreateCategoryModal();
        }
    };
    expenseCategory.addEventListener('change', this.handleCategoryChange);
}   

showCreateCategoryModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal" id="create-category-modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Create New Category</h3>
                    <button class="close-btn" onclick="expenseManagement.hideCreateCategoryModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-category-name">Category Name</label>
                        <input type="text" 
                               id="new-category-name" 
                               class="form-control" 
                               placeholder="Enter category name"
                               autocomplete="off">
                        <small class="text-muted">E.g., Office Supplies, Marketing, Travel, etc.</small>
                    </div>
                    
                    <div class="mt-4">
                        <h6>Common Categories</h6>
                        <div class="common-categories mt-2">
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Office Supplies')">
                                Office Supplies
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Marketing')">
                                Marketing
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Travel')">
                                Travel
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Rent')">
                                Rent
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Salaries')">
                                Salaries
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Utilities')">
                                Utilities
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Software')">
                                Software
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm me-2 mb-2" onclick="expenseManagement.selectCommonCategory('Equipment')">
                                Equipment
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="expenseManagement.hideCreateCategoryModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="expenseManagement.saveNewCategory()">Create Category</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('create-category-modal');
    if (existingModal) existingModal.remove();
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    setTimeout(() => {
        const modal = document.getElementById('create-category-modal');
        if (modal) modal.classList.remove('d-none');
        
        // Focus on input
        const input = document.getElementById('new-category-name');
        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveNewCategory();
                }
            });
        }
    }, 10);
}

hideCreateCategoryModal() {
    const modal = document.getElementById('create-category-modal');
    if (modal) {
        modal.classList.add('d-none');
        setTimeout(() => modal.remove(), 300);
    }
}

selectCommonCategory(categoryName) {
    const input = document.getElementById('new-category-name');
    if (input) {
        input.value = categoryName;
        input.focus();
    }
}

saveNewCategory() {
    const input = document.getElementById('new-category-name');
    if (!input || !input.value.trim()) {
        showNotification('Error', 'Please enter a category name', 'error');
        input?.focus();
        return;
    }
    
    const newCategory = input.value.trim();
    
    // Check if category already exists
    if (this.allCategoriesForModal.includes(newCategory)) {
        showNotification('Info', 'Category already exists', 'info');
        this.useNewCategory(newCategory);
        return;
    }
    
    // Add to categories array
    this.allCategoriesForModal.push(newCategory);
    this.allCategoriesForModal.sort();
    
    // Update the expense category dropdown
    this.populateExpenseCategoryDropdown();
    
    // Select the new category
    this.useNewCategory(newCategory);
    
    // Hide create category modal
    this.hideCreateCategoryModal();
    
    showNotification('Success', 'Category created successfully', 'success');
}

useNewCategory(categoryName) {
    const expenseCategory = document.getElementById('expense-category');
    if (expenseCategory) {
        expenseCategory.value = categoryName;
        this.updateExpensePreview();
    }
}

    resetExpenseForm() {
        const form = document.getElementById('add-expense-form');
        if (form) {
            form.reset();
            document.getElementById('expense-id').value = '';
            document.getElementById('expense-status').value = 'pending';
        }
        this.updateExpensePreview();
    }

    updateExpensePreview() {
        const description = document.getElementById('expense-description').value || '-';
        const category = document.getElementById('expense-category').value || '-';
        const amount = document.getElementById('expense-amount').value || '0.00';
        const date = document.getElementById('expense-date').value || '-';

        document.getElementById('preview-description').textContent = description;
        document.getElementById('preview-category').textContent = category;
        document.getElementById('preview-amount').textContent = formatCurrency(parseFloat(amount) || 0);
        document.getElementById('preview-date').textContent = date ? this.formatDate(date) : '-';
    }

    async saveExpense(e) {
    e.preventDefault();
    
    if (!currentBusiness?.id) {
        this.showError('No business selected');
        return;
    }

    // Validate form
    if (!this.validateExpenseForm()) {
        return;
    }

    const isEditMode = !!this.editingExpense;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // Check if we have a file to upload
        let receiptUrl = document.getElementById('expense-attachment-url').value;
        
        // If we have a selected file but no URL (new file), upload it
        if (this.selectedFile && !receiptUrl) {
            showNotification('Info', 'Uploading receipt...', 'info');
            receiptUrl = await this.uploadFile(this.selectedFile);
            if (!receiptUrl && !isEditMode) {
                throw new Error('Failed to upload receipt');
            }
        }

        const expenseData = {
            business_id: currentBusiness.id,
            description: document.getElementById('expense-description').value.trim(),
            category: document.getElementById('expense-category').value || null,
            amount: parseFloat(document.getElementById('expense-amount').value),
            expense_date: document.getElementById('expense-date').value,
            vendor: document.getElementById('expense-vendor').value.trim() || null,
            payment_method: document.getElementById('expense-payment-method').value || null,
            status: document.getElementById('expense-status').value,
            notes: document.getElementById('expense-notes').value.trim() || null,
            receipt_url: receiptUrl || null,
            updated_at: new Date().toISOString()
        };

        let result;
        if (isEditMode) {
            // Update existing expense
            const { data, error } = await supabase
                .from('expenses')
                .update(expenseData)
                .eq('id', this.editingExpense.id)
                .eq('business_id', currentBusiness.id)
                .select();

            if (error) throw error;
            result = data?.[0];
        } else {
            // Create new expense
            expenseData.created_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('expenses')
                .insert([expenseData])
                .select();

            if (error) throw error;
            result = data?.[0];
        }

        if (result) {
            // Update categories if new
            if (expenseData.category && !this.categories.includes(expenseData.category)) {
                this.categories.push(expenseData.category);
                this.categories.sort();
                this.updateCategoryDropdowns();
            }

            // Update vendors if new
            if (expenseData.vendor && !this.vendors.includes(expenseData.vendor)) {
                this.vendors.push(expenseData.vendor);
                this.vendors.sort();
            }

            showNotification('Success', `Expense ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
            
            // Close modal and refresh data
            this.hideAddExpenseModal();
            await this.loadExpenses();
        }

    } catch (error) {
        console.error('Error saving expense:', error);
        this.showError(`Failed to ${isEditMode ? 'update' : 'save'} expense: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

    validateExpenseForm() {
        const description = document.getElementById('expense-description').value.trim();
        const amount = document.getElementById('expense-amount').value;
        const date = document.getElementById('expense-date').value;

        if (!description) {
            this.showError('Please enter a description');
            document.getElementById('expense-description').focus();
            return false;
        }

        if (!amount || parseFloat(amount) <= 0) {
            this.showError('Please enter a valid amount');
            document.getElementById('expense-amount').focus();
            return false;
        }

        if (!date) {
            this.showError('Please select a date');
            document.getElementById('expense-date').focus();
            return false;
        }

        // Check if date is in the future
        const today = new Date().toISOString().split('T')[0];
        if (date > today) {
            this.showError('Expense date cannot be in the future');
            document.getElementById('expense-date').focus();
            return false;
        }

        return true;
    }

    async editExpense(expenseId) {
    if (!currentBusiness?.id) {
        this.showError('No business selected');
        return;
    }

    // Check if expenseId is valid
    if (!expenseId || typeof expenseId !== 'string') {
        this.showError('Invalid expense ID');
        return;
    }

    try {
        console.log('Loading expense for editing:', expenseId, 'business:', currentBusiness.id);
        
        const { data: expense, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', expenseId)
            .eq('business_id', currentBusiness.id)
            .single();

        if (error) {
            console.error('Supabase error loading expense:', error);
            
            if (error.code === 'PGRST116') {
                // No rows returned - expense doesn't exist or doesn't belong to this business
                this.showError('Expense not found. It may have been deleted or belongs to a different business.');
                return;
            }
            
            throw error;
        }

        if (!expense) {
            this.showError('Expense not found');
            return;
        }

        console.log('Expense loaded for editing:', expense);
        this.editingExpense = expense;
        await this.populateExpenseForm(expense);
        
        const modal = document.getElementById('add-expense-modal');
        modal.classList.remove('d-none');
        document.getElementById('expense-modal-title').textContent = 'Edit Expense';
        
        // 🔥 FIX: Ensure categories are loaded before setting the value
        await this.populateExpenseCategoryDropdown();
        
        // Now set the category value
        document.getElementById('expense-category').value = expense.category || '';
        
        setTimeout(() => {
            document.getElementById('expense-description').focus();
            this.updateExpensePreview();
        }, 100);

    } catch (error) {
        console.error('Error loading expense for edit:', error);
        
        // Check if it's a network error
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            this.showError('Network error. Please check your connection and try again.');
        } else {
            this.showError('Failed to load expense for editing: ' + error.message);
        }
    }
}

    async populateExpenseForm(expense) {
    try {
        // Wait for category dropdown to be populated
        await this.populateExpenseCategoryDropdown();
        
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-description').value = expense.description || '';
        document.getElementById('expense-category').value = expense.category || '';
        document.getElementById('expense-amount').value = expense.amount || '';
        document.getElementById('expense-date').value = expense.expense_date?.split('T')[0] || '';
        document.getElementById('expense-vendor').value = expense.vendor || '';
        document.getElementById('expense-payment-method').value = expense.payment_method || '';
        document.getElementById('expense-status').value = expense.status || 'pending';
        document.getElementById('expense-notes').value = expense.notes || '';
        
        // Handle receipt URL
        const receiptUrl = expense.receipt_url;
        if (receiptUrl) {
            document.getElementById('expense-attachment-url').value = receiptUrl;
            
            // Show file preview if there's a receipt
            this.showExistingFilePreview(receiptUrl);
        } else {
            this.removeFile();
        }

        this.updateExpensePreview();
        
    } catch (error) {
        console.error('Error populating expense form:', error);
        this.showError('Failed to load expense details');
    }
}

showExistingFilePreview(fileUrl) {
    const filePreview = document.getElementById('file-preview');
    const uploadArea = document.getElementById('file-upload-area');
    const fileName = document.getElementById('selected-file-name');
    const fileSize = document.getElementById('selected-file-size');
    
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];
    
    // Update file info
    fileName.textContent = filename || 'Uploaded Receipt';
    fileSize.textContent = 'Uploaded';
    
    // Determine file type from URL extension
    const extension = filename.split('.').pop().toLowerCase();
    const fileIcon = document.querySelector('.file-icon');
    
    if (extension === 'pdf') {
        fileIcon.className = 'fas fa-file-pdf file-icon text-danger';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        fileIcon.className = 'fas fa-file-image file-icon text-success';
    } else if (['doc', 'docx'].includes(extension)) {
        fileIcon.className = 'fas fa-file-word file-icon text-primary';
    } else if (['xls', 'xlsx'].includes(extension)) {
        fileIcon.className = 'fas fa-file-excel file-icon text-success';
    } else {
        fileIcon.className = 'fas fa-file-alt file-icon text-muted';
    }
    
    // Show preview, hide upload area
    uploadArea.classList.add('d-none');
    filePreview.classList.remove('d-none');
}

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId)
                .eq('business_id', currentBusiness.id);

            if (error) throw error;

            // Remove from local array
            this.expenses = this.expenses.filter(exp => exp.id !== expenseId);
            
            this.renderExpensesTable();
            this.updateStats();
            this.updateCategoryBreakdown();
            
            showNotification('Success', 'Expense deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showError('Failed to delete expense');
        }
    }

    async viewExpenseDetails(expenseId) {
        try {
            const { data: expense, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('id', expenseId)
                .eq('business_id', currentBusiness.id)
                .single();

            if (error) throw error;

            if (expense) {
                this.showExpenseDetailsModal(expense);
            }

        } catch (error) {
            console.error('Error loading expense details:', error);
            this.showError('Failed to load expense details');
        }
    }

    showExpenseDetailsModal(expense) {
        // Create modal HTML for expense details
        const modalHTML = `
            <div class="modal" id="expense-details-modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Expense Details</h3>
                        <button class="close-btn" onclick="expenseManagement.hideExpenseDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="expense-details">
                            <div class="detail-section">
                                <h4>Basic Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Description:</span>
                                        <span class="detail-value">${expense.description}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Category:</span>
                                        <span class="detail-value">${expense.category || 'Uncategorized'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Amount:</span>
                                        <span class="detail-value">${formatCurrency(expense.amount)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Date:</span>
                                        <span class="detail-value">${this.formatDate(expense.expense_date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="detail-section">
                                <h4>Vendor & Payment</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Vendor:</span>
                                        <span class="detail-value">${expense.vendor || '-'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Payment Method:</span>
                                        <span class="detail-value">${this.getPaymentMethodText(expense.payment_method) || '-'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Status:</span>
                                        <span class="detail-value">
                                            <span class="status-badge status-${expense.status}">
                                                ${this.getStatusText(expense.status)}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            ${expense.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="notes-content">${expense.notes}</div>
                            </div>
                            ` : ''}

                            ${expense.receipt_url ? `
                            <div class="detail-section">
                                <h4>Attachment</h4>
                                <a href="${expense.receipt_url}" target="_blank" class="btn btn-outline">
                                    <i class="fas fa-external-link-alt me-2"></i>View Receipt
                                </a>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="expenseManagement.hideExpenseDetailsModal()">Close</button>
                        <button class="btn btn-primary" onclick="expenseManagement.editExpense('${expense.id}')">
                            <i class="fas fa-edit me-2"></i>Edit Expense
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('expense-details-modal');
        if (existingModal) existingModal.remove();

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        setTimeout(() => {
            const modal = document.getElementById('expense-details-modal');
            if (modal) modal.classList.remove('d-none');
        }, 10);
    }

    hideExpenseDetailsModal() {
        const modal = document.getElementById('expense-details-modal');
        if (modal) {
            modal.classList.add('d-none');
            setTimeout(() => modal.remove(), 300);
        }
    }

    hideAddExpenseModal() {
        const modal = document.getElementById('add-expense-modal');
        if (modal) {
            modal.classList.add('d-none');
        }
        this.resetExpenseForm();
        this.editingExpense = null;
    }

    // Filter handling methods
    handleSearch(e) {
        this.currentFilters.search = e.target.value.toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
    }

    handleDateFilterChange(e) {
        this.currentFilters.dateRange = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleCategoryFilter(e) {
        this.currentFilters.category = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleStatusFilter(e) {
        this.currentFilters.status = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
    }

    async applyFilters() {
        await this.loadExpenses();
    }

    // Export functionality
    async exportExpenses() {
        if (this.expenses.length === 0) {
            this.showError('No expenses to export');
            return;
        }

        try {
            showNotification('Info', 'Preparing export...', 'info');

            const { startDate, endDate } = this.getDateRange();
            const filename = `expenses_${startDate || 'all'}_to_${endDate || 'all'}.csv`;

            // Prepare CSV headers
            const headers = [
                'Date',
                'Description',
                'Category',
                'Vendor',
                'Amount',
                'Payment Method',
                'Status',
                'Notes'
            ];

            // Prepare data rows
            const rows = this.expenses.map(expense => [
                this.formatDate(expense.expense_date),
                expense.description,
                expense.category || '',
                expense.vendor || '',
                expense.amount,
                this.getPaymentMethodText(expense.payment_method) || '',
                this.getStatusText(expense.status),
                expense.notes || ''
            ]);

            // Add summary row
            const totalAmount = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            rows.push(['', '', '', '', 'TOTAL:', '', '', formatCurrency(totalAmount)]);

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

            showNotification('Success', 'Expenses exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting expenses:', error);
            this.showError('Failed to export expenses');
        }
    }

    printExpenses() {
        if (this.expenses.length === 0) {
            this.showError('No expenses to print');
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
        const { startDate, endDate } = this.getDateRange();
        const businessName = currentBusiness?.name || 'Your Business';
        const reportDate = new Date().toLocaleDateString();
        const start = startDate ? this.formatDate(startDate) : 'Beginning';
        const end = endDate ? this.formatDate(endDate) : 'Now';
        const totalAmount = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Expenses Report - ${businessName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                    .amount { text-align: right; }
                    @media print {
                        body { margin: 0; padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${businessName}</h1>
                    <h2>Expenses Report</h2>
                    <p>Period: ${start} to ${end}</p>
                    <p>Generated on: ${reportDate}</p>
                </div>
                
                <div class="summary">
                    <strong>Summary:</strong><br>
                    Total Expenses: ${this.expenses.length}<br>
                    Total Amount: ${formatCurrency(totalAmount)}<br>
                    Average Expense: ${formatCurrency(totalAmount / this.expenses.length)}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Vendor</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.expenses.map(expense => `
                            <tr>
                                <td>${this.formatDate(expense.expense_date)}</td>
                                <td>${expense.description}</td>
                                <td>${expense.category || 'Uncategorized'}</td>
                                <td>${expense.vendor || '-'}</td>
                                <td class="amount">${formatCurrency(expense.amount)}</td>
                                <td>${this.getStatusText(expense.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align: right;"><strong>Total:</strong></td>
                            <td class="amount"><strong>${formatCurrency(totalAmount)}</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer">
                    <p>Report generated by IB Manager Expense System</p>
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

    // Utility methods
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

    getStatusText(status) {
        const statusMap = {
            'paid': 'Paid',
            'pending': 'Pending',
            'overdue': 'Overdue',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    getPaymentMethodText(method) {
        const methodMap = {
            'cash': 'Cash',
            'credit_card': 'Credit Card',
            'debit_card': 'Debit Card',
            'bank_transfer': 'Bank Transfer',
            'check': 'Check',
            'online': 'Online Payment'
        };
        return methodMap[method] || method;
    }

    updateCategoryDropdowns() {
        // Update filter dropdown
        const categoryFilter = document.getElementById('expense-category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
                this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }
    }

    updatePagination() {
        const paginationContainer = document.getElementById('expenses-pagination');
        if (!paginationContainer) return;

        if (this.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <nav aria-label="Expenses pagination">
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" onclick="expenseManagement.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </li>
        `;

        // Show page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                        <button class="page-link" onclick="expenseManagement.goToPage(${i})">
                            ${i}
                        </button>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        paginationHTML += `
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <button class="page-link" onclick="expenseManagement.goToPage(${this.currentPage + 1})" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderExpensesTable();
        this.updatePagination();
    }

    showError(message) {
        showNotification('Error', message, 'error');
    }
    cleanup() {
    console.log('🧹 Cleaning up expense management instance...');
    
    // Remove event listeners
    const eventsToRemove = [
        { selector: '#add-expense-btn', event: 'click' },
        { selector: '#export-expenses-btn', event: 'click' },
        { selector: '#print-expenses-btn', event: 'click' },
        { selector: '#refresh-expense-btn', event: 'click' },
        { selector: '#expense-search', event: 'input' },
        { selector: '#expense-date-filter', event: 'change' },
        { selector: '#expense-category-filter', event: 'change' },
        { selector: '#expense-status-filter', event: 'change' },
        { selector: '#start-date', event: 'change' },
        { selector: '#end-date', event: 'change' },
        { selector: '#add-expense-form', event: 'submit' },
        { selector: '#expense-description', event: 'input' },
        { selector: '#expense-category', event: 'change' },
        { selector: '#expense-amount', event: 'input' },
        { selector: '#expense-date', event: 'change' }
    ];
    
    eventsToRemove.forEach(({ selector, event }) => {
        const element = document.querySelector(selector);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    });
    
    // Clear all data
    this.expenses = [];
    this.categories = [];
    this.vendors = [];
    this.selectedExpenses.clear();
    this.currentPage = 1;
    this.totalPages = 0;
    this.editingExpense = null;
    this.currentFilters = {
        dateRange: 'month',
        category: 'all',
        status: 'all',
        search: ''
    };
    
    // Clear table content
    const tableBody = document.getElementById('expenses-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    // Clear category breakdown
    const breakdownContainer = document.getElementById('expense-category-breakdown');
    if (breakdownContainer) {
        breakdownContainer.innerHTML = '';
    }
    
    // Reset stats
    this.resetStats();
    
    // Clear pagination
    const paginationContainer = document.getElementById('expenses-pagination');
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
    
    console.log('✅ Expense management cleanup completed');
}
}



// Initialize Expense Management
let expenseManagement = null;
let expensesPageActive = false;
let initializationInProgress = false;

// expenses.js - Updated initialization function
function initializeExpenseManagement(forceRefresh = false) {
    if (initializationInProgress) {
        console.log('⚠️ Expense initialization already in progress');
        return;
    }
    
    initializationInProgress = true;
    
    console.log('💰 Initializing expense management for business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ Cannot initialize expense management: No business selected');
        initializationInProgress = false;
        return;
    }
    
    // Check if expenses page is actually visible
    const expensesPage = document.getElementById('expenses-page');
    if (!expensesPage || expensesPage.classList.contains('d-none')) {
        console.log('⚠️ Expenses page not visible, skipping initialization');
        initializationInProgress = false;
        return;
    }
    
    try {
        // Clean up previous instance if exists
        if (expenseManagement) {
            console.log('🧹 Cleaning up previous expense management instance...');
            expenseManagement.cleanup();
            expenseManagement = null;
        }
        
        // Create new instance
        console.log('🆕 Creating new ExpenseManagement instance...');
        expenseManagement = new ExpenseManagement();
        window.expenseManagement = expenseManagement;
        
        // Mark as initialized
        expensesPageActive = true;
        
        console.log('✅ Expense management initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing expense management:', error);
    } finally {
        initializationInProgress = false;
    }
}

async function reloadExpensesForCurrentBusiness() {
    console.log('🔄 Reloading expenses for current business:', currentBusiness?.name);
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected');
        return;
    }
    
    if (expenseManagement) {
        // Clear expense data
        expenseManagement.expenses = [];
        expenseManagement.categories = [];
        expenseManagement.vendors = [];
        expenseManagement.currentPage = 1;
        
        // Reload data
        await expenseManagement.loadCategories();
        await expenseManagement.loadExpenses();
        await expenseManagement.loadVendors();
        expenseManagement.updateStats();
        
        console.log('✅ Expense data reloaded for business:', currentBusiness.name);
    } else {
        console.warn('⚠️ expenseManagement not initialized yet');
    }
}

// Add business change event listener
if (window.addEventListener) {
    window.addEventListener('businessChanged', async function() {
        console.log('🏢 Business changed event received in expenses.js');
        if (expenseManagement) {
            await reloadExpensesForCurrentBusiness();
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the expenses page
    const expensesPage = document.getElementById('expenses-page');
    if (expensesPage && !expensesPage.classList.contains('d-none')) {
        initializeExpenseManagement();
    }
});

// Also initialize when navigating to expenses page
document.addEventListener('click', function(e) {
    const navLink = e.target.closest('.sidebar-menu a[data-page]');
    if (navLink && navLink.getAttribute('data-page') === 'expenses') {
        // Use a flag to prevent rapid multiple clicks
        if (window.expensesNavigationClicked) return;
        window.expensesNavigationClicked = true;
        
        setTimeout(() => {
            // Small delay before checking if page is visible
            setTimeout(() => {
                initializeExpenseManagement();
                window.expensesNavigationClicked = false;
            }, 350);
        }, 50);
    }
});

// Add this function to expense.js
function toggleExpensesActionDropdown(expenseId) {
    // Close all other dropdowns first
    document.querySelectorAll('.action-dropdown-menu.show').forEach(dropdown => {
        if (!dropdown.id.includes(`expenses-action-dropdown-${expenseId}`)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Toggle current dropdown
    const dropdown = document.getElementById(`expenses-action-dropdown-${expenseId}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Add this function:
function setupExpensesActionDropdownListeners() {
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
window.expenseManagement = expenseManagement;
window.initializeExpenseManagement = initializeExpenseManagement;
window.reloadExpensesForCurrentBusiness = reloadExpensesForCurrentBusiness;