// Enhanced Sales Management Functions with Business Isolation
let currentSalesPage = 1;
const salesPageSize = 10;

async function initializeSalesPage() {
    console.log('🛒 Initializing sales page for business:', currentBusiness?.name);
    await loadSalesSummary();
    await loadRecentSales();
    setupSalesEventListeners();
    updateDashboardMetrics();
}

function setupSalesEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('sales-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadRecentSales, 300));
    }
    
    // Status filter
    const statusFilter = document.getElementById('sales-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadRecentSales);
    }
}

async function loadSalesSummary() {
    if (!currentBusiness?.id) return;
    
    try {
        const { data: sales, error } = await getBusinessData('sales', {
            cacheKey: 'sales_summary'
        });
        
        if (error) throw error;
        
        const totalSales = sales.length;
        const totalAmount = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const pendingInvoices = sales.filter(sale => sale.status === 'pending').length;
        const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;
        
        document.getElementById('total-sales-count').textContent = totalSales;
        document.getElementById('total-sales-amount').textContent = formatCurrency(totalAmount);
        document.getElementById('pending-invoices').textContent = pendingInvoices;
        document.getElementById('avg-sale-value').textContent = formatCurrency(avgSaleValue);
        
    } catch (error) {
        console.error('❌ Sales summary error:', error);
    }
}

async function loadRecentSales() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for sales');
        displayRecentSales([]);
        return;
    }
    
    try {
        let query = supabase
            .from('sales')
            .select('*', { count: 'exact' })
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false });
        
        // Apply search filter
        const searchTerm = document.getElementById('sales-search')?.value;
        if (searchTerm) {
            query = query.or(`invoice_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
        }
        
        // Apply status filter
        const status = document.getElementById('sales-status-filter')?.value;
        if (status) {
            query = query.eq('status', status);
        }
        
        // Apply pagination
        const from = (currentSalesPage - 1) * salesPageSize;
        const to = from + salesPageSize - 1;
        
        const { data: sales, error, count } = await query.range(from, to);
        
        if (error) throw error;
        
        displayRecentSales(sales || []);
        updateSalesPagination(count || 0);
        
    } catch (error) {
        console.error('❌ Recent sales load error:', error);
        showNotification('Error', 'Failed to load sales data', 'error');
        displayRecentSales([]);
    }
}

function displayRecentSales(sales) {
    const container = document.getElementById('sales-table-body');
    if (!container) return;
    
    if (sales.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 3rem; color: #6c757d;">
                    <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h4>No Sales Yet</h4>
                    <p>Create your first sale to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = sales.map(sale => `
        <tr class="clickable-row" onclick="viewSale('${sale.id}')">
            <td>
                <div style="font-weight: 600;">${sale.invoice_number || 'N/A'}</div>
            </td>
            <td>${new Date(sale.created_at).toLocaleDateString()}</td>
            <td>${sale.customer_name || 'Walk-in Customer'}</td>
            <td>${sale.items?.length || 0} items</td>
            <td>
                <div style="font-weight: 600; color: var(--success);">
                    ${formatCurrency(sale.total_amount || 0)}
                </div>
            </td>
            <td>
                <span class="badge ${getSaleStatusClass(sale.status)}">
                    ${getSaleStatusText(sale.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); viewSale('${sale.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); printInvoice('${sale.id}')">
                        <i class="fas fa-print"></i>
                    </button>
                    ${sale.status === 'pending' ? `
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); completeSale('${sale.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getSaleStatusClass(status) {
    switch (status) {
        case 'completed': return 'badge-success';
        case 'pending': return 'badge-warning';
        case 'cancelled': return 'badge-danger';
        default: return 'badge-outline';
    }
}

function getSaleStatusText(status) {
    switch (status) {
        case 'completed': return 'Completed';
        case 'pending': return 'Pending';
        case 'cancelled': return 'Cancelled';
        default: return status;
    }
}

function updateSalesPagination(totalCount) {
    const container = document.getElementById('sales-pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(totalCount / salesPageSize);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    paginationHTML += `
        <button class="pagination-btn" ${currentSalesPage === 1 ? 'disabled' : ''} 
                onclick="changeSalesPage(${currentSalesPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentSalesPage - 1 && i <= currentSalesPage + 1)) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentSalesPage ? 'active' : ''}" 
                        onclick="changeSalesPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentSalesPage - 2 || i === currentSalesPage + 2) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }
    
    paginationHTML += `
        <button class="pagination-btn" ${currentSalesPage === totalPages ? 'disabled' : ''} 
                onclick="changeSalesPage(${currentSalesPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += `
        <div class="pagination-info">
            Showing ${((currentSalesPage - 1) * salesPageSize) + 1} to 
            ${Math.min(currentSalesPage * salesPageSize, totalCount)} of ${totalCount} sales
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

function changeSalesPage(page) {
    currentSalesPage = page;
    loadRecentSales();
}

// Business-aware sale creation
async function createNewSale(saleData) {
    try {
        const sale = await createBusinessRecord('sales', saleData);
        showNotification('Success', 'Sale created successfully!', 'success');
        loadSalesSummary();
        loadRecentSales();
        return sale;
    } catch (error) {
        console.error('❌ Sale creation error:', error);
        throw error;
    }
}

function createNewSale() {
    showNotification('New Sale', 'Opening sales creation interface...', 'info');
    // Implementation for new sale interface
}

function viewSale(saleId) {
    showNotification('View Sale', `Viewing sale ${saleId}`, 'info');
    // Implementation for viewing sale details
}

function printInvoice(saleId) {
    showNotification('Print', `Printing invoice for sale ${saleId}`, 'info');
    // Implementation for invoice printing
}

function completeSale(saleId) {
    if (confirm('Mark this sale as completed?')) {
        showNotification('Complete Sale', `Completing sale ${saleId}`, 'info');
        // Implementation for completing sale
    }
}

function showSalesReport() {
    showNotification('Sales Report', 'Generating sales report...', 'info');
    // Implementation for sales reports
}

// Export functions for sales
async function exportSalesData() {
    try {
        const sales = await getBusinessData('sales', { useCache: false });
        
        const csvData = sales.map(sale => [
            sale.invoice_number || 'N/A',
            new Date(sale.created_at).toLocaleDateString(),
            sale.customer_name || 'Walk-in Customer',
            sale.items?.length || 0,
            formatCurrency(sale.total_amount || 0),
            sale.status
        ]);
        
        downloadCSV(csvData, `sales_export_${new Date().toISOString().split('T')[0]}.csv`, 
                   ['Invoice No', 'Date', 'Customer', 'Items', 'Amount', 'Status']);
        
    } catch (error) {
        console.error('❌ Sales export error:', error);
        showNotification('Error', 'Failed to export sales data', 'error');
    }
}

function downloadCSV(data, filename, headers) {
    const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}