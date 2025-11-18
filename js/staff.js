// Simplified Staff Management with Direct Email Addition
console.log('🔧 Loading simplified staff management functions...');

// Debug function to check current state
function debugStaffState() {
    console.log('🔍 Debugging staff state:');
    console.log('👤 currentUser:', currentUser);
    console.log('🎯 currentUser.role:', currentUser?.role);
    console.log('🏢 currentBusiness:', currentBusiness);
    console.log('🔐 Business owner check:', currentBusiness?.owner_id === currentUser?.id);
    console.log('📋 ROLE_PERMISSIONS:', ROLE_PERMISSIONS);
    
    // Test permissions
    if (currentUser?.role) {
        console.log('🔐 Staff create permission:', hasPermission('staff', 'create'));
    }
}

// Make it globally available
window.debugStaffState = debugStaffState;

async function initializeStaffPage() {
    console.log('👥 Initializing staff page for business:', currentBusiness?.name);
    await initializeStaffManagement();
    updateDashboardMetrics();
}

// Staff management functions
async function initializeStaffManagement() {
    try {
        console.log('👥 Initializing staff management for business:', currentBusiness?.name);
        
        if (!currentBusiness) {
            console.warn('⚠️ No current business selected for staff management');
            return;
        }
        
        await loadCurrentUserRole();
        applyRoleBasedAccess();
        await loadStaffMembers();
        setupStaffEventListeners();
        console.log('✅ Staff management initialized');
    } catch (error) {
        console.error('❌ Staff management initialization failed:', error);
    }
}

