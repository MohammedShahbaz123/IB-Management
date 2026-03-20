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

         // 🔥 NEW: Try to initialize salesManagement if available
        if (typeof initializeSalesManagement === 'function') {
            console.log('🔄 Initializing sales management...');
            try {
                await initializeSalesManagement();
                console.log('✅ salesManagement initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize salesManagement:', error);
            }
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

if (window.addEventListener) {
    window.addEventListener('businessChanged', async function() {
        console.log('🏢 Business changed event received in dashboard.js');
        
        // Reload the current page
        const currentPage = localStorage.getItem('activeDashboardPage') || 'overview';
        console.log('🔄 Reloading current page after business change:', currentPage);
        
        // Force reload of current page
        await showDashboardPage(currentPage);
    });
}

// Enhanced navigation that doesn't reset on tab switch
async function showDashboardPage(page) {
    if (isNavigating) {
        console.log('⚠️ Navigation in progress, skipping...');
        return;
    }
    
    isNavigating = true;
    
    try {
        console.log('📄 Navigating to:', page, 'for business:', currentBusiness?.name);
        
        // Save current page
        sessionStorage.setItem('currentPage', page);
        localStorage.setItem('activeDashboardPage', page);
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
        updateActiveNavigation(page);
        
        // Initialize specific page if needed
        if (page === 'settings') {
            // Give it a moment to render, then initialize
            setTimeout(() => {
                if (typeof initializeSettingsPage === 'function') {
                    initializeSettingsPage();
                }
            }, 100);
        } else {
            // Force re-initialize page content for other pages
            await forceInitializePageContent(page);
        }

        if (page === 'businesses') {
        // Initialize business management page
        if (window.initializeBusinessManagementPage) {
            await initializeBusinessManagementPage();
        }
    }
        
        console.log('✅ Dashboard page shown:', page, 'for business:', currentBusiness?.name);
        
    } catch (error) {
        console.error('❌ Error showing dashboard page:', error);
    } finally {
        isNavigating = false;
    }
}

// New function: Force initialize page content (no caching)
async function forceInitializePageContent(page) {
    try {
        // Clear any cached data for this page
        if (window.clearBusinessData) {
            clearBusinessData(`${page}_data`);
        }
        
        switch (page) {
            case 'overview':
                // Clear all cached data
                clearDashboardData();
                await initializeOverviewPage();
                break;
            case 'sales':
                if (window.initializeSalesManagement) {
                    await initializeSalesManagement();
                }
                break;
             case 'purchases':
                    if (!window.purchasesManagement) {
                        initializePurchasesManagement();
                    } else {
                        purchasesManagement.loadPurchasesData();
                    }
                    break;
            case 'inventory':
                if (window.initializeInventoryPage) {
                    await initializeInventoryPage();
                }
                break;
            case 'staff':
                if (window.initializeStaffManagement) {
                    await initializeStaffManagement();
                }
                break;
            case 'parties':
                if (window.initializePartiesSystem) {
                    await initializePartiesSystem();
                }
                break;
            case 'expenses':
            if (typeof initializeExpenseManagement === 'function') {
                await initializeExpenseManagement();
            }
            break;
            default:
                console.log('ℹ️ No specific initialization for page:', page);
        }
    } catch (error) {
        console.error(`❌ Error forcing initialization of page ${page}:`, error);
        throw error;
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
            case 'parties':
                if (window.initializePartiesSystem) await initializePartiesSystem();
                break;
            case 'expenses':
                if (window.initializeExpenseManagement) await initializeExpenseManagement();
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
        const accessiblePages = ['overview', 'sales', 'inventory', 'customers', 'staff', 'reports','parties'];
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

async function loadCharts() {
    try {
        const salesChartEl = document.getElementById('salesChart');
        const revenueChartEl = document.getElementById('revenueChart');
        
        if (!salesChartEl || !revenueChartEl) {
            console.warn('⚠️ Chart elements not found');
            return;
        }
        
        const period = document.getElementById('chart-period')?.value || 30;
        console.log(`📊 Loading charts for period: ${period} days`);
        
        // 🔥 FIX: Safely destroy existing charts
        if (salesChart && typeof salesChart.destroy === 'function') {
            try {
                salesChart.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying sales chart:', e);
            }
        }
        
        if (revenueChart && typeof revenueChart.destroy === 'function') {
            try {
                revenueChart.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying revenue chart:', e);
            }
        }
        
        // 🔥 NEW: Load REAL sales data from database
        const salesData = await loadRealSalesData(period);
        const revenueData = await loadRealRevenueData(period);
        
        // Create sales chart with real data
        const salesCtx = salesChartEl.getContext('2d');
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Daily Sales',
                    data: salesData.data,
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Sales: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Sales'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
        
        // Create revenue chart with real data
        const revenueCtx = revenueChartEl.getContext('2d');
revenueChart = new Chart(revenueCtx, {
    type: 'line', // Changed from 'bar' to 'line' to match sales chart
    data: {
        labels: revenueData.labels, // Now uses daily labels
        datasets: [{
            label: 'Daily Revenue (₹)',
            data: revenueData.data, // Now uses daily data
            backgroundColor: 'rgba(76, 201, 240, 0.1)', // Semi-transparent fill
            borderColor: 'rgba(76, 201, 240, 1)',
            borderWidth: 2,
            tension: 0.4, // Smooth line
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Revenue: ₹${context.raw.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Revenue (₹)'
                },
                ticks: {
                    callback: function(value) {
                        return '₹' + value.toLocaleString();
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Date'
                }
            }
        }
    }
});
        
        console.log('✅ Charts loaded with real data');
        
    } catch (error) {
        console.error('❌ Chart loading error:', error);
        // Show fallback message
        showChartFallback();
    }
}

function showChartFallback() {
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            const parent = canvas.parentElement;
            parent.innerHTML = `
                <div class="chart-fallback" style="height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px; padding: 20px;">
                    <div class="text-center">
                        <i class="fas fa-chart-line" style="font-size: 2rem; color: #6c757d; margin-bottom: 10px;"></i>
                        <p style="color: #6c757d; margin-bottom: 5px;">Chart data unavailable</p>
                        <small style="color: #adb5bd;">Check your internet connection or try again</small>
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadCharts()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    });
}

function getDefaultChartData(days, isRevenue = false) {
    const labels = [];
    const data = [];
    
    if (isRevenue) {
        // Weekly labels for revenue
        const weeks = Math.ceil(days / 7);
        for (let i = 1; i <= weeks; i++) {
            labels.push(`Week ${i}`);
            data.push(0);
        }
    } else {
        // Daily labels for sales
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - i - 1));
            labels.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
            data.push(0);
        }
    }
    
    return { labels, data };
}

async function loadRealSalesData(days = 30) {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No business selected for sales data');
        return getDefaultChartData(days);
    }
    
    try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        console.log(`📊 Loading sales data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // 🔥 FIX: Remove is_active filter since column doesn't exist
        const { data: sales, error } = await supabase
            .from('sales')
            .select('created_at, total_amount')
            .eq('business_id', currentBusiness.id)
            // REMOVED: .eq('is_active', true) - this column doesn't exist
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('❌ Error loading sales data:', error);
            return getDefaultChartData(days);
        }
        
        if (!sales || sales.length === 0) {
            console.log('ℹ️ No sales data found for period');
            return getDefaultChartData(days);
        }
        
        // Group sales by date
        const salesByDate = {};
        sales.forEach(sale => {
            const date = new Date(sale.created_at).toISOString().split('T')[0];
            if (!salesByDate[date]) {
                salesByDate[date] = 0;
            }
            salesByDate[date]++;
        });
        
        // Generate labels for all days in the period
        const labels = [];
        const data = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayLabel = currentDate.toLocaleDateString('en-IN', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            labels.push(dayLabel);
            data.push(salesByDate[dateStr] || 0);
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`✅ Loaded ${sales.length} sales across ${labels.length} days`);
        
        return { labels, data };
        
    } catch (error) {
        console.error('❌ Error processing sales data:', error);
        return getDefaultChartData(days);
    }
}

async function loadRealRevenueData(days = 30) {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No business selected for revenue data');
        return getDefaultChartData(days, false); // Changed to false for daily data
    }
    
    try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        console.log(`💰 Loading revenue data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // 🔥 FIX: Remove is_active filter since column doesn't exist
        const { data: sales, error } = await supabase
            .from('sales')
            .select('created_at, total_amount')
            .eq('business_id', currentBusiness.id)
            // REMOVED: .eq('is_active', true) - this column doesn't exist
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('❌ Error loading revenue data:', error);
            return getDefaultChartData(days, false); // Changed to false for daily data
        }
        
        if (!sales || sales.length === 0) {
            console.log('ℹ️ No revenue data found for period');
            return getDefaultChartData(days, false); // Changed to false for daily data
        }
        
        // 🔥 CHANGE: Group revenue by date (DAILY, not weekly)
        const revenueByDate = {};
        sales.forEach(sale => {
            const date = new Date(sale.created_at).toISOString().split('T')[0];
            if (!revenueByDate[date]) {
                revenueByDate[date] = 0;
            }
            revenueByDate[date] += (sale.total_amount || 0);
        });
        
        // 🔥 CHANGE: Generate DAILY labels and data (same as sales data)
        const labels = [];
        const data = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayLabel = currentDate.toLocaleDateString('en-IN', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            labels.push(dayLabel);
            data.push(revenueByDate[dateStr] || 0);
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`✅ Loaded revenue data: ${sales.length} sales, total ₹${data.reduce((a, b) => a + b, 0).toLocaleString()} across ${labels.length} days`);
        
        return { labels, data }; // Now returns daily data
        
    } catch (error) {
        console.error('❌ Error processing revenue data:', error);
        return getDefaultChartData(days, false); // Changed to false for daily data
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
        
        // Sort by timestamp (most recent first)
        const sortedActivities = activities.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA; // Descending (newest first)
        });
        
        // Store activities globally for access in modal
        window.allActivitiesData = sortedActivities;
        
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
            <div class="table-responsive">
                <table class="table table-hover" style="margin-bottom: 0;">
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th style="width: 60px;">Type</th>
                            <th>Description</th>
                            <th style="width: 100px;">Time/Date</th>
                            <th style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recent-activities-body">
                        ${Array.from({ length: 5 }).map((_, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td class="text-center">
                                    <div class="placeholder-glow">
                                        <div class="placeholder col-2" style="height: 20px;"></div>
                                    </div>
                                </td>
                                <td>
                                    <div class="placeholder-glow">
                                        <div class="placeholder col-8" style="height: 20px;"></div>
                                    </div>
                                </td>
                                <td>
                                    <div class="placeholder-glow">
                                        <div class="placeholder col-4" style="height: 20px;"></div>
                                    </div>
                                </td>
                                <td>
                                    <div class="placeholder-glow">
                                        <div class="placeholder col-3" style="height: 20px;"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
            // Removed: .eq('is_active', true) if column doesn't exist
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        return sales ? sales.map(sale => ({
            id: sale.id, // 🔥 IMPORTANT: Make sure ID is included
            type: 'sale', // 🔥 IMPORTANT: Add type field
            icon: 'fa-shopping-cart',
            title: 'New Sale',
            description: `${sale.invoice_number || `#${sale.id?.slice(-6) || 'N/A'}`} - ${formatCurrency(sale.total_amount || 0)}`,
            time: formatTimeAgo(sale.created_at),
            timestamp: sale.created_at,
            isAlert: false
        })) : [];
        
    } catch (error) {
        console.error('❌ Error loading sales activity:', error);
        return [];
    }
}

function showAllActivitiesPage() {
    console.log('📄 Opening all activities page...');
    
    // Store current page before navigating
    localStorage.setItem('previousPage', currentPage);
    
    // Create or show the all activities page
    const pageId = 'all-activities-page';
    let page = document.getElementById(pageId);
    
    if (!page) {
        // Create the page if it doesn't exist
        page = document.createElement('div');
        page.id = pageId;
        page.className = 'page-content';
        page.innerHTML = createAllActivitiesPageHTML();
        
        // Add to main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(page);
        } else {
            // Fallback to body
            document.body.appendChild(page);
        }
    }
    
    // Hide all other pages
    document.querySelectorAll('.page-content').forEach(p => {
        if (p.id !== pageId) {
            p.classList.add('d-none');
        }
    });
    
    // Show the all activities page
    page.classList.remove('d-none');
    
    // Update current page
    currentPage = 'all-activities';
    
    // Load activities data for the page
    setTimeout(() => loadAllActivitiesPage(), 100);
}

async function loadAllActivitiesPage() {
    try {
        // Show loading state
        const tableBody = document.getElementById('all-activities-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                            <p>Loading activities...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Load fresh data
        let activities = [];
        activities = await loadAllActivitiesFromDatabase();
        window.allActivitiesData = activities;
        
        console.log(`📊 Loaded ${activities.length} total activities`);
        
        // Setup event listeners for filters
        setupActivitiesPageFilters();
        
        // Setup search field with clear button
        setupActivitiesSearchField();
        
        // Initialize pagination
        initializeActivitiesPagination(activities);
        
        // Update filter button counts with ALL activities (not filtered)
        updateFilterButtonCounts(activities);
        
        // Apply initial filters and render
        applyActivitiesFilters();

        initializeEnhancedDateRangeDropdown();
        
    } catch (error) {
        console.error('❌ Error loading activities page:', error);
        const tableBody = document.getElementById('all-activities-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Failed to load activities
                            <p class="mb-0 mt-2 small">${error.message}</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="loadAllActivitiesPage()">
                                <i class="fas fa-redo me-1"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

function setupActivitiesPageFilters() {
    // Setup filter button click events
    const filterButtons = ['filter-all', 'filter-alerts', 'filter-sales', 'filter-purchases'];
    
    filterButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all buttons
                filterButtons.forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Apply filters immediately
                applyActivitiesFilters();
            });
        }
    });
    
    // Setup date range filter change event
    const dateRangeFilter = document.getElementById('date-range-filter');
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', function() {
            applyActivitiesFilters();
        });
    }
} 

function updateFilterButtonStates() {
    const filterState = getCurrentFilterState();
    const buttons = ['filter-all', 'filter-alerts', 'filter-sales', 'filter-purchases'];
    
    // Remove active class from all buttons
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    
    // Determine which button should be active
    let activeButtonId = 'filter-all';
    
    if (filterState.type === 'stock_alert' && filterState.status === 'alert') {
        activeButtonId = 'filter-alerts';
    } else if (filterState.type === 'sale') {
        activeButtonId = 'filter-sales';
    } else if (filterState.type === 'purchase') {
        activeButtonId = 'filter-purchases';
    }
    
    // Add active class to appropriate button
    const activeButton = document.getElementById(activeButtonId);
    if (activeButton) activeButton.classList.add('active');
}

function setupActivitiesSearchField() {
    const searchInput = document.getElementById('activities-search-input');
    const clearBtn = document.getElementById('clear-activities-search-btn');
    
    if (!searchInput || !clearBtn) return;
    
    // Show/hide clear button based on input
    searchInput.addEventListener('input', function() {
        if (this.value.trim()) {
            clearBtn.style.display = 'block';
            // Trigger search immediately
            searchActivitiesInPage();
        } else {
            clearBtn.style.display = 'none';
            // If cleared, refresh with current filters
            applyActivitiesFilters();
        }
    });
    
    // Clear search when X is clicked
    clearBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        searchInput.value = '';
        searchInput.focus();
        clearBtn.style.display = 'none';
        applyActivitiesFilters(); // Refresh with cleared search
    });
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchActivitiesInPage();
        }
    });
    
    // Focus on search field when page loads
    setTimeout(() => {
        if (searchInput) {
            searchInput.focus();
        }
    }, 300);
}

function searchActivitiesInPage() {
    const searchTerm = document.getElementById('activities-search-input').value.toLowerCase().trim();
    const filterState = getCurrentFilterState();
    
    console.log('🔍 Searching with:', { searchTerm, filterState });
    
    // Filter all activities
    let filtered = [...window.allActivitiesData];
    
    // Apply type filter from active button
    if (filterState.type !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(a => a.type === filterState.type);
        console.log(`📊 Filtered by type '${filterState.type}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply status filter from active button
    if (filterState.status !== 'all') {
        const beforeCount = filtered.length;
        if (filterState.status === 'alert') {
            filtered = filtered.filter(a => a.isAlert === true);
        } else {
            filtered = filtered.filter(a => a.isAlert === false);
        }
        console.log(`📊 Filtered by status '${filterState.status}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply date range filter
    if (filterState.dateRange !== 'all') {
        const beforeCount = filtered.length;
        filtered = filterByDateRange(filtered, filterState.dateRange);
        console.log(`📊 Filtered by date range '${filterState.dateRange}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply search filter
    if (searchTerm) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(activity => {
            return (
                activity.title.toLowerCase().includes(searchTerm) ||
                activity.description.toLowerCase().includes(searchTerm) ||
                (activity.metadata?.invoiceNumber && activity.metadata.invoiceNumber.toLowerCase().includes(searchTerm)) ||
                (activity.type && activity.type.toLowerCase().includes(searchTerm))
            );
        });
        console.log(`📊 Filtered by search '${searchTerm}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Store and render results
    window.currentFilteredActivities = filtered;
    window.currentPage = 1;
    
    console.log(`✅ Final filtered count: ${filtered.length}`);
    
    renderActivitiesTable(filtered);
}

function applyAdditionalFilters(activities, filterState) {
    let filtered = [...activities];
    
    // Apply date range filter
    if (filterState.dateRange !== 'all') {
        filtered = filterByDateRange(filtered, filterState.dateRange);
    }
    
    // Apply type filter
    if (filterState.type !== 'all') {
        filtered = filtered.filter(a => a.type === filterState.type);
    }
    
    // Apply status filter
    if (filterState.status !== 'all') {
        filtered = filtered.filter(a => 
            filterState.status === 'alert' ? a.isAlert : !a.isAlert
        );
    }
    
    return filtered;
}

function applyActivitiesFilters() {
    const searchTerm = document.getElementById('activities-search-input')?.value.toLowerCase().trim() || '';
    const filterState = getCurrentFilterState();
    
    console.log('🔍 Applying filters:', { searchTerm, filterState });
    
    // Filter all activities
    let filtered = [...window.allActivitiesData];
    
    console.log('📊 Total activities:', filtered.length);
    
    // Apply type filter
    if (filterState.type !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(a => a.type === filterState.type);
        console.log(`📊 Filtered by type '${filterState.type}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply status filter
    if (filterState.status !== 'all') {
        const beforeCount = filtered.length;
        if (filterState.status === 'alert') {
            filtered = filtered.filter(a => a.isAlert === true);
        } else {
            filtered = filtered.filter(a => a.isAlert === false);
        }
        console.log(`📊 Filtered by status '${filterState.status}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply date range filter
    if (filterState.dateRange !== 'all') {
        const beforeCount = filtered.length;
        filtered = filterByDateRange(filtered, filterState.dateRange);
        console.log(`📊 Filtered by date range '${filterState.dateRange}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Apply search filter if any
    if (searchTerm) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(activity => 
            activity.title.toLowerCase().includes(searchTerm) ||
            activity.description.toLowerCase().includes(searchTerm) ||
            (activity.metadata?.invoiceNumber && activity.metadata.invoiceNumber.toLowerCase().includes(searchTerm)) ||
            (activity.type && activity.type.toLowerCase().includes(searchTerm))
        );
        console.log(`📊 Filtered by search '${searchTerm}': ${beforeCount} -> ${filtered.length}`);
    }
    
    // Store filtered results
    window.currentFilteredActivities = filtered;
    window.currentPage = 1;
    
    console.log(`✅ Final filtered count: ${filtered.length}`);
    
    // Update filter button counts with current filtered results
    updateFilterButtonCounts(filtered);
    
    // Render table
    renderActivitiesTable(filtered);
}

function filterByDateRange(activities, range) {
    const now = new Date();
    const startDate = new Date();
    
    switch(range) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(startDate);
            yesterdayEnd.setHours(23, 59, 59, 999);
            return activities.filter(activity => {
                const activityDate = new Date(activity.timestamp);
                return activityDate >= startDate && activityDate <= yesterdayEnd;
            });
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate.setDate(startDate.getDate() - 30);
            break;
        case 'quarter':
            startDate.setDate(startDate.getDate() - 90);
            break;
        case 'year':
            startDate.setDate(startDate.getDate() - 365);
            break;
        default:
            return activities; // 'all' - no date filtering
    }
    
    return activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= startDate;
    });
}

function getCurrentFilterState() {
    // Get active button filter
    let type = 'all';
    let status = 'all';
    
    const activeButton = document.querySelector('.btn-group .btn.active');
    if (activeButton) {
        if (activeButton.id === 'filter-alerts') {
            type = 'stock_alert';
            status = 'alert';
        } else if (activeButton.id === 'filter-sales') {
            type = 'sale';
            status = 'all'; // Show all sales, not just alert sales
        } else if (activeButton.id === 'filter-purchases') {
            type = 'purchase';
            status = 'all';
        }
        // For 'all' button, both type and status remain 'all'
    }
    
    return {
        dateRange: document.getElementById('date-range-filter')?.value || 'all',
        type: type,
        status: status
    };
}

function initializeActivitiesPagination(activities) {
    window.currentPage = 1;
    window.pageSize = 20;
    window.currentFilteredActivities = [...activities];
    
    // Setup event listeners for pagination buttons
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (window.currentPage > 1) {
                window.currentPage--;
                renderActivitiesTable(window.currentFilteredActivities, window.currentPage, window.pageSize);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(window.currentFilteredActivities.length / window.pageSize);
            if (window.currentPage < totalPages) {
                window.currentPage++;
                renderActivitiesTable(window.currentFilteredActivities, window.currentPage, window.pageSize);
            }
        });
    }
    
    // Initial render
    renderActivitiesTable(activities, 1, window.pageSize);
}

function updatePaginationButtons(currentPage, totalPages) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.innerHTML = currentPage <= 1 ? 
            '<i class="fas fa-chevron-left"></i>' : 
            `<i class="fas fa-chevron-left"></i> Page ${currentPage - 1}`;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.innerHTML = currentPage >= totalPages ? 
            '<i class="fas fa-chevron-right"></i>' : 
            `Page ${currentPage + 1} <i class="fas fa-chevron-right"></i>`;
    }
}

