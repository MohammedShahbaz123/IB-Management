// Enhanced Business Management Functions with Complete Business Isolation

// Business Isolation Management
function getBusinessStorageKey(key) {
    const userId = currentUser ? currentUser.id : 'anonymous';
    const businessId = currentBusiness ? currentBusiness.id : 'default';
    return `${userId}_${businessId}_${key}`;
}

function saveBusinessData(key, data) {
    const businessKey = getBusinessStorageKey(key);
    localStorage.setItem(businessKey, JSON.stringify(data));
}

function loadBusinessData(key) {
    const businessKey = getBusinessStorageKey(key);
    const data = localStorage.getItem(businessKey);
    return data ? JSON.parse(data) : null;
}

function clearBusinessData(key) {
    const businessKey = getBusinessStorageKey(key);
    localStorage.removeItem(businessKey);
}

function clearAllBusinessData(businessId = 'all') {
    console.log('🧹 Clearing business data for:', businessId);
    
    // Clear all business-specific data
    const prefixes = ['business', 'inventory', 'sales', 'products', 'customers', 'staff', 'financial', 'analytics'];
    
    if (businessId === 'all') {
        // Clear everything
        localStorage.clear();
        sessionStorage.clear();
    } else {
        // Clear specific business data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes(businessId) ||
                prefixes.some(prefix => key.includes(prefix))
            )) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed business data:', key);
        });
    }
}

// User-specific storage functions
function getUserStorageKey(key) {
    const userId = currentUser ? currentUser.id : 'anonymous';
    return `${userId}_${key}`;
}

function saveUserData(key, data) {
    const userKey = getUserStorageKey(key);
    localStorage.setItem(userKey, JSON.stringify(data));
}

function loadUserData(key) {
    const userKey = getUserStorageKey(key);
    const data = localStorage.getItem(userKey);
    return data ? JSON.parse(data) : null;
}

function clearUserData(key) {
    const userKey = getUserStorageKey(key);
    localStorage.removeItem(userKey);
}

function clearAllUserData() {
    console.log('🧹 Clearing all user data...');
    
    if (currentUser) {
        const userId = currentUser.id;
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(userId)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed user data:', key);
        });
    }
    
    // Clear user-related global variables
    userBusinesses = [];
    userRoles = {};
}

// Reset business management state
function resetBusinessManagement() {
    console.log('🔄 Resetting business management state...');
    
    // Clear business list
    const businessesList = document.getElementById('businesses-list');
    if (businessesList) {
        businessesList.innerHTML = '';
    }
    
    // Reset business selector
    const businessSelect = document.getElementById('navbar-business-select');
    if (businessSelect) {
        businessSelect.innerHTML = '<option value="">No businesses</option>';
    }
    
    // Reset current business display
    const currentBusinessName = document.getElementById('current-business-name');
    if (currentBusinessName) {
        currentBusinessName.textContent = 'No Business Selected';
    }
}

// Business-aware data operations
async function getBusinessData(table, options = {}) {
    if (!currentBusiness?.id) {
        throw new Error('No active business selected');
    }
    
    const cacheKey = options.cacheKey || table;
    const useCache = options.useCache !== false;
    
    // Try cache first
    if (useCache) {
        const cached = loadBusinessData(cacheKey);
        if (cached) {
            console.log(`📦 Using cached ${cacheKey} for business:`, currentBusiness.name);
            return cached;
        }
    }
    
    // Verify access before querying
    await verifyBusinessAccess(currentBusiness.id);
    
    let query = supabase
        .from(table)
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true);
    
    // Apply additional filters
    if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
    }
    
    // Apply ordering
    if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
    }
    
    // Apply pagination
    if (options.limit) {
        query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Cache the result
    if (useCache && data) {
        saveBusinessData(cacheKey, data);
    }
    
    return data || [];
}

