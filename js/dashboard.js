// Enhanced Dashboard Functions with Business Isolation
let salesChart = null;
let revenueChart = null;
let currentPage = 'overview';
let isNavigating = false;

// 🔥 NEW: Show first accessible page function
async function showFirstAccessiblePage() {
    const accessiblePages = [
        'overview',
        'sales', 
        'inventory',
        'customers',
        'staff',
        'reports'
    ];
    
    for (const page of accessiblePages) {
        if (window.canAccessPage && canAccessPage(page)) {
            console.log(`🎯 Showing first accessible page: ${page}`);
            await showDashboardPage(page);
            return;
        }
    }
    
    // If no pages are accessible, show overview with restricted view
    console.log('⚠️ No pages accessible, showing restricted overview');
    await showDashboardPage('overview');
}

async function showDashboard() {
    console.log('📊 Showing dashboard with page persistence...');
    
    try {
        safeHide(landingPage);
        safeHide(authPages);
        safeShow(dashboard);
        
        // Initialize business management
        await initializeBusinessManagement();
        
        // Wait for business data
        if ((!currentBusiness || !currentBusiness.id) && userBusinesses.length > 0) {
            await setActiveBusiness(userBusinesses[0].id);
        }
        
        // Load user role
        if (window.loadCurrentUserRole) {
            await loadCurrentUserRole();
        }
        
        // Apply role-based access
        if (window.applyRoleBasedAccess) {
            applyRoleBasedAccess();
        }
        
        // 🔥 CRITICAL: Restore last page instead of always going to overview
        const pageToShow = restoreLastPage();
        await showDashboardPage(pageToShow);
        
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        // Fallback to overview but save the error state
        await showDashboardPage('overview');
    }
}