async function loadAllActivitiesFromDatabase() {
    console.log('📊 Loading all activities from database...');
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No business selected');
        return [];
    }
    
    const activities = [];
    
    try {
        // 1. Load sales activities
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (!salesError && sales) {
    sales.forEach(sale => {
        activities.push({
            id: sale.id,
            type: 'sale', // Make sure type is 'sale'
            icon: 'fa-shopping-cart',
            title: 'Sale Invoice',
            description: `Invoice #${sale.invoice_number || sale.id.slice(-6)} - ${formatCurrency(sale.total_amount || 0)}`,
            timestamp: sale.created_at,
            isAlert: false,
            metadata: {
                invoiceNumber: sale.invoice_number,
                customerId: sale.customer_id,
                amount: sale.total_amount
            }
        });
    });
    console.log(`✅ Loaded ${sales.length} sales`);
} else if (salesError) {
            console.error('❌ Error loading sales:', salesError);
        }
        
        // 2. Load purchases (if you have a purchases table)
        try {
            const { data: purchases, error: purchasesError } = await supabase
                .from('purchases')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .order('created_at', { ascending: false })
                .limit(30);
            
            if (!purchasesError && purchases) {
                purchases.forEach(purchase => {
                    activities.push({
                        id: purchase.id,
                        type: 'purchase', // Type is 'purchase'
                        icon: 'fa-truck',
                        title: 'Purchase Order',
                        description: `PO #${purchase.invoice_number || purchase.id.slice(-6)} - ${formatCurrency(purchase.total_amount || 0)}`,
                        timestamp: purchase.created_at,
                        isAlert: false,
                        metadata: {
                            invoiceNumber: purchase.invoice_number,
                            supplierId: purchase.supplier_id,
                            amount: purchase.total_amount
                        }
                    });
                });
                console.log(`✅ Loaded ${purchases.length} purchases`);
            }
        } catch (purchaseErr) {
            console.log('ℹ️ No purchases table or error:', purchaseErr.message);
        }
        
        // 3. Load low stock alerts
        const { data: lowStockProducts, error: lowStockError } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .gt('reorder_level', 0)
            .gt('current_stock', 0);
        
        if (!lowStockError && lowStockProducts) {
            const lowStockAlerts = lowStockProducts.filter(p => p.current_stock <= p.reorder_level);
            lowStockAlerts.forEach(product => {
                activities.push({
                    id: product.id,
                    type: 'stock_alert', // Type is 'stock_alert'
                    icon: 'fa-exclamation-triangle',
                    title: 'Low Stock Alert',
                    description: `${product.name} (${product.current_stock} left, reorder at ${product.reorder_level})`,
                    timestamp: product.updated_at || product.created_at,
                    isAlert: true, // This is important - alerts have isAlert = true
                    metadata: {
                        productId: product.id,
                        currentStock: product.current_stock,
                        reorderLevel: product.reorder_level
                    }
                });
            });
            console.log(`✅ Loaded ${lowStockAlerts.length} low stock alerts`);
        }
        
        // 4. Load out of stock alerts
        const { data: outOfStockProducts, error: outOfStockError } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('current_stock', 0);
        
        if (!outOfStockError && outOfStockProducts) {
            outOfStockProducts.forEach(product => {
                activities.push({
                    id: product.id,
                    type: 'stock_alert', // Type is 'stock_alert'
                    icon: 'fa-times-circle',
                    title: 'Out of Stock',
                    description: `${product.name} (0 in stock)`,
                    timestamp: product.updated_at || product.created_at,
                    isAlert: true, // This is important - alerts have isAlert = true
                    metadata: {
                        productId: product.id,
                        currentStock: 0
                    }
                });
            });
            console.log(`✅ Loaded ${outOfStockProducts.length} out of stock alerts`);
        }
        
        // 5. Load new products
        const { data: newProducts, error: newProductsError } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (!newProductsError && newProducts) {
            newProducts.forEach(product => {
                activities.push({
                    id: product.id,
                    type: 'product', // Type is 'product'
                    icon: 'fa-box',
                    title: 'New Product Added',
                    description: `${product.name} - ${formatCurrency(product.selling_price || 0)}`,
                    timestamp: product.created_at,
                    isAlert: false,
                    metadata: {
                        productId: product.id,
                        price: product.selling_price
                    }
                });
            });
            console.log(`✅ Loaded ${newProducts.length} new products`);
        }
        
        // Sort all activities by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📊 Total activities loaded: ${activities.length}`);
        
        // Debug: Count by type
        const typeCounts = {};
        activities.forEach(a => {
            typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
        });
        console.log('📊 Activities by type:', typeCounts);
        
        return activities;
        
    } catch (error) {
        console.error('❌ Error loading activities from database:', error);
        return [];
    }
}