// Business-aware data creation
async function createBusinessRecord(table, recordData) {
    if (!currentBusiness?.id) {
        throw new Error('No active business selected');
    }
    
    try {
        const recordWithBusiness = {
            ...recordData,
            business_id: currentBusiness.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Only add owner_id for tables that need it
        // For staff_roles, we handle owner_id in the staff creation function
        if (table !== 'staff_roles' && currentUser) {
            recordWithBusiness.owner_id = currentUser.id;
        }
        
        console.log(`📝 Creating ${table} record with:`, {
            business_id: recordWithBusiness.business_id,
            owner_id: recordWithBusiness.owner_id,
            table: table
        });
        
        const { data: record, error } = await supabase
            .from(table)
            .insert([recordWithBusiness])
            .select()
            .single();
            
        if (error) throw error;
        
        // Clear relevant caches
        clearBusinessData(table);
        if (table === 'products') {
            clearBusinessData('inventory_summary');
            clearBusinessData('low_stock_alerts');
        } else if (table === 'sales') {
            clearBusinessData('financial_summary');
            clearBusinessData('analytics');
        }
        
        return record;
        
    } catch (error) {
        console.error(`❌ ${table} creation failed for business:`, currentBusiness.name, error);
        throw error;
    }
}

// Debug function
async function debugBusinessFlow() {
    console.log('=== BUSINESS FLOW DEBUG ===');
    console.log('1. Current User:', currentUser?.email, 'ID:', currentUser?.id);
    console.log('2. Current Business:', currentBusiness?.name, 'ID:', currentBusiness?.id);
    
    // Test business-specific data access
    if (currentBusiness?.id) {
        const { data: businessProducts, error } = await supabase
            .from('products')
            .select('id, name')
            .eq('business_id', currentBusiness.id)
            .limit(3);
        
        console.log('3. Business products sample:', businessProducts);
    }
    console.log('=== END DEBUG ===');
}

// Business Management Functions
console.log('🔧 Loading business functions...');

async function initializeBusinessManagement() {
    try {
        console.log('🏢 Initializing business management with complete isolation...');
        await loadUserBusinesses();
        console.log('✅ Business management initialized');
    } catch (error) {
        console.error('❌ Business initialization failed:', error);
    }
}

async function setActiveBusinessOnLoad() {
    try {
        console.log('🎯 Setting active business on load...');
        
        const storedBusiness = loadUserData('activeBusiness');
        
        if (storedBusiness) {
            const businessExists = userBusinesses.some(b => b.id === storedBusiness.id);
            
            if (businessExists) {
                currentBusiness = storedBusiness;
                console.log('✅ Restored active business from user storage:', currentBusiness.name);
                return;
            } else {
                console.log('⚠️ Stored business not found in user businesses');
                clearUserData('activeBusiness');
            }
        }
        
        if (userBusinesses.length > 0) {
            await setActiveBusiness(userBusinesses[0].id);
            console.log('✅ Set first business as active:', userBusinesses[0].name);
        } else {
            console.log('⚠️ No businesses available to set as active');
            currentBusiness = null;
        }
        
    } catch (error) {
        console.error('❌ Error setting active business on load:', error);
    }
}

async function loadBusinessIntelligence() {
    if (!currentBusiness?.id) return;
    
    try {
        await verifyBusinessAccess(currentBusiness.id);
        
        await Promise.all([
            loadFinancialSummary(),
            loadInventorySummary(),
            loadSalesAnalytics(),
            loadBusinessAlerts()
        ]);
        updateDashboardMetrics();
    } catch (error) {
        console.error('❌ Business intelligence load failed:', error);
    }
}

async function verifyBusinessAccess(businessId) {
    try {
        // Check if user owns the business
        const { data: ownedBusiness, error: ownedError } = await supabase
            .from('businesses')
            .select('id, owner_id')
            .eq('id', businessId)
            .eq('owner_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (ownedError && ownedError.code !== 'PGRST116') {
            console.error('Ownership check error:', ownedError);
        }
        
        if (ownedBusiness) {
            return true;
        }
        
        // Check staff roles
        const { data: staffAccess, error: staffError } = await supabase
            .from('staff_roles')
            .select('id')
            .eq('business_id', businessId)
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (staffError && staffError.code !== 'PGRST116') {
            console.error('Staff role check error:', staffError);
        }
        
        if (staffAccess) {
            return true;
        }
        
        throw new Error('Access denied to business');
        
    } catch (error) {
        console.error('❌ Business access verification failed:', error);
        throw new Error('Access denied to business');
    }
}

async function loadBusinessAlerts() {
    const alerts = [];
    
    if (!currentBusiness?.id) return;
    
    try {
        await verifyBusinessAccess(currentBusiness.id);
        
        // Low stock products for current business only
        const { data: lowStockProducts, error: stockError } = await getBusinessData('products', {
            filters: { current_stock: 5 },
            cacheKey: 'low_stock_alerts'
        });
        
        if (stockError) {
            console.error('❌ Error loading low stock products:', stockError);
        } else if (lowStockProducts && lowStockProducts.length > 0) {
            alerts.push({
                type: 'warning',
                message: `${lowStockProducts.length} products are low on stock`,
                action: 'inventory'
            });
        }
        
        updateAlertsUI(alerts);
        
    } catch (error) {
        console.error('❌ Business alerts error:', error);
    }
}

function updateAlertsUI(alerts) {
    const alertContainer = document.getElementById('business-alerts');
    const alertContent = document.getElementById('alert-content');
    
    if (!alertContainer || !alertContent) return;
    
    if (alerts.length === 0) {
        alertContainer.style.display = 'none';
        return;
    }
    
    alertContainer.style.display = 'block';
    alertContainer.className = `content-card status-${alerts[0].type}`;
    
    alertContent.innerHTML = alerts.map(alert => `
        <div class="alert-banner">
            <i class="fas fa-${alert.type === 'critical' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
            <span>${alert.message}</span>
            <button class="btn btn-outline btn-sm" onclick="showDashboardPage('${alert.action}')" 
                    style="margin-left: auto; background: white;">
                View Details
            </button>
        </div>
    `).join('');
}

// Enhanced business loading for staff members
async function loadUserBusinesses() {
    try {
        console.log('📊 Loading user businesses with staff access...');
        
        if (!currentUser) {
            console.warn('⚠️ No current user found');
            userBusinesses = [];
            updateBusinessesUI();
            return;
        }

        console.log('👤 Loading businesses for user:', currentUser.email, 'ID:', currentUser.id);

        // Get businesses owned by the user
        const { data: ownedBusinesses, error: ownedError } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', currentUser.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (ownedError) {
            console.error('❌ Error loading owned businesses:', ownedError);
        }

        // 🔥 FIX: Use simpler query for staff roles to avoid relationship issues
        let staffBusinesses = [];
        
        try {
            // Get staff roles by email (without complex join)
            const { data: staffRolesByEmail, error: staffErrorByEmail } = await supabase
                .from('staff_roles')
                .select('id, business_id, role, staff_name, email, owner_id, is_active')
                .eq('email', currentUser.email)
                .eq('is_active', true);

            console.log('📋 Staff roles found by email:', staffRolesByEmail);

            if (staffRolesByEmail && staffRolesByEmail.length > 0) {
                // Get business details separately
                const businessIds = staffRolesByEmail.map(role => role.business_id);
                const { data: staffBusinessesData, error: businessesError } = await supabase
                    .from('businesses')
                    .select('*')
                    .in('id', businessIds)
                    .eq('is_active', true);

                if (!businessesError && staffBusinessesData) {
                    staffBusinesses = staffRolesByEmail.map(role => {
                        const business = staffBusinessesData.find(b => b.id === role.business_id);
                        return business ? {
                            ...business,
                            access_type: 'staff',
                            staff_role: role.role,
                            staff_name: role.staff_name,
                            staff_email: role.email,
                            staff_role_id: role.id,
                            added_by_owner_id: role.owner_id
                        } : null;
                    }).filter(business => business !== null);
                }
            }

        } catch (schemaError) {
            console.warn('⚠️ Schema error when loading staff roles:', schemaError);
            // Continue with owned businesses only
        }

        // Combine businesses
        const allBusinesses = [];
        
        // Add owned businesses
        if (ownedBusinesses) {
            ownedBusinesses.forEach(business => {
                business.access_type = 'owner';
                business.staff_role = 'owner';
                allBusinesses.push(business);
            });
        }
        
        // Add staff businesses
        staffBusinesses.forEach(business => {
            if (!allBusinesses.some(b => b.id === business.id)) {
                allBusinesses.push(business);
            }
        });

        userBusinesses = allBusinesses;
        saveUserData('userBusinesses', userBusinesses);
        
        console.log('✅ Combined businesses:', {
            owned: ownedBusinesses?.length || 0,
            staff: staffBusinesses.length,
            total: userBusinesses.length
        });

        console.log('📋 Final businesses list:', userBusinesses.map(b => ({
            id: b.id,
            name: b.name,
            access_type: b.access_type,
            role: b.staff_role || 'owner'
        })));

        // Set active business
        await setActiveBusinessOnLoad();
        updateBusinessesUI();
        updateNavbarBusinessSelector();
        
    } catch (error) {
        console.error('❌ Error loading businesses:', error);
        userBusinesses = [];
        updateBusinessesUI();
    }
}

