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
// In business.js, update the getBusinessData function:
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
        .eq('business_id', currentBusiness.id);
    
    // Only add is_active filter if the table has this column
    const tablesWithActiveFlag = [
        'businesses', 
        'products', 
        'parties', 
        'staff_roles',
        'expenses'
        // Add other tables that have is_active column
    ];
    
    if (tablesWithActiveFlag.includes(table)) {
        query = query.eq('is_active', true);
    }
    
    // Apply additional filters
    if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
            if (key.includes('_gte') || key.includes('_lte')) {
                // Handle date range filters
                const operator = key.includes('_gte') ? 'gte' : 'lte';
                const cleanKey = key.replace(/_gte|_lte/g, '');
                query = query[operator](cleanKey, value);
            } else {
                query = query.eq(key, value);
            }
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
    
    if (error) {
        console.error(`❌ Error fetching ${table}:`, error);
        throw error;
    }
    
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

        // 🔥 CRITICAL: Set window.userBusinesses for other modules
        window.userBusinesses = userBusinesses;

        // Dispatch event that businesses are loaded
        window.dispatchEvent(new CustomEvent('businessesLoaded', {
            detail: { count: userBusinesses.length }
        }));

        // 🔥 CRITICAL: Set active business if not set
        if (!currentBusiness && userBusinesses.length > 0) {
            console.log('🎯 No active business set, setting first business as active...');
            await setActiveBusiness(userBusinesses[0].id);
        } else if (currentBusiness) {
            // Ensure window.currentBusiness is set
            window.currentBusiness = currentBusiness;
            console.log('✅ Current business already set:', currentBusiness.name);
        }
        
        updateBusinessesUI();
        updateNavbarBusinessSelector();
        
    } catch (error) {
        console.error('❌ Error loading businesses:', error);
        userBusinesses = [];
        window.userBusinesses = [];
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
        console.log('⚡ Setting active business:', businessId);
        
        const business = userBusinesses.find(b => b.id === businessId);
        if (!business) {
            throw new Error('Business not found');
        }
        
        // Skip if already on this business
        if (currentBusiness && currentBusiness.id === businessId) {
            console.log('ℹ️ Already on this business');
            return;
        }
        
        // 🔥 CRITICAL: Set both local and window variables
        currentBusiness = business;
        window.currentBusiness = business;
        
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

// Make sure business data is loaded when settings page is shown
function ensureBusinessDataForSettings() {
    console.log('🔍 Ensuring business data for settings...');
    
    // Check if we already have business data
    if (window.currentBusiness && window.currentBusiness.id) {
        console.log('✅ Business data already available:', window.currentBusiness.name);
        return Promise.resolve(window.currentBusiness);
    }
    
    // Try to load businesses if not loaded
    if (window.userBusinesses && window.userBusinesses.length > 0) {
        const business = window.userBusinesses[0];
        window.currentBusiness = business;
        currentBusiness = business;
        console.log('✅ Set current business from userBusinesses:', business.name);
        return Promise.resolve(business);
    }
    
    // Try to load from storage
    const storedBusiness = loadUserData('activeBusiness');
    if (storedBusiness) {
        window.currentBusiness = storedBusiness;
        currentBusiness = storedBusiness;
        console.log('✅ Restored business from storage:', storedBusiness.name);
        return Promise.resolve(storedBusiness);
    }
    
    // Last resort - try to load from database
    console.log('🔄 Attempting to load businesses from database...');
    return loadUserBusinesses().then(() => {
        if (window.userBusinesses && window.userBusinesses.length > 0) {
            const business = window.userBusinesses[0];
            window.currentBusiness = business;
            currentBusiness = business;
            console.log('✅ Loaded business from database:', business.name);
            return business;
        }
        return null;
    });
}

// Make it globally available
window.ensureBusinessDataForSettings = ensureBusinessDataForSettings;


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
    
    // Check if the elements exist before trying to update them
    const businessesList = document.getElementById('businesses-list');
    const noBusinessesMessage = document.getElementById('no-businesses-message');
    const businessCount = document.getElementById('business-count');
    
    // If these elements don't exist, we're not on the businesses page
    if (!businessesList) {
        console.log('⚠️ Businesses UI elements not found (not on businesses page)');
        return;
    }
    
    // Check if message element exists, if not create it
    let noBusinessMsg = noBusinessesMessage;
    if (!noBusinessMsg) {
        noBusinessMsg = document.createElement('div');
        noBusinessMsg.id = 'no-businesses-message';
        noBusinessMsg.className = 'empty-state';
        noBusinessMsg.innerHTML = `
            <i class="fas fa-store"></i>
            <h3>No Businesses Found</h3>
            <p>You don't have access to any businesses yet.</p>
            <button class="btn btn-primary mt-2" onclick="showCreateBusinessModal()">
                <i class="fas fa-plus"></i> Create Your First Business
            </button>
        `;
        businessesList.appendChild(noBusinessMsg);
    }
    
    if (businessCount) {
        businessCount.textContent = `${userBusinesses.length} business${userBusinesses.length !== 1 ? 'es' : ''}`;
    }
    
    if (userBusinesses.length === 0) {
        if (noBusinessMsg) {
            noBusinessMsg.style.display = 'block';
        }
        businessesList.innerHTML = '';
        if (noBusinessMsg) {
            businessesList.appendChild(noBusinessMsg);
        }
    } else {
        if (noBusinessMsg) {
            noBusinessMsg.style.display = 'none';
        }
        
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
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--dark);">${escapeHtml(business.name)}</h4>
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
                    <div><i class="fas fa-industry"></i> ${escapeHtml(business.business_type || 'Not specified')}</div>
                    <div><i class="fas fa-money-bill"></i> ${business.currency || 'INR'}</div>
                    ${business.phone ? `<div><i class="fas fa-phone"></i> ${escapeHtml(business.phone)}</div>` : ''}
                    ${business.email ? `<div><i class="fas fa-envelope"></i> ${escapeHtml(business.email)}</div>` : ''}
                    <div><i class="fas fa-calendar"></i> Created ${new Date(business.created_at).toLocaleDateString()}</div>
                </div>
            </div>
            `;
        }).join('');
        
        businessesList.innerHTML = businessesHTML;
    }
    
    console.log('✅ Businesses UI updated with', userBusinesses.length, 'businesses');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
window.currentBusiness = currentBusiness;
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

// Business Selector Component JS
document.addEventListener('DOMContentLoaded', function() {
    initializeBusinessSelector();
});

function initializeBusinessSelector() {
    console.log('🎯 Initializing business selector component...');
    
    const activeBusinessDisplay = document.getElementById('active-business-display');
    const businessSearchInput = document.getElementById('business-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const businessesList = document.getElementById('businesses-list');
    const businessDropdownMenu = document.getElementById('business-dropdown-menu');
    
    if (!activeBusinessDisplay || !businessesList) {
        console.warn('⚠️ Business selector elements not found');
        return;
    }
    
    // Toggle dropdown when clicking the active business display
    activeBusinessDisplay.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleBusinessDropdown();
    });
    
    // Add hover effect to active business display
    activeBusinessDisplay.style.cursor = 'pointer';
    activeBusinessDisplay.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
        this.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.1)';
    });
    
    activeBusinessDisplay.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
        this.style.boxShadow = '';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const isInsideSelector = e.target.closest('.business-selector-container');
        if (!isInsideSelector) {
            closeBusinessDropdown();
        }
    });
    
    // Handle search input
    if (businessSearchInput) {
        businessSearchInput.addEventListener('input', function() {
            filterBusinesses(this.value);
            updateClearSearchButton();
        });
        
        businessSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                filterBusinesses('');
                updateClearSearchButton();
                closeBusinessDropdown();
            }
        });
    }
    
    // Handle clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (businessSearchInput) {
                businessSearchInput.value = '';
                filterBusinesses('');
                businessSearchInput.focus();
                updateClearSearchButton();
            }
        });
    }
    
    // Close dropdown with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeBusinessDropdown();
        }
    });
    
    // Initialize display
    updateActiveBusinessDisplay();
    
    console.log('✅ Business selector initialized');
}

function toggleBusinessDropdown() {
    const businessDropdownMenu = document.getElementById('business-dropdown-menu');
    const activeBusinessDisplay = document.getElementById('active-business-display');
    
    if (!businessDropdownMenu || !activeBusinessDisplay) return;
    
    const isOpen = businessDropdownMenu.style.display === 'block';
    
    if (isOpen) {
        closeBusinessDropdown();
    } else {
        openBusinessDropdown();
    }
}

function openBusinessDropdown() {
    const businessDropdownMenu = document.getElementById('business-dropdown-menu');
    const activeBusinessDisplay = document.getElementById('active-business-display');
    
    if (!businessDropdownMenu || !activeBusinessDisplay) return;
    
    // Update active business display state
    activeBusinessDisplay.classList.add('active');
    
    // Position dropdown relative to the selector container
    const selectorContainer = document.querySelector('.business-selector-container');
    const rect = selectorContainer.getBoundingClientRect();
    
    // Position dropdown below the selector
    businessDropdownMenu.style.top = (rect.bottom + 5) + 'px';
    businessDropdownMenu.style.left = rect.left + 'px';
    businessDropdownMenu.style.width = rect.width + 'px';
    businessDropdownMenu.style.display = 'block';
    businessDropdownMenu.style.opacity = '0';
    businessDropdownMenu.style.transform = 'translateY(-10px)';
    
    // Trigger animation
    setTimeout(() => {
        businessDropdownMenu.style.opacity = '1';
        businessDropdownMenu.style.transform = 'translateY(0)';
    }, 10);
    
    // Clear search and load businesses
    const businessSearchInput = document.getElementById('business-search-input');
    if (businessSearchInput) {
        businessSearchInput.value = '';
        filterBusinesses('');
        updateClearSearchButton();
        setTimeout(() => businessSearchInput.focus(), 100);
    }
    
    // Ensure businesses list is updated
    updateBusinessesListInSelector();
    
    console.log('📂 Business dropdown opened');
}

function closeBusinessDropdown() {
    const businessDropdownMenu = document.getElementById('business-dropdown-menu');
    const activeBusinessDisplay = document.getElementById('active-business-display');
    
    if (!businessDropdownMenu || !activeBusinessDisplay) return;
    
    // Update active business display state
    activeBusinessDisplay.classList.remove('active');
    
    // Hide dropdown with animation
    businessDropdownMenu.style.opacity = '0';
    businessDropdownMenu.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        businessDropdownMenu.style.display = 'none';
    }, 200);
    
    console.log('📂 Business dropdown closed');
}

function filterBusinesses(searchTerm) {
    const businessesList = document.getElementById('businesses-list');
    if (!businessesList) return;
    
    const businessItems = businessesList.querySelectorAll('.business-item');
    const noResults = businessesList.querySelector('.no-businesses-message') || 
                     businessesList.querySelector('.business-loading');
    
    if (noResults) {
        return; // Don't filter if showing loading or no results
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    let hasVisibleItems = false;
    
    businessItems.forEach(item => {
        const businessName = item.querySelector('.business-item-name')?.textContent.toLowerCase() || '';
        const businessType = item.querySelector('.business-item-type')?.textContent.toLowerCase() || '';
        
        if (searchLower === '' || 
            businessName.includes(searchLower) || 
            businessType.includes(searchLower)) {
            item.style.display = 'flex';
            hasVisibleItems = true;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show no results message if no items match
    const noResultsElement = businessesList.querySelector('.no-results-message');
    if (!hasVisibleItems && searchLower !== '') {
        if (!noResultsElement) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results-message';
            noResultsDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6c757d;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No businesses found for "${searchTerm}"</p>
                </div>
            `;
            businessesList.appendChild(noResultsDiv);
        }
    } else if (noResultsElement) {
        noResultsElement.remove();
    }
}