// Add this function after the existing functions
function openSalesInvoicePreview(saleId, invoiceNumber = '') {
    console.log(`🔍 Opening sales invoice preview for ID: ${saleId}`);
    
    // Check if sales management module exists
    if (window.salesManagement && typeof salesManagement.showInvoicePreview === 'function') {
        // Use the existing sales management preview
        salesManagement.showInvoicePreview(saleId, invoiceNumber);
    } else {
        // Fallback to generic preview modal
        openActivityPreviewModal('sale', saleId);
    }
}

// Make it globally available
window.openSalesInvoicePreview = openSalesInvoicePreview;

function renderActivitiesTable(activities) {
    const tableBody = document.getElementById('all-activities-table-body');
    const countElement = document.getElementById('activities-count');
    
    if (!tableBody) return;
    
    if (activities.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-search fa-2x mb-3"></i>
                        <p>No activities found</p>
                        <p class="small mb-0">Try adjusting your filters</p>
                    </div>
                </td>
            </tr>
        `;
        
        if (countElement) {
            countElement.textContent = 'No activities found';
        }
        return;
    }
    
    // Render ALL activities at once (no pagination)
    tableBody.innerHTML = activities.map((activity, index) => {
        const isTransaction = activity.type === 'sale' || activity.type === 'purchase';
        
        return `
            <tr class="${activity.isAlert ? 'table-warning' : ''} ${isTransaction ? 'clickable-row' : ''}"
                data-activity-id="${activity.id}"
                data-activity-type="${activity.type}"
                ${isTransaction ? 'style="cursor: pointer;"' : ''}
                onclick="${isTransaction ? `viewActivityDetails('${activity.type}', '${activity.id}')` : ''}">
                <td class="fw-medium text-muted">${index + 1}</td>
                <td class="text-center">
                    <i class="fas ${activity.icon} ${activity.isAlert ? 'text-warning' : 'text-primary'} fa-lg"></i>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="fw-medium">${activity.title}</span>
                            ${activity.isAlert ? '<span class="badge bg-warning ms-2">Alert</span>' : ''}
                        </div>
                        <small class="text-muted mt-1">${activity.description}</small>
                    </div>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <small class="text-muted">${getFullDateTime(activity.timestamp)}</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${activity.metadata?.productId ? `
                            <button class="btn btn-outline-primary" 
                                    onclick="event.stopPropagation(); adjustStock('${activity.metadata.productId}')"
                                    title="Restock Product">
                                <i class="fas fa-plus"></i>
                            </button>
                        ` : ''}
                        
                        ${isTransaction ? `
                            <button class="btn btn-outline-info" 
                                    onclick="event.stopPropagation(); viewActivityDetails('${activity.type}', '${activity.id}')"
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary" 
                                    onclick="event.stopPropagation(); printTransaction('${activity.type}', '${activity.id}')"
                                    title="Print">
                                <i class="fas fa-print"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function printTransaction(type, id) {
    if (type === 'sale') {
        printSaleInvoice(id);
    } else {
        showNotification('Info', 'Print not available for this transaction type', 'info');
    }
}

async function viewActivityDetails(type, id) {
    console.log(`🔍 Viewing ${type} details for ID: ${id}`);
    
    if (type === 'sale') {
        try {
            // Fetch invoice number from database directly
            const { data: sale, error } = await supabase
                .from('sales')
                .select('invoice_number')
                .eq('id', id)
                .eq('business_id', currentBusiness.id)
                .single();
            
            let invoiceNumber = 'INV-' + id.slice(-6);
            
            if (!error && sale && sale.invoice_number) {
                invoiceNumber = sale.invoice_number;
                console.log(`✅ Found invoice number in database: ${invoiceNumber}`);
            } else if (error) {
                console.error('Error fetching invoice number:', error);
            }

             updateNavigationForSales();
             updateGlobalNavigation('sales');
            // Open sale invoice preview
            if (window.salesManagement && typeof salesManagement.showInvoicePreview === 'function') {
                console.log(`📄 Opening invoice preview with invoice number: ${invoiceNumber}`);
                salesManagement.showInvoicePreview(id, invoiceNumber);
            } else {
                openActivityPreviewModal(type, id);
            }
        } catch (error) {
            console.error('Error in viewActivityDetails:', error);
            // Fallback
            updateNavigationForSales();
             updateGlobalNavigation('sales');
            if (window.salesManagement && typeof salesManagement.showInvoicePreview === 'function') {
                salesManagement.showInvoicePreview(id, 'INV-' + id.slice(-6));
            } else {
                openActivityPreviewModal(type, id);
            }
        }
    } else if (type === 'purchase') {
        openActivityPreviewModal(type, id);
    } else if (type === 'stock_alert') {
        openActivityPreviewModal(type, id);
    } else {
        openActivityPreviewModal(type, id);
    }
}

function updateNavigationForSales() {
    console.log('🎯 Updating navigation to Sales section');
    
    // 1. Update URL hash
    if (window.history && window.history.pushState) {
        const state = { 
            page: 'sales',
            section: 'invoice-preview'
        };
        
        window.history.pushState(state, 'Sales Invoice', '#sales');
        console.log('✅ URL updated to show Sales section');
    }
    
    // 2. Update current page tracking
    currentPage = 'sales';
    
    // 3. Update sidebar navigation (only if sidebar exists)
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    if (sidebarLinks.length > 0) {
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });
        
        // Highlight Sales in sidebar
        const salesLink = document.querySelector('.sidebar-menu a[data-page="sales"]');
        if (salesLink) {
            salesLink.classList.add('active');
            salesLink.setAttribute('aria-current', 'page');
            console.log('✅ Sales menu item highlighted in sidebar');
        }
    }
    
    // 4. Update page title
    document.title = `Invoice Preview - Sales - IB Manager`;
    
    // 5. If we're coming from dashboard overview page, hide dashboard and show sales page
    const dashboard = document.getElementById('dashboard');
    const salesPage = document.getElementById('sales-page');
    
    if (dashboard && !dashboard.classList.contains('d-none') && salesPage) {
        // Actually show the sales page, not just update navigation
        showDashboardPage('sales');
    }
    
    console.log('✅ Navigation updated to Sales section');
}

function openActivityPreviewModal(type, id) {
    const modal = document.getElementById('activity-preview-modal');
    const title = document.getElementById('preview-title');
    const content = document.getElementById('preview-content');
    
    if (!modal || !title || !content) return;
    
    // Show loading state
    title.textContent = 'Loading...';
    content.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Loading details...</p>
        </div>
    `;
    
    modal.classList.remove('d-none');
    
    // Load details based on type
    setTimeout(() => {
        if (type === 'sale') {
            loadSaleDetails(id, content);
        } else if (type === 'stock_alert') {
            loadStockAlertDetails(id, content);
        } else {
            loadGenericActivityDetails(type, id, content);
        }
    }, 100);
}

function loadGenericActivityDetails(type, id, contentElement) {
    document.getElementById('preview-title').textContent = 'Activity Details';
    
    contentElement.innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Activity details view is not available for this type.
        </div>
        <div class="text-center">
            <button class="btn btn-outline" onclick="closePreviewModal()">
                <i class="fas fa-times me-1"></i> Close
            </button>
        </div>
    `;
}

async function loadStockAlertDetails(productId, contentElement) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('preview-title').textContent = `Stock Alert: ${product.name}`;
        
        contentElement.innerHTML = `
            <div class="stock-alert-details">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Stock Level Alert</strong>
                </div>
                
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Product Information</h6>
                                <p class="mb-1"><strong>Name:</strong> ${product.name}</p>
                                <p class="mb-1"><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
                                <p class="mb-1"><strong>Category:</strong> ${product.category || 'N/A'}</p>
                                <p class="mb-1"><strong>Unit:</strong> ${product.unit || 'pcs'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Stock Information</h6>
                                <p class="mb-1"><strong>Current Stock:</strong> 
                                    <span class="${product.current_stock === 0 ? 'text-danger fw-bold' : 'text-warning fw-bold'}">
                                        ${product.current_stock}
                                    </span>
                                </p>
                                <p class="mb-1"><strong>Reorder Level:</strong> ${product.reorder_level || 0}</p>
                                <p class="mb-1"><strong>Selling Price:</strong> ${formatCurrency(product.selling_price)}</p>
                                <p class="mb-1"><strong>Cost Price:</strong> ${formatCurrency(product.cost_price)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${product.current_stock === 0 ? 'bg-danger' : 'bg-warning'}" 
                             role="progressbar" 
                             style="width: ${Math.min(100, (product.current_stock / (product.reorder_level * 2 || 10)) * 100)}%"
                             aria-valuenow="${product.current_stock}" 
                             aria-valuemin="0" 
                             aria-valuemax="${product.reorder_level * 2 || 10}">
                            ${product.current_stock} in stock
                        </div>
                    </div>
                    <small class="text-muted">Stock level relative to reorder point (${product.reorder_level || 0})</small>
                </div>
                
                <div class="text-end mt-4">
                    <button class="btn btn-primary" onclick="adjustStock('${productId}')">
                        <i class="fas fa-plus me-1"></i> Adjust Stock
                    </button>
                    <button class="btn btn-outline-primary ms-2" onclick="showProductDetails('${productId}')">
                        <i class="fas fa-eye me-1"></i> View Product
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading stock alert details:', error);
        contentElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load stock alert details
            </div>
        `;
    }
}

function showProductDetails(productId) {
    // Navigate to inventory page and show product details
    showDashboardPage('inventory');
    
    // Try to show product details if inventory module is available
    setTimeout(() => {
        if (window.showProductDetailsModal) {
            showProductDetailsModal(productId);
        }
    }, 500);
}

async function loadSaleDetails(saleId, contentElement) {
    try {
        if (!currentBusiness?.id) throw new Error('No business selected');
        
        // Fetch sale data
        const { data: sale, error } = await supabase
            .from('sales')
            .select('*, parties(*)')
            .eq('id', saleId)
            .eq('business_id', currentBusiness.id)
            .single();
        
        if (error) throw error;
        
        if (!sale) {
            contentElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Sale not found
                </div>
            `;
            return;
        }
        
        // Update modal title
        document.getElementById('preview-title').textContent = `Sale Invoice #${sale.invoice_number || 'N/A'}`;
        
        // Load sale items
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('*, products(*)')
            .eq('sale_id', saleId);
        
        const itemsHTML = saleItems && saleItems.length > 0 ? 
            saleItems.map(item => `
                <tr>
                    <td>${item.products?.name || 'Unknown Product'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-end">${formatCurrency(item.unit_price)}</td>
                    <td class="text-end">${formatCurrency(item.total_price || item.quantity * item.unit_price)}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center text-muted">No items found</td></tr>';
        
        // Render sale details
        contentElement.innerHTML = `
            <div class="sale-details-preview">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6><i class="fas fa-user me-2"></i>Customer Details</h6>
                        <div class="card">
                            <div class="card-body">
                                <p class="mb-1"><strong>Name:</strong> ${sale.parties?.name || 'N/A'}</p>
                                <p class="mb-1"><strong>Phone:</strong> ${sale.parties?.phone || 'N/A'}</p>
                                <p class="mb-1"><strong>Email:</strong> ${sale.parties?.email || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-file-invoice me-2"></i>Invoice Details</h6>
                        <div class="card">
                            <div class="card-body">
                                <p class="mb-1"><strong>Invoice #:</strong> ${sale.invoice_number || 'N/A'}</p>
                                <p class="mb-1"><strong>Date:</strong> ${formatDateTime(sale.created_at)}</p>
                                <p class="mb-1"><strong>Status:</strong> <span class="badge ${sale.status === 'completed' ? 'bg-success' : 'bg-warning'}">${sale.status}</span></p>
                                <p class="mb-0"><strong>Total:</strong> ${formatCurrency(sale.total_amount)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h6><i class="fas fa-list me-2"></i>Items</h6>
                <div class="table-responsive mb-4">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th class="text-center">Qty</th>
                                <th class="text-end">Price</th>
                                <th class="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="text-end"><strong>Grand Total:</strong></td>
                                <td class="text-end"><strong>${formatCurrency(sale.total_amount)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div class="text-end">
                    <button class="btn btn-primary" onclick="printSaleInvoice('${saleId}')">
                        <i class="fas fa-print me-1"></i> Print Invoice
                    </button>
                    ${window.salesManagement ? `
                        <button class="btn btn-outline-primary ms-2" onclick="salesManagement.showInvoicePreview('${saleId}', '${sale.invoice_number || ''}')">
                            <i class="fas fa-external-link-alt me-1"></i> Open Full View
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading sale details:', error);
        contentElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load sale details
                <p class="mb-0 mt-2 small">${error.message}</p>
            </div>
        `;
    }
}

function printSaleInvoice(saleId) {
    if (window.salesManagement && typeof salesManagement.printInvoice === 'function') {
        salesManagement.printInvoice();
    } else {
        showNotification('Info', 'Print functionality requires sales management module', 'info');
    }
}

function createAllActivitiesPageHTML() {
    return `
        <div class="page-header mb-4">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2>All Activities & Alerts</h2>
                    <p class="text-muted mb-0">View and manage all system activities</p>
                </div>
            </div>
        </div>
        
        <!-- Filters and Actions Row -->
        <div class="card mb-4">
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <!-- Filter Buttons -->
                    <div class="col-md-4 mb-3 mb-md-0">
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-primary active" id="filter-all">
                                <i class="fas fa-list me-1"></i> All
                                <span class="badge bg-primary ms-1" id="all-count">0</span>
                            </button>
                            <button class="btn btn-outline-warning" id="filter-alerts">
                                <i class="fas fa-exclamation-triangle me-1"></i> Alerts
                                <span class="badge bg-warning text-dark ms-1" id="alert-count">0</span>
                            </button>
                            <button class="btn btn-outline-success" id="filter-sales">
                                <i class="fas fa-shopping-cart me-1"></i> Sales
                                <span class="badge bg-success ms-1" id="sale-count">0</span>
                            </button>
                            <button class="btn btn-outline-info" id="filter-purchases">
                                <i class="fas fa-truck me-1"></i> Purchases
                                <span class="badge bg-info ms-1" id="purchase-count">0</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search, Date Range, Export in Single Row -->
                    <div class="col-md-8">
                        <div class="d-flex align-items-center gap-2">
                            <!-- Search Field -->
                            <div class="search-container" style="display: inline-block; margin-right: 10px;">
                                <div class="input-group" style="width: 250px;">
                                    <i class="fas fa-search"></i>
                                    <input type="text" 
                                           class="form-control" 
                                           id="activities-search-input" 
                                           placeholder="Search activities...">
                                    <button class="btn btn-link position-absolute top-50 end-0 translate-middle-y me-1 text-muted" 
                                            id="clear-activities-search-btn" 
                                            style="display: none; padding: 0; border: none; background: none; text-decoration: none;">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Date Range Dropdown -->
                            <div class="date-range-wrapper" style="min-width: 180px;">
                                <div class="d-flex align-items-center date-range-container" style="height: 38px;">
                                    <span class="bg-light rounded-start p-2 border border-end-0 date-range-icon">
                                        <i class="fas fa-calendar-alt text-muted"></i>
                                    </span>
                                    <select class="form-select rounded-start-0 border date-range-select" 
                                            id="date-range-filter"
                                            style="height: 38px; border-left: 0 !important; min-width: 100%;">
                                        <option value="all" selected>All Time</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="quarter">This Quarter</option>
                                        <option value="year">This Year</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Export Button -->
                            <button class="btn btn-primary" onclick="exportActivities()" style="white-space: nowrap;">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Activities Table - SCROLLABLE VERSION -->
        <div class="card">
            <div class="card-body p-0">
                <div class="scrollable-table-container" style="height: calc(100vh - 170px); overflow-y: auto;">
                    <table class="table table-hover mb-0">
                        <thead class="table-light sticky-top" style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
                            <tr>
                                <th style="width: 40px;">#</th>
                                <th style="width: 60px;">Type</th>
                                <th>Activity Details</th>
                                <th style="width: 250px;">Date & Time</th>  
                                <th style="width: 180px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="all-activities-table-body">
                            <tr>
                                <td colspan="6" class="text-center py-5">
                                    <div class="text-muted">
                                        <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                                        <p>Loading activities...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Sale/Invoice Preview Modal -->
        <div id="activity-preview-modal" class="modal d-none">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 id="preview-title">Activity Details</h3>
                    <button class="close-btn" onclick="closePreviewModal()">&times;</button>
                </div>
                <div class="modal-body" id="preview-content">
                    Loading...
                </div>
            </div>
        </div>
    `;
}

function closePreviewModal() {
    const modal = document.getElementById('activity-preview-modal');
    if (modal) {
        modal.classList.add('d-none');
    }
}

function updateFilterButtonCounts(activities) {
    if (!activities || !Array.isArray(activities)) return;
    
    // Count all activities
    const allCount = activities.length;
    
    // Count by type for each button
    const alertCount = activities.filter(a => a.isAlert).length;
    const salesCount = activities.filter(a => a.type === 'sale').length;
    const purchasesCount = activities.filter(a => a.type === 'purchase').length;
    
    // Update badge counts
    const allCountElement = document.getElementById('all-count');
    const alertCountElement = document.getElementById('alert-count');
    const saleCountElement = document.getElementById('sale-count');
    const purchaseCountElement = document.getElementById('purchase-count');
    
    if (allCountElement) allCountElement.textContent = allCount;
    if (alertCountElement) alertCountElement.textContent = alertCount;
    if (saleCountElement) saleCountElement.textContent = salesCount;
    if (purchaseCountElement) purchaseCountElement.textContent = purchasesCount;
}


// 🔥 NEW: Load low stock alerts
async function loadLowStockAlertsActivity() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .gt('reorder_level', 0)
            .gt('current_stock', 0);
            // Removed: .eq('is_active', true) if column doesn't exist
        
        if (error) throw error;
        
        const lowStockProducts = (products || []).filter(product => 
            (product.current_stock || 0) <= (product.reorder_level || 0)
        );
        
        return lowStockProducts.map(product => ({
            icon: 'fa-exclamation-triangle',
            title: 'Low Stock Alert',
            description: `${product.name} (${product.current_stock} left)`,
            time: formatTimeAgo(product.updated_at || product.created_at), // Use actual timestamp
            timestamp: product.updated_at || product.created_at, // Store actual timestamp
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
            .eq('current_stock', 0);
            // Removed: .eq('is_active', true) if column doesn't exist
        
        if (error) throw error;
        
        return (products || []).map(product => ({
            icon: 'fa-times-circle',
            title: 'Out of Stock',
            description: `${product.name} (0 in stock)`,
            time: formatTimeAgo(product.updated_at || product.created_at), // Use actual timestamp
            timestamp: product.updated_at || product.created_at, // Store actual timestamp
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
            // Removed: .eq('is_active', true) if column doesn't exist
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        return (products || []).map(product => ({
            icon: 'fa-box',
            title: 'New Product',
            description: `${product.name} added`,
            time: formatTimeAgo(product.created_at),
            timestamp: product.created_at, // Store actual timestamp
            isAlert: false
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
    
    // Show only first 5 activities
    const displayedActivities = activities.slice(0, 5);
    const remainingCount = Math.max(0, activities.length - 5);
    
    // Create table structure
    container.innerHTML = `
        <div class="recent-activities-container">
            <div class="table-responsive">
                <table class="table table-hover table-sm mb-0" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th style="width: 30px; font-size: 0.8rem;" class="text-muted">#</th>
                            <th style="width: 40px; font-size: 0.8rem;" class="text-muted">Type</th>
                            <th style="font-size: 0.8rem;" class="text-muted">Activity</th>
                            <th style="width: 120px; font-size: 0.8rem;" class="text-muted">Time</th>
                            <th style="width: 70px; font-size: 0.8rem;" class="text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recent-activities-body">
                        ${displayedActivities.map((activity, index) => `
                            <tr class="${activity.isAlert ? 'table-warning' : ''} ${(activity.type === 'sale' || activity.type === 'purchase') ? 'clickable-row' : ''}" 
                                data-activity-id="${activity.id}"
                                data-activity-type="${activity.type}"
                                ${(activity.type === 'sale' || activity.type === 'purchase') ? 'style="cursor: pointer;"' : ''}
                                title="${getFullDateTime(activity.timestamp)}">
                                <td class="text-muted fw-medium">${index + 1}</td>
                                <td class="text-center">
                                    <i class="fas ${activity.icon} ${activity.isAlert ? 'text-warning' : 'text-primary'}" 
                                       title="${activity.isAlert ? 'Alert' : 'Activity'}"></i>
                                </td>
                                <td>
                                    <div class="d-flex flex-column">
                                        <span class="fw-medium">${activity.title}</span>
                                        <small class="text-muted">${activity.description}</small>
                                    </div>
                                </td>
                                <td>
                                    <small class="${activity.isAlert ? 'text-danger fw-medium' : 'text-muted'}">
                                        ${activity.timestamp ? formatDateTime(activity.timestamp) : 'N/A'}
                                    </small>
                                </td>
                                <td>
                                    ${activity.productId ? `
                                        <button class="btn btn-sm btn-outline-primary restock-btn" 
                                                data-product-id="${activity.productId}"
                                                title="Restock Product">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    ` : `
                                        <span class="text-muted">-</span>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${remainingCount > 0 ? `
                <div class="activities-footer mt-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Showing 5 of ${activities.length} activities
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="showAllActivitiesPage()">
                                <i class="fas fa-list me-1"></i> View All
                            </button>
                            <button class="btn btn-outline-primary" onclick="exportActivities()">
                                <i class="fas fa-download me-1"></i> Export
                            </button>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="activities-footer mt-2 text-end">
                    <small class="text-muted">
                        ${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} shown
                    </small>
                </div>
            `}
        </div>
    `;
    
    // Add event listeners AFTER the HTML is rendered
    setTimeout(() => {
        setupRecentActivitiesClickHandlers();
    }, 100);
}

function setupRecentActivitiesClickHandlers() {
    const tableBody = document.getElementById('recent-activities-body');
    if (!tableBody) return;
    
    // Add click event to clickable rows
    const clickableRows = tableBody.querySelectorAll('.clickable-row');
    clickableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking on a button
            if (e.target.closest('.restock-btn') || e.target.closest('button')) {
                return;
            }
            
            const activityId = this.getAttribute('data-activity-id');
            const activityType = this.getAttribute('data-activity-type');
            
            console.log(`Clicked on ${activityType} with ID: ${activityId}`);
            
            if (activityType === 'sale' || activityType === 'purchase') {
                if (typeof viewActivityDetails === 'function') {
                    viewActivityDetails(activityType, activityId);
                } else {
                    console.error('viewActivityDetails function not found');
                    // Fallback: directly open modal
                    openActivityPreviewModal(activityType, activityId);
                }
            }
        });
    });
    
    // Add click event to restock buttons
    const restockButtons = tableBody.querySelectorAll('.restock-btn');
    restockButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row click
            const productId = this.getAttribute('data-product-id');
            console.log('Restock product:', productId);
            
            if (typeof adjustStock === 'function') {
                adjustStock(productId);
            } else {
                showNotification('Info', `Adjusting stock for product ${productId}`, 'info');
            }
        });
    });
}

// Add CSS styles
const activitiesPageStyles = document.createElement('style');
activitiesPageStyles.textContent = `
    .recent-activities-container .clickable-row {
    cursor: pointer;
    transition: all 0.2s ease;
}

.recent-activities-container .clickable-row:hover {
    background-color: #f8f9fa !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Make sure buttons don't trigger row click */
.recent-activities-container .btn {
    pointer-events: auto !important;
}

/* Style for clickable rows hover effect */
.recent-activities-container .clickable-row td {
    position: relative;
}

.recent-activities-container .clickable-row:hover td:first-child::after {
    content: '▶';
    position: absolute;
    right: 5px;
    color: #0d6efd;
    font-size: 0.8em;
    opacity: 0.7;
}

    #all-activities-table-body{
        background-color: #fff;
    }
      /* Date range dropdown custom styling */
    .date-range-container {
        border: 1px solid #c8cbce;
        border-radius: 5px;
        overflow: hidden;
        background-color: #fff;
        height: 38px;
    }
    
    
    .date-range-select:focus {
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
    }
    
    /* Remove default Bootstrap styling */
    .date-range-select.form-control:focus {
        border-color: transparent !important;
        box-shadow: none !important;
    }
    
    /* Hover state */
    .date-range-container:hover {
        border-color: #adb5bd;
    }
    
    /* Focus state */
    .date-range-container:focus-within {
        border-color: #0d6efd;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
    }
    
    /* Remove Bootstrap's default select styling */
    .date-range-select {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
    }
    
     /* Enhanced Date Range Dropdown */
    .date-range-container {
        position: relative;
        border: 1px solid #c8cbce;
        border-radius: 5px;
        overflow: visible !important;
        background-color: #fff;
        transition: all 0.2s ease;
    }
    
    .date-range-container:hover {
        border-color: #0d6efd;
    }
    
    .date-range-container:focus-within {
        border-color: #0d6efd;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
    }
    
    .date-range-icon {
        background-color: #f8f9fa !important;
        padding: 0px 9px 0px 14px !important;
    }
    
    .date-range-select {
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        background: transparent;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        padding-right: 30px !important;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") !important;
        background-repeat: no-repeat !important;
        background-position: right 0.75rem center !important;
        background-size: 16px 12px !important;
    }
    
    /* Custom dropdown styling */
    .date-range-select option {
        display: none;
    }
    
    /* Make dropdown wider */
    .date-range-select {
        min-width: 200px !important;
    }
    
    /* Custom dropdown container - will be created dynamically */
    .custom-date-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1050;
        margin-top: 4px;
        padding: 8px 0;
        display: none;
        min-width: 280px;
    }
    
    .custom-date-dropdown.show {
        display: block;
    }
    
    .custom-date-option {
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
        font-size: 14px;
    }
    
    .custom-date-option:hover {
        background-color: #f8f9fa;
    }
    
    .custom-date-option.active {
        background-color: #0d6efd;
        color: white;
    }
    
    .custom-date-option.active .date-range-info {
        color: rgba(255,255,255,0.9);
    }
    
    .date-range-info {
        font-size: 12px;
        color: #6c757d;
        font-weight: normal;
        margin-left: 8px;
        white-space: nowrap;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .date-range-wrapper {
            width: 100%;
            min-width: auto !important;
        }
        
        .date-range-container {
            width: 100%;
        }
        
        .date-range-select {
            min-width: 100% !important;
        }
    }
    
    /* Search field with clear button */
    .position-relative .fa-search {
        z-index: 10;
    }
    
    #clear-activities-search-btn {
        z-index: 10;
        color: #6c757d;
        text-decoration: none !important;
        display: none;
    }
    
    #clear-activities-search-btn:hover {
        color: #dc3545;
        background: none;
    }
    
    #activities-search-input:not(:placeholder-shown) ~ #clear-activities-search-btn {
        display: block !important;
    }
    
    #activities-search-input{
    padding-left:0px !important;
    }
    
    /* Filter buttons active state */
    .btn-group .btn.active {
        background-color: #0d6efd;
        color: white;
        border-color: #0d6efd;
    }
    
    .btn-group .btn.active.btn-outline-warning {
        background-color: #ffc107;
        color: #000;
        border-color: #ffc107;
    }
    
    .btn-group .btn.active.btn-outline-success {
        background-color: #198754;
        color: white;
        border-color: #198754;
    }
    
    .btn-group .btn.active.btn-outline-info {
        background-color: #0dcaf0;
        color: #000;
        border-color: #0dcaf0;
    }
    
    /* Pagination styles */
    #prev-page, #next-page {
        min-width: 100px;
    }
    
    /* Activity badges */
    .badge.bg-warning {
        color: #000;
    }
    
    /* Single row layout */
    .d-flex.gap-2 {
        display:flex;
        gap: 0.5rem !important;
    }
    
    /* Make date range select smaller */
    #date-range-filter {
        height: 38px;
        min-width: 140px;
    }
    
    /* Clickable rows */
    .clickable-row {
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .clickable-row:hover {
        background-color: #f8f9fa !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .btn-group {
            flex-wrap: wrap;
        }
        
        #activities-search-input {
            font-size: 14px;
        }
        
        .table td, .table th {
            padding: 0px 4px;
            font-size: 13px;
        }
        
        .d-flex.align-items-center.gap-2 {
            flex-wrap: wrap;
        }
        
        .position-relative.flex-grow-1 {
            width: 100%;
            margin-bottom: 0.5rem;
        }
    }
    
    @media (max-width: 576px) {
        .btn-group .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
        
        .btn-group .badge {
            font-size: 0.65rem;
            padding: 0.15rem 0.3rem;
        }
    }
`;
document.head.appendChild(activitiesPageStyles);

function formatDateForDisplay(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Function to get date ranges for each option
function getDateRangeInfo(value) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    switch(value) {
        case 'today':
            return formatDateForDisplay(today);
        case 'yesterday':
            return formatDateForDisplay(yesterday);
        case 'week':
            return `${formatDateForDisplay(startOfWeek)} - ${formatDateForDisplay(today)}`;
        case 'month':
            return `${formatDateForDisplay(startOfMonth)} - ${formatDateForDisplay(today)}`;
        case 'quarter':
            return `${formatDateForDisplay(startOfQuarter)} - ${formatDateForDisplay(today)}`;
        case 'year':
            return `${formatDateForDisplay(startOfYear)} - ${formatDateForDisplay(today)}`;
        case 'all':
            return 'All dates';
        default:
            return '';
    }
}

// Function to create custom dropdown
function createCustomDateRangeDropdown() {
    // Remove existing custom dropdown if any
    const existingDropdown = document.querySelector('.custom-date-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    const container = document.querySelector('.date-range-container');
    const select = document.getElementById('date-range-filter');
    
    if (!container || !select) return;
    
    // Create dropdown element
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-date-dropdown';
    
    // Options with date ranges
    const options = [
        { value: 'all', label: 'All Time', info: getDateRangeInfo('all') },
        { value: 'today', label: 'Today', info: getDateRangeInfo('today') },
        { value: 'yesterday', label: 'Yesterday', info: getDateRangeInfo('yesterday') },
        { value: 'week', label: 'This Week', info: getDateRangeInfo('week') },
        { value: 'month', label: 'This Month', info: getDateRangeInfo('month') },
        { value: 'quarter', label: 'This Quarter', info: getDateRangeInfo('quarter') },
        { value: 'year', label: 'This Year', info: getDateRangeInfo('year') }
    ];
    
    // Create option elements
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'custom-date-option';
        optionElement.dataset.value = option.value;
        
        if (option.value === select.value) {
            optionElement.classList.add('active');
        }
        
        optionElement.innerHTML = `
            <span class="date-label">${option.label}</span>
            <span class="date-range-info">${option.info}</span>
        `;
        
        optionElement.addEventListener('click', function() {
            // Update select value
            select.value = option.value;
            
            // Trigger change event
            select.dispatchEvent(new Event('change'));
            
            // Update active state
            dropdown.querySelectorAll('.custom-date-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Hide dropdown
            dropdown.classList.remove('show');
        });
        
        dropdown.appendChild(optionElement);
    });
    
    // Add to container
    container.appendChild(dropdown);
    
    // Show/hide dropdown on click
    container.addEventListener('click', function(e) {
        if (e.target === select || e.target.closest('.date-range-icon')) {
            dropdown.classList.toggle('show');
            e.stopPropagation();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });
    
    return dropdown;
}

function initializeEnhancedDateRangeDropdown() {
    const select = document.getElementById('date-range-filter');
    if (!select) return;
    
    // Create custom dropdown
    createCustomDateRangeDropdown();
    
    // Update options in the actual select (for form submission if needed)
    const options = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'year', label: 'This Year' }
    ];
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add new options with data attributes for date ranges
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.dataset.range = getDateRangeInfo(option.value);
        select.appendChild(optionElement);
    });
    
    // Set default value
    select.value = 'all';
    
    // Update the displayed text to show date range
    function updateSelectDisplay() {
        const selectedOption = select.options[select.selectedIndex];
        const dateRange = getDateRangeInfo(select.value);
        
        // Create a hidden span to calculate width
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.textContent = `${selectedOption.text} (${dateRange})`;
        document.body.appendChild(tempSpan);
        
        // Adjust select width if needed
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        // Set minimum width
        select.style.minWidth = Math.max(180, textWidth + 40) + 'px';
    }
    
    // Initial update
    updateSelectDisplay();
    
    // Update on change
    select.addEventListener('change', function() {
        updateSelectDisplay();
        applyActivitiesFilters();
        
        // Also update custom dropdown active state
        const customDropdown = document.querySelector('.custom-date-dropdown');
        if (customDropdown) {
            customDropdown.querySelectorAll('.custom-date-option').forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.value === this.value) {
                    opt.classList.add('active');
                }
            });
        }
    });
}

function showAllActivities() {
    // Store activities globally or fetch fresh data
    if (!window.allActivitiesData) {
        console.warn('No activities data available');
        return;
    }
    
    const activities = window.allActivitiesData || [];
    
    const modalHTML = `
        <div id="all-activities-modal" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3><i class="fas fa-history me-2"></i>All Activities & Alerts</h3>
                    <button class="close-btn" onclick="closeModal('all-activities-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary active" onclick="filterActivities('all')">
                                All (${activities.length})
                            </button>
                            <button class="btn btn-outline-warning" onclick="filterActivities('alerts')">
                                <i class="fas fa-exclamation-triangle me-1"></i>Alerts
                                (${activities.filter(a => a.isAlert).length})
                            </button>
                            <button class="btn btn-outline-success" onclick="filterActivities('sales')">
                                <i class="fas fa-shopping-cart me-1"></i>Sales
                                (${activities.filter(a => a.icon === 'fa-shopping-cart').length})
                            </button>
                        </div>
                        
                        <div class="input-group input-group-sm mt-2" style="width: 300px;">
                            <input type="text" class="form-control" id="activities-search" 
                                   placeholder="Search activities..." onkeyup="searchActivities()">
                            <button class="btn btn-outline-secondary" onclick="clearSearch()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-hover table-sm">
                            <thead style="position: sticky; top: 0; background: white; z-index: 1;">
                                <tr>
                                    <th>#</th>
                                    <th>Type</th>
                                    <th>Activity</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="all-activities-list">
                                ${activities.map((activity, index) => `
                                    <tr class="${activity.isAlert ? 'table-warning' : ''}">
                                        <td>${index + 1}</td>
                                        <td class="text-center">
                                            <i class="fas ${activity.icon} ${activity.isAlert ? 'text-warning' : 'text-primary'}"></i>
                                        </td>
                                        <td>
                                            <div class="d-flex flex-column">
                                                <span class="fw-medium">${activity.title}</span>
                                                <small class="text-muted">${activity.description}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <small class="text-muted">
                                                ${getFullDateTime(activity.timestamp)}
                                            </small>
                                        </td>
                                        <td>
                                            <span class="badge ${activity.isAlert ? 'bg-warning' : 'bg-success'}">
                                                ${activity.isAlert ? 'Alert' : 'Activity'}
                                            </span>
                                        </td>
                                        <td>
                                            ${activity.productId ? `
                                                <button class="btn btn-sm btn-outline-primary" 
                                                        onclick="adjustStock('${activity.productId}')">
                                                    <i class="fas fa-plus"></i> Restock
                                                </button>
                                            ` : '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                Total: ${activities.length} activities • 
                                ${activities.filter(a => a.isAlert).length} alerts
                            </small>
                            <button class="btn btn-sm btn-outline-primary" onclick="exportActivities()">
                                <i class="fas fa-download me-1"></i> Export to CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('all-activities-modal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store activities for filtering/searching
    window.allActivitiesData = activities;
    
    // Show modal
    document.getElementById('all-activities-modal').classList.remove('d-none');
}

function searchActivities() {
    const searchTerm = document.getElementById('activities-search').value.toLowerCase();
    const activities = window.allActivitiesData || [];
    
    const filtered = activities.filter(activity => 
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm) ||
        activity.timestamp.toLowerCase().includes(searchTerm)
    );
    
    const tableBody = document.getElementById('all-activities-list');
    if (tableBody) {
        tableBody.innerHTML = filtered.map((activity, index) => `
            <tr class="${activity.isAlert ? 'table-warning' : ''}">
                <td>${index + 1}</td>
                <td class="text-center">
                    <i class="fas ${activity.icon} ${activity.isAlert ? 'text-warning' : 'text-primary'}"></i>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <span class="fw-medium">${activity.title}</span>
                        <small class="text-muted">${activity.description}</small>
                    </div>
                </td>
                <td>
                    <small class="text-muted">
                        ${getFullDateTime(activity.timestamp)}
                    </small>
                </td>
                <td>
                    <span class="badge ${activity.isAlert ? 'bg-warning' : 'bg-success'}">
                        ${activity.isAlert ? 'Alert' : 'Activity'}
                    </span>
                </td>
                <td>
                    ${activity.productId ? `
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="adjustStock('${activity.productId}')">
                            <i class="fas fa-plus"></i> Restock
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    }
}

function clearSearch() {
    document.getElementById('activities-search').value = '';
    filterActivities('all');
}   

function exportActivities() {
    const activities = window.allActivitiesData || [];
    
    if (activities.length === 0) {
        showNotification('Info', 'No activities to export', 'info');
        return;
    }
    
    // Prepare CSV content
    const headers = ['Type', 'Title', 'Description', 'Date & Time', 'Status', 'Product ID'];
    
    const rows = activities.map(activity => [
        activity.isAlert ? 'Alert' : 'Activity',
        activity.title,
        activity.description,
        getFullDateTime(activity.timestamp),
        activity.isAlert ? 'Alert' : 'Normal',
        activity.productId || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `activities_export_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Success', 'Activities exported successfully', 'success');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('d-none');
        setTimeout(() => modal.remove(), 300);
    }
}

function filterActivities(type) {
    const activities = window.allActivitiesData || [];
    let filtered = activities;
    
    // Update button states
    document.querySelectorAll('#all-activities-modal .btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    switch(type) {
        case 'alerts':
            filtered = activities.filter(a => a.isAlert);
            break;
        case 'sales':
            filtered = activities.filter(a => a.icon === 'fa-shopping-cart');
            break;
        case 'all':
        default:
            filtered = activities;
    }
    
    // Update table
    const tableBody = document.getElementById('all-activities-list');
    if (tableBody) {
        tableBody.innerHTML = filtered.map((activity, index) => `
            <tr class="${activity.isAlert ? 'table-warning' : ''}">
                <td>${index + 1}</td>
                <td class="text-center">
                    <i class="fas ${activity.icon} ${activity.isAlert ? 'text-warning' : 'text-primary'}"></i>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <span class="fw-medium">${activity.title}</span>
                        <small class="text-muted">${activity.description}</small>
                    </div>
                </td>
                <td>
                    <small class="text-muted">
                        ${getFullDateTime(activity.timestamp)}
                    </small>
                </td>
                <td>
                    <span class="badge ${activity.isAlert ? 'bg-warning' : 'bg-success'}">
                        ${activity.isAlert ? 'Alert' : 'Activity'}
                    </span>
                </td>
                <td>
                    ${activity.productId ? `
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="adjustStock('${activity.productId}')">
                            <i class="fas fa-plus"></i> Restock
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    }
}

function formatDateTime(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) {
            if (diffHours === 1) return '1 hour ago';
            return `${diffHours} hours ago`;
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        // Show actual date format for older entries
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: diffDays > 365 ? 'numeric' : undefined
        });
        
    } catch (error) {
        return 'N/A';
    }
}

function getFullDateTime(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return dateString || 'N/A';
    }
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
        console.log('💰 Loading financial summary for business:', currentBusiness.name);
        
        // Get the selected period from the dropdown
        const periodSelect = document.getElementById('period-select');
        const period = periodSelect ? periodSelect.value : 'month';
        
        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();
        
        switch(period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1); // Default to month
                startDate.setHours(0, 0, 0, 0);
        }
        
        const endDate = new Date();
        
        console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // Load sales data for the period
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('total_amount, status, created_at')
            .eq('business_id', currentBusiness.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (salesError) {
            console.error('❌ Error loading sales:', salesError);
            throw salesError;
        }
        
        // Load expenses data for the period
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount, status, created_at')
            .eq('business_id', currentBusiness.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (expensesError) {
            console.error('❌ Error loading expenses:', expensesError);
            // Don't throw, just log - expenses table might not exist
        }
        
        // Calculate totals
        const totalRevenue = sales ? sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) : 0;
        const totalExpenses = expenses ? expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0) : 0;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        
        console.log(`📊 Financial Summary: Revenue: ${totalRevenue}, Expenses: ${totalExpenses}, Profit: ${netProfit}`);
        
        // Update UI
        const revenueElement = document.getElementById('total-revenue');
        const expensesElement = document.getElementById('total-expenses');
        const profitElement = document.getElementById('net-profit');
        const marginElement = document.getElementById('profit-margin');
        
        if (revenueElement) {
            revenueElement.textContent = formatCurrency(totalRevenue);
            revenueElement.className = totalRevenue >= 0 ? 'financial-positive' : 'financial-negative';
        }
        
        if (expensesElement) {
            expensesElement.textContent = formatCurrency(totalExpenses);
            expensesElement.className = 'financial-negative';
        }
        
        if (profitElement) {
            profitElement.textContent = formatCurrency(netProfit);
            profitElement.className = netProfit >= 0 ? 'financial-positive' : 'financial-negative';
        }
        
        if (marginElement) {
            marginElement.textContent = profitMargin.toFixed(1) + '%';
            marginElement.className = profitMargin >= 0 ? 'financial-positive' : 'financial-negative';
        }
        
        // Also update the dashboard stats (today's sales, today's revenue)
        await updateDashboardStats();
        
        return { totalRevenue, totalExpenses, netProfit, profitMargin };
        
    } catch (error) {
        console.error('❌ Financial summary error:', error);
        
        // Set default values on error
        const revenueElement = document.getElementById('total-revenue');
        const expensesElement = document.getElementById('total-expenses');
        const profitElement = document.getElementById('net-profit');
        const marginElement = document.getElementById('profit-margin');
        
        if (revenueElement) revenueElement.textContent = formatCurrency(0);
        if (expensesElement) expensesElement.textContent = formatCurrency(0);
        if (profitElement) profitElement.textContent = formatCurrency(0);
        if (marginElement) marginElement.textContent = '0%';
        
        return { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 };
    }
}

async function updateDashboardStats() {
    if (!currentBusiness?.id) return;
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get today's sales
        const { data: todaySales, error: salesError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('business_id', currentBusiness.id)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());
        
        if (!salesError && todaySales) {
            const todaySalesCount = todaySales.length;
            const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
            
            const todaySalesElement = document.getElementById('today-sales');
            const todayRevenueElement = document.getElementById('today-revenue');
            
            if (todaySalesElement) todaySalesElement.textContent = todaySalesCount;
            if (todayRevenueElement) todayRevenueElement.textContent = formatCurrency(todayRevenue);
        }
        
        // Get low stock count
        await updateDashboardLowStockCount();
        
        // Get pending orders count (sales with status 'pending')
        const { data: pendingSales, error: pendingError } = await supabase
            .from('sales')
            .select('id')
            .eq('business_id', currentBusiness.id)
            .eq('status', 'pending');
        
        if (!pendingError) {
            const pendingOrdersElement = document.getElementById('pending-orders');
            if (pendingOrdersElement) {
                pendingOrdersElement.textContent = pendingSales ? pendingSales.length : 0;
            }
        }
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
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
    console.log('🧹 Safely clearing dashboard data...');
    
    // Clear dashboard metrics
    const metricIds = [
        'today-sales', 'today-revenue', 'low-stock-count',
        'total-sales-count', 'total-sales-amount', 'pending-invoices',
        'avg-sale-value', 'total-products', 'total-stock-value',
        'out-of-stock-count'
    ];
    
    metricIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
        }
    });
    
    // 🔥 FIX: Safely destroy charts only if they exist
    if (salesChart && typeof salesChart.destroy === 'function') {
        try {
            salesChart.destroy();
            console.log('✅ Sales chart destroyed');
        } catch (error) {
            console.warn('⚠️ Error destroying sales chart:', error);
        }
        salesChart = null;
    }
    
    if (revenueChart && typeof revenueChart.destroy === 'function') {
        try {
            revenueChart.destroy();
            console.log('✅ Revenue chart destroyed');
        } catch (error) {
            console.warn('⚠️ Error destroying revenue chart:', error);
        }
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

const previewModalStyles = document.createElement('style');
previewModalStyles.textContent = `
    .sale-details-preview,
    .stock-alert-details {
        max-height: 70vh;
        overflow-y: auto;
        padding-right: 10px;
    }
    
    .sale-details-preview h6,
    .stock-alert-details h6 {
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        padding-bottom: 8px;
        margin-bottom: 15px;
    }
    
    #activity-preview-modal .modal-content {
        max-height: 85vh;
        display: flex;
        flex-direction: column;
    }
    
    #activity-preview-modal .modal-body {
        flex: 1;
        overflow: hidden;
    }
    
    .progress-bar.bg-warning {
        color: #000;
    }
`;
document.head.appendChild(previewModalStyles);

function updateGlobalNavigation(page) {
    console.log(`🌐 Updating global navigation to: ${page}`);
    
    currentPage = page;
    
    // Update URL
    if (window.history && window.history.pushState) {
        window.history.pushState({ page: page }, page.charAt(0).toUpperCase() + page.slice(1), `#${page}`);
    }
    
    // Update page title
    const pageTitles = {
        'sales': 'Sales',
        'inventory': 'Inventory',
        'customers': 'Customers',
        'staff': 'Staff',
        'overview': 'Overview',
        'reports': 'Reports',
        'parties': 'Parties'
    };
    
    document.title = `${pageTitles[page] || page} - IB Manager`;
    
    // Update sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-page]');
    sidebarLinks.forEach(link => {
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
    
    console.log(`✅ Global navigation updated to: ${page}`);
}

// Make it globally available
window.updateGlobalNavigation = updateGlobalNavigation;

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
window.showAllActivitiesPage = showAllActivitiesPage;
window.loadAllActivitiesPage = loadAllActivitiesPage;
window.viewActivityDetails = viewActivityDetails;
window.closePreviewModal = closePreviewModal;
window.printTransaction = printTransaction;
window.adjustStock = function(productId) {
    // Implementation for adjusting stock
    showNotification('Info', `Adjusting stock for product ${productId}`, 'info');
    // You would implement actual stock adjustment logic here
};

console.log('✅ Enhanced dashboard functions loaded successfully');