// Enhanced active business loading
async function loadActiveBusiness() {
    try {
        console.log('🎯 Loading active business...');
        
        const storedBusiness = loadUserData('activeBusiness');
        
        if (storedBusiness) {
            const businessExists = userBusinesses.some(b => b.id === storedBusiness.id);
            
            if (businessExists) {
                currentBusiness = storedBusiness;
                console.log('✅ Restored active business from storage:', currentBusiness.name);
                return;
            } else {
                console.log('⚠️ Stored business not found in user businesses');
                clearUserData('activeBusiness');
            }
        }

        // 🔥 CRITICAL FIX: Always set first available business
        if (userBusinesses.length > 0) {
            // For staff members, prioritize their staff businesses
            const staffBusiness = userBusinesses.find(b => b.access_type === 'staff');
            const businessToSet = staffBusiness || userBusinesses[0];
            
            await setActiveBusiness(businessToSet.id);
            console.log('✅ Set active business:', businessToSet.name, 'access:', businessToSet.access_type);
        } else {
            console.log('⚠️ No businesses available to set as active');
            currentBusiness = null;
            
            // Show helpful message for users without business access
            if (currentUser) {
                showNotification(
                    'No Business Access', 
                    'You are not assigned to any active businesses. Please contact the business owner.',
                    'warning',
                    10000
                );
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading active business:', error);
        currentBusiness = null;
    }
}

async function setActiveBusiness(businessId) {
    try {
        console.log('⚡ Setting active business (FAST):', businessId);
        
        const business = userBusinesses.find(b => b.id === businessId);
        if (!business) {
            throw new Error('Business not found');
        }
        
        // Skip if already on this business
        if (currentBusiness && currentBusiness.id === businessId) {
            console.log('ℹ️ Already on this business');
            return;
        }
        
        // Store previous business for cache clearing
        const previousBusiness = currentBusiness;
        
        // Update current business immediately (NO LOADING STATE)
        currentBusiness = business;
        
        // Save to storage (async, don't wait)
        setTimeout(() => {
            saveUserData('activeBusiness', currentBusiness);
        }, 0);
        
        // Update UI immediately
        updateCurrentBusinessUI();
        updateNavbarBusinessSelector();
        
        console.log('✅ Business switched to:', currentBusiness.name);
        
        // Load data in background (non-blocking)
        setTimeout(() => {
            loadBusinessDataInBackground();
        }, 300);
        
        // Trigger event for other components
        triggerBusinessChangeEvent();
        
    } catch (error) {
        console.error('❌ Fast business switch error:', error);
        // Don't show error - just log it
    }
}


// 🔥 NEW FUNCTION: Show loading state for main content
function showMainContentLoadingState() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'business-switch-loading';
    loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: 12px;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="text-align: center; color: #333;">
            <i class="fas fa-sync-alt fa-spin" style="font-size: 3rem; margin-bottom: 1rem; color: #007bff;"></i>
            <h3 style="margin-bottom: 0.5rem;">Switching Business...</h3>
            <p style="color: #6c757d;">Loading data for the new business</p>
        </div>
    `;
    
    mainContent.style.position = 'relative';
    mainContent.appendChild(loadingOverlay);
}

// 🔥 NEW FUNCTION: Hide loading state
function hideMainContentLoadingState() {
    const loadingOverlay = document.getElementById('business-switch-loading');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// 🔥 NEW FUNCTION: Clear all business caches
function clearAllBusinessCaches() {
    console.log('🧹 Clearing all business caches...');
    
    const cacheKeys = [
        'financial_summary',
        'inventory',
        'inventory_summary',
        'low_stock_alerts',
        'customers',
        'analytics',
        'staff_members',
        'sales_data',
        'products',
        'reports',
        'dashboard_metrics'
    ];
    
    cacheKeys.forEach(key => {
        clearBusinessData(key);
    });
    
    // Clear any page-specific data
    if (window.clearPageData) {
        clearPageData();
    }
}

// 🔥 NEW FUNCTION: Reload all main content
async function reloadAllMainContent() {
    console.log('🔄 Reloading all main content for new business...');
    
    try {
        // Get current active page
        const currentPage = localStorage.getItem('activeDashboardPage') || 'overview';
        console.log('📄 Current active page:', currentPage);
        
        // 🔥 CRITICAL: First, clear all existing data and UI
        clearAllPageDataImmediately();
        
        // 🔥 CRITICAL: Wait a brief moment to ensure UI is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force reload business intelligence data
        try {
            if (window.loadBusinessIntelligence) {
                await loadBusinessIntelligence();
            }
        } catch (intelError) {
            console.warn('⚠️ Business intelligence load failed (non-critical):', intelError);
        }
        
        // Update realtime subscriptions
        try {
            if (window.setupRealtimeSubscriptions) {
                setupRealtimeSubscriptions();
            }
        } catch (realtimeError) {
            console.warn('⚠️ Realtime subscriptions failed (non-critical):', realtimeError);
        }
        
        // 🔥 CRITICAL: Reload the current page with fresh data
        await reloadCurrentPage(currentPage);
        
        // Update dashboard metrics
        if (window.updateDashboardMetrics) {
            updateDashboardMetrics();
        }
        
        // 🔥 CRITICAL: Trigger business change event for other modules
        triggerBusinessChangeEvent();
        
        // Hide loading state
        hideMainContentLoadingState();
        
        console.log('✅ All main content reloaded successfully for business:', currentBusiness?.name);
        
    } catch (error) {
        console.error('❌ Critical error reloading main content:', error);
        hideMainContentLoadingState();
        
        // Show user-friendly error message
        showNotification(
            'Business Data Loaded', 
            `Business switched to ${currentBusiness?.name || 'new business'}. Data is loading.`,
            'success',
            3000
        );
        
        // Even if there's an error, try to at least show basic UI
        try {
            const currentPage = localStorage.getItem('activeDashboardPage') || 'overview';
            await showBasicPageContent(currentPage);
        } catch (fallbackError) {
            console.error('❌ Even fallback failed:', fallbackError);
        }
    }
}

function clearAllPageDataImmediately() {
    console.log('🧹 Immediately clearing all page data...');
    
    // Clear any global data variables
    window.inventoryData = [];
    window.salesData = [];
    window.customersData = [];
    window.staffData = [];
    window.partiesData = [];
    
    // Clear all table bodies
    document.querySelectorAll('tbody').forEach(tbody => {
        if (tbody && tbody.innerHTML.trim() !== '') {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">Loading...</td></tr>';
        }
    });
    
    // Clear charts
    if (window.salesChart) {
        try {
            salesChart.destroy();
        } catch (e) {}
        window.salesChart = null;
    }
    
    if (window.revenueChart) {
        try {
            revenueChart.destroy();
        } catch (e) {}
        window.revenueChart = null;
    }
}

// 🔥 ENHANCED FUNCTION: Reload current page with fresh data
async function reloadCurrentPage(page) {
    console.log('🔄 Force reloading page:', page);
    
    // Clear any existing page data first
    clearPageDataForBusiness();
    
    try {
        switch (page) {
            case 'overview':
                if (window.initializeOverviewPage) {
                    await initializeOverviewPage();
                } else {
                    console.warn('⚠️ initializeOverviewPage not available');
                    await loadDefaultOverview();
                }
                break;
                
            case 'sales':
                if (window.initializeSalesManagement) {
                    await initializeSalesManagement();
                } else {
                    console.warn('⚠️ initializeSalesManagement not available');
                    await loadDefaultSales();
                }
                break;
                
            case 'inventory':
                if (window.initializeInventoryPage) {
                    await initializeInventoryPage();
                } else {
                    console.warn('⚠️ initializeInventoryPage not available');
                    await loadDefaultInventory();
                }
                break;
                
            case 'customers':
                if (window.initializeCustomersPage) {
                    await initializeCustomersPage();
                } else {
                    console.warn('⚠️ initializeCustomersPage not available');
                    await loadDefaultCustomers();
                }
                break;
                
            case 'staff':
                if (window.initializeStaffManagement) {
                    await initializeStaffManagement();
                } else {
                    console.warn('⚠️ initializeStaffManagement not available');
                    await loadDefaultStaff();
                }
                break;
                
            case 'reports':
                if (window.initializeReportsPage) {
                    await initializeReportsPage();
                } else {
                    console.warn('⚠️ initializeReportsPage not available');
                    await loadDefaultReports();
                }
                break;
                
            case 'settings':
                if (window.initializeSettingsPage) {
                    await initializeSettingsPage();
                } else {
                    console.warn('⚠️ initializeSettingsPage not available');
                    await loadDefaultSettings();
                }
                break;
                
            default:
                console.log('📄 Loading default page data for:', page);
                // For any page, reload the basic business intelligence
                if (window.loadBusinessIntelligence) {
                    await loadBusinessIntelligence();
                }
        }
        
        console.log('✅ Page reload completed:', page);
        
    } catch (pageError) {
        console.error(`❌ Error reloading page ${page}:`, pageError);
        
        // Show error in the page content
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.innerHTML = `
                <div class="content-card">
                    <div class="text-center" style="padding: 3rem; color: #6c757d;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3>Loading Error</h3>
                        <p>There was an error loading the page data. Please try refreshing.</p>
                        <button class="btn btn-primary mt-2" onclick="reloadCurrentPage('${page}')">
                            <i class="fas fa-refresh"></i> Try Again
                        </button>
                    </div>
                </div>
            `;
        }
        
        throw pageError; // Re-throw to let caller handle it
    }
}

function triggerBusinessChangeEvent() {
    console.log('🎯 Triggering business change event...');
    
    // Create and dispatch a custom event
    const businessChangedEvent = new CustomEvent('businessChanged', {
        detail: {
            businessId: currentBusiness?.id,
            businessName: currentBusiness?.name,
            timestamp: new Date().toISOString()
        }
    });
    
    window.dispatchEvent(businessChangedEvent);
    console.log('✅ Business change event dispatched');
}

// 🔥 NEW FUNCTION: Clear page-specific data
function clearPageDataForBusiness() {
    console.log('🧹 Clearing page-specific data for business switch...');
    
    // Clear any global page data variables
    if (window.inventoryData) {
        window.inventoryData = [];
    }
    
    if (window.salesData) {
        window.salesData = [];
    }
    
    if (window.customersData) {
        window.customersData = [];
    }
    
    if (window.staffData) {
        window.staffData = [];
    }
    
    // Clear any chart instances
    if (window.salesChart) {
        window.salesChart.destroy();
        window.salesChart = null;
    }
    
    if (window.inventoryChart) {
        window.inventoryChart.destroy();
        window.inventoryChart = null;
    }
    
    // Clear any table data
    const tableBodies = document.querySelectorAll('tbody');
    tableBodies.forEach(tbody => {
        if (tbody.id && tbody.id.includes('table-body')) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">Loading data...</td></tr>';
        }
    });
}

// 🔥 NEW FUNCTION: Default page loaders (fallbacks)
async function loadDefaultOverview() {
    console.log('📊 Loading default overview...');
    await loadBusinessIntelligence();
    updateDashboardMetrics();
}

async function loadDefaultSales() {
    console.log('💰 Loading default sales...');
    // Implement basic sales loading
    const salesContainer = document.getElementById('sales-page');
    if (salesContainer) {
        salesContainer.innerHTML = '<div class="text-center p-4">Loading sales data...</div>';
        // Your sales loading logic here
    }
}

async function loadDefaultInventory() {
    console.log('📦 Loading default inventory...');
    // Implement basic inventory loading
    const inventoryContainer = document.getElementById('inventory-page');
    if (inventoryContainer) {
        inventoryContainer.innerHTML = '<div class="text-center p-4">Loading inventory data...</div>';
        // Your inventory loading logic here
    }
}

async function loadDefaultParties() {
    console.log('👥 Loading default parties...');
    const partiesContainer = document.getElementById('parties-page');
    if (partiesContainer) {
        partiesContainer.innerHTML = '<div class="text-center p-4">Loading parties data...</div>';
        
        // Your parties loading logic here
        if (window.loadParties) {
            await loadParties();
        }
    }
}

async function loadDefaultCustomers() {
    console.log('👥 Loading default customers...');
    // Implement basic customers loading
}

async function loadDefaultStaff() {
    console.log('👨‍💼 Loading default staff...');
    // Implement basic staff loading
}

async function loadDefaultReports() {
    console.log('📈 Loading default reports...');
    // Implement basic reports loading
}

async function loadDefaultSettings() {
    console.log('⚙️ Loading default settings...');
    // Implement basic settings loading
}

function updateCurrentBusinessUI() {
    const currentBusinessName = document.getElementById('current-business-name');
    if (currentBusinessName) {
        if (currentBusiness && currentBusiness.name) {
            currentBusinessName.textContent = currentBusiness.name;
        } else {
            currentBusinessName.textContent = 'No Business Selected';
        }
    }
}

function updateBusinessesUI() {
    console.log('🔄 Updating businesses UI...');
    const businessesList = document.getElementById('businesses-list');
    const noBusinessesMessage = document.getElementById('no-businesses-message');
    const businessCount = document.getElementById('business-count');
    
    if (!businessesList || !noBusinessesMessage || !businessCount) {
        console.warn('⚠️ Business UI elements not found');
        return;
    }
    
    businessCount.textContent = `${userBusinesses.length} business${userBusinesses.length !== 1 ? 'es' : ''}`;
    
    if (userBusinesses.length === 0) {
        noBusinessesMessage.style.display = 'block';
        businessesList.innerHTML = '';
        businessesList.appendChild(noBusinessesMessage);
    } else {
        noBusinessesMessage.style.display = 'none';
        
        const businessesHTML = userBusinesses.map(business => {
            const isActive = currentBusiness && business.id === currentBusiness.id;
            const badgeClass = isActive ? 'badge-success' : 'badge-outline';
            const badgeText = isActive ? 'Active' : 'Inactive';
            const accessType = business.access_type === 'owner' ? 'Owner' : 'Staff';
            
            return `
            <div class="business-card ${isActive ? 'active-business' : ''}" 
                 data-business-id="${business.id}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--dark);">${business.name}</h4>
                        <span class="badge ${badgeClass}">
                            <i class="fas ${isActive ? 'fa-check' : 'fa-times'}"></i> ${badgeText}
                        </span>
                        <span class="badge badge-primary" style="margin-left: 0.5rem;">
                            ${accessType}
                        </span>
                    </div>
                    <div class="business-actions" style="display: flex; gap: 0.5rem;">
                        ${!isActive ? `
                            <button class="btn btn-outline btn-sm set-active-btn" 
                                    onclick="setActiveBusiness('${business.id}')"
                                    data-business-id="${business.id}">
                                <i class="fas fa-check"></i> Set Active
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div style="color: #6c757d; font-size: 0.9rem;">
                    <div><i class="fas fa-industry"></i> ${business.business_type || 'Not specified'}</div>
                    <div><i class="fas fa-money-bill"></i> ${business.currency || 'INR'}</div>
                    ${business.phone ? `<div><i class="fas fa-phone"></i> ${business.phone}</div>` : ''}
                    ${business.email ? `<div><i class="fas fa-envelope"></i> ${business.email}</div>` : ''}
                    <div><i class="fas fa-calendar"></i> Created ${new Date(business.created_at).toLocaleDateString()}</div>
                </div>
            </div>
            `;
        }).join('');
        
        businessesList.innerHTML = businessesHTML;
    }
    
    console.log('✅ Businesses UI updated');
}