// Enhanced navigation that doesn't reset on tab switch
async function showDashboardPage(page) {
    if (isNavigating) {
        console.log('⚠️ Navigation in progress, skipping...');
        return;
    }
    
    // Check permissions first
    if (window.canAccessPage && !canAccessPage(page)) {
        console.warn('🚫 Access denied to page:', page);
        showNotification('Access Denied', 'You do not have permission to access this page.', 'error');
        
        // Find first accessible page
        const accessiblePages = ['overview', 'sales', 'inventory', 'customers', 'staff', 'reports'];
        for (const accessiblePage of accessiblePages) {
            if (canAccessPage(accessiblePage)) {
                page = accessiblePage;
                break;
            }
        }
    }
    
    isNavigating = true;
    
    try {
        console.log('📄 Navigating to:', page);
        
        // Save current page to session storage
        sessionStorage.setItem('currentPage', page);
        currentPage = page;
        
        // Hide all page contents
        const pageContents = document.querySelectorAll('.page-content');
        pageContents.forEach(content => {
            if (content && content.classList) {
                content.classList.add('d-none');
            }
        });
        
        // Show selected page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('d-none');
        }
        
        // Update active menu item
        const menuItems = document.querySelectorAll('.sidebar-menu a');
        menuItems.forEach(item => {
            if (item && item.classList) {
                item.classList.remove('active');
            }
        });
        
        const activeMenuItem = document.querySelector(`.sidebar-menu a[data-page="${page}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        localStorage.setItem('activeDashboardPage', page);
        
        // Initialize page-specific content WITHOUT reloading everything
        await initializePageContent(page);
        
        console.log('✅ Dashboard page shown:', page);
        
    } catch (error) {
        console.error('❌ Error showing dashboard page:', error);
    } finally {
        isNavigating = false;
    }
}

// Enhanced page content initialization
async function initializePageContent(page) {
    try {
        switch (page) {
            case 'overview':
                // Only load fresh data if needed, otherwise use cached
                await loadDashboardData();
                break;
            case 'sales':
                if (window.loadSalesSummary) {
                    await loadSalesSummary();
                }
                break;
            case 'inventory':
                if (window.loadInventorySummary) {
                    await loadInventorySummary();
                }
                break;
            case 'staff':
                if (window.initializeStaffManagement) {
                    await initializeStaffManagement();
                }
                break;
            default:
                console.log('ℹ️ No specific initialization for page:', page);
        }
    } catch (error) {
        console.error(`❌ Error initializing page ${page}:`, error);
    }
}

// Restore last viewed page on app load
function restoreLastPage() {
    const savedPage = sessionStorage.getItem('currentPage') || localStorage.getItem('activeDashboardPage') || 'overview';
    
    // Check if user has access to the saved page
    if (window.canAccessPage && !canAccessPage(savedPage)) {
        // Find first accessible page
        const accessiblePages = ['overview', 'sales', 'inventory', 'customers', 'staff', 'reports'];
        for (const page of accessiblePages) {
            if (canAccessPage(page)) {
                currentPage = page;
                break;
            }
        }
    } else {
        currentPage = savedPage;
    }
    
    console.log('🔄 Restoring last page:', currentPage);
    return currentPage;
}

function updateActiveNavigation(page) {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-page]');
    sidebarLinks.forEach(link => {
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Overview Page Functions
async function initializeOverviewPage() {
    console.log('📊 Initializing overview page for business:', currentBusiness?.name);
    
    // Show loading state immediately
    showActivitiesLoadingState();
    
    await loadDashboardData();
    loadCharts();
    await loadRecentActivityAndAlerts(); // Use new function
    updateDashboardMetrics();
    setupActivityAutoRefresh();
}

async function initializeSalesPage() {
    console.log('🛒 Initializing sales page for business:', currentBusiness?.name);
    if (window.loadSalesSummary) {
        await loadSalesSummary();
    } else {
        console.warn('⚠️ loadSalesSummary function not available');
    }
    
    if (window.loadRecentSales) {
        await loadRecentSales();
    } else {
        console.warn('⚠️ loadRecentSales function not available');
    }
    updateDashboardMetrics();
}

async function initializeInventoryPage() {
    console.log('📦 Initializing inventory page for business:', currentBusiness?.name);
    if (window.loadInventorySummary) {
        await loadInventorySummary();
    } else {
        console.warn('⚠️ loadInventorySummary function not available');
    }
    
    if (window.loadInventoryProducts) {
        await loadInventoryProducts();
    } else {
        console.warn('⚠️ loadInventoryProducts function not available');
    }
    updateDashboardMetrics();
}

async function initializeStaffPage() {
    console.log('👥 Initializing staff page for business:', currentBusiness?.name);
    if (window.initializeStaffManagement) {
        await initializeStaffManagement();
    } else {
        console.warn('⚠️ initializeStaffManagement function not available');
    }
    updateDashboardMetrics();
}

async function loadDashboardData() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for dashboard data');
        return;
    }
    
    try {
        // Load today's sales for current business only
        const today = new Date().toISOString().split('T')[0];
        const { data: todaySales, error: salesError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('business_id', currentBusiness.id)
            .gte('created_at', today)
            .lte('created_at', `${today}T23:59:59.999Z`);
        
        if (!salesError && todaySales) {
            const todaySalesCount = todaySales.length;
            const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
            
            const todaySalesElement = document.getElementById('today-sales');
            const todayRevenueElement = document.getElementById('today-revenue');
            
            if (todaySalesElement) todaySalesElement.textContent = todaySalesCount;
            if (todayRevenueElement) todayRevenueElement.textContent = formatCurrency(todayRevenue);
        } else if (salesError) {
            console.error('❌ Error loading today sales:', salesError);
        }

        // 🔥 FIXED: Use same logic as inventory for low stock count
        await updateDashboardLowStockCount();
        
        // Load financial summary
        if (window.loadFinancialSummary) {
            await loadFinancialSummary();
        }
        
    } catch (error) {
        console.error('❌ Dashboard data load error:', error);
    }
}

// 🔥 NEW: Centralized function to update dashboard low stock count
async function updateDashboardLowStockCount() {
    console.log('📊 Updating dashboard low stock count...');
    
    if (!currentBusiness?.id) return;
    
    try {
        // Use the SAME logic as inventory low stock alerts
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .gt('reorder_level', 0)
            .gt('current_stock', 0)
            .eq('is_active', true);
        
        if (error) throw error;
        
        // Client-side filtering to match inventory logic
        const lowStockProducts = (products || []).filter(product => {
            const currentStock = product.current_stock || 0;
            const reorderLevel = product.reorder_level || 0;
            return currentStock <= reorderLevel;
        });
        
        const lowStockElement = document.getElementById('low-stock-count');
        if (lowStockElement) {
            lowStockElement.textContent = lowStockProducts.length;
        }
        
        console.log(`✅ Dashboard low stock count updated: ${lowStockProducts.length} products`);
        
    } catch (error) {
        console.error('❌ Error updating dashboard low stock count:', error);
        const lowStockElement = document.getElementById('low-stock-count');
        if (lowStockElement) lowStockElement.textContent = '0';
    }
}

// 🔥 NEW: Function to refresh dashboard when stock changes
async function refreshDashboardOnStockChange() {
    console.log('🔄 Refreshing dashboard after stock change...');
    
    // Only refresh if we're on the overview page
    if (currentPage === 'overview') {
        await updateDashboardLowStockCount();
        
        // Also refresh other relevant metrics
        if (window.loadFinancialSummary) {
            await loadFinancialSummary();
        }
    }
}

// Add to dashboard.js
window.updateDashboardLowStockCount = updateDashboardLowStockCount;
window.refreshDashboardOnStockChange = refreshDashboardOnStockChange;

function loadCharts() {
    try {
        const salesChartEl = document.getElementById('salesChart');
        const revenueChartEl = document.getElementById('revenueChart');
        
        if (!salesChartEl || !revenueChartEl) {
            console.warn('⚠️ Chart elements not found');
            return;
        }
        
        const period = document.getElementById('chart-period')?.value || 30;
        
        // Destroy existing charts
        if (salesChart) salesChart.destroy();
        if (revenueChart) revenueChart.destroy();
        
        // Sample data - replace with actual data from Supabase
        const salesData = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Sales',
                data: [12, 19, 8, 15, 12, 18, 14],
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        };
        
        const revenueData = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Revenue',
                data: [1250, 1890, 1580, 2170],
                backgroundColor: 'rgba(76, 201, 240, 0.2)',
                borderColor: 'rgba(76, 201, 240, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        };
        
        // Create charts
        const salesCtx = salesChartEl.getContext('2d');
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: salesData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        const revenueCtx = revenueChartEl.getContext('2d');
        revenueChart = new Chart(revenueCtx, {
            type: 'bar',
            data: revenueData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Chart loading error:', error);
    }
}

async function loadRecentActivity() {
    await loadRecentActivityAndAlerts();
}

// 🔥 NEW: Enhanced function to load both recent activity AND alerts
async function loadRecentActivityAndAlerts() {
    console.log('🔄 Loading recent activity and alerts...');
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for activity');
        return;
    }
    
    // Show loading state
    showActivitiesLoadingState();
    
    try {
        const activities = [];
        
        // 1. Load recent sales (activity)
        const recentSales = await loadRecentSalesActivity();
        activities.push(...recentSales);
        
        // 2. Load low stock alerts
        const stockAlerts = await loadLowStockAlertsActivity();
        activities.push(...stockAlerts);
        
        // 3. Load out of stock alerts
        const outOfStockAlerts = await loadOutOfStockAlertsActivity();
        activities.push(...outOfStockAlerts);
        
        // 4. Load recent product additions
        const newProducts = await loadNewProductsActivity();
        activities.push(...newProducts);
        
        // Sort by timestamp (most recent first) and limit to 10 items
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        updateRecentActivityUI(sortedActivities);
        
        console.log(`✅ Loaded ${sortedActivities.length} activities and alerts`);
        
    } catch (error) {
        console.error('❌ Error loading activities:', error);
        showActivitiesErrorState();
    } finally {
        // Always reset button state
        resetRefreshButton();
    }
}

// 🔥 NEW: Show error state for activities
function showActivitiesErrorState() {
    const container = document.getElementById('recent-activity');
    
    if (container) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: #6c757d;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Failed to load activities</p>
                <small class="text-muted">Please try again</small>
                <br>
                <button class="btn btn-primary btn-sm mt-2" onclick="loadRecentActivityAndAlerts()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// 🔥 NEW: Reset refresh button to normal state
function resetRefreshButton() {
    const refreshBtn = document.getElementById('refresh-activities-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const refreshText = document.getElementById('refresh-text');
    
    if (refreshBtn && refreshIcon && refreshText) {
        refreshBtn.disabled = false;
        refreshIcon.className = 'fas fa-refresh';
        refreshText.textContent = 'Refresh';
    }
}

// 🔥 NEW: Show loading state for activities
function showActivitiesLoadingState() {
    const container = document.getElementById('recent-activity');
    const refreshBtn = document.getElementById('refresh-activities-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const refreshText = document.getElementById('refresh-text');
    
    if (container) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: #6c757d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Loading activities...</p>
                <small class="text-muted">Fetching latest data</small>
            </div>
        `;
    }
    
    // Update button to show loading state
    if (refreshBtn && refreshIcon && refreshText) {
        refreshBtn.disabled = true;
        refreshIcon.className = 'fas fa-spinner fa-spin';
        refreshText.textContent = 'Refreshing...';
    }
}