// Comprehensive Role Permissions Configuration
const ROLE_PERMISSIONS = {
    owner: {
        name: 'Business Owner',
        description: 'Full access to all features and settings',
        permissions: {
            // Staff Management
            staff: ['create', 'view', 'edit', 'delete', 'manage_roles'],
            // Business Management
            business: ['create', 'view', 'edit', 'delete', 'settings'],
            // Inventory Management
            products: ['create', 'view', 'edit', 'delete', 'import', 'export', 'categories'],
            inventory: ['view', 'adjust', 'transfer', 'count'],
            suppliers: ['create', 'view', 'edit', 'delete'],
            categories: ['create', 'view', 'edit', 'delete'],
            // Sales & Billing
            sales: ['create', 'view', 'edit', 'delete', 'refund', 'invoices'],
            customers: ['create', 'view', 'edit', 'delete'],
            invoices: ['create', 'view', 'edit', 'delete', 'send'],
            quotes: ['create', 'view', 'edit', 'delete'],
            // Purchases
            purchases: ['create', 'view', 'edit', 'delete', 'orders'],
            vendors: ['create', 'view', 'edit', 'delete'],
            // Expenses
            expenses: ['create', 'view', 'edit', 'delete', 'categories'],
            expense_categories: ['create', 'view', 'edit', 'delete'],
            // Financial
            payments: ['create', 'view', 'edit', 'delete', 'reconcile'],
            taxes: ['create', 'view', 'edit', 'delete'],
            // Reports & Analytics
            reports: ['sales', 'inventory', 'financial', 'customer', 'tax'],
            analytics: ['view', 'export'],
            // System
            settings: ['general', 'appearance', 'notifications', 'backup']
        }
    },
    admin: {
        name: 'Administrator',
        description: 'Full operational access except business ownership',
        permissions: {
            // Staff Management
            staff: ['create', 'view', 'edit', 'delete'],
            // Business Management
            business: ['view', 'edit', 'settings'],
            // Inventory Management
            products: ['create', 'view', 'edit', 'delete', 'import', 'export', 'categories'],
            inventory: ['view', 'adjust', 'transfer', 'count'],
            suppliers: ['create', 'view', 'edit', 'delete'],
            categories: ['create', 'view', 'edit', 'delete'],
            // Sales & Billing
            sales: ['create', 'view', 'edit', 'delete', 'refund', 'invoices'],
            customers: ['create', 'view', 'edit', 'delete'],
            invoices: ['create', 'view', 'edit', 'delete', 'send'],
            quotes: ['create', 'view', 'edit', 'delete'],
            // Purchases
            purchases: ['create', 'view', 'edit', 'delete', 'orders'],
            vendors: ['create', 'view', 'edit', 'delete'],
            // Expenses
            expenses: ['create', 'view', 'edit', 'delete', 'categories'],
            expense_categories: ['create', 'view', 'edit', 'delete'],
            // Financial
            payments: ['create', 'view', 'edit', 'delete', 'reconcile'],
            taxes: ['create', 'view', 'edit', 'delete'],
            // Reports & Analytics
            reports: ['sales', 'inventory', 'financial', 'customer', 'tax'],
            analytics: ['view', 'export'],
            // System
            settings: ['general', 'appearance', 'notifications']
        }
    },
    manager: {
        name: 'Manager',
        description: 'Department management with limited administrative access',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['create', 'view', 'edit', 'categories'],
            inventory: ['view', 'adjust', 'count'],
            suppliers: ['create', 'view', 'edit'],
            categories: ['view', 'edit'],
            // Sales & Billing
            sales: ['create', 'view', 'edit', 'refund', 'invoices'],
            customers: ['create', 'view', 'edit'],
            invoices: ['create', 'view', 'edit', 'send'],
            quotes: ['create', 'view', 'edit'],
            // Purchases
            purchases: ['create', 'view', 'edit', 'orders'],
            vendors: ['create', 'view', 'edit'],
            // Expenses
            expenses: ['create', 'view', 'edit', 'categories'],
            expense_categories: ['view', 'edit'],
            // Financial
            payments: ['create', 'view', 'edit'],
            taxes: ['view'],
            // Reports & Analytics
            reports: ['sales', 'inventory', 'customer'],
            analytics: ['view'],
            // System
            settings: ['view']
        }
    },
    salesman: {
    name: 'Sales Manager',
    description: 'Focus on sales, customers, and revenue generation',
    permissions: {
        // Staff Management
        staff: ['view'],
        // Business Management
        business: ['view'],
        // Inventory Management
        products: ['view'],
        inventory: ['view'],
        suppliers: ['view'],
        categories: ['view'],
        // Sales & Billing
        sales: ['create', 'view', 'edit', 'refund', 'invoices'],
        customers: ['create', 'view', 'edit', 'delete'],
        invoices: ['create', 'view', 'edit', 'send'],
        quotes: ['create', 'view', 'edit', 'delete'],
        // Purchases - 🔥 SALES MANAGER SHOULD NOT HAVE THESE
        purchases: [], // No access to purchases
        vendors: [],   // No access to vendors
        // Expenses - 🔥 SALES MANAGER SHOULD NOT HAVE THESE
        expenses: [],  // No access to expenses
        expense_categories: [], // No access to expense categories
        // Financial
        payments: ['create', 'view', 'edit'],
        taxes: ['view'],
        // Reports & Analytics
        reports: ['sales', 'customer'],
        analytics: ['view'],
        // System
        settings: ['view']
    }
},
    inventory_manager: {
        name: 'Inventory Manager',
        description: 'Focus on stock management, suppliers, and product catalog',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['create', 'view', 'edit', 'delete', 'categories'],
            inventory: ['view', 'adjust', 'transfer', 'count'],
            suppliers: ['create', 'view', 'edit', 'delete'],
            categories: ['create', 'view', 'edit', 'delete'],
            // Sales & Billing
            sales: ['view'],
            customers: ['view'],
            invoices: ['view'],
            quotes: ['view'],
            // Purchases
            purchases: ['create', 'view', 'edit', 'orders'],
            vendors: ['create', 'view', 'edit'],
            // Expenses
            expenses: ['view'],
            expense_categories: ['view'],
            // Financial
            payments: ['view'],
            taxes: ['view'],
            // Reports & Analytics
            reports: ['inventory'],
            analytics: ['view'],
            // System
            settings: ['view']
        }
    },
    accountant: {
        name: 'Accountant',
        description: 'Financial management, expenses, and reporting',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['view'],
            inventory: ['view'],
            suppliers: ['view'],
            categories: ['view'],
            // Sales & Billing
            sales: ['view'],
            customers: ['view'],
            invoices: ['view'],
            quotes: ['view'],
            // Purchases
            purchases: ['view'],
            vendors: ['view'],
            // Expenses
            expenses: ['create', 'view', 'edit', 'delete', 'categories'],
            expense_categories: ['create', 'view', 'edit', 'delete'],
            // Financial
            payments: ['create', 'view', 'edit', 'delete', 'reconcile'],
            taxes: ['create', 'view', 'edit', 'delete'],
            // Reports & Analytics
            reports: ['financial', 'tax', 'sales'],
            analytics: ['view', 'export'],
            // System
            settings: ['view']
        }
    },
    staff: {
        name: 'Staff',
        description: 'Day-to-day operational tasks',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['view', 'edit'],
            inventory: ['view'],
            suppliers: ['view'],
            categories: ['view'],
            // Sales & Billing
            sales: ['create', 'view'],
            customers: ['view', 'edit'],
            invoices: ['view'],
            quotes: ['view'],
            // Purchases
            purchases: ['view'],
            vendors: ['view'],
            // Expenses
            expenses: ['view'],
            expense_categories: ['view'],
            // Financial
            payments: ['view'],
            taxes: ['view'],
            // Reports & Analytics
            reports: ['sales'],
            analytics: ['view'],
            // System
            settings: ['view']
        }
    },
    cashier: {
        name: 'Cashier',
        description: 'Point of sale and basic sales operations',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['view'],
            inventory: ['view'],
            suppliers: ['view'],
            categories: ['view'],
            // Sales & Billing
            sales: ['create', 'view'],
            customers: ['view'],
            invoices: ['view'],
            quotes: ['view'],
            // Purchases
            purchases: ['view'],
            vendors: ['view'],
            // Expenses
            expenses: ['view'],
            expense_categories: ['view'],
            // Financial
            payments: ['create', 'view'],
            taxes: ['view'],
            // Reports & Analytics
            reports: ['sales'],
            analytics: ['view'],
            // System
            settings: ['view']
        }
    },
    viewer: {
        name: 'Viewer',
        description: 'Read-only access for auditing and reporting',
        permissions: {
            // Staff Management
            staff: ['view'],
            // Business Management
            business: ['view'],
            // Inventory Management
            products: ['view'],
            inventory: ['view'],
            suppliers: ['view'],
            categories: ['view'],
            // Sales & Billing
            sales: ['view'],
            customers: ['view'],
            invoices: ['view'],
            quotes: ['view'],
            // Purchases
            purchases: ['view'],
            vendors: ['view'],
            // Expenses
            expenses: ['view'],
            expense_categories: ['view'],
            // Financial
            payments: ['view'],
            taxes: ['view'],
            // Reports & Analytics
            reports: ['sales', 'inventory', 'financial'],
            analytics: ['view'],
            // System
            settings: ['view']
        }
    }
};