function updateNavbarBusinessSelector() {
    const navbarSelector = document.getElementById('navbar-business-select');
    if (!navbarSelector) return;
    
    navbarSelector.innerHTML = userBusinesses.map(business => 
        `<option value="${business.id}" ${business.id === currentBusiness?.id ? 'selected' : ''}>
            ${business.name} ${business.id === currentBusiness?.id ? '✓' : ''}
        </option>`
    ).join('');
    
    if (userBusinesses.length === 0) {
        navbarSelector.innerHTML = '<option value="">No businesses</option>';
    }
    
    // Remove existing event listeners and add new one
    navbarSelector.onchange = null;
    navbarSelector.onchange = async function() {
        const selectedBusinessId = this.value;
        if (selectedBusinessId && selectedBusinessId !== currentBusiness?.id) {
            console.log('🎯 Navbar selector changed active business to:', selectedBusinessId);
            await setActiveBusiness(selectedBusinessId);
        }
    };
    
    console.log('✅ Updated navbar business selector');
}

function updateAllBusinessUI() {
    console.log('🔄 Updating all business UI...');
    updateCurrentBusinessUI();
    updateBusinessesUI();
    updateNavbarBusinessSelector();
    updateBusinessDependentUI();
}

function updateBusinessDependentUI() {
    const businessNameElements = document.querySelectorAll('[data-business-name]');
    businessNameElements.forEach(element => {
        if (currentBusiness) {
            element.textContent = currentBusiness.name;
        }
    });
    console.log('🔄 Updated business-dependent UI');
}

