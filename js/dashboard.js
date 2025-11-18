// Enhanced Dashboard Functions with Business Isolation
let salesChart = null;
let revenueChart = null;
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
    console.log('📊 Showing dashboard...');
    
    try {
        safeHide(landingPage);
        safeHide(authPages);
        safeShow(dashboard);
        localStorage.setItem(STATE_KEYS.LAST_VISIBLE_SECTION, 'dashboard');
        
        // Update current business name immediately
        const currentBusinessName = document.getElementById('current-business-name');
        if (currentBusinessName) {
            currentBusinessName.textContent = currentBusiness?.name || 'No Business Selected';
        }
        
        // Initialize business management
        await initializeBusinessManagement();
        
        // 🔥 CRITICAL: Wait for business data to load and ensure we have a business
        if ((!currentBusiness || !currentBusiness.id) && userBusinesses.length > 0) {
            console.log('🔄 Setting first business as active...');
            await setActiveBusiness(userBusinesses[0].id);
        }
        
        // 🔥 CRITICAL: Load user role for the current business
        if (window.loadCurrentUserRole) {
            await loadCurrentUserRole();
        }
        
        // 🔥 FIX: Ensure role is properly set
        if (window.ensureUserRole) {
            ensureUserRole();
        }
        
        console.log('🎯 Final user state:', {
            email: currentUser?.email,
            role: currentUser?.role,
            business: currentBusiness?.name
        });
        
        // Apply role-based access control
        if (window.applyRoleBasedAccess) {
            applyRoleBasedAccess();
        }
        
        // Show first accessible page
        await showFirstAccessiblePage();
        
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        // Fallback to overview page
        await showDashboardPage('overview');
    }
}

async function showDashboardPage(page) {
    if (isNavigating) {
        console.log('⚠️ Navigation in progress, skipping...');
        return;
    }
    
    console.log('📄 Showing dashboard page:', page);
    
    // Check if user has permission to access this page
    if (window.canAccessPage && !canAccessPage(page)) {
        console.warn('🚫 Access denied to page:', page);
        showNotification('Access Denied', 'You do not have permission to access this page.', 'error');
        
        // Redirect to first accessible page but prevent recursion
        isNavigating = true;
        setTimeout(async () => {
            await showFirstAccessiblePage();
            isNavigating = false;
        }, 100);
        return;
    }
    
    isNavigating = true;
    
    try {
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
                // 🔥 FIX: Hide menu items user doesn't have access to
                const itemPage = item.getAttribute('data-page');
                if (itemPage && window.canAccessPage && !canAccessPage(itemPage)) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
            }
        });
        
        const activeMenuItem = document.querySelector(`.sidebar-menu a[data-page="${page}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        localStorage.setItem(STATE_KEYS.ACTIVE_DASHBOARD_PAGE, page);
        
        // Initialize page-specific content
        await initializePageContent(page);
        
        console.log('✅ Dashboard page shown and initialized:', page);
        
    } catch (error) {
        console.error('❌ Error showing dashboard page:', error);
    } finally {
        isNavigating = false;
    }
}

async function initializePageContent(page) {
    try {
        switch (page) {
            case 'overview':
                await initializeOverviewPage();
                break;
            case 'sales':
                await initializeSalesPage();
                break;
            case 'inventory':
                await initializeInventoryPage();
                break;
            case 'staff':
                await initializeStaffPage();
                break;
            case 'customers':
                if (window.initializeCustomersPage) {
                    await initializeCustomersPage();
                }
                break;
            case 'reports':
                if (window.initializeReportsPage) {
                    await initializeReportsPage();
                }
                break;
            default:
                console.log('⚠️ No specific initialization for page:', page);
        }
    } catch (error) {
        console.error(`❌ Error initializing page ${page}:`, error);
    }
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
    await loadDashboardData();
    loadCharts();
    await loadRecentActivity();
    updateDashboardMetrics();
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

        // Load inventory alerts for current business only
        const { data: lowStockProducts, error: inventoryError } = await supabase
            .from('products')
            .select('id')
            .eq('business_id', currentBusiness.id)
            .lte('current_stock', 5)
            .eq('is_active', true);
        
        if (!inventoryError && lowStockProducts) {
            const lowStockElement = document.getElementById('low-stock-count');
            if (lowStockElement) lowStockElement.textContent = lowStockProducts.length;
        } else if (inventoryError) {
            console.error('❌ Error loading low stock products:', inventoryError);
        }

        // Load financial summary
        if (window.loadFinancialSummary) {
            await loadFinancialSummary();
        }
        
    } catch (error) {
        console.error('❌ Dashboard data load error:', error);
    }
}

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
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for recent activity');
        return;
    }
    
    try {
        // Check if getBusinessData function exists
        if (typeof getBusinessData !== 'function') {
            throw new Error('getBusinessData function not available');
        }
        
        // Load recent sales for current business
        const { data: recentSales, error } = await getBusinessData('sales', {
            orderBy: 'created_at',
            ascending: false,
            limit: 5,
            cacheKey: 'recent_activity'
        });
        
        if (error) throw error;
        
        const activities = recentSales ? recentSales.map(sale => ({
            icon: 'fa-shopping-cart',
            title: 'New Sale Created',
            description: `Sale ${sale.invoice_number || 'N/A'} for ${formatCurrency(sale.total_amount || 0)}`,
            time: formatTimeAgo(sale.created_at)
        })) : [];
        
        updateRecentActivityUI(activities);
        
    } catch (error) {
        console.error('❌ Recent activity load error:', error);
        // Fallback to sample data
        const sampleActivities = [
            {
                icon: 'fa-shopping-cart',
                title: 'New Sale Created',
                description: 'Sale #INV-001 for $250.00',
                time: '2 hours ago'
            },
            {
                icon: 'fa-box',
                title: 'Low Stock Alert',
                description: 'Product "Wireless Mouse" is running low',
                time: '5 hours ago'
            }
        ];
        updateRecentActivityUI(sampleActivities);
    }
}

function updateRecentActivityUI(activities) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: #6c757d;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
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

console.log('✅ Enhanced dashboard functions loaded successfully');