function updateClearSearchButton() {
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const businessSearchInput = document.getElementById('business-search-input');
    
    if (clearSearchBtn && businessSearchInput) {
        const searchValue = businessSearchInput.value.trim();
        
        if (searchValue !== '') {
            // Show clear button when there's text
            clearSearchBtn.style.display = 'flex';
            clearSearchBtn.style.opacity = '1';
            clearSearchBtn.style.visibility = 'visible';
        } else {
            // Hide clear button when input is empty
            clearSearchBtn.style.display = 'none';
            clearSearchBtn.style.opacity = '0';
            clearSearchBtn.style.visibility = 'hidden';
        }
    }
}

function updateBusinessesListInSelector() {
    const businessesList = document.getElementById('businesses-list');
    if (!businessesList) return;
    
    // Clear current content
    businessesList.innerHTML = '';
    
    // Show loading state initially
    if (!userBusinesses) {
        businessesList.innerHTML = `
            <div class="business-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading businesses...</span>
            </div>
        `;
        return;
    }
    
    if (userBusinesses.length === 0) {
        businessesList.innerHTML = `
            <div class="no-businesses-message">
                <div style="text-align: center; padding: 2rem; color: #6c757d;">
                    <i class="fas fa-store" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No businesses found</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="showCreateBusinessModal(); closeBusinessDropdown();">
                        <i class="fas fa-plus"></i> Create Business
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Add business items
    userBusinesses.forEach(business => {
        const isActive = currentBusiness && business.id === currentBusiness.id;
        const businessItem = document.createElement('div');
        businessItem.className = `business-item ${isActive ? 'active' : ''}`;
        businessItem.dataset.businessId = business.id;
        
        const accessType = business.access_type === 'owner' ? 'Owner' : 'Staff';
        const role = business.staff_role || accessType;
        
        businessItem.innerHTML = `
            <div class="business-item-icon">
                <i class="fas fa-store"></i>
            </div>
            <div class="business-item-info">
                <div class="business-item-name">${business.name}</div>
                <div class="business-item-meta">
                    <span class="business-item-type">${business.business_type || 'General'}</span>
                    <span class="business-item-role">${role}</span>
                </div>
            </div>
            ${!isActive ? `
                
            ` : `
                <div class="business-item-actions">
                    <span class="current-business-badge">
                        <i class="fas fa-check-circle"></i>
                    </span>
                </div>
            `}
        `;
        
        // Add click event to the entire item (except the switch button)
        businessItem.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-switch-business')) {
                switchBusinessInSelector(business.id);
            }
        });
        
        businessesList.appendChild(businessItem);
    });
    
    console.log('✅ Business selector list updated:', userBusinesses.length, 'businesses');
}

async function switchBusinessInSelector(businessId) {
    console.log('🔄 Switching business from selector:', businessId);
    
    try {
        // Show loading state in selector
        const businessesList = document.getElementById('businesses-list');
        if (businessesList) {
            const originalContent = businessesList.innerHTML;
            businessesList.innerHTML = `
                <div class="business-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Switching business...</span>
                </div>
            `;
        }
        
        // Update active business display immediately for better UX
        const business = userBusinesses.find(b => b.id === businessId);
        if (business) {
            updateActiveBusinessDisplayPreview(business);
        }
        
        // Call the main setActiveBusiness function
        await setActiveBusiness(businessId);
        
        // Close the dropdown
        closeBusinessDropdown();
        
        // Show success notification
        showNotification('Success', `Switched to ${business?.name || 'business'}`, 'success', 2000);
        
        console.log('✅ Business switched successfully from selector');
        
    } catch (error) {
        console.error('❌ Error switching business from selector:', error);
        
        // Restore original content
        updateBusinessesListInSelector();
        
        // Restore original active business display
        updateActiveBusinessDisplay();
        
        // Show error notification
        showNotification('Error', 'Failed to switch business', 'error');
    }
}

// Update active business display with preview (for immediate feedback)
function updateActiveBusinessDisplayPreview(business) {
    const activeBusinessName = document.getElementById('active-business-name');
    const activeBusinessType = document.getElementById('active-business-type');
    const activeBusinessRole = document.getElementById('active-business-role');
    
    if (!activeBusinessName) return;
    
    // Get or create the span
    let nameSpan = activeBusinessName.querySelector('span');
    if (!nameSpan) {
        nameSpan = document.createElement('span');
        activeBusinessName.appendChild(nameSpan);
    }
    
    // Update text content
    nameSpan.textContent = business.name;
    
    // Update other elements
    if (activeBusinessType) {
        activeBusinessType.textContent = business.business_type || 'General';
    }
    if (activeBusinessRole) {
        const role = business.access_type === 'owner' ? 'Owner' : 
                    business.staff_role || 'Staff';
        activeBusinessRole.textContent = role;
    }
}

// Update active business display from currentBusiness
function updateActiveBusinessDisplay() {
    const activeBusinessName = document.getElementById('active-business-name');
    const activeBusinessType = document.getElementById('active-business-type');
    const activeBusinessRole = document.getElementById('active-business-role');
    const businessAvatar = document.querySelector('.business-avatar');
    
    if (!activeBusinessName) return;
    
    if (currentBusiness && currentBusiness.name) {
        // Update name
        activeBusinessName.innerHTML = `<span>${escapeHtml(currentBusiness.name)}</span>`;
        
        // Update type
        if (activeBusinessType) {
            activeBusinessType.textContent = currentBusiness.business_type || 'General';
        }
        
        // Update role
        if (activeBusinessRole) {
            const role = currentBusiness.access_type === 'owner' ? 'Owner' : 
                        currentBusiness.staff_role || 'Staff';
            activeBusinessRole.textContent = role;
        }
        
        // Update logo/avatar
        if (businessAvatar) {
            // Check if business has logo
            if (currentBusiness.logo_data && currentBusiness.logo_data.startsWith('data:image')) {
                // Show logo image
                businessAvatar.innerHTML = `<img src="${currentBusiness.logo_data}" alt="${escapeHtml(currentBusiness.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
                businessAvatar.style.backgroundColor = 'transparent';
            } else {
                // Show icon with business initial
                const initial = currentBusiness.name.charAt(0).toUpperCase();
                businessAvatar.innerHTML = `<i class="fas fa-store"></i>`;
                // Optionally show initial in a circle
                // businessAvatar.innerHTML = `<span style="font-size: 1.2rem; font-weight: bold;">${initial}</span>`;
                businessAvatar.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
            }
        }
        
    } else {
        activeBusinessName.innerHTML = '<span class="placeholder">No business selected</span>';
        if (activeBusinessType) activeBusinessType.textContent = '-';
        if (activeBusinessRole) activeBusinessRole.textContent = 'None';
        
        // Reset avatar
        if (businessAvatar) {
            businessAvatar.innerHTML = '<i class="fas fa-store"></i>';
            businessAvatar.style.backgroundColor = '';
        }
    }
    
    console.log('✅ Active business display updated with logo for:', currentBusiness?.name);
}