// Business creation function
async function createNewBusiness(businessData) {
    try {
        console.log('🏢 Creating new business for user:', currentUser.email);
        
        if (!currentUser) {
            throw new Error('User must be authenticated to create business');
        }
        
        const businessInsertData = {
            name: businessData.name,
            owner_id: currentUser.id,
            business_type: businessData.type,
            currency: businessData.currency || 'INR',
            phone: businessData.phone || '',
            email: businessData.email || currentUser.email,
            address: businessData.address || '',
            gst_number: businessData.gstNumber || '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Inserting business data:', businessInsertData);
        
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .insert([businessInsertData])
            .select()
            .single();
        
        if (businessError) {
            console.error('❌ Business creation error:', businessError);
            throw businessError;
        }
        
        console.log('✅ Business created:', business);
        
        // 🔥 CRITICAL FIX: Create owner role in staff_roles table
        console.log('👑 Creating owner role in staff_roles for business:', business.id);
        
        const ownerRoleData = {
            business_id: business.id,
            owner_id: currentUser.id, // The business owner
            email: currentUser.email, // Owner's email
            staff_name: currentUser.email.split('@')[0], // Default name from email
            role: 'owner',
            is_active: true,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Inserting owner role data:', ownerRoleData);
        
        const { data: staffRole, error: roleError } = await supabase
            .from('staff_roles')
            .insert([ownerRoleData])
            .select()
            .single();
        
        if (roleError) {
            console.error('❌ Owner role creation error:', roleError);
            // Don't throw error here - business was created successfully
            // Just log the error and continue
        } else {
            console.log('✅ Owner role created in staff_roles:', staffRole);
        }
        
        return business;
        
    } catch (error) {
        console.error('❌ Error creating business:', error);
        throw error;
    }
}

// Enhanced user roles loading
async function loadUserRoles() {
    try {
        if (!currentUser) {
            console.warn('⚠️ No current user for role loading');
            return {};
        }
        
        const { data: roles, error } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);
        
        if (error) {
            console.error('❌ Error loading user roles:', error);
            return {};
        }
        
        userRoles = {};
        if (roles) {
            roles.forEach(role => {
                userRoles[role.business_id] = {
                    id: role.id,
                    business_id: role.business_id,
                    user_id: role.user_id,
                    role: role.role,
                    is_active: role.is_active
                };
            });
        }
        
        console.log('✅ Loaded user roles:', Object.keys(userRoles).length);
        return userRoles;
        
    } catch (error) {
        console.error('❌ Error loading user roles:', error);
        return {};
    }
}