// Display role permissions reference
function displayRolePermissions() {
    const container = document.getElementById('role-permissions-grid');
    if (!container) return;

    const roleEntries = Object.entries(ROLE_PERMISSIONS);
    
    container.innerHTML = roleEntries.map(([roleKey, roleInfo]) => {
        const permissionsByCategory = groupPermissionsByCategory(roleInfo.permissions);
        
        return `
            <div class="role-card ${roleKey}">
                <div class="role-header">
                    <div class="role-title">
                        <div class="role-name">${roleInfo.name}</div>
                        <p class="role-description">${roleInfo.description}</p>
                    </div>
                    <span class="role-badge-small badge-${getRoleBadgeColor(roleKey)}">${roleKey}</span>
                </div>
                <div class="permission-categories">
                    ${Object.entries(permissionsByCategory).map(([category, permissions]) => `
                        <div class="permission-category">
                            <div class="category-icon">
                                <i class="fas ${getCategoryIcon(category)}"></i>
                            </div>
                            <div class="category-info">
                                <div class="category-name">${formatCategoryName(category)}</div>
                                <div class="category-permissions">
                                    ${permissions.slice(0, 4).map(permission => `
                                        <span class="permission-tag">${formatPermissionName(permission)}</span>
                                    `).join('')}
                                    ${permissions.length > 4 ? `<span class="permission-tag">+${permissions.length - 4} more</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Group permissions by category
function groupPermissionsByCategory(permissions) {
    const categories = {};
    
    Object.entries(permissions).forEach(([resource, actions]) => {
        const category = getPermissionCategory(resource);
        if (!categories[category]) {
            categories[category] = [];
        }
        actions.forEach(action => {
            categories[category].push(`${resource}.${action}`);
        });
    });
    
    return categories;
}

// Get category for permission resource
function getPermissionCategory(resource) {
    const categoryMap = {
        // Staff & Business
        staff: 'administration',
        business: 'administration',
        // Inventory
        products: 'inventory',
        inventory: 'inventory',
        suppliers: 'inventory',
        categories: 'inventory',
        // Sales & Billing
        sales: 'sales',
        customers: 'sales',
        invoices: 'sales',
        quotes: 'sales',
        // Purchases
        purchases: 'purchases',
        vendors: 'purchases',
        // Expenses & Financial
        expenses: 'financial',
        expense_categories: 'financial',
        payments: 'financial',
        taxes: 'financial',
        // Reports & Analytics
        reports: 'analytics',
        analytics: 'analytics',
        // System
        settings: 'system'
    };
    
    return categoryMap[resource] || 'other';
}

// Get icon for category
function getCategoryIcon(category) {
    const iconMap = {
        administration: 'fa-users-cog',
        inventory: 'fa-boxes',
        sales: 'fa-shopping-cart',
        purchases: 'fa-truck',
        financial: 'fa-money-bill-wave',
        analytics: 'fa-chart-bar',
        system: 'fa-cog',
        other: 'fa-circle'
    };
    
    return iconMap[category] || 'fa-circle';
}

// Format category name
function formatCategoryName(category) {
    return category.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Format permission name
function formatPermissionName(permission) {
    const [resource, action] = permission.split('.');
    const actionMap = {
        create: 'Add',
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        manage_roles: 'Roles',
        settings: 'Settings',
        import: 'Import',
        export: 'Export',
        categories: 'Categories',
        refund: 'Refund',
        invoices: 'Invoices',
        send: 'Send',
        orders: 'Orders',
        adjust: 'Adjust',
        transfer: 'Transfer',
        count: 'Count',
        reconcile: 'Reconcile'
    };
    
    return actionMap[action] || action;
}

// Apply role-based access control
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

function applyContentRestrictions() {
    // Hide entire sections based on permissions
    if (!hasPermission('reports', 'view')) {
        const reportsSection = document.getElementById('reports-section');
        if (reportsSection) {
            reportsSection.style.display = 'none';
            console.log('🚫 Reports section hidden');
        }
    }
    
    if (!hasPermission('analytics', 'view')) {
        const analyticsSection = document.getElementById('analytics-section');
        if (analyticsSection) {
            analyticsSection.style.display = 'none';
            console.log('🚫 Analytics section hidden');
        }
    }
}

function applyNavigationRestrictions() {
    const menuItems = document.querySelectorAll('.sidebar-menu a[data-page]');
    let visibleCount = 0;
    
    menuItems.forEach(menuItem => {
        const page = menuItem.getAttribute('data-page');
        
        if (!canAccessPage(page)) {
            menuItem.style.display = 'none';
            console.log(`🚫 Hiding navigation: ${page}`);
        } else {
            menuItem.style.display = 'flex';
            visibleCount++;
            console.log(`✅ Showing navigation: ${page}`);
        }
    });
    
    console.log(`📊 Navigation: ${visibleCount} items visible`);
}

function applyActionButtonRestrictions() {
    // Add staff button
    const addStaffButton = document.getElementById('add-staff-btn');
    if (addStaffButton) {
        if (currentBusiness?.owner_id === currentUser?.id || hasPermission('staff', 'create')) {
            addStaffButton.style.display = 'flex';
            console.log('✅ Add staff button shown');
        } else {
            addStaffButton.style.display = 'none';
            console.log('🚫 Add staff button hidden');
        }
    }
    
    // Add product button
    const addProductButton = document.getElementById('add-product-btn');
    if (addProductButton) {
        if (hasPermission('products', 'create')) {
            addProductButton.style.display = 'block';
            console.log('✅ Add product button shown');
        } else {
            addProductButton.style.display = 'none';
            console.log('🚫 Add product button hidden');
        }
    }
    
    // Add sale button
    const addSaleButton = document.getElementById('add-sale-btn');
    if (addSaleButton) {
        if (hasPermission('sales', 'create')) {
            addSaleButton.style.display = 'block';
            console.log('✅ Add sale button shown');
        } else {
            addSaleButton.style.display = 'none';
            console.log('🚫 Add sale button hidden');
        }
    }
}

async function loadCurrentUserRole() {
    try {
        console.log('👤 Loading current user role...');
        
        if (!currentUser) {
            console.warn('⚠️ No current user found');
            currentUser.role = 'viewer';
            return 'viewer';
        }

        if (!currentBusiness) {
            console.warn('⚠️ No current business selected');
            currentUser.role = 'viewer';
            return 'viewer';
        }

        console.log('🔍 Checking role for:', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            businessId: currentBusiness.id,
            businessName: currentBusiness.name
        });

        // Check if user is the business owner first
        if (currentBusiness.owner_id === currentUser.id) {
            currentUser.role = 'owner';
            console.log('✅ User is business owner');
            return 'owner';
        }

        // 🔥 FIX: Check staff_roles by email (since staff might not have user_id linked yet)
        const { data: staffRole, error } = await supabase
            .from('staff_roles')
            .select('role, staff_name, business_id, id')
            .eq('business_id', currentBusiness.id)
            .eq('email', currentUser.email)  // Check by email instead of user_id
            .eq('is_active', true)
            .single();

        console.log('🔍 Staff role query result:', { staffRole, error });

        if (error) {
            if (error.code === 'PGRST116') {
                console.warn('⚠️ No staff role found for user email in this business');
                currentUser.role = 'viewer';
                return 'viewer';
            }
            console.error('❌ Error loading user role:', error);
            currentUser.role = 'viewer';
            return 'viewer';
        }

        if (!staffRole) {
            console.warn('⚠️ No staff role data returned');
            currentUser.role = 'viewer';
            return 'viewer';
        }

        currentUser.role = staffRole.role;
        console.log('✅ Current user role loaded:', currentUser.role);
        return staffRole.role;

    } catch (error) {
        console.error('❌ Error loading current user role:', error);
        currentUser.role = 'viewer';
        return 'viewer';
    }
}

// Staff session management
function initializeStaffSession() {
    try {
        console.log('🔐 Initializing staff session...');
        
        if (!currentUser || !currentBusiness) return;
        
        // Check if user is staff in current business
        const staffSession = {
            user_id: currentUser.id,
            email: currentUser.email,
            business_id: currentBusiness.id,
            business_name: currentBusiness.name,
            role: currentUser.role,
            is_staff: currentUser.role !== 'owner' && currentUser.role !== 'viewer',
            permissions: ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.viewer
        };
        
        localStorage.setItem('staffSession', JSON.stringify(staffSession));
        console.log('✅ Staff session initialized:', staffSession);
        
    } catch (error) {
        console.error('❌ Error initializing staff session:', error);
    }
}

// Load staff session on page load
function loadStaffSession() {
    try {
        const staffSession = JSON.parse(localStorage.getItem('staffSession') || '{}');
        if (staffSession.business_id === currentBusiness?.id) {
            console.log('🔍 Loaded staff session:', staffSession);
            return staffSession;
        }
        return null;
    } catch (error) {
        console.error('❌ Error loading staff session:', error);
        return null;
    }
}

// Clean add staff member function
async function addStaffMember(staffData) {
    try {
        console.log('👤 Adding staff member:', staffData);
        
        if (!currentBusiness) {
            throw new Error('No business selected');
        }

        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Validate required fields
        if (!staffData.name?.trim()) {
            throw new Error('Please enter staff member name');
        }

        if (!isValidEmail(staffData.email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!staffData.role) {
            throw new Error('Please select a role');
        }

        console.log('🏢 Business context:', {
            business_id: currentBusiness.id,
            business_name: currentBusiness.name,
            owner_id: currentUser.id,
            owner_email: currentUser.email
        });

        // Check if staff already exists in this business by email
        const { data: existingStaff, error: checkError } = await supabase
            .from('staff_roles')
            .select('id, email, staff_name, is_active')
            .eq('business_id', currentBusiness.id)
            .eq('email', staffData.email)
            .single();

        // If staff exists and is active, throw error
        if (existingStaff && existingStaff.is_active) {
            throw new Error(`Staff member with email ${staffData.email} already exists in your business`);
        }

        // If staff exists but is inactive, reactivate them
        if (existingStaff && !existingStaff.is_active) {
            console.log('🔄 Reactivating inactive staff member:', existingStaff);
            
            const { data: updatedStaff, error: updateError } = await supabase
                .from('staff_roles')
                .update({
                    role: staffData.role,
                    staff_name: staffData.name,
                    owner_id: currentUser.id, // Update owner_id to current user
                    is_active: true,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingStaff.id)
                .select()
                .single();

            if (updateError) throw updateError;
            
            console.log('✅ Staff member reactivated:', updatedStaff);
            showNotification('Success', `${staffData.name} has been reactivated as ${staffData.role}`, 'success');
            return updatedStaff;
        }

        // If error is not "no rows" error, log it but continue
        if (checkError && checkError.code !== 'PGRST116') {
            console.warn('⚠️ Check existing staff warning:', checkError);
        }

        // Create new staff record with proper business_id and owner_id
        const staffRecord = {
            email: staffData.email,
            role: staffData.role,
            business_id: currentBusiness.id, // The business where staff is added
            owner_id: currentUser.id,        // The user who created/invited the staff
            staff_name: staffData.name,
            is_active: true,
            status: 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Creating staff record with:', {
            business_id: staffRecord.business_id,
            owner_id: staffRecord.owner_id,
            email: staffRecord.email,
            role: staffRecord.role
        });

        const { data: staffRole, error } = await supabase
            .from('staff_roles')
            .insert([staffRecord])
            .select()
            .single();

        if (error) {
            console.error('❌ Database error:', error);
            
            // Handle specific constraint violations
            if (error.code === '23505') {
                if (error.message.includes('staff_roles_business_id_email_key')) {
                    throw new Error('This staff member already exists in your business');
                } else if (error.message.includes('staff_roles_business_id_owner_id_key')) {
                    throw new Error('This user is already a staff member in your business');
                } else {
                    throw new Error('Staff member already exists with these details');
                }
            }
            throw error;
        }

        if (!staffRole) {
            throw new Error('Failed to create staff member - no data returned');
        }

        console.log('✅ Staff member added successfully:', staffRole);
        
        // Clear staff cache
        clearBusinessData('staff_roles');
        
        // Show success message
        showNotification(
            'Staff Added Successfully', 
            `${staffData.name} (${staffData.email}) has been added as ${staffData.role} to ${currentBusiness.name}.`,
            'success'
        );
        
        return staffRole;

    } catch (error) {
        console.error('❌ Error adding staff member:', error);
        throw error;
    }
}

// Staff session management
function getCurrentStaffRole() {
    if (!currentBusiness || !currentUser) return null;
    
    // Check if user is staff in current business
    const staffSession = JSON.parse(localStorage.getItem('staffSession') || '{}');
    if (staffSession.business_id === currentBusiness.id) {
        return staffSession.role;
    }
    
    return null;
}

function setCurrentStaffRole(businessId) {
    const staffRole = userRoles[businessId];
    if (staffRole && staffRole.role !== 'owner') {
        const staffSession = {
            staff_id: staffRole.id,
            email: currentUser.email,
            role: staffRole.role,
            business_id: businessId,
            business_name: staffRole.businesses.name,
            permissions: ROLE_PERMISSIONS[staffRole.role] || ROLE_PERMISSIONS.viewer,
            is_staff: true
        };
        localStorage.setItem('staffSession', JSON.stringify(staffSession));
    }
}

// Enhanced staff loading with better error handling
async function loadStaffMembers() {
    try {
        console.log('📊 Loading staff members...');
        
        if (!currentBusiness) {
            console.warn('⚠️ No current business selected');
            updateStaffUI([]);
            return;
        }

        if (!hasPermission('staff', 'view')) {
            console.warn('🚫 No permission to view staff members');
            updateStaffUI([]);
            return;
        }

        console.log('🏢 Loading staff for business:', currentBusiness.id);

        // Use business-aware data loading
        const staffRoles = await getBusinessData('staff_roles', {
            cacheKey: 'staff_members'
        });

        console.log('✅ Staff roles loaded:', staffRoles.length);
        processStaffData(staffRoles);
        
    } catch (error) {
        console.error('❌ Error loading staff members:', error);
        showNotification('Error', 'Failed to load staff members. Please refresh the page.', 'error');
        updateStaffUI([]);
    }
}

function processStaffData(staffRoles) {
    if (!staffRoles || staffRoles.length === 0) {
        console.log('📭 No staff members found');
        updateStaffUI([]);
        return;
    }

    const staffMembers = staffRoles.map(staff => ({
        ...staff,
        email: staff.email || 'No email',
        full_name: staff.staff_name || staff.email || 'Staff Member'
    }));

    console.log('✅ Processed staff members:', staffMembers.length);
    updateStaffUI(staffMembers);
    displayRolePermissions();
}

function updateStaffUI(staffMembers) {
    const staffTableBody = document.getElementById('staff-table-body');
    const totalStaff = document.getElementById('total-staff');
    const activeStaff = document.getElementById('active-staff');
    const adminCount = document.getElementById('admin-count');

    // Update stats even if table doesn't exist
    if (totalStaff) totalStaff.textContent = staffMembers.length;
    if (activeStaff) activeStaff.textContent = staffMembers.filter(s => s.is_active).length;
    if (adminCount) adminCount.textContent = staffMembers.filter(s => s.role === 'admin').length;

    if (!staffTableBody) {
        console.warn('⚠️ Staff table body not found - staff page might not be active');
        return;
    }

    // Update table
    staffTableBody.innerHTML = staffMembers.map(staff => {
        const statusClass = staff.is_active ? 'badge-success' : 'badge-secondary';
        const statusText = staff.is_active ? 'Active' : 'Inactive';
        const roleInfo = ROLE_PERMISSIONS[staff.role] || ROLE_PERMISSIONS.viewer;
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar">
                            ${(staff.full_name || staff.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 500;">${staff.full_name || staff.email || 'Staff Member'}</div>
                            <small style="color: #6c757d;">${roleInfo.name}</small>
                        </div>
                    </div>
                </td>
                <td>${staff.email}</td>
                <td>
                    <span class="badge badge-${getRoleBadgeColor(staff.role)}">
                        ${roleInfo.name}
                    </span>
                </td>
                <td>
                    <span class="badge ${statusClass}">${statusText}</span>
                </td>
                <td>${staff.last_active ? new Date(staff.last_active).toLocaleDateString() : 'Never'}</td>
                <td>
                    <div class="action-buttons">
                        ${hasPermission('staff', 'edit') ? `
                            <button class="btn btn-outline btn-sm" onclick="editStaffMember('${staff.id}')" 
                                    ${staff.email === currentUser.email ? 'disabled' : ''}>
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${hasPermission('staff', 'delete') && staff.email !== currentUser.email ? `
                            <button class="btn btn-outline btn-sm" onclick="removeStaffMember('${staff.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    console.log('✅ Staff UI updated with', staffMembers.length, 'members');
}

function ensureUserRole() {
    console.log('🛠️ Ensuring user role is set...');
    
    if (!currentUser) {
        console.warn('⚠️ No current user found');
        return 'viewer';
    }
    
    // If role is "authenticated", try to load the proper role
    if (currentUser.role === 'authenticated' || !currentUser.role) {
        console.log('🔄 Role is "authenticated", attempting to load proper role...');
        
        // Try to get role from localStorage as fallback
        const userData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
        const userRole = userData.user?.user_metadata?.role;
        
        if (userRole && userRole !== 'authenticated') {
            currentUser.role = userRole;
            console.log('✅ Restored role from metadata:', currentUser.role);
            return currentUser.role;
        }
        
        // Default to viewer if no role found
        currentUser.role = 'viewer';
        console.log('⚠️ Defaulting to viewer role');
    }
    
    return currentUser.role;
}

// Permission summary helper
function getPermissionSummary(role) {
    const roleInfo = ROLE_PERMISSIONS[role];
    if (!roleInfo) return 'No permissions';
    
    const permissions = [];
    if (roleInfo.permissions.staff?.includes('create')) permissions.push('Add Staff');
    if (roleInfo.permissions.staff?.includes('edit')) permissions.push('Edit Staff');
    if (roleInfo.permissions.staff?.includes('delete')) permissions.push('Remove Staff');
    if (roleInfo.permissions.products?.includes('create')) permissions.push('Add Products');
    if (roleInfo.permissions.products?.includes('edit')) permissions.push('Edit Products');
    if (roleInfo.permissions.products?.includes('delete')) permissions.push('Delete Products');
    
    return permissions.length > 0 ? permissions.join(', ') : 'View Only';
}

// Role badge color helper
function getRoleBadgeColor(role) {
    const colors = {
        owner: 'primary',
        admin: 'success',
        manager: 'warning',
        staff: 'info',
        viewer: 'secondary'
    };
    return colors[role] || 'secondary';
}

// Enhanced handleAddStaff with detailed error reporting
async function handleAddStaff(e) {
    e.preventDefault();
    console.log('📝 Handling add staff form submission...');
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitButton.disabled = true;

        const formData = {
            name: document.getElementById('staff-name').value.trim(),
            email: document.getElementById('staff-email').value.trim(),
            role: document.getElementById('staff-role').value
        };

        console.log('📧 Form data:', formData);

        // Validate required fields
        if (!formData.name || !formData.email || !formData.role) {
            showNotification('Error', 'Please fill in all required fields', 'error');
            return;
        }

        await addStaffMember(formData);
        
        hideAddStaffModal();
        
        // Reload staff list
        await loadStaffMembers();

    } catch (error) {
        console.error('❌ Error adding staff member:', error);
        
        let errorMessage = 'Failed to add staff member';
        let errorTitle = 'Error';
        
        if (error.message.includes('already exists')) {
            errorMessage = 'This staff member already exists in your business';
        } else if (error.message.includes('valid email')) {
            errorMessage = 'Please enter a valid email address';
        } else if (error.message.includes('staff member name')) {
            errorMessage = 'Please enter staff member name';
        } else if (error.message.includes('select a role')) {
            errorMessage = 'Please select a role';
        } else if (error.message.includes('permission')) {
            errorMessage = 'You do not have permission to add staff members';
        } else if (error.message.includes('business selected')) {
            errorMessage = 'Please select a business first';
        } else {
            errorMessage = `Database error: ${error.message}`;
        }
        
        showNotification(errorTitle, errorMessage, 'error');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Modal functions
function showAddStaffModal() {
    console.log('🎯 showAddStaffModal called');
    
    // Debug first
    debugStaffState();
    
    // Check if user is business owner (bypass permission check for owner)
    if (currentBusiness?.owner_id === currentUser?.id) {
        console.log('✅ Business owner detected - allowing staff addition');
        const modal = document.getElementById('add-staff-modal');
        if (modal) {
            modal.classList.remove('d-none');
            document.getElementById('staff-email').focus();
        } else {
            console.error('❌ Add staff modal not found');
        }
        return;
    }
    
    // For non-owners, check permissions
    if (!hasPermission('staff', 'create')) {
        console.warn('🚫 No permission to add staff members');
        showNotification('Access Denied', 'You do not have permission to add staff members.', 'error');
        return;
    }
    
    const modal = document.getElementById('add-staff-modal');
    if (modal) {
        console.log('✅ Showing add staff modal');
        modal.classList.remove('d-none');
        document.getElementById('staff-email').focus();
    } else {
        console.error('❌ Add staff modal not found');
    }
}

// Enhanced permission checking function
function hasPermission(resource, action) {
    // 🔥 FIX: Ensure role is properly set first
    const userRole = ensureUserRole();
    
    console.log(`🔐 Checking permission: ${resource}.${action} for user:`, currentUser?.email, 'role:', userRole);
    
    // Always allow business owner
    if (currentBusiness?.owner_id === currentUser?.id) {
        console.log('✅ Business owner - full access granted');
        return true;
    }
    
    if (!currentUser) {
        console.warn('⚠️ No current user found');
        return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) {
        console.warn('⚠️ No permissions defined for role:', userRole);
        return false;
    }

    const resourcePermissions = rolePermissions.permissions[resource];
    if (!resourcePermissions) {
        console.warn('⚠️ No permissions defined for resource:', resource);
        return false;
    }

    const hasAccess = resourcePermissions.includes(action);
    console.log(`🔐 Permission result: ${userRole} -> ${resource}.${action}: ${hasAccess}`);
    return hasAccess;
}

// Enhanced page access control
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

function hideAddStaffModal() {
    console.log('🎯 hideAddStaffModal called');
    const modal = document.getElementById('add-staff-modal');
    if (modal) {
        modal.classList.add('d-none');
        document.getElementById('add-staff-form').reset();
    }
}

function showEditStaffModal() {
    console.log('🎯 showEditStaffModal called');
    const modal = document.getElementById('edit-staff-modal');
    if (modal) {
        modal.classList.remove('d-none');
    }
}

function hideEditStaffModal() {
    console.log('🎯 hideEditStaffModal called');
    const modal = document.getElementById('edit-staff-modal');
    if (modal) {
        modal.classList.add('d-none');
        document.getElementById('edit-staff-form').reset();
    }
}

// Edit staff member
async function editStaffMember(staffRoleId) {
    try {
        const { data: staffRole, error } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('id', staffRoleId)
            .single();

        if (error) {
            console.error('❌ Error loading staff member:', error);
            throw error;
        }

        // Populate edit form
        document.getElementById('edit-staff-id').value = staffRole.id;
        document.getElementById('edit-staff-role').value = staffRole.role;
        document.getElementById('edit-staff-status').value = staffRole.is_active ? 'active' : 'inactive';

        showEditStaffModal();

    } catch (error) {
        console.error('❌ Error editing staff member:', error);
        showNotification('Error', 'Failed to load staff member details', 'error');
    }
}

async function updateStaffMember(staffData) {
    try {
        const { error } = await supabase
            .from('staff_roles')
            .update({
                role: staffData.role,
                is_active: staffData.status === 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', staffData.id);

        if (error) {
            console.error('❌ Error updating staff member:', error);
            throw error;
        }

        showNotification('Success', 'Staff member updated successfully', 'success');
        hideEditStaffModal();
        await loadStaffMembers();

    } catch (error) {
        console.error('❌ Error updating staff member:', error);
        showNotification('Error', 'Failed to update staff member', 'error');
    }
}

// Remove staff member
async function removeStaffMember(staffRoleId) {
    if (!confirm('Are you sure you want to remove this staff member? They will lose access to this business.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('staff_roles')
            .update({
                is_active: false,
                status: 'removed',
                updated_at: new Date().toISOString()
            })
            .eq('id', staffRoleId);

        if (error) {
            console.error('❌ Error removing staff member:', error);
            throw error;
        }

        showNotification('Success', 'Staff member removed successfully', 'success');
        await loadStaffMembers();

    } catch (error) {
        console.error('❌ Error removing staff member:', error);
        showNotification('Error', 'Failed to remove staff member', 'error');
    }
}

// Handle edit form submission
async function handleEditStaff(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitButton.disabled = true;

        const formData = {
            id: document.getElementById('edit-staff-id').value,
            role: document.getElementById('edit-staff-role').value,
            status: document.getElementById('edit-staff-status').value
        };

        await updateStaffMember(formData);

    } catch (error) {
        console.error('❌ Error handling staff edit:', error);
        showNotification('Error', 'Failed to update staff member', 'error');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Email validation helper
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Event listeners setup
function setupStaffEventListeners() {
    const addStaffForm = document.getElementById('add-staff-form');
    const editStaffForm = document.getElementById('edit-staff-form');

    console.log('🔍 Setting up staff event listeners...');
    console.log('📝 Add staff form found:', !!addStaffForm);
    console.log('📝 Edit staff form found:', !!editStaffForm);

    if (addStaffForm) {
        addStaffForm.addEventListener('submit', handleAddStaff);
        console.log('✅ Add staff form event listener attached');
    }

    if (editStaffForm) {
        editStaffForm.addEventListener('submit', handleEditStaff);
        console.log('✅ Edit staff form event listener attached');
    }

    // Search functionality
    const staffSearch = document.getElementById('staff-search');
    const roleFilter = document.getElementById('role-filter');
    const statusFilter = document.getElementById('status-filter');

    if (staffSearch) {
        staffSearch.addEventListener('input', debounce(handleStaffSearch, 300));
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', handleStaffFilter);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', handleStaffFilter);
    }
}

function handleStaffSearch() {
    const searchTerm = document.getElementById('staff-search').value.toLowerCase();
    const rows = document.querySelectorAll('#staff-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function handleStaffFilter() {
    loadStaffMembers();
}

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 Staff management ready to initialize');
});

console.log('✅ Enhanced staff management functions loaded successfully');

// Export functions for global access
window.initializeStaffManagement = initializeStaffManagement;
window.showAddStaffModal = showAddStaffModal;
window.hideAddStaffModal = hideAddStaffModal;
window.showEditStaffModal = showEditStaffModal;
window.hideEditStaffModal = hideEditStaffModal;
window.editStaffMember = editStaffMember;
window.removeStaffMember = removeStaffMember;
window.handleAddStaff = handleAddStaff;
window.handleEditStaff = handleEditStaff;
window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
window.hasPermission = hasPermission;
window.canAccessPage = canAccessPage;
window.applyRoleBasedAccess = applyRoleBasedAccess;