// Integrate with existing business functions
window.addEventListener('businessChanged', function(event) {
    console.log('🎯 Business selector: Business changed event received', event.detail);
    
    // Wait a bit to ensure all data is updated
    setTimeout(() => {
        updateActiveBusinessDisplay();
        updateBusinessesListInSelector();
    }, 100);
});

// Also listen for when businesses are loaded
window.addEventListener('businessesLoaded', function() {
    console.log('📊 Business selector: Businesses loaded event received');
    updateActiveBusinessDisplay();
    updateBusinessesListInSelector();
});

// Override the existing setActiveBusiness to also update the selector
const originalSetActiveBusiness = window.setActiveBusiness;
window.setActiveBusiness = async function(businessId) {
    console.log('🎯 Business selector: Overridden setActiveBusiness called');
    
    await originalSetActiveBusiness(businessId);
    
    // Update the selector UI
    updateActiveBusinessDisplay();
    updateBusinessesListInSelector();
    
    return;
};

// Business Management Page Functions
function initializeBusinessManagementPage() {
    console.log('🏢 Initializing business management page...');
    
    // Load businesses data
    loadBusinessesForManagement();
    
    // Setup search and filter listeners
    setupBusinessSearchAndFilter();
    
    // Update stats
    updateBusinessStats();
    
    console.log('✅ Business management page initialized');
}

