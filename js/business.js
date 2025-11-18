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

function clearAllBusinessData(businessId) {
    if (!businessId || !currentUser) return;
    
    const keysToClear = [
        'inventory', 'products', 'sales', 'customers', 'suppliers',
        'financial_summary', 'inventory_summary', 'analytics',
        'recent_activity', 'low_stock_alerts', 'staff_members'
    ];
    
    keysToClear.forEach(key => {
        const businessKey = `${currentUser.id}_${businessId}_${key}`;
        localStorage.removeItem(businessKey);
    });
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
    if (currentUser) {
        const keys = ['activeBusiness', 'userBusinesses'];
        keys.forEach(key => clearUserData(key));
    }
    localStorage.removeItem('currentUserId');
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

        // 🔥 CRITICAL FIX: Get staff businesses by BOTH user_id AND email
        let staffBusinesses = [];
        
        // Try by user_id first (for staff who have completed profile)
        const { data: staffRolesByUserId, error: staffErrorByUserId } = await supabase
            .from('staff_roles')
            .select(`
                id, business_id, role, staff_name, email, is_active,
                businesses!inner(*)
            `)
            .eq('owner_id', currentUser.id)
            .eq('is_active', true)
            .eq('businesses.is_active', true);

        console.log('📋 Staff roles found by user_id:', staffRolesByUserId);

        // Try by email as fallback (for staff who haven't completed profile)
        const { data: staffRolesByEmail, error: staffErrorByEmail } = await supabase
            .from('staff_roles')
            .select(`
                id, business_id, role, staff_name, email, is_active,
                businesses!inner(*)
            `)
            .eq('email', currentUser.email)
            .eq('is_active', true)
            .eq('businesses.is_active', true);

        console.log('📋 Staff roles found by email:', staffRolesByEmail);

        // Combine both results
        const allStaffRoles = [
            ...(staffRolesByUserId || []),
            ...(staffRolesByEmail || [])
        ];

        // Remove duplicates by business_id
        const uniqueStaffRoles = allStaffRoles.filter((role, index, self) => 
            index === self.findIndex(r => r.business_id === role.business_id)
        );

        if (uniqueStaffRoles.length > 0) {
            staffBusinesses = uniqueStaffRoles.map(role => ({
                ...role.businesses,
                access_type: 'staff',
                staff_role: role.role,
                staff_name: role.staff_name,
                staff_email: role.email,
                staff_role_id: role.id
            }));
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
            // Avoid duplicates
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

        // 🔥 CRITICAL: Set active business if none is set
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
        console.log('🎯 Setting active business with isolation:', businessId);
        const business = userBusinesses.find(b => b.id === businessId);
        if (!business) {
            throw new Error('Business not found in user businesses');
        }
        
        // Clear current business cache if switching
        if (currentBusiness && currentBusiness.id !== businessId) {
            console.log('🔄 Clearing cache for previous business:', currentBusiness.name);
            clearAllBusinessData(currentBusiness.id);
        }
        
        currentBusiness = business;
        
        // Save to user-specific storage
        saveUserData('activeBusiness', currentBusiness);
        
        console.log('✅ Active business set:', currentBusiness.name, 'Access type:', currentBusiness.access_type);
        
        // Clear all business-specific caches
        clearBusinessData('financial_summary');
        clearBusinessData('inventory');
        clearBusinessData('customers');
        clearBusinessData('analytics');
        clearBusinessData('staff_members');
        
        // Update UI immediately
        updateCurrentBusinessUI();
        updateBusinessesUI();
        updateNavbarBusinessSelector();
        
        // 🔥 CRITICAL: Force reload user role for the new business
        if (window.loadCurrentUserRole) {
            console.log('🔄 Reloading user role for new business...');
            await loadCurrentUserRole();
        }
        
        // 🔥 CRITICAL: Ensure role is properly set
        if (window.ensureUserRole) {
            ensureUserRole();
        }
        
        // 🔥 CRITICAL: Apply permissions for the new business
        if (window.applyRoleBasedAccess) {
            console.log('🔄 Applying role-based access...');
            applyRoleBasedAccess();
        }
        
        // Load fresh data for the new business
        await loadBusinessIntelligence();
        
        // Update realtime subscriptions
        setupRealtimeSubscriptions();
        
        // Reload current page with new business data
        const currentPage = localStorage.getItem(STATE_KEYS.ACTIVE_DASHBOARD_PAGE) || 'overview';
        await reloadCurrentPage(currentPage);
        
        showNotification('Business Switched', `Now viewing ${currentBusiness.name}`, 'success');
        
    } catch (error) {
        console.error('❌ Error setting active business:', error);
        showNotification('Error', 'Failed to switch business', 'error');
    }
}

// 🔥 NEW FUNCTION: Reload current page with fresh data
async function reloadCurrentPage(page) {
    console.log('🔄 Reloading page:', page);
    
    switch (page) {
        case 'overview':
            await initializeOverviewPage();
            break;
        case 'sales':
            if (window.initializeSalesPage) {
                await initializeSalesPage();
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
        // Add other pages as needed
        default:
            // For any page, reload the basic business intelligence
            await loadBusinessIntelligence();
    }
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
        
        // Create owner role
        const { data: staffRole, error: roleError } = await supabase
            .from('staff_roles')
            .insert([{
                business_id: business.id,
                user_id: currentUser.id,
                role: 'owner',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (roleError) {
            console.error('❌ Staff role creation error:', roleError);
        } else {
            console.log('✅ Owner role created:', staffRole);
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
        
        // Add to user businesses and set as active
        userBusinesses.unshift(newBusiness);
        
        // Clear cache and reload to ensure fresh data
        clearUserData('userBusinesses');
        
        await setActiveBusiness(newBusiness.id);
        
        hideCreateBusinessModal();
        showNotification('Success', `Business "${newBusiness.name}" created!`, 'success');
        
        // Force refresh all UI components
        updateBusinessesUI();
        updateNavbarBusinessSelector();
        
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
    
    // Test database queries
    if (currentUser) {
        console.log('🔍 Testing staff role queries...');
        
        // Test query by user_id
        supabase
            .from('staff_roles')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .then(({ data, error }) => {
                console.log('📋 Staff roles by user_id:', data, error);
            });
            
        // Test query by email
        supabase
            .from('staff_roles')
            .select('*')
            .eq('email', currentUser.email)
            .eq('is_active', true)
            .then(({ data, error }) => {
                console.log('📋 Staff roles by email:', data, error);
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