function showCreateBusinessModal() {
    const modal = document.getElementById('create-business-modal');
    if (modal) {
        modal.classList.remove('d-none');
        document.getElementById('new-business-name').focus();
    }
}

function hideCreateBusinessModal() {
    const modal = document.getElementById('create-business-modal');
    if (modal) {
        modal.classList.add('d-none');
        document.getElementById('create-business-form').reset();
    }
}

// Initialize business form handling
function initializeBusinessForms() {
    const createBusinessForm = document.getElementById('create-business-form');
    if (createBusinessForm) {
        createBusinessForm.addEventListener('submit', handleCreateBusiness);
    }
}

async function handleCreateBusiness(e) {
    e.preventDefault();
    console.log('🏢 Handling business creation...');
    isCreatingBusiness = true;
    
    const submitButton = document.querySelector('#create-business-form button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitButton.disabled = true;
        
        const businessName = document.getElementById('new-business-name');
        const businessType = document.getElementById('new-business-type');
        const businessCurrency = document.getElementById('new-business-currency');
        
        if (!businessName || !businessType || !businessCurrency) {
            throw new Error('Required form fields are missing');
        }
        
        const formData = {
            name: businessName.value.trim(),
            type: businessType.value,
            currency: businessCurrency.value,
            phone: document.getElementById('new-business-phone')?.value.trim() || '',
            email: document.getElementById('new-business-email')?.value.trim() || currentUser?.email || '',
            address: document.getElementById('new-business-address')?.value.trim() || '',
            gstNumber: document.getElementById('new-gst-number')?.value.trim() || ''
        };
        
        if (!formData.name) {
            showNotification('Error', 'Business name is required', 'error');
            return;
        }
        
        if (!formData.type) {
            showNotification('Error', 'Business type is required', 'error');
            return;
        }
        
        console.log('📝 Creating business with data:', formData);
        
        const newBusiness = await createNewBusiness(formData);
        
        // 🔥 CRITICAL: Add the new business to userBusinesses with proper access type
        const businessWithAccess = {
            ...newBusiness,
            access_type: 'owner',
            staff_role: 'owner'
        };
        
        userBusinesses.unshift(businessWithAccess);
        
        // Clear cache and reload to ensure fresh data
        clearUserData('userBusinesses');
        saveUserData('userBusinesses', userBusinesses);
        
        // Set the new business as active
        await setActiveBusiness(newBusiness.id);
        
        hideCreateBusinessModal();
        showNotification('Success', `Business "${newBusiness.name}" created!`, 'success');
        
        // 🔥 CRITICAL FIX: Force redirect to dashboard after business creation
        console.log('🔄 Redirecting to dashboard after business creation...');
        
        // Wait a moment for the notification to show
        setTimeout(async () => {
            await showDashboard();
            
            // Force reload all dashboard data
            if (window.loadDashboardData) {
                await loadDashboardData();
            }
            
            // Update all UI components
            updateBusinessesUI();
            updateNavbarBusinessSelector();
            
            // 🔥 IMPORTANT: Reload user role for the new business
            if (window.loadCurrentUserRole) {
                await loadCurrentUserRole();
            }
            if (window.applyRoleBasedAccess) {
                applyRoleBasedAccess();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Business creation error:', error);
        let errorMessage = 'Failed to create business';
        
        if (error.message.includes('form fields are missing')) {
            errorMessage = 'Form configuration error. Please refresh the page.';
        } else if (error.message.includes('23505')) {
            errorMessage = 'A business with this name already exists';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification('Error', errorMessage, 'error');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        isCreatingBusiness = false;
    }
}

function editBusiness(businessId) {
    const business = userBusinesses.find(b => b.id === businessId);
    if (!business) {
        showNotification('Error', 'Business not found', 'error');
        return;
    }
    
    const shouldSetActive = confirm(`Business: ${business.name}\nType: ${business.business_type}\n\nDo you want to set this as your active business?`);
    
    if (shouldSetActive) {
        setActiveBusiness(businessId);
    } else {
        showNotification(
            'Business Details', 
            `Name: ${business.name}\nType: ${business.business_type}\nCurrency: ${business.currency || 'INR'}`,
            'info',
            5000
        );
    }
    
    console.log('✏️ Editing business:', business);
}

function setupRealtimeSubscriptions() {
    if (!currentBusiness?.id) return;
    
    // Clear existing subscriptions
    supabase.removeAllChannels();
    
    console.log('📡 Setting up realtime subscriptions for business:', currentBusiness.name);
    
    // Inventory changes for current business only
    const inventorySubscription = supabase
        .channel(`inventory-${currentBusiness.id}`)
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'products',
                filter: `business_id=eq.${currentBusiness.id}`
            }, 
            (payload) => {
                console.log('🔄 Inventory change for current business:', payload);
                clearBusinessData('inventory');
                clearBusinessData('inventory_summary');
                clearBusinessData('low_stock_alerts');
                loadInventorySummary();
                loadBusinessAlerts();
            }
        )
        .subscribe();
    
    // Sales changes for current business only
    const salesSubscription = supabase
        .channel(`sales-${currentBusiness.id}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'sales',
                filter: `business_id=eq.${currentBusiness.id}`
            },
            (payload) => {
                console.log('🔄 Sales change for current business:', payload);
                clearBusinessData('financial_summary');
                clearBusinessData('analytics');
                loadFinancialSummary();
                updateDashboardMetrics();
            }
        )
        .subscribe();
    
    // Customer changes for current business only
    const customersSubscription = supabase
        .channel(`customers-${currentBusiness.id}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'customers',
                filter: `business_id=eq.${currentBusiness.id}`
            },
            (payload) => {
                console.log('🔄 Customer change for current business:', payload);
                clearBusinessData('customers');
            }
        )
        .subscribe();
}

// Refresh business data
async function refreshBusinessData() {
    console.log('🔄 Refreshing business data...');
    clearUserData('userBusinesses');
    clearAllBusinessData(currentBusiness?.id);
    await loadUserBusinesses();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeBusinessForms();
});