async function loadBusinessesForManagement() {
    try {
        console.log('📊 Loading businesses for management page...');
        
        // Get all user businesses
        await loadUserBusinesses();
        
        // Update UI
        updateBusinessesGrid();
        updateBusinessesTable();
        updateBusinessStats();
        
    } catch (error) {
        console.error('❌ Error loading businesses for management:', error);
        showBusinessManagementError();
    }
}

function updateBusinessesGrid() {
    const gridContainer = document.getElementById('businesses-grid-view');
    if (!gridContainer) return;
    
    if (userBusinesses.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>No Businesses Found</h3>
                <p>You don't have access to any businesses yet. Create your first business to get started.</p>
                <button class="btn btn-primary" onclick="showCreateBusinessModal()">
                    <i class="fas fa-plus"></i> Create Your First Business
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    userBusinesses.forEach(business => {
        const isActive = currentBusiness && business.id === currentBusiness.id;
        const isOwner = business.access_type === 'owner';
        const createdAt = new Date(business.created_at).toLocaleDateString();
        const status = business.is_active ? 'active' : 'inactive';
        const role = isOwner ? 'Owner' : (business.staff_role || 'Staff');
        
        html += `
            <div class="business-card ${isActive ? 'active-business' : ''}" 
                 onclick="handleBusinessCardClick('${business.id}')">
                
                <div class="business-card-header">
                    <div style="flex: 1;">
                        <div class="business-type-badge">${business.business_type || 'General'}</div>
                        <h4 class="business-name">${business.name}</h4>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <span class="status-badge status-${status}">
                            <i class="fas fa-circle" style="font-size: 0.6rem;"></i>
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        <span class="role-badge role-${isOwner ? 'owner' : 'staff'}">
                            ${role}
                        </span>
                    </div>
                </div>
                
                <div class="business-details">
                    <div class="business-detail-row">
                        <i class="fas fa-money-bill"></i>
                        <span>Currency: ${business.currency || 'INR'}</span>
                    </div>
                    <div class="business-detail-row">
                        <i class="fas fa-calendar"></i>
                        <span>Created: ${createdAt}</span>
                    </div>
                    ${business.phone ? `
                        <div class="business-detail-row">
                            <i class="fas fa-phone"></i>
                            <span>${business.phone}</span>
                        </div>
                    ` : ''}
                    ${business.email ? `
                        <div class="business-detail-row">
                            <i class="fas fa-envelope"></i>
                            <span>${business.email}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="business-actions">
                    ${!isActive ? `
                        <button class="btn btn-primary btn-sm" 
                                onclick="setActiveBusiness('${business.id}'); event.stopPropagation();">
                            <i class="fas fa-check"></i> Set Active
                        </button>
                    ` : `
                        <button class="btn btn-success btn-sm" disabled>
                            <i class="fas fa-check-circle"></i> Active
                        </button>
                    `}
                    
                    ${isOwner ? `
                        <button class="btn btn-outline btn-sm" 
                                onclick="editBusinessInManagement('${business.id}'); event.stopPropagation();">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" 
                                onclick="viewBusinessDetails('${business.id}'); event.stopPropagation();">
                            <i class="fas fa-eye"></i> View
                        </button>
                    `}
                </div>
            </div>
        `;
    });
    
    gridContainer.innerHTML = html;
}

function updateBusinessesTable() {
    const tableBody = document.getElementById('businesses-table-body');
    if (!tableBody) return;
    
    if (userBusinesses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state" style="padding: 0;">
                        <i class="fas fa-building"></i>
                        <h4>No Businesses Found</h4>
                        <button class="btn btn-primary btn-sm mt-2" onclick="showCreateBusinessModal()">
                            <i class="fas fa-plus"></i> Create Business
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    userBusinesses.forEach(business => {
        const isActive = currentBusiness && business.id === currentBusiness.id;
        const isOwner = business.access_type === 'owner';
        const createdAt = new Date(business.created_at).toLocaleDateString();
        const role = isOwner ? 'Owner' : (business.staff_role || 'Staff');
        
        html += `
            <tr onclick="handleBusinessCardClick('${business.id}')" style="cursor: pointer;">
                <td>
                    <strong>${business.name}</strong>
                    ${isActive ? '<span class="badge badge-success ml-2">Active</span>' : ''}
                </td>
                <td>${business.business_type || 'General'}</td>
                <td>
                    <span class="status-badge status-${business.is_active ? 'active' : 'inactive'}">
                        ${business.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <span class="role-badge role-${isOwner ? 'owner' : 'staff'}">
                        ${role}
                    </span>
                </td>
                <td>${createdAt}</td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 0.25rem;">
                        ${!isActive ? `
                            <button class="btn btn-primary btn-sm" 
                                    onclick="setActiveBusiness('${business.id}'); event.stopPropagation();">
                                <i class="fas fa-check"></i> Switch
                            </button>
                        ` : `
                            <button class="btn btn-success btn-sm" disabled>
                                <i class="fas fa-check-circle"></i> Active
                            </button>
                        `}
                        
                        ${isOwner ? `
                            <button class="btn btn-outline btn-sm" 
                                    onclick="editBusinessInManagement('${business.id}'); event.stopPropagation();">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline btn-sm" 
                                    onclick="viewBusinessDetails('${business.id}'); event.stopPropagation();">
                                <i class="fas fa-eye"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function updateBusinessStats() {
    const totalCount = userBusinesses.length;
    const activeCount = userBusinesses.filter(b => b.is_active).length;
    const inactiveCount = totalCount - activeCount;
    
    // Update count elements
    const totalElement = document.getElementById('total-businesses-count');
    const activeElement = document.getElementById('active-businesses-count');
    const inactiveElement = document.getElementById('businesses-inactive');
    const businessCountElement = document.getElementById('business-count');
    
    if (totalElement) totalElement.textContent = totalCount;
    if (activeElement) activeElement.textContent = activeCount;
    if (inactiveElement) inactiveElement.textContent = inactiveCount;
    if (businessCountElement) {
        businessCountElement.textContent = `${totalCount} business${totalCount !== 1 ? 'es' : ''}`;
    }
    
    // Update active business actions section
    const activeActions = document.getElementById('active-business-actions');
    if (activeActions) {
        if (currentBusiness) {
            activeActions.style.display = 'block';
        } else {
            activeActions.style.display = 'none';
        }
    }
}

function setupBusinessSearchAndFilter() {
    const searchInput = document.getElementById('businesses-search-input');
    const statusFilter = document.getElementById('business-status-filter');
    const typeFilter = document.getElementById('business-type-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterBusinessesList(this.value, statusFilter?.value, typeFilter?.value);
        }, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterBusinessesList(searchInput?.value, this.value, typeFilter?.value);
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            filterBusinessesList(searchInput?.value, statusFilter?.value, this.value);
        });
    }
}

function filterBusinessesList(searchTerm, statusFilter, typeFilter) {
    console.log('🔍 Filtering businesses:', { searchTerm, statusFilter, typeFilter });
    
    const filteredBusinesses = userBusinesses.filter(business => {
        // Search term filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = business.name.toLowerCase().includes(searchLower);
            const typeMatch = (business.business_type || '').toLowerCase().includes(searchLower);
            const emailMatch = (business.email || '').toLowerCase().includes(searchLower);
            
            if (!nameMatch && !typeMatch && !emailMatch) {
                return false;
            }
        }
        
        // Status filter
        if (statusFilter && statusFilter !== '') {
            if (statusFilter === 'active' && !business.is_active) return false;
            if (statusFilter === 'inactive' && business.is_active) return false;
        }
        
        // Type filter
        if (typeFilter && typeFilter !== '') {
            if (business.business_type !== typeFilter) return false;
        }
        
        return true;
    });
    
    // Update UI with filtered results
    updateBusinessesGridWithFiltered(filteredBusinesses);
    updateBusinessesTableWithFiltered(filteredBusinesses);
}

function updateBusinessesGridWithFiltered(filteredBusinesses) {
    const gridContainer = document.getElementById('businesses-grid-view');
    if (!gridContainer) return;
    
    if (filteredBusinesses.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Businesses Found</h3>
                <p>No businesses match your search criteria. Try different filters.</p>
                <button class="btn btn-outline" onclick="clearBusinessFilters()">
                    <i class="fas fa-times"></i> Clear Filters
                </button>
            </div>
        `;
        return;
    }
    
    // Similar to updateBusinessesGrid but with filtered data
    // We'll just update the visibility of existing cards
    const businessCards = gridContainer.querySelectorAll('.business-card');
    
    businessCards.forEach(card => {
        const businessId = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        const isVisible = filteredBusinesses.some(b => b.id === businessId);
        card.style.display = isVisible ? 'block' : 'none';
    });
}

function updateBusinessesTableWithFiltered(filteredBusinesses) {
    const tableBody = document.getElementById('businesses-table-body');
    if (!tableBody) return;
    
    if (filteredBusinesses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state" style="padding: 0;">
                        <i class="fas fa-search"></i>
                        <h4>No Businesses Found</h4>
                        <button class="btn btn-outline btn-sm mt-2" onclick="clearBusinessFilters()">
                            Clear Filters
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Update table with filtered businesses
    // For simplicity, we'll just call updateBusinessesTable with filtered array
    const originalBusinesses = userBusinesses;
    userBusinesses = filteredBusinesses;
    updateBusinessesTable();
    userBusinesses = originalBusinesses; // Restore original
}

function clearBusinessFilters() {
    const searchInput = document.getElementById('businesses-search-input');
    const statusFilter = document.getElementById('business-status-filter');
    const typeFilter = document.getElementById('business-type-filter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    
    // Reset filters
    filterBusinessesList('', '', '');
    
    // Show all businesses
    updateBusinessesGrid();
    updateBusinessesTable();
}

function setBusinessViewMode(mode) {
    const gridView = document.getElementById('businesses-grid-view');
    const listView = document.getElementById('businesses-list-view');
    const gridBtn = document.querySelector('[onclick*="setBusinessViewMode(\'grid\')"]');
    const listBtn = document.querySelector('[onclick*="setBusinessViewMode(\'list\')"]');
    
    if (mode === 'grid') {
        gridView.classList.remove('d-none');
        listView.classList.add('d-none');
        if (gridBtn) gridBtn.classList.add('active');
        if (listBtn) listBtn.classList.remove('active');
    } else if (mode === 'list') {
        gridView.classList.add('d-none');
        listView.classList.remove('d-none');
        if (gridBtn) gridBtn.classList.remove('active');
        if (listBtn) listBtn.classList.add('active');
    }
}

function handleBusinessCardClick(businessId) {
    console.log('👆 Business card clicked:', businessId);
    
    const business = userBusinesses.find(b => b.id === businessId);
    if (!business) return;
    
    // Show business details modal or switch to business
    viewBusinessDetails(businessId);
}

async function editBusinessInManagement(businessId) {
    const business = userBusinesses.find(b => b.id === businessId);
    if (!business) return;
    
    // Show edit modal (you'll need to create this)
    showEditBusinessModal(business);
}

function viewBusinessDetails(businessId) {
    const business = userBusinesses.find(b => b.id === businessId);
    if (!business) return;
    
    // Show business details in a modal or tooltip
    showNotification(
        'Business Details',
        `
        <div style="text-align: left;">
            <p><strong>Name:</strong> ${business.name}</p>
            <p><strong>Type:</strong> ${business.business_type || 'General'}</p>
            <p><strong>Currency:</strong> ${business.currency || 'INR'}</p>
            <p><strong>Role:</strong> ${business.access_type === 'owner' ? 'Owner' : 'Staff'}</p>
            <p><strong>Status:</strong> ${business.is_active ? 'Active' : 'Inactive'}</p>
            <p><strong>Created:</strong> ${new Date(business.created_at).toLocaleDateString()}</p>
            ${business.phone ? `<p><strong>Phone:</strong> ${business.phone}</p>` : ''}
            ${business.email ? `<p><strong>Email:</strong> ${business.email}</p>` : ''}
        </div>
        `,
        'info',
        10000
    );
}

function showBusinessManagementError() {
    const gridContainer = document.getElementById('businesses-grid-view');
    if (gridContainer) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Businesses</h3>
                <p>There was an error loading your businesses. Please try refreshing the page.</p>
                <button class="btn btn-primary" onclick="loadBusinessesForManagement()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }
}

function editCurrentBusiness() {
    if (currentBusiness) {
        editBusinessInManagement(currentBusiness.id);
    }
}

function exportBusinessData() {
    if (!currentBusiness) {
        showNotification('Error', 'No active business selected', 'error');
        return;
    }
    
    // Export current business data
    const exportData = {
        business: currentBusiness,
        exportDate: new Date().toISOString(),
        user: currentUser?.email
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${currentBusiness.name.replace(/\s+/g, '_')}_data_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Success', `Business data exported for ${currentBusiness.name}`, 'success');
}

function manageBusinessStaff() {
    if (!currentBusiness) {
        showNotification('Error', 'No active business selected', 'error');
        return;
    }
    
    // Redirect to staff management page
    showDashboardPage('staff');
}

async function archiveBusiness() {
    if (!currentBusiness) {
        showNotification('Error', 'No active business selected', 'error');
        return;
    }
    
    const confirmation = confirm(`Are you sure you want to archive "${currentBusiness.name}"?\n\nThis will mark the business as inactive. You can restore it later.`);
    
    if (!confirmation) return;
    
    try {
        // Update business as inactive
        const { error } = await supabase
            .from('businesses')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', currentBusiness.id)
            .eq('owner_id', currentUser.id);
        
        if (error) throw error;
        
        // Remove from userBusinesses array
        const businessIndex = userBusinesses.findIndex(b => b.id === currentBusiness.id);
        if (businessIndex > -1) {
            userBusinesses[businessIndex].is_active = false;
        }
        
        // Switch to another active business if available
        const activeBusiness = userBusinesses.find(b => b.is_active);
        if (activeBusiness) {
            await setActiveBusiness(activeBusiness.id);
        } else {
            currentBusiness = null;
            saveUserData('activeBusiness', null);
        }
        
        // Update UI
        updateBusinessesGrid();
        updateBusinessesTable();
        updateBusinessStats();
        
        showNotification('Success', `Business "${currentBusiness?.name || 'Business'}" archived successfully`, 'success');
        
    } catch (error) {
        console.error('❌ Error archiving business:', error);
        showNotification('Error', 'Failed to archive business', 'error');
    }
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions available globally
window.initializeBusinessManagementPage = initializeBusinessManagementPage;
window.setBusinessViewMode = setBusinessViewMode;
window.clearBusinessFilters = clearBusinessFilters;
window.editCurrentBusiness = editCurrentBusiness;
window.exportBusinessData = exportBusinessData;
window.manageBusinessStaff = manageBusinessStaff;
window.archiveBusiness = archiveBusiness;

// Initialize when businesses page is shown
document.addEventListener('DOMContentLoaded', function() {
    // Listen for when businesses page is shown
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.id === 'businesses-page' && !node.classList.contains('d-none')) {
                    initializeBusinessManagementPage();
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});

// Export functions
window.initializeBusinessSelector = initializeBusinessSelector;
window.toggleBusinessDropdown = toggleBusinessDropdown;
window.switchBusinessInSelector = switchBusinessInSelector;
window.updateActiveBusinessDisplay = updateActiveBusinessDisplay;

// Logo Management Functions
async function uploadBusinessLogo(businessId, file) {
    try {
        console.log('📸 Uploading business logo for business:', businessId);
        
        // Validate file
        if (!file.type.match('image.*')) {
            throw new Error('Please select an image file (JPG, PNG, GIF)');
        }
        
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Logo size should be less than 5MB');
        }
        
        // Create unique filename
        const fileName = `logo_${businessId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fullFileName = `${fileName}.${fileExt}`;
        
        // In a real application, you would upload to Supabase Storage or your own server
        // For now, we'll store as base64 in the database
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
            reader.onload = async (event) => {
                try {
                    const base64Data = event.target.result;
                    
                    // Update business with logo data
                    const { data, error } = await supabase
                        .from('businesses')
                        .update({
                            logo_data: base64Data,
                            logo_filename: fullFileName,
                            logo_mime_type: file.type,
                            logo_updated_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', businessId)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    console.log('✅ Logo uploaded successfully');
                    showNotification('Logo uploaded successfully', 'success');
                    
                    // Update current business object
                    if (currentBusiness && currentBusiness.id === businessId) {
                        currentBusiness.logo_data = data.logo_data;
                        currentBusiness.logo_filename = data.logo_filename;
                        currentBusiness.logo_mime_type = data.logo_mime_type;
                    }
                    
                    // Update UI
                    updateBusinessLogoInUI(businessId, base64Data);
                    
                    resolve(data);
                    
                } catch (uploadError) {
                    console.error('❌ Error saving logo to database:', uploadError);
                    reject(uploadError);
                }
            };
            
            reader.onerror = (error) => {
                console.error('❌ Error reading file:', error);
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
        
    } catch (error) {
        console.error('❌ Logo upload error:', error);
        showNotification(error.message || 'Error uploading logo', 'error');
        throw error;
    }
}

async function removeBusinessLogo(businessId) {
    try {
        if (!confirm('Are you sure you want to remove the business logo?')) {
            return;
        }
        
        const { error } = await supabase
            .from('businesses')
            .update({
                logo_data: null,
                logo_filename: null,
                logo_mime_type: null,
                logo_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId);
        
        if (error) throw error;
        
        // Update current business object
        if (currentBusiness && currentBusiness.id === businessId) {
            delete currentBusiness.logo_data;
            delete currentBusiness.logo_filename;
            delete currentBusiness.logo_mime_type;
        }
        
        // Update UI
        removeBusinessLogoFromUI(businessId);
        
        showNotification('Logo removed successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error removing logo:', error);
        showNotification('Error removing logo', 'error');
    }
}

function updateBusinessLogoInUI(businessId, logoData) {
    // Update in business selector
    const businessItem = document.querySelector(`.business-item[data-business-id="${businessId}"]`);
    if (businessItem) {
        const iconElement = businessItem.querySelector('.business-item-icon');
        if (iconElement) {
            iconElement.innerHTML = `<img src="${logoData}" alt="Business Logo" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;">`;
        }
    }
    
    // Update active business display
    if (currentBusiness && currentBusiness.id === businessId) {
        const avatarElement = document.querySelector('.business-avatar');
        if (avatarElement) {
            avatarElement.innerHTML = `<img src="${logoData}" alt="${currentBusiness.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
        }
    }
    
    // Update in businesses list
    const businessCards = document.querySelectorAll(`.business-card[data-business-id="${businessId}"]`);
    businessCards.forEach(card => {
        const logoElement = card.querySelector('.business-logo-preview');
        if (logoElement) {
            logoElement.src = logoData;
            logoElement.style.display = 'block';
        }
    });
}

function removeBusinessLogoFromUI(businessId) {
    // Update in business selector
    const businessItem = document.querySelector(`.business-item[data-business-id="${businessId}"]`);
    if (businessItem) {
        const iconElement = businessItem.querySelector('.business-item-icon');
        if (iconElement) {
            iconElement.innerHTML = '<i class="fas fa-store"></i>';
        }
    }
    
    // Update active business display
    if (currentBusiness && currentBusiness.id === businessId) {
        const avatarElement = document.querySelector('.business-avatar');
        if (avatarElement) {
            avatarElement.innerHTML = '<i class="fas fa-store"></i>';
        }
    }
    
    // Update in businesses list
    const businessCards = document.querySelectorAll(`.business-card[data-business-id="${businessId}"]`);
    businessCards.forEach(card => {
        const logoElement = card.querySelector('.business-logo-preview');
        if (logoElement) {
            logoElement.style.display = 'none';
        }
    });
}

// Update the business selector to show logos
function enhanceBusinessSelectorWithLogos() {
    // Update the business list rendering to include logos
    const originalUpdateBusinessesListInSelector = window.updateBusinessesListInSelector;
    
    window.updateBusinessesListInSelector = function() {
        const businessesList = document.getElementById('businesses-list');
        if (!businessesList) return;
        
        // Clear current content
        businessesList.innerHTML = '';
        
        // Show loading state initially
        if (!userBusinesses) {
            businessesList.innerHTML = `
                <div class="business-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading businesses...</span>
                </div>
            `;
            return;
        }
        
        if (userBusinesses.length === 0) {
            businessesList.innerHTML = `
                <div class="no-businesses-message">
                    <div style="text-align: center; padding: 2rem; color: #6c757d;">
                        <i class="fas fa-store" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>No businesses found</p>
                        <button class="btn btn-primary btn-sm mt-2" onclick="showCreateBusinessModal(); closeBusinessDropdown();">
                            <i class="fas fa-plus"></i> Create Business
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Add business items with logos
        userBusinesses.forEach(business => {
            const isActive = currentBusiness && business.id === currentBusiness.id;
            const businessItem = document.createElement('div');
            businessItem.className = `business-item ${isActive ? 'active' : ''}`;
            businessItem.dataset.businessId = business.id;
            
            const accessType = business.access_type === 'owner' ? 'Owner' : 'Staff';
            const role = business.staff_role || accessType;
            
            // Check if logo exists
            const hasLogo = business.logo_data && business.logo_data.startsWith('data:image');
            const logoElement = hasLogo 
                ? `<img src="${business.logo_data}" alt="${business.name}" class="business-logo">`
                : `<i class="fas fa-store"></i>`;
            
            businessItem.innerHTML = `
                <div class="business-item-icon">
                    ${logoElement}
                </div>
                <div class="business-item-info">
                    <div class="business-item-name">${business.name}</div>
                    <div class="business-item-meta">
                        <span class="business-item-type">${business.business_type || 'General'}</span>
                        <span class="business-item-role">${role}</span>
                    </div>
                </div>
                ${!isActive ? `
                    
                ` : `
                    <div class="business-item-actions">
                        <span class="current-business-badge">
                            <i class="fas fa-check-circle"></i>
                        </span>
                    </div>
                `}
            `;
            
            // Add click event to the entire item (except the switch button)
            businessItem.addEventListener('click', function(e) {
                if (!e.target.closest('.btn-switch-business')) {
                    switchBusinessInSelector(business.id);
                }
            });
            
            businessesList.appendChild(businessItem);
        });
        
        console.log('✅ Business selector list updated with logos:', userBusinesses.length, 'businesses');
    };
}

// Update create business function to include logo
async function createNewBusinessWithLogo(businessData, logoFile = null) {
    try {
        console.log('🏢 Creating new business with logo...');
        
        const business = await createNewBusiness(businessData);
        
        // Upload logo if provided
        if (logoFile) {
            await uploadBusinessLogo(business.id, logoFile);
        }
        
        return business;
        
    } catch (error) {
        console.error('❌ Error creating business with logo:', error);
        throw error;
    }
}

// Make functions globally available
window.uploadBusinessLogo = uploadBusinessLogo;
window.removeBusinessLogo = removeBusinessLogo;
window.enhanceBusinessSelectorWithLogos = enhanceBusinessSelectorWithLogos;
window.createNewBusinessWithLogo = createNewBusinessWithLogo;

// Add CSS for business logos
const businessLogoCSS = `
    .business-logo {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
        background: white;
        border: 1px solid #e0e0e0;
    }
    
    .business-logo-preview {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        object-fit: cover;
        border: 2px solid #e0e0e0;
        background: white;
    }
    
    .logo-upload-area {
        border: 2px dashed #ddd;
        border-radius: 10px;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #f8f9fa;
        margin-bottom: 1rem;
    }
    
    .logo-upload-area:hover {
        border-color: #007bff;
        background: #f0f8ff;
    }
    
    .logo-upload-area.active {
        border-color: #28a745;
        background: #f0fff4;
    }
    
    .logo-preview-container {
        position: relative;
        display: inline-block;
        margin-bottom: 1rem;
    }
    
    .logo-preview-actions {
        position: absolute;
        top: -8px;
        right: -8px;
        display: flex;
        gap: 4px;
    }
    
    .logo-preview-actions button {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
    }
    
    .logo-upload-hint {
        font-size: 0.875rem;
        color: #6c757d;
        margin-top: 0.5rem;
    }
`;

// Add the CSS to the document
const styleSheet = document.createElement("style");
styleSheet.textContent = businessLogoCSS;
document.head.appendChild(styleSheet);

// Initialize enhanced business selector
document.addEventListener('DOMContentLoaded', function() {
    enhanceBusinessSelectorWithLogos();
});

// Add to business.js
function previewNewBusinessLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file (JPG, PNG, GIF)', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Logo size should be less than 5MB', 'error');
        return;
    }
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('new-business-logo-preview');
        const uploadArea = document.getElementById('new-business-logo-area');
        
        if (preview) {
            preview.src = e.target.result;
            preview.classList.remove('d-none');
            preview.style.display = 'block';
        }
        
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="logo-preview-container">
                    <img id="new-business-logo-preview" src="${e.target.result}" alt="Logo Preview" class="business-logo-preview">
                    <div class="logo-preview-actions">
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('new-business-logo-upload').click()" title="Change Logo">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeNewBusinessLogoPreview()" title="Remove Logo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

function removeNewBusinessLogoPreview() {
    const uploadArea = document.getElementById('new-business-logo-area');
    const fileInput = document.getElementById('new-business-logo-upload');
    
    if (uploadArea) {
        uploadArea.innerHTML = `
            <div class="text-center">
                <i class="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-0">Click to upload logo</p>
                <p class="text-muted small">JPG, PNG, GIF up to 5MB</p>
                <img id="new-business-logo-preview" src="" alt="Logo Preview" class="business-logo-preview d-none">
            </div>
        `;
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
}

// Update handleCreateBusiness to handle logo upload
async function handleCreateBusinessWithLogo(e) {
    e.preventDefault();
    console.log('🏢 Handling business creation with logo...');
    isCreatingBusiness = true;
    
    const submitButton = document.querySelector('#create-business-form button[type="submit"]');
    const originalText = submitButton.innerHTML;
    let logoFile = null;
    
    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitButton.disabled = true;
        
        const businessName = document.getElementById('new-business-name');
        const businessType = document.getElementById('new-business-type');
        const businessCurrency = document.getElementById('new-business-currency');
        
        if (!businessName || !businessType || !businessCurrency) {
            throw new Error('Required form fields are missing');
        }
        
        // Get logo file if uploaded
        const logoInput = document.getElementById('new-business-logo-upload');
        if (logoInput && logoInput.files && logoInput.files[0]) {
            logoFile = logoInput.files[0];
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
        
        console.log('📝 Creating business with logo:', formData);
        
        // Use the new function that handles logo
        const newBusiness = await createNewBusinessWithLogo(formData, logoFile);
        
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

// Replace the form submit handler
document.addEventListener('DOMContentLoaded', function() {
    const createBusinessForm = document.getElementById('create-business-form');
    if (createBusinessForm) {
        createBusinessForm.addEventListener('submit', handleCreateBusinessWithLogo);
    }
});