// 🔥 NEW: Auto-refresh activities when relevant events happen
function setupActivityAutoRefresh() {
    // Refresh activities when coming back to overview page
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && currentPage === 'overview') {
            loadRecentActivityAndAlerts();
        }
    });
    
    // Refresh every 5 minutes when on overview page
    setInterval(() => {
        if (currentPage === 'overview') {
            loadRecentActivityAndAlerts();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// 🔥 NEW: Load recent sales activity
async function loadRecentSalesActivity() {
    try {
        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        return sales ? sales.map(sale => ({
            icon: 'fa-shopping-cart',
            title: 'New Sale Created',
            description: `Sale ${sale.invoice_number || `#${sale.id.slice(-6)}`} for ${formatCurrency(sale.total_amount || 0)}`,
            time: formatTimeAgo(sale.created_at),
            timestamp: sale.created_at
        })) : [];
        
    } catch (error) {
        console.error('❌ Error loading sales activity:', error);
        return [];
    }
}

// 🔥 NEW: Load low stock alerts
async function loadLowStockAlertsActivity() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .gt('reorder_level', 0)
            .gt('current_stock', 0)
            .eq('is_active', true);
        
        if (error) throw error;
        
        const lowStockProducts = (products || []).filter(product => 
            (product.current_stock || 0) <= (product.reorder_level || 0)
        );
        
        return lowStockProducts.map(product => ({
            icon: 'fa-exclamation-triangle',
            title: 'Low Stock Alert',
            description: `"${product.name}" is running low (${product.current_stock} left)`,
            time: 'Just now',
            timestamp: new Date().toISOString(),
            isAlert: true,
            productId: product.id
        }));
        
    } catch (error) {
        console.error('❌ Error loading low stock alerts:', error);
        return [];
    }
}

// 🔥 NEW: Load out of stock alerts
async function loadOutOfStockAlertsActivity() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('current_stock', 0)
            .eq('is_active', true);
        
        if (error) throw error;
        
        return (products || []).map(product => ({
            icon: 'fa-times-circle',
            title: 'Out of Stock',
            description: `"${product.name}" is out of stock`,
            time: 'Just now',
            timestamp: new Date().toISOString(),
            isAlert: true,
            productId: product.id
        }));
        
    } catch (error) {
        console.error('❌ Error loading out of stock alerts:', error);
        return [];
    }
}