console.log('✅ Business functions loaded successfully');

// 🔥 ADD THESE TO BUSINESS.JS IF NOT PRESENT:

// Simple permission check fallback
function hasPermission(resource, action) {
    console.log(`🔐 Checking permission: ${resource}.${action} for user:`, currentUser?.email, 'role:', currentUser?.role);
    
    // Always allow business owner
    if (currentBusiness?.owner_id === currentUser?.id) {
        console.log('✅ Business owner - full access granted');
        return true;
    }
    
    if (!currentUser) {
        console.warn('⚠️ No current user found');
        return false;
    }

    if (!currentUser.role) {
        console.warn('⚠️ No user role available for permission check');
        return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[currentUser.role];
    if (!rolePermissions) {
        console.warn('⚠️ No permissions defined for role:', currentUser.role);
        return false;
    }

    const resourcePermissions = rolePermissions.permissions[resource];
    if (!resourcePermissions) {
        console.warn('⚠️ No permissions defined for resource:', resource);
        return false;
    }

    const hasAccess = resourcePermissions.includes(action);
    console.log(`🔐 Permission result: ${currentUser.role} -> ${resource}.${action}: ${hasAccess}`);
    return hasAccess;
}

// Simple page access check
function canAccessPage(page) {
    console.log(`🔐 Checking page access: ${page} for role:`, currentUser?.role);
    
    // Page to permission mapping
    const pagePermissions = {
        'overview': { resource: 'business', action: 'view' },
        'sales': { resource: 'sales', action: 'view' },
        'inventory': { resource: 'products', action: 'view' },
        'customers': { resource: 'customers', action: 'view' },
        'staff': { resource: 'staff', action: 'view' },
        'reports': { resource: 'reports', action: 'view' },
        'settings': { resource: 'settings', action: 'view' },
        'parties': { resource: 'customers', action: 'view' },
        'purchases': { resource: 'purchases', action: 'view' },
        'expenses': { resource: 'expenses', action: 'view' },
        'business': { resource: 'business', action: 'view' }
    };

    const permission = pagePermissions[page];
    if (!permission) {
        console.log('✅ Page has no permission requirements:', page);
        return true; // No specific permission required
    }

    const canAccess = hasPermission(permission.resource, permission.action);
    console.log(`🔐 Page access result: ${page} -> ${canAccess}`);
    return canAccess;
}

// Apply basic UI restrictions
function applyRoleBasedAccess() {
    console.log('🔐 Applying role-based access control...');
    
    if (!currentUser || !currentBusiness) {
        console.warn('⚠️ No user or business for access control');
        return;
    }
    
    console.log('👤 Current user role:', currentUser.role);
    console.log('🏢 Current business:', currentBusiness.name);
    
    // Apply to navigation menu
    applyNavigationRestrictions();
    
    // Apply to action buttons
    applyActionButtonRestrictions();
    
    // Apply to page content
    applyContentRestrictions();
}

// Debug function to check business and role status
function debugBusinessAndRoleStatus() {
    console.log('=== BUSINESS & ROLE DEBUG ===');
    console.log('👤 Current User:', currentUser?.email, 'ID:', currentUser?.id);
    console.log('🏢 Current Business:', currentBusiness?.name, 'ID:', currentBusiness?.id);
    console.log('🔐 Business Access Type:', currentBusiness?.access_type);
    console.log('🎯 User Role:', currentUser?.role);
    console.log('📊 User Businesses:', userBusinesses.length);
    console.log('📋 Businesses List:', userBusinesses.map(b => ({
        id: b.id,
        name: b.name,
        access_type: b.access_type,
        role: b.staff_role
    })));
    
    // Test database queries with correct schema
    if (currentUser) {
        console.log('🔍 Testing staff role queries...');
        
        // Test query by email (primary method)
        supabase
            .from('staff_roles')
            .select('*')
            .eq('email', currentUser.email)
            .eq('is_active', true)
            .then(({ data, error }) => {
                console.log('📋 Staff roles by email:', data, error);
            });
            
        // Test query by owner_id
        supabase
            .from('staff_roles')
            .select('*')
            .eq('owner_id', currentUser.id)
            .eq('is_active', true)
            .then(({ data, error }) => {
                console.log('📋 Staff roles by owner_id:', data, error);
            });
    }
    console.log('=== END DEBUG ===');
}

// Make it globally available
window.debugBusinessAndRoleStatus = debugBusinessAndRoleStatus;

// Make functions globally available
window.hasPermission = hasPermission;
window.canAccessPage = canAccessPage;
window.applyRoleBasedAccess = applyRoleBasedAccess;
// Ensure functions are available globally
window.setActiveBusiness = setActiveBusiness;
window.clearAllBusinessCaches = clearAllBusinessCaches;
window.reloadCurrentPage = reloadCurrentPage;
window.triggerBusinessChangeEvent = triggerBusinessChangeEvent;

console.log('✅ Business switching functions loaded successfully');