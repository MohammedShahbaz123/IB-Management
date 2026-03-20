// Reports Management Module
const reportsManagement = {
    currentFilters: {
        type: 'sales',
        dateRange: 'month',
        startDate: null,
        endDate: null,
        category: '',
        status: ''
    },
    
    charts: {},
    isInitialized: false,
    
    init: function() {
        if (this.isInitialized) return;
        
        console.log('📊 Initializing reports management...');
        
        this.setupEventListeners();
        this.setupDateRange();
        this.initializeCharts();
        
        // Check if business is available
        if (currentBusiness?.id) {
            console.log('✅ Business already selected:', currentBusiness.name);
            this.loadDefaultReport();
        } else {
            console.log('⚠️ No business selected yet');
            this.showNoBusinessMessage();
        }
        
        // Listen for business change events from navbar selector
        window.addEventListener('businessChanged', () => {
            if (currentBusiness?.id) {
                console.log('✅ Business changed via navbar, loading reports for:', currentBusiness.name);
                this.loadDefaultReport();
            } else {
                this.showNoBusinessMessage();
            }
        });
        
        this.isInitialized = true;
    },
    
    showNoBusinessMessage: function() {
        const reportTitle = document.getElementById('report-title');
        const reportResults = document.querySelector('.report-results');
        
        if (reportTitle) {
            reportTitle.textContent = 'Select a Business First';
        }
        
        if (reportResults) {
            reportResults.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: #6c757d;">
                    <i class="fas fa-building fa-3x mb-3" style="opacity: 0.5;"></i>
                    <h3>No Business Selected</h3>
                    <p>Please select a business from the dropdown in the navigation bar to view reports.</p>
                    <div class="mt-3">
                        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                            <p class="mb-2"><strong>How to select a business:</strong></p>
                            <ol style="text-align: left; margin: 0 auto; max-width: 300px;">
                                <li>Look for the business dropdown in the left sidebar</li>
                                <li>Select your business from the list</li>
                                <li>Reports will load automatically</li>
                            </ol>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    
    setupEventListeners: function() {
        // Report type selection
        document.querySelectorAll('.report-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!currentBusiness?.id) {
                    showNotification('Please select a business first from the navigation', 'warning');
                    return;
                }
                const reportType = e.currentTarget.dataset.type;
                this.loadReport(reportType);
            });
        });
        
        // Filter controls
        document.getElementById('report-type')?.addEventListener('change', (e) => {
            if (!currentBusiness?.id) {
                showNotification('Please select a business first from the navigation', 'warning');
                return;
            }
            this.currentFilters.type = e.target.value;
            this.loadReportData();
        });
        
        document.getElementById('report-date-range')?.addEventListener('change', (e) => {
            this.currentFilters.dateRange = e.target.value;
            this.setupDateRange();
            this.loadReportData();
        });
        
        document.getElementById('start-date')?.addEventListener('change', () => this.loadReportData());
        document.getElementById('end-date')?.addEventListener('change', () => this.loadReportData());
        
        // Quick date buttons
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.setQuickDateRange(range);
            });
        });
        
        // Export buttons
        document.getElementById('export-pdf-btn')?.addEventListener('click', () => this.exportPDF());
        document.getElementById('export-excel-btn')?.addEventListener('click', () => this.exportExcel());
        document.getElementById('export-csv-btn')?.addEventListener('click', () => this.exportCSV());
        
        // Print button
        document.getElementById('print-report-btn')?.addEventListener('click', () => this.printReport());
        
        // Refresh button
        document.getElementById('refresh-report-btn')?.addEventListener('click', () => {
            if (!currentBusiness?.id) {
                showNotification('Please select a business first from the navigation', 'warning');
                return;
            }
            this.loadReportData();
        });
    },
    
    setupDateRange: function() {
        const dateRange = document.getElementById('report-date-range');
        const customRange = document.getElementById('custom-date-range');
        
        if (!dateRange || !customRange) return;
        
        if (dateRange.value === 'custom') {
            customRange.style.display = 'block';
        } else {
            customRange.style.display = 'none';
            this.setDefaultDates();
        }
    },
    
    setDefaultDates: function() {
        const now = new Date();
        let startDate = new Date();
        
        switch(this.currentFilters.dateRange) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        this.currentFilters.startDate = startDate;
        this.currentFilters.endDate = now;
        
        if (document.getElementById('start-date')) {
            document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
        }
        if (document.getElementById('end-date')) {
            document.getElementById('end-date').value = now.toISOString().split('T')[0];
        }
    },
    
    setQuickDateRange: function(range) {
        const now = new Date();
        const startDate = new Date(now);
        
        switch(range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                const yesterdayEnd = new Date(startDate);
                yesterdayEnd.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = now.toISOString().split('T')[0];
        document.getElementById('report-date-range').value = 'custom';
        this.setupDateRange();
        this.loadReportData();
    },
    
    loadDefaultReport: function() {
        if (!currentBusiness?.id) {
            this.showNoBusinessMessage();
            return;
        }
        this.loadReport('sales');
    },
    
    loadReport: function(reportType) {
        if (!currentBusiness?.id) {
            showNotification('Please select a business first from the navigation', 'warning');
            return;
        }
        
        this.currentFilters.type = reportType;
        
        // Update active card
        document.querySelectorAll('.report-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const activeCard = document.querySelector(`.report-card[data-type="${reportType}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
        
        // Update UI
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) {
            reportTypeSelect.value = reportType;
        }
        
        // Load report data
        this.loadReportData();
        
        // Update page title
        this.updateReportTitle();
    },
    
    updateReportTitle: function() {
        const reportTitle = document.getElementById('report-title');
        if (!reportTitle) return;
        
        if (!currentBusiness?.id) {
            reportTitle.textContent = 'Select a Business First';
            return;
        }
        
        const titles = {
            sales: 'Sales Report',
            expenses: 'Expenses Report',
            inventory: 'Inventory Report',
            profit: 'Profit & Loss Report',
            cashflow: 'Cash Flow Report',
            customers: 'Customer Report',
            suppliers: 'Supplier Report'
        };
        
        reportTitle.textContent = titles[this.currentFilters.type] || 'Business Reports';
        
        // Add business name to subtitle if you have one
        const reportSubtitle = document.querySelector('.reports-header p');
        if (reportSubtitle) {
            reportSubtitle.textContent = `Showing data for ${currentBusiness.name}`;
        }
    },
    
    loadReportData: async function() {
        try {
            showLoading();
            
            if (!currentBusiness?.id) {
                showNotification('Please select a business first from the navigation', 'warning');
                hideLoading();
                return;
            }
            
            console.log('📊 Loading report for business:', currentBusiness.name);
            
            // Get date range
            let startDate, endDate;
            
            const startDateInput = document.getElementById('start-date')?.value;
            const endDateInput = document.getElementById('end-date')?.value;
            
            if (startDateInput && endDateInput) {
                // Parse dates from input fields
                startDate = new Date(startDateInput + 'T00:00:00');
                endDate = new Date(endDateInput + 'T23:59:59');
            } else {
                // Use default date range
                startDate = this.currentFilters.startDate || new Date();
                endDate = this.currentFilters.endDate || new Date();
                
                if (this.currentFilters.dateRange !== 'custom') {
                    this.setDefaultDates();
                    startDate = this.currentFilters.startDate;
                    endDate = this.currentFilters.endDate;
                }
            }
            
            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date range selected');
            }
            
            // Ensure end date is after start date
            if (startDate > endDate) {
                [startDate, endDate] = [endDate, startDate];
            }
            
            // Load data based on report type
            switch(this.currentFilters.type) {
                case 'sales':
                    await this.loadSalesReport(startDate, endDate);
                    break;
                case 'expenses':
                    await this.loadExpensesReport(startDate, endDate);
                    break;
                case 'inventory':
                    await this.loadInventoryReport(startDate, endDate);
                    break;
                case 'profit':
                    await this.loadProfitLossReport(startDate, endDate);
                    break;
                case 'cashflow':
                    await this.loadCashFlowReport(startDate, endDate);
                    break;
                case 'customers':
                    await this.loadCustomerReport(startDate, endDate);
                    break;
                case 'suppliers':
                    await this.loadSupplierReport(startDate, endDate);
                    break;
            }
            
            this.updateReportMeta();
            
        } catch (error) {
            console.error('Error loading report:', error);
            showNotification('Failed to load report: ' + error.message, 'error');
            
            // Show error in report results
            const reportResults = document.querySelector('.report-results');
            if (reportResults) {
                reportResults.innerHTML = `
                    <div class="text-center" style="padding: 2rem; color: #6c757d;">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                        <h4>Error Loading Report</h4>
                        <p>${error.message}</p>
                        <button class="btn btn-primary mt-2" onclick="reportsManagement.loadReportData()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                `;
            }
        } finally {
            hideLoading();
        }
    },
    
    loadSalesReport: async function(startDate, endDate) {
        try {
            if (!currentBusiness?.id) {
                throw new Error('No active business selected');
            }
            
            // Use business-aware data fetching
            const sales = await getBusinessData('sales', {
                filters: {},
                orderBy: 'created_at',
                ascending: false,
                useCache: false
            });
            
            // Filter by date range
            const filteredSales = sales.filter(sale => {
                const saleDate = new Date(sale.created_at);
                return saleDate >= startDate && saleDate <= endDate;
            });
            
            // Get customers for these sales
            const customerIds = [...new Set(filteredSales.map(sale => sale.customer_id).filter(id => id))];
            let customers = {};
            
            if (customerIds.length > 0) {
                const { data: customerData, error: customerError } = await supabase
                    .from('parties')
                    .select('id, name, email, phone')
                    .in('id', customerIds);
                
                if (!customerError && customerData) {
                    customerData.forEach(customer => {
                        customers[customer.id] = customer;
                    });
                }
            }
            
            // Get sale items
            const saleIds = filteredSales.map(sale => sale.id) || [];
            let saleItems = [];
            
            if (saleIds.length > 0) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('sale_items')
                    .select('*')
                    .in('sale_id', saleIds);
                
                if (!itemsError && itemsData) {
                    saleItems = itemsData;
                }
            }
            
            // Combine data
            const enhancedSales = filteredSales.map(sale => ({
                ...sale,
                customer: customers[sale.customer_id] || { name: 'Walk-in Customer' },
                sale_items: saleItems.filter(item => item.sale_id === sale.id) || []
            }));
            
            this.displaySalesReport(enhancedSales);
            this.generateSalesCharts(enhancedSales);
            
        } catch (error) {
            console.error('Error loading sales report:', error);
            throw error;
        }
    },
    
    displaySalesReport: function(sales) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (sales.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2rem; color: #6c757d;">
                        <i class="fas fa-info-circle"></i> No sales data found for the selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        let totalAmount = 0;
        let totalItems = 0;
        
        sales.forEach(sale => {
            const itemsCount = sale.sale_items?.length || 0;
            const amount = parseFloat(sale.total_amount || 0);
            
            totalAmount += amount;
            totalItems += itemsCount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sale.invoice_number || 'N/A'}</td>
                <td>${formatDate(sale.created_at)}</td>
                <td>${sale.customer?.name || 'Walk-in Customer'}</td>
                <td>${itemsCount}</td>
                <td>${formatCurrency(amount)}</td>
                <td>
                    <span class="status-badge ${sale.status || 'completed'}">
                        ${(sale.status || 'completed').toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="payment-status ${sale.payment_status || 'paid'}">
                        ${(sale.payment_status || 'paid').toUpperCase()}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update summary
        document.getElementById('report-summary-total').textContent = formatCurrency(totalAmount);
        document.getElementById('report-summary-count').textContent = sales.length;
        document.getElementById('report-summary-items').textContent = totalItems;
        document.getElementById('report-summary-avg').textContent = formatCurrency(
            sales.length > 0 ? totalAmount / sales.length : 0
        );
    },
    
    loadExpensesReport: async function(startDate, endDate) {
        try {
            if (!currentBusiness?.id) {
                throw new Error('No active business selected');
            }
            
            const expenses = await getBusinessData('expenses', {
                filters: {},
                orderBy: 'date',
                ascending: false,
                useCache: false
            });
            
            // Filter by date range
            const filteredExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= startDate && expenseDate <= endDate;
            });
            
            this.displayExpensesReport(filteredExpenses);
            this.generateExpensesCharts(filteredExpenses);
            
        } catch (error) {
            console.error('Error loading expenses report:', error);
            throw error;
        }
    },
    
    displayExpensesReport: function(expenses) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem; color: #6c757d;">
                        <i class="fas fa-info-circle"></i> No expenses data found for the selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        let totalAmount = 0;
        const categoryTotals = {};
        
        expenses.forEach(expense => {
            const amount = parseFloat(expense.amount || 0);
            totalAmount += amount;
            
            const category = expense.category || 'other';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += amount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(expense.date)}</td>
                <td>${expense.description || 'N/A'}</td>
                <td>${expense.category || 'Other'}</td>
                <td>${expense.vendor || 'N/A'}</td>
                <td>${formatCurrency(amount)}</td>
                <td>
                    <span class="status-badge ${expense.status}">
                        ${(expense.status || 'pending').toUpperCase()}
                    </span>
                </td>
                <td>${expense.payment_method || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update summary
        document.getElementById('report-summary-total').textContent = formatCurrency(totalAmount);
        document.getElementById('report-summary-count').textContent = expenses.length;
        document.getElementById('report-summary-categories').textContent = Object.keys(categoryTotals).length;
        
        // Display category breakdown
        this.displayCategoryBreakdown(categoryTotals);
    },
    
    displayCategoryBreakdown: function(categoryTotals) {
        const breakdownContainer = document.getElementById('category-breakdown');
        if (!breakdownContainer) return;
        
        const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
        
        if (total === 0) {
            breakdownContainer.innerHTML = `
                <div class="text-center" style="padding: 1rem; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> No category data available
                </div>
            `;
            return;
        }
        
        breakdownContainer.innerHTML = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => {
                const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
                return `
                    <div class="category-breakdown-item">
                        <div class="category-name">${category}</div>
                        <div class="category-bar">
                            <div class="bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="category-amount">${formatCurrency(amount)} (${percentage}%)</div>
                    </div>
                `;
            })
            .join('');
    },
    
    loadInventoryReport: async function(startDate, endDate) {
        try {
            if (!currentBusiness?.id) {
                throw new Error('No active business selected');
            }
            
            const products = await getBusinessData('products', {
                orderBy: 'name',
                ascending: true,
                useCache: false
            });
            
            this.displayInventoryReport(products);
            this.generateInventoryCharts(products);
            
        } catch (error) {
            console.error('Error loading inventory report:', error);
            throw error;
        }
    },
    
    displayInventoryReport: function(products) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 2rem; color: #6c757d;">
                        <i class="fas fa-info-circle"></i> No inventory data found
                    </td>
                </tr>
            `;
            return;
        }
        
        let totalStockValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        products.forEach(product => {
            const stockValue = parseFloat(product.current_stock || 0) * parseFloat(product.cost_price || 0);
            totalStockValue += stockValue;
            
            if (product.current_stock <= 0) {
                outOfStockCount++;
            } else if (product.current_stock <= product.reorder_level) {
                lowStockCount++;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.sku || 'N/A'}</td>
                <td>${product.category || 'Uncategorized'}</td>
                <td>${product.current_stock || 0} ${product.unit || 'units'}</td>
                <td>${product.reorder_level || 0}</td>
                <td>${formatCurrency(product.cost_price || 0)}</td>
                <td>${formatCurrency(product.selling_price || 0)}</td>
                <td>${formatCurrency(stockValue)}</td>
                <td>
                    <span class="stock-status ${product.current_stock <= 0 ? 'out-of-stock' : 
                                               product.current_stock <= product.reorder_level ? 'low-stock' : 
                                               'in-stock'}">
                        ${product.current_stock <= 0 ? 'Out of Stock' : 
                          product.current_stock <= product.reorder_level ? 'Low Stock' : 'In Stock'}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update summary
        document.getElementById('report-summary-value').textContent = formatCurrency(totalStockValue);
        document.getElementById('report-summary-count').textContent = products.length;
        document.getElementById('report-summary-low').textContent = lowStockCount;
        document.getElementById('report-summary-out').textContent = outOfStockCount;
    },
    
    loadProfitLossReport: async function(startDate, endDate) {
        try {
            if (!currentBusiness?.id) {
                throw new Error('No active business selected');
            }
            
            // Get sales data
            const sales = await getBusinessData('sales', {
                filters: {
                    status: 'completed'
                },
                useCache: false
            });
            
            // Get expenses data
            const expenses = await getBusinessData('expenses', {
                filters: {
                    status: 'paid'
                },
                useCache: false
            });
            
            // Filter by date range
            const filteredSales = sales.filter(sale => {
                const saleDate = new Date(sale.created_at);
                return saleDate >= startDate && saleDate <= endDate;
            });
            
            const filteredExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= startDate && expenseDate <= endDate;
            });
            
            const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0) || 0;
            const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0) || 0;
            const netProfit = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
            
            this.displayProfitLossReport(totalRevenue, totalExpenses, netProfit, profitMargin);
            this.generateProfitLossCharts(totalRevenue, totalExpenses);
            
        } catch (error) {
            console.error('Error loading profit/loss report:', error);
            throw error;
        }
    },
    
    updateReportMeta: function() {
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        
        const periodElement = document.getElementById('report-period');
        if (periodElement && startDate && endDate) {
            periodElement.textContent = `${formatDate(startDate)} to ${formatDate(endDate)}`;
        }
        
        const generatedElement = document.getElementById('report-generated');
        if (generatedElement) {
            generatedElement.textContent = formatDate(new Date(), 'full');
        }
    },
    
    initializeCharts: function() {
        // Sales trend chart
        const salesChartCtx = document.getElementById('sales-trend-chart')?.getContext('2d');
        if (salesChartCtx) {
            this.charts.salesTrend = new Chart(salesChartCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Sales',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Expenses by category chart
        const expensesChartCtx = document.getElementById('expenses-category-chart')?.getContext('2d');
        if (expensesChartCtx) {
            this.charts.expensesCategory = new Chart(expensesChartCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#3498db', '#2ecc71', '#9b59b6', '#f39c12',
                            '#e74c3c', '#1abc9c', '#d35400', '#34495e'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
    },
    
    generateSalesCharts: function(salesData) {
        // Group sales by date
        const salesByDate = {};
        salesData.forEach(sale => {
            const date = sale.created_at.split('T')[0];
            if (!salesByDate[date]) {
                salesByDate[date] = 0;
            }
            salesByDate[date] += parseFloat(sale.total_amount || 0);
        });
        
        // Sort dates
        const dates = Object.keys(salesByDate).sort();
        const amounts = dates.map(date => salesByDate[date]);
        
        // Update chart
        if (this.charts.salesTrend) {
            this.charts.salesTrend.data.labels = dates.map(date => formatDate(date, 'short'));
            this.charts.salesTrend.data.datasets[0].data = amounts;
            this.charts.salesTrend.update();
        }
    },
    
    generateExpensesCharts: function(expensesData) {
        // Group expenses by category
        const expensesByCategory = {};
        expensesData.forEach(expense => {
            const category = expense.category || 'other';
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = 0;
            }
            expensesByCategory[category] += parseFloat(expense.amount || 0);
        });
        
        // Update chart
        if (this.charts.expensesCategory) {
            this.charts.expensesCategory.data.labels = Object.keys(expensesByCategory);
            this.charts.expensesCategory.data.datasets[0].data = Object.values(expensesByCategory);
            this.charts.expensesCategory.update();
        }
    },
    
    generateProfitLossCharts: function(revenue, expenses) {
        const profitLossCtx = document.getElementById('profit-loss-chart')?.getContext('2d');
        if (profitLossCtx) {
            new Chart(profitLossCtx, {
                type: 'bar',
                data: {
                    labels: ['Revenue', 'Expenses', 'Profit'],
                    datasets: [{
                        label: 'Amount',
                        data: [revenue, expenses, revenue - expenses],
                        backgroundColor: ['#2ecc71', '#e74c3c', '#3498db']
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }
    },
    
    exportPDF: function() {
        if (!currentBusiness?.id) {
            showNotification('Please select a business first from the navigation', 'warning');
            return;
        }
        showNotification('PDF export feature coming soon!', 'info');
    },
    
    exportExcel: function() {
        if (!currentBusiness?.id) {
            showNotification('Please select a business first from the navigation', 'warning');
            return;
        }
        showNotification('Excel export feature coming soon!', 'info');
    },
    
    exportCSV: function() {
        if (!currentBusiness?.id) {
            showNotification('Please select a business first from the navigation', 'warning');
            return;
        }
        
        const table = document.getElementById('report-table-body');
        if (!table || table.children.length === 0) {
            showNotification('No data to export', 'warning');
            return;
        }
        
        // Get headers
        const headers = [];
        document.querySelectorAll('#report-table th').forEach(th => {
            if (th.textContent.trim()) {
                headers.push(th.textContent.trim());
            }
        });
        
        // Get data rows
        const rows = [headers];
        table.querySelectorAll('tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('td').forEach(td => {
                // Remove HTML tags and get clean text
                const text = td.textContent.trim();
                row.push(text);
            });
            if (row.length > 0) {
                rows.push(row);
            }
        });
        
        // Create CSV
        const csv = rows.map(row => 
            row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFilters.type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Report exported as CSV successfully!', 'success');
    },
    
    printReport: function() {
        if (!currentBusiness?.id) {
            showNotification('Please select a business first from the navigation', 'warning');
            return;
        }
        window.print();
    },
    
    getInsights: function() {
        if (!currentBusiness?.id) return;
        
        // Generate insights based on report data
        const insights = [
            {
                icon: 'fa-chart-line',
                title: 'Sales Trend',
                description: 'Sales have increased by 15% compared to last month'
            },
            {
                icon: 'fa-exclamation-triangle',
                title: 'Low Stock Alert',
                description: '5 products are running low on stock'
            },
            {
                icon: 'fa-money-bill-wave',
                title: 'Profit Margin',
                description: 'Current profit margin is 25%'
            }
        ];
        
        const insightsContainer = document.getElementById('report-insights');
        if (insightsContainer) {
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <div class="insight-icon">
                        <i class="fas ${insight.icon}"></i>
                    </div>
                    <div class="insight-content">
                        <h4>${insight.title}</h4>
                        <p>${insight.description}</p>
                    </div>
                </div>
            `).join('');
        }
    }
};

// Initialize reports management when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('reports-page')) {
        console.log('📊 Reports page detected, initializing...');
        
        // Wait a bit for business management to initialize
        setTimeout(() => {
            reportsManagement.init();
        }, 1000);
    }
});

// Also listen for when reports page is shown
window.addEventListener('dashboardPageChanged', function(e) {
    if (e.detail.page === 'reports') {
        console.log('📊 Reports page shown, checking business...');
        
        // Update title based on current business
        reportsManagement.updateReportTitle();
        
        if (currentBusiness?.id && !reportsManagement.isInitialized) {
            console.log('✅ Business available, initializing reports...');
            setTimeout(() => {
                reportsManagement.init();
            }, 500);
        } else if (!currentBusiness?.id) {
            console.log('⚠️ No business selected, showing message...');
            reportsManagement.showNoBusinessMessage();
        }
    }
});