// 🔥 NEW: Load recently added products
async function loadNewProductsActivity() {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true)
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        return (products || []).map(product => ({
            icon: 'fa-box',
            title: 'New Product Added',
            description: `"${product.name}" was added to inventory`,
            time: formatTimeAgo(product.created_at),
            timestamp: product.created_at
        }));
        
    } catch (error) {
        console.error('❌ Error loading new products activity:', error);
        return [];
    }
}

function updateRecentActivityUI(activities) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: #6c757d;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No recent activity or alerts</p>
                <small class="text-muted">Activities and alerts will appear here</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item ${activity.isAlert ? 'activity-alert' : ''}">
            <div class="activity-icon ${activity.isAlert ? 'alert' : ''}">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">
                    ${activity.title}
                    ${activity.isAlert ? '<span class="alert-badge">Alert</span>' : ''}
                </div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
            ${activity.productId ? `
                <div class="activity-action">
                <button class="btn btn-outline btn-sm" onclick="adjustStock('${activity.productId}')">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function formatTimeAgo(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    } catch (error) {
        return 'Recently';
    }
}

// Dashboard page specific functions
function quickSale() {
    if (window.hasPermission && hasPermission('sales', 'create')) {
        showNotification('Quick Sale', 'Opening quick sale interface...', 'info');
        showDashboardPage('sales');
    } else {
        showNotification('Access Denied', 'You do not have permission to create sales.', 'error');
    }
}

function exportData(type) {
    if (window.hasPermission && hasPermission('reports', 'export')) {
        showNotification('Export', `Exporting ${type} data...`, 'info');
        // Implementation would go here
    } else {
        showNotification('Access Denied', 'You do not have permission to export data.', 'error');
    }
}

// Initialize dashboard components
async function initializeDashboardComponents() {
    if (currentBusiness?.id) {
        if (window.loadFinancialSummary) await loadFinancialSummary();
        if (window.loadInventorySummary) await loadInventorySummary();
        if (window.loadBusinessAlerts) await loadBusinessAlerts();
        updateDashboardMetrics();
    }
}

function updateDashboardMetrics() {
    const businessNameElement = document.getElementById('current-business-name');
    if (businessNameElement) {
        businessNameElement.textContent = currentBusiness?.name || 'No Business Selected';
    }
    
    // Update any other business-specific UI elements
    const businessElements = document.querySelectorAll('[data-business-name]');
    businessElements.forEach(element => {
        if (currentBusiness) {
            element.textContent = currentBusiness.name;
        }
    });
}

// Business-aware financial summary
async function loadFinancialSummary() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for financial summary');
        return;
    }
    
    try {
        // Check if caching functions exist
        if (typeof loadBusinessData === 'function') {
            const cached = loadBusinessData('financial_summary');
            if (cached) {
                console.log('📊 Using cached financial summary for business:', currentBusiness.name);
                updateFinancialUI(cached);
                return;
            }
        }
        
        // Load sales data for current business
        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        if (error) throw error;
        
        const summary = {
            totalSales: sales ? sales.length : 0,
            totalRevenue: sales ? sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) : 0,
            pendingInvoices: sales ? sales.filter(sale => sale.status === 'pending').length : 0,
            avgSaleValue: sales && sales.length > 0 ? sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) / sales.length : 0
        };
        
        // Cache the result if saveBusinessData exists
        if (typeof saveBusinessData === 'function') {
            saveBusinessData('financial_summary', summary);
        }
        
        updateFinancialUI(summary);
        
    } catch (error) {
        console.error('❌ Financial summary error:', error);
        // Set default values on error
        updateFinancialUI({
            totalSales: 0,
            totalRevenue: 0,
            pendingInvoices: 0,
            avgSaleValue: 0
        });
    }
}

function updateFinancialUI(summary) {
    const totalSalesElement = document.getElementById('total-sales-count');
    const totalAmountElement = document.getElementById('total-sales-amount');
    const pendingInvoicesElement = document.getElementById('pending-invoices');
    const avgSaleValueElement = document.getElementById('avg-sale-value');
    
    if (totalSalesElement) totalSalesElement.textContent = summary.totalSales;
    if (totalAmountElement) totalAmountElement.textContent = formatCurrency(summary.totalRevenue);
    if (pendingInvoicesElement) pendingInvoicesElement.textContent = summary.pendingInvoices;
    if (avgSaleValueElement) avgSaleValueElement.textContent = formatCurrency(summary.avgSaleValue);
}

// Clear all dashboard data
function clearDashboardData() {
    console.log('🧹 Clearing dashboard data...');
    
    // Clear dashboard metrics
    const metricIds = [
        'today-sales', 'today-revenue', 'low-stock-count',
        'total-sales-count', 'total-sales-amount', 'pending-invoices',
        'avg-sale-value', 'total-products', 'total-stock-value',
        'out-of-stock-count', 'low-stock-count'
    ];
    
    metricIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
        }
    });
    
    // Clear charts
    if (window.salesChart) {
        salesChart.destroy();
        salesChart = null;
    }
    if (window.revenueChart) {
        revenueChart.destroy();
        revenueChart = null;
    }
    
    // Clear recent activity
    const recentActivity = document.getElementById('recent-activity');
    if (recentActivity) {
        recentActivity.innerHTML = '';
    }
    
    // Clear all page-specific data
    clearAllPageData();
}

function clearAllPageData() {
    console.log('🧹 Clearing all page data...');
    
    // Clear sales page data
    const salesTable = document.getElementById('sales-table-body');
    if (salesTable) salesTable.innerHTML = '';
    
    // Clear inventory page data  
    const inventoryTable = document.getElementById('inventory-table-body');
    if (inventoryTable) inventoryTable.innerHTML = '';
    
    // Clear staff page data
    const staffTable = document.getElementById('staff-table-body');
    if (staffTable) staffTable.innerHTML = '';
    
    // Clear customer page data
    const customersTable = document.getElementById('customers-table-body');
    if (customersTable) customersTable.innerHTML = '';
    
    // Clear any other page data
    const allTableBodies = document.querySelectorAll('tbody');
    allTableBodies.forEach(tbody => {
        if (tbody.innerHTML.trim() !== '') {
            tbody.innerHTML = '';
        }
    });
}

// 🔥 ADD: Make functions globally available
window.showDashboard = showDashboard;
window.showDashboardPage = showDashboardPage;
window.initializeOverviewPage = initializeOverviewPage;
window.initializeSalesPage = initializeSalesPage;
window.initializeInventoryPage = initializeInventoryPage;
window.initializeStaffPage = initializeStaffPage;
window.quickSale = quickSale;
window.exportData = exportData;
window.showFirstAccessiblePage = showFirstAccessiblePage;
window.loadRecentActivityAndAlerts = loadRecentActivityAndAlerts;
window.loadRecentActivity = loadRecentActivityAndAlerts;

console.log('✅ Enhanced dashboard functions loaded successfully');