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
    
    init: function() {
        this.setupEventListeners();
        this.loadDefaultReport();
        this.setupDateRange();
        this.loadChartData();
    },
    
    setupEventListeners: function() {
        // Report type selection
        document.querySelectorAll('.report-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const reportType = e.currentTarget.dataset.type;
                this.loadReport(reportType);
            });
        });
        
        // Filter controls
        document.getElementById('report-type')?.addEventListener('change', (e) => {
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
        document.getElementById('refresh-report-btn')?.addEventListener('click', () => this.loadReportData());
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
        this.loadReport('sales');
    },
    
    loadReport: function(reportType) {
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
        document.getElementById('report-type').value = reportType;
        
        // Load report data
        this.loadReportData();
        
        // Update page title
        const reportTitle = document.getElementById('report-title');
        if (reportTitle) {
            const titles = {
                sales: 'Sales Report',
                expenses: 'Expenses Report',
                inventory: 'Inventory Report',
                profit: 'Profit & Loss Report',
                cashflow: 'Cash Flow Report',
                customers: 'Customer Report',
                suppliers: 'Supplier Report'
            };
            reportTitle.textContent = titles[reportType] || 'Report';
        }
    },
    
    loadReportData: async function() {
        try {
            showLoading();
            
             if (!window.currentBusiness) {
            showNotification('Please select a business first', 'warning');
            hideLoading();
            return;
        }
        const currentBusiness = window.currentBusiness;
            
            // Get date range
            const startDate = this.currentFilters.startDate || 
                            new Date(document.getElementById('start-date').value);
            const endDate = this.currentFilters.endDate || 
                          new Date(document.getElementById('end-date').value);
            
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
            showNotification('Failed to load report: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    loadSalesReport: async function(startDate, endDate) {
    try {
        // Get sales data
        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', window.currentBusiness?.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get customers separately if needed
        const customerIds = [...new Set(sales?.map(sale => sale.customer_id).filter(id => id))];
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
        const saleIds = sales?.map(sale => sale.id) || [];
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
        const enhancedSales = sales?.map(sale => ({
            ...sale,
            customer: customers[sale.customer_id] || { name: 'Walk-in Customer' },
            sale_items: saleItems.filter(item => item.sale_id === sale.id) || []
        })) || [];
        
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
    
    let totalAmount = 0;
    let totalItems = 0;
    
    (sales || []).forEach(sale => {
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
        const { data: expenses, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('business_id', window.currentBusiness?.id)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        this.displayExpensesReport(expenses || []);
        this.generateExpensesCharts(expenses || []);
    },
    
    displayExpensesReport: function(expenses) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
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
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', window.currentBusiness?.id)
            .order('name');
        
        if (error) throw error;
        
        // Get inventory movements
        const { data: movements, error: movementsError } = await supabase
            .from('inventory_movements')
            .select('*')
            .eq('business_id', window.currentBusiness?.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (movementsError) throw movementsError;
        
        this.displayInventoryReport(products || [], movements || []);
        this.generateInventoryCharts(products || []);
    },
    
    displayInventoryReport: function(products, movements) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
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
        // Get sales data
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('business_id', window.currentBusiness?.id)
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (salesError) throw salesError;
        
        // Get expenses data
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('business_id', window.currentBusiness?.id)
            .eq('status', 'paid')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());
        
        if (expensesError) throw expensesError;
        
        const totalRevenue = sales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0) || 0;
        const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0) || 0;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
        
        this.displayProfitLossReport(totalRevenue, totalExpenses, netProfit, profitMargin);
        this.generateProfitLossCharts(totalRevenue, totalExpenses);
    },
    
    displayProfitLossReport: function(revenue, expenses, profit, margin) {
        const resultsContainer = document.getElementById('report-results-content');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="profit-loss-summary">
                <div class="summary-grid">
                    <div class="summary-card positive">
                        <div class="value">${formatCurrency(revenue)}</div>
                        <div class="label">Total Revenue</div>
                    </div>
                    <div class="summary-card negative">
                        <div class="value">${formatCurrency(expenses)}</div>
                        <div class="label">Total Expenses</div>
                    </div>
                    <div class="summary-card ${profit >= 0 ? 'positive' : 'negative'}">
                        <div class="value">${formatCurrency(profit)}</div>
                        <div class="label">Net Profit</div>
                    </div>
                    <div class="summary-card ${margin >= 0 ? 'positive' : 'negative'}">
                        <div class="value">${margin.toFixed(1)}%</div>
                        <div class="label">Profit Margin</div>
                    </div>
                </div>
                
                <div class="profit-loss-details">
                    <h4>Details</h4>
                    <table class="details-table">
                        <tr>
                            <td>Gross Revenue:</td>
                            <td class="text-end">${formatCurrency(revenue)}</td>
                        </tr>
                        <tr>
                            <td>Total Expenses:</td>
                            <td class="text-end">${formatCurrency(expenses)}</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>Net Profit:</strong></td>
                            <td class="text-end"><strong>${formatCurrency(profit)}</strong></td>
                        </tr>
                        <tr>
                            <td>Profit Margin:</td>
                            <td class="text-end">${margin.toFixed(1)}%</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    },
    
    loadCashFlowReport: async function(startDate, endDate) {
        // This would combine sales, expenses, and other cash movements
        // For now, we'll show a simplified version
        this.displayCashFlowReport();
    },
    
    loadCustomerReport: async function(startDate, endDate) {
        const { data: customers, error } = await supabase
            .from('parties')
            .select(`
                *,
                sales!inner(
                    total_amount,
                    created_at
                )
            `)
            .eq('business_id', window.currentBusiness?.id)
            .eq('type', 'customer')
            .gte('sales.created_at', startDate.toISOString())
            .lte('sales.created_at', endDate.toISOString());
        
        if (error) throw error;
        
        this.displayCustomerReport(customers || []);
    },
    
    displayCustomerReport: function(customers) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        customers.forEach(customer => {
            const totalPurchases = customer.sales?.reduce((sum, sale) => 
                sum + parseFloat(sale.total_amount || 0), 0) || 0;
            const purchaseCount = customer.sales?.length || 0;
            const avgPurchase = purchaseCount > 0 ? totalPurchases / purchaseCount : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${purchaseCount}</td>
                <td>${formatCurrency(totalPurchases)}</td>
                <td>${formatCurrency(avgPurchase)}</td>
                <td>${customer.city || 'N/A'}</td>
                <td>
                    <span class="status-badge ${customer.status || 'active'}">
                        ${(customer.status || 'active').toUpperCase()}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },
    
    loadSupplierReport: async function(startDate, endDate) {
        const { data: suppliers, error } = await supabase
            .from('parties')
            .select(`
                *,
                purchases!inner(
                    total_amount,
                    created_at
                )
            `)
            .eq('business_id', window.currentBusiness?.id)
            .eq('type', 'supplier')
            .gte('purchases.created_at', startDate.toISOString())
            .lte('purchases.created_at', endDate.toISOString());
        
        if (error) throw error;
        
        this.displaySupplierReport(suppliers || []);
    },
    
    displaySupplierReport: function(suppliers) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        suppliers.forEach(supplier => {
            const totalPurchases = supplier.purchases?.reduce((sum, purchase) => 
                sum + parseFloat(purchase.total_amount || 0), 0) || 0;
            const purchaseCount = supplier.purchases?.length || 0;
            const avgPurchase = purchaseCount > 0 ? totalPurchases / purchaseCount : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supplier.name}</td>
                <td>${supplier.company || 'N/A'}</td>
                <td>${supplier.email || 'N/A'}</td>
                <td>${supplier.phone || 'N/A'}</td>
                <td>${purchaseCount}</td>
                <td>${formatCurrency(totalPurchases)}</td>
                <td>${formatCurrency(avgPurchase)}</td>
                <td>${supplier.city || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
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
    
    loadChartData: function() {
        // Initialize charts
        this.initializeCharts();
        
        // Load chart data based on report type
        // This would typically fetch data and update charts
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
        showNotification('PDF export feature coming soon!', 'info');
    },
    
    exportExcel: function() {
        showNotification('Excel export feature coming soon!', 'info');
    },
    
    exportCSV: function() {
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
        window.print();
    },
    
    getInsights: function() {
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
        reportsManagement.init();
    }
});


