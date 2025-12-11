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
        // Staff Management - LIMITED
        staff: ['view'],
        // Business Management - LIMITED (NO CREATE ACCESS)
        business: ['view'], // No 'create' permission
        // Inventory Management - FULL ACCESS
        products: ['create', 'view', 'edit', 'delete', 'categories'],
        inventory: ['view', 'adjust', 'transfer', 'count'],
        suppliers: ['create', 'view', 'edit', 'delete'],
        categories: ['create', 'view', 'edit', 'delete'],
        // Sales & Billing - LIMITED (view only)
        sales: ['view'],
        customers: ['view'], 
        invoices: ['view'],
        quotes: ['view'],
        // Purchases - FULL ACCESS
        purchases: ['create', 'view', 'edit', 'orders'],
        vendors: ['create', 'view', 'edit'],
        // Expenses - LIMITED (view only)
        expenses: ['view'],
        expense_categories: ['view'],
        // Financial - LIMITED (view only)
        payments: ['view'],
        taxes: ['view'],
        // Reports & Analytics - LIMITED
        reports: ['view'],
        analytics: ['view'],
        // System - LIMITED
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

// ENHANCED: Direct navigation hiding with multiple strategies
function applyDirectNavigationHiding() {
    console.log('🎯 Applying direct navigation hiding...');
    
    if (!currentUser || !currentUser.role) {
        console.warn('⚠️ No user or role for navigation hiding');
        return;
    }
    
    const role = currentUser.role;
    console.log(`👤 Applying navigation restrictions for: ${role}`);
    
    // Define what each role should see
    const roleNavigation = {
        owner:['overview','inventory','parties','sales','purchases','expenses','reports','businesses','staff','settings'],
        inventory_manager: ['overview', 'inventory', 'products', 'purchases', 'parties','reports'],
        salesman: ['overview', 'sales', 'customers', 'parties'],
        cashier: ['overview', 'sales'],
        staff: ['overview', 'sales', 'inventory'],
        viewer: ['overview']
    };
    
    const allowedPages = roleNavigation[role] || ['overview'];
    console.log(`✅ ${role} can access:`, allowedPages);
    
    // Get all navigation items using multiple selectors
    const allNavItems = document.querySelectorAll(`
        .sidebar-menu a[data-page],
        .nav-item[data-page], 
        .menu-item[data-page],
        [data-page],
        .nav-link,
        .menu-link,
        .sidebar-menu li,
        .navigation a
    `);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allNavItems.forEach(item => {
        let pageName = null;
        
        // Try different ways to identify the page
        if (item.hasAttribute('data-page')) {
            pageName = item.getAttribute('data-page');
        } else if (item.getAttribute('href')) {
            const href = item.getAttribute('href');
            pageName = href.split('/').pop() || href.split('#').pop();
        } else if (item.textContent) {
            // Use text content as fallback
            const text = item.textContent.toLowerCase().trim();
            const pageMap = {
                'dashboard': 'overview',
                'inventory': 'inventory', 
                'sales': 'sales',
                'customers': 'customers',
                'parties': 'parties',
                'purchases': 'purchases',
                'expenses': 'expenses',
                'reports': 'reports',
                'staff': 'staff',
                'settings': 'settings'
            };
            pageName = pageMap[text];
        }
        
        if (!pageName) {
            return; // Skip if we can't identify the page
        }
        
        // Check if this page is allowed
        const isAllowed = allowedPages.includes(pageName);
        
        if (isAllowed) {
            item.style.display = 'flex';
            item.classList.remove('d-none');
            visibleCount++;
            console.log(`✅ Showing: ${pageName}`);
        } else {
            item.style.display = 'none';
            item.classList.add('d-none');
            hiddenCount++;
            console.log(`🚫 Hiding: ${pageName}`);
        }
    });
    
    console.log(`📊 Direct hiding complete: ${visibleCount} visible, ${hiddenCount} hidden`);
}

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
    console.log('🔐 APPLYING COMPREHENSIVE ROLE-BASED ACCESS CONTROL...');
    
    if (!currentUser || !currentBusiness) {
        console.warn('⚠️ No user or business context');
        return;
    }
    
    console.log('👤 User:', currentUser.email);
    console.log('🎯 Role:', currentUser.role);
    console.log('🏢 Business:', currentBusiness.name);
    
    // Apply multiple hiding strategies for maximum coverage
    applyDirectNavigationHiding(); // Primary method - most reliable
    applyNavigationRestrictions(); // Secondary method - permission-based
    applyRoleBasedUI();           // UI elements
    
    // Update UI based on current permissions
    updateUIForCurrentRole();
    
    console.log('✅ ACCESS CONTROL COMPLETE');
    
    // Show what's accessible for debugging
    setTimeout(() => {
        const visibleItems = document.querySelectorAll('.sidebar-menu a[data-page]');
        const visiblePages = Array.from(visibleItems)
            .filter(item => item.style.display !== 'none')
            .map(item => item.getAttribute('data-page'));
        
        console.log('📋 Final accessible pages:', visiblePages);
    }, 1000);
}

// Update UI to reflect current role
function updateUIForCurrentRole() {
    // Show current role in UI if element exists
    const roleIndicator = document.getElementById('current-role');
    if (roleIndicator) {
        const roleInfo = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.viewer;
        roleIndicator.textContent = roleInfo.name;
        roleIndicator.className = `badge badge-${getRoleBadgeColor(currentUser.role)}`;
    }
    
    // Update page title or header to show restricted access
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
        const pageHeader = document.querySelector('.page-header h1');
        if (pageHeader) {
            pageHeader.innerHTML += ` <small class="text-muted">(${ROLE_PERMISSIONS[currentUser.role]?.name} View)</small>`;
        }
    }
}

// Enhanced helper function to hide elements by ID, class, or selector
function hideElementById(identifier) {
    // If it starts with #, it's an ID
    if (identifier.startsWith('#')) {
        const element = document.getElementById(identifier.substring(1));
        if (element) {
            element.style.display = 'none';
            element.classList.add('d-none');
        }
    } 
    // If it starts with ., it's a class
    else if (identifier.startsWith('.')) {
        const elements = document.querySelectorAll(identifier);
        elements.forEach(element => {
            element.style.display = 'none';
            element.classList.add('d-none');
        });
    }
    // Otherwise, try as selector
    else {
        const elements = document.querySelectorAll(identifier);
        elements.forEach(element => {
            element.style.display = 'none';
            element.classList.add('d-none');
        });
    }
}

function applyContentRestrictions() {
    console.log('📄 Applying content restrictions...');
    
    // Hide entire sections based on permissions
    if (!hasPermission('reports', 'view')) {
        hideElementById('reports-section');
        hideElementById('reports-tab');
        hideElementById('reports-panel');
        console.log('🚫 Reports section hidden');
    }
    
    if (!hasPermission('analytics', 'view')) {
        hideElementById('analytics-section');
        hideElementById('analytics-tab');
        hideElementById('analytics-panel');
        console.log('🚫 Analytics section hidden');
    }
    
    if (!hasPermission('staff', 'view')) {
        hideElementById('staff-section');
        hideElementById('staff-tab');
        hideElementById('staff-panel');
        console.log('🚫 Staff section hidden');
    }
    
    if (!hasPermission('expenses', 'view')) {
        hideElementById('expenses-section');
        hideElementById('expenses-tab');
        hideElementById('expenses-panel');
        console.log('🚫 Expenses section hidden');
    }
    
    if (!hasPermission('purchases', 'view')) {
        hideElementById('purchases-section');
        hideElementById('purchases-tab');
        hideElementById('purchases-panel');
        console.log('🚫 Purchases section hidden');
    }
    
    if (!hasPermission('settings', 'view')) {
        hideElementById('settings-section');
        hideElementById('settings-tab');
        hideElementById('settings-panel');
        console.log('🚫 Settings section hidden');
    }
}

// Enhanced Navigation Control System
function applyNavigationRestrictions() {
    console.log('🔐 Applying comprehensive navigation restrictions...');
    
    if (!currentUser || !currentBusiness) {
        console.warn('⚠️ No user or business for navigation restrictions');
        return;
    }
    
    // Define page permissions mapping
    const pagePermissions = {
        // Dashboard & Overview
        'overview': { resource: 'business', action: 'view' },
        
        // Sales & Billing
        'sales': { resource: 'sales', action: 'view' },
        'customers': { resource: 'customers', action: 'view' },
        'invoices': { resource: 'invoices', action: 'view' },
        'quotes': { resource: 'quotes', action: 'view' },
        
        // Inventory Management
        'inventory': { resource: 'products', action: 'view' },
        'products': { resource: 'products', action: 'view' },
        'categories': { resource: 'categories', action: 'view' },
        'suppliers': { resource: 'suppliers', action: 'view' },
        
        // Purchases
        'purchases': { resource: 'purchases', action: 'view' },
        'vendors': { resource: 'vendors', action: 'view' },
        
        // Expenses
        'expenses': { resource: 'expenses', action: 'view' },
        'expense-categories': { resource: 'expense_categories', action: 'view' },
        
        // Financial
        'payments': { resource: 'payments', action: 'view' },
        'taxes': { resource: 'taxes', action: 'view' },
        
        // Reports & Analytics
        'reports': { resource: 'reports', action: 'view' },
        'analytics': { resource: 'analytics', action: 'view' },
        
        // Staff & Settings
        'staff': { resource: 'staff', action: 'view' },
        'settings': { resource: 'settings', action: 'view' },
        'business-settings': { resource: 'business', action: 'settings' }
    };

    // Hide all navigation elements first, then show authorized ones
    const menuItems = document.querySelectorAll('.sidebar-menu a[data-page], .nav-item[data-page], .menu-item[data-page]');
    let visibleCount = 0;
    let hiddenCount = 0;

    menuItems.forEach(menuItem => {
        const page = menuItem.getAttribute('data-page');
        
        if (!page) {
            console.warn('⚠️ Menu item missing data-page attribute:', menuItem);
            return;
        }

        const permission = pagePermissions[page];
        
        if (!permission) {
            console.log(`ℹ️ No permission defined for page: ${page} - showing by default`);
            menuItem.style.display = 'flex';
            visibleCount++;
            return;
        }

        if (canAccessPage(page)) {
            menuItem.style.display = 'flex';
            visibleCount++;
            console.log(`✅ Showing navigation: ${page}`);
        } else {
            menuItem.style.display = 'none';
            hiddenCount++;
            console.log(`🚫 Hiding navigation: ${page}`);
        }
    });

    // Also check for navigation by ID or class
    hideNavigationBySelectors();
    
    // 🔥 SPECIFIC FIX: Hide Create Business button for non-owners
    hideCreateBusinessButton();
    
    console.log(`📊 Navigation Summary: ${visibleCount} visible, ${hiddenCount} hidden`);
}

// 🔥 NEW: Hide Create Business button specifically
function hideCreateBusinessButton() {
    console.log('🚫 Checking Create Business button visibility...');
    
    // Debug info
    console.log('👤 Current User ID:', currentUser?.id);
    console.log('🏢 Business Owner ID:', currentBusiness?.owner_id);
    console.log('🔐 Is Owner:', currentBusiness?.owner_id === currentUser?.id);
    console.log('🎯 User Role:', currentUser?.role);
    
    // ONLY hide for non-owners - OWNERS should see the button
    const isOwner = currentBusiness?.owner_id === currentUser?.id;
    
    if (isOwner) {
        console.log('✅ User is owner - SHOWING all Create Business buttons');
        // Ensure all create business buttons are visible for owners
        const createBusinessButtons = document.querySelectorAll(`
            #create-business-btn,
            .create-business-btn,
            [data-action="create-business"],
            [href*="create-business"],
            .btn[onclick*="createBusiness"],
            .btn[onclick*="showCreateBusinessModal"]
        `);
        
        createBusinessButtons.forEach(button => {
            button.style.display = 'flex';
            button.classList.remove('d-none');
            console.log('✅ Showing Create Business button for owner');
        });
        
        return; // Exit early - don't hide anything for owners
    }
    
    // Only execute the hiding logic for NON-owners
    console.log('🚫 User is not owner - HIDING Create Business buttons');
    
    const createBusinessButtons = document.querySelectorAll(`
        #create-business-btn,
        .create-business-btn,
        [data-action="create-business"],
        [href*="create-business"],
        .btn[onclick*="createBusiness"],
        .btn[onclick*="showCreateBusinessModal"]
    `);
    
    createBusinessButtons.forEach(button => {
        button.style.display = 'none';
        button.classList.add('d-none');
        console.log('🚫 Hiding Create Business button for non-owner');
    });
    
    // Also hide any "Add Business" or "New Business" buttons for non-owners
    const addBusinessElements = document.querySelectorAll(`
        #add-business-btn,
        .add-business-btn,
        [data-action="add-business"]
    `);
    
    addBusinessElements.forEach(element => {
        element.style.display = 'none';
        element.classList.add('d-none');
    });
}

// Additional navigation hiding by selectors
function hideNavigationBySelectors() {
    const selectorsToHide = [];
    
    // Define selectors based on permissions
    if (!hasPermission('reports', 'view')) {
        selectorsToHide.push('#reports-nav', '.reports-menu', '[href*="reports"]');
    }
    
    if (!hasPermission('analytics', 'view')) {
        selectorsToHide.push('#analytics-nav', '.analytics-menu', '[href*="analytics"]');
    }
    
    if (!hasPermission('staff', 'view')) {
        selectorsToHide.push('#staff-nav', '.staff-menu', '[href*="staff"]');
    }
    
    if (!hasPermission('settings', 'view')) {
        selectorsToHide.push('#settings-nav', '.settings-menu', '[href*="settings"]');
    }
    
    if (!hasPermission('expenses', 'view')) {
        selectorsToHide.push('#expenses-nav', '.expenses-menu', '[href*="expenses"]');
    }
    
    if (!hasPermission('purchases', 'view')) {
        selectorsToHide.push('#purchases-nav', '.purchases-menu', '[href*="purchases"]');
    }
    
    // Apply hiding
    selectorsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.style.display = 'none';
            console.log(`🚫 Hiding element: ${selector}`);
        });
    });
}



function applyActionButtonRestrictions() {
    console.log('🔘 Applying action button restrictions...');
    
    // Staff management buttons
    const addStaffButton = document.getElementById('add-staff-btn');
    if (addStaffButton) {
        if (hasPermission('staff', 'create')) {
            addStaffButton.style.display = 'flex';
            console.log('✅ Add staff button shown');
        } else {
            addStaffButton.style.display = 'none';
            console.log('🚫 Add staff button hidden');
        }
    }
    
    // Product management buttons
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
    
    // Sales buttons
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
    
    // Purchase buttons
    const addPurchaseButton = document.getElementById('add-purchase-btn');
    if (addPurchaseButton) {
        if (hasPermission('purchases', 'create')) {
            addPurchaseButton.style.display = 'block';
            console.log('✅ Add purchase button shown');
        } else {
            addPurchaseButton.style.display = 'none';
            console.log('🚫 Add purchase button hidden');
        }
    }
    
    // Expense buttons
    const addExpenseButton = document.getElementById('add-expense-btn');
    if (addExpenseButton) {
        if (hasPermission('expenses', 'create')) {
            addExpenseButton.style.display = 'block';
            console.log('✅ Add expense button shown');
        } else {
            addExpenseButton.style.display = 'none';
            console.log('🚫 Add expense button hidden');
        }
    }
    
    // Report export buttons
    const exportButtons = document.querySelectorAll('.export-btn, [data-action="export"]');
    exportButtons.forEach(button => {
        if (hasPermission('analytics', 'export')) {
            button.style.display = 'inline-block';
        } else {
            button.style.display = 'none';
        }
    });
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

        // 🔥 FIX: Use email to find staff role (since staff_roles uses owner_id, not user_id)
        const { data: staffRole, error } = await supabase
            .from('staff_roles')
            .select('role, staff_name, business_id, id, owner_id')
            .eq('business_id', currentBusiness.id)
            .eq('email', currentUser.email)
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
        console.log('👤 Adding staff member with direct login capability:', staffData);
        
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
            .select('id, email, staff_name, is_active, owner_id')
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
                    owner_id: currentUser.id,
                    is_active: true,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingStaff.id)
                .select()
                .single();

            if (updateError) throw updateError;
            
            console.log('✅ Staff member reactivated:', updatedStaff);
            
            // Send staff invitation notification
            await sendStaffInvitation(staffData.email, staffData.name, currentBusiness.name, staffData.role);
            
            showNotification('Success', `${staffData.name} has been reactivated as ${staffData.role}`, 'success');
            return updatedStaff;
        }

        // Create new staff record
        const staffRecord = {
            email: staffData.email,
            role: staffData.role,
            business_id: currentBusiness.id,
            owner_id: currentUser.id,
            staff_name: staffData.name,
            is_active: true,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Creating staff record with:', staffRecord);

        const { data: staffRole, error } = await supabase
            .from('staff_roles')
            .insert([staffRecord])
            .select()
            .single();

        if (error) {
            console.error('❌ Database error:', error);
            
            if (error.code === '23505') {
                throw new Error('This staff member already exists in your business');
            }
            throw error;
        }

        if (!staffRole) {
            throw new Error('Failed to create staff member - no data returned');
        }

        console.log('✅ Staff member added successfully:', staffRole);
        
        // Send staff invitation
        await sendStaffInvitation(staffData.email, staffData.name, currentBusiness.name, staffData.role);
        
        // Clear staff cache
        clearBusinessData('staff_roles');
        
        return staffRole;

    } catch (error) {
        console.error('❌ Error adding staff member:', error);
        throw error;
    }
}

// Send staff invitation with login instructions
async function sendStaffInvitation(email, staffName, businessName, role) {
    try {
        console.log(`📧 Sending invitation to ${email} for business ${businessName}`);
        
        // Show notification with login instructions
        showNotification(
            'Staff Invited Successfully', 
            `${staffName} has been added as ${role} to ${businessName}. They can now login directly with their email address.`,
            'success',
            8000
        );
        
        // Optional: You can implement email sending here
        // await sendInvitationEmail(email, staffName, businessName, role);
        
    } catch (error) {
        console.warn('⚠️ Could not send invitation:', error);
        // Don't throw error - staff was still created successfully
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

        console.log('🏢 Loading staff for business:', currentBusiness.id, currentBusiness.name);

        // 🔥 FIX: Use simple query without complex joins
        const { data: staffRoles, error } = await supabase
            .from('staff_roles')
            .select('id, business_id, owner_id, email, staff_name, role, is_active, status, created_at, updated_at')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading staff members:', error);
            
            // If it's a schema error, try alternative approach
            if (error.message.includes('relationship') || error.message.includes('schema')) {
                console.log('🔄 Trying alternative staff loading method...');
                return await loadStaffMembersAlternative();
            }
            
            showNotification('Error', 'Failed to load staff members. Please refresh the page.', 'error');
            updateStaffUI([]);
            return;
        }

        console.log('✅ Staff roles loaded:', staffRoles?.length || 0, staffRoles);
        processStaffData(staffRoles || []);
        
    } catch (error) {
        console.error('❌ Error loading staff members:', error);
        showNotification('Error', 'Failed to load staff members. Please refresh the page.', 'error');
        updateStaffUI([]);
    }
}

// Alternative staff loading method
async function loadStaffMembersAlternative() {
    try {
        console.log('🔍 Using alternative staff loading method');
        
        const { data: staffRoles, error } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Alternative staff loading failed:', error);
            updateStaffUI([]);
            return;
        }

        processStaffData(staffRoles || []);
        
    } catch (error) {
        console.error('❌ Error in alternative staff loading:', error);
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
        // Dashboard
        'overview': { resource: 'business', action: 'view' },
        
        // Sales
        'sales': { resource: 'sales', action: 'view' },
        'customers': { resource: 'customers', action: 'view' },
        'invoices': { resource: 'invoices', action: 'view' },
        'quotes': { resource: 'quotes', action: 'view' },
        
        // Inventory
        'inventory': { resource: 'products', action: 'view' },
        'products': { resource: 'products', action: 'view' },
        'categories': { resource: 'categories', action: 'view' },
        'suppliers': { resource: 'suppliers', action: 'view' },
        
        // Purchases
        'purchases': { resource: 'purchases', action: 'view' },
        'vendors': { resource: 'vendors', action: 'view' },
        
        // Expenses
        'expenses': { resource: 'expenses', action: 'view' },
        'expense-categories': { resource: 'expense_categories', action: 'view' },
        
        // Financial
        'payments': { resource: 'payments', action: 'view' },
        'taxes': { resource: 'taxes', action: 'view' },
        
        // Reports
        'reports': { resource: 'reports', action: 'view' },
        'analytics': { resource: 'analytics', action: 'view' },
        
        // Administration
        'staff': { resource: 'staff', action: 'view' },
        'settings': { resource: 'settings', action: 'view' },
        'business-settings': { resource: 'business', action: 'settings' }
    };

    const permission = pagePermissions[page];
    if (!permission) {
        console.log(`✅ Page ${page} has no permission requirements - allowing access`);
        return true;
    }

    const canAccess = hasPermission(permission.resource, permission.action);
    console.log(`🔐 Page access result: ${page} -> ${canAccess ? 'ALLOWED' : 'DENIED'}`);
    return canAccess;
}

// Comprehensive UI element control based on roles
function applyRoleBasedUI() {
    console.log('🎨 Applying role-based UI restrictions...');
    
    if (!currentUser || !currentBusiness) {
        console.warn('⚠️ No user or business for UI restrictions');
        return;
    }
    
    // Control action buttons
    applyActionButtonRestrictions();
    
    // Control page sections
    applyContentRestrictions();
    
    // Control dashboard widgets
    applyDashboardRestrictions();
    
    // Control form elements
    applyFormRestrictions();
}

// Form element restrictions
function applyFormRestrictions() {
    console.log('📝 Applying form restrictions...');
    
    // Disable form fields based on permissions
    const editableFields = document.querySelectorAll('[contenteditable="true"], input:not([readonly]), select:not([disabled])');
    
    editableFields.forEach(field => {
        const formSection = field.closest('.form-section, .tab-pane, [data-resource]');
        if (formSection) {
            const resource = formSection.getAttribute('data-resource');
            if (resource && !hasPermission(resource, 'edit')) {
                field.setAttribute('readonly', true);
                field.setAttribute('disabled', true);
            }
        }
    });
}

// Dashboard restrictions
function applyDashboardRestrictions() {
    console.log('📊 Applying dashboard restrictions...');
    
    if (!currentUser || !currentBusiness) {
        console.warn('⚠️ No user or business for dashboard restrictions');
        return;
    }
    
    const userRole = currentUser.role;
    console.log(`🎯 Applying dashboard restrictions for: ${userRole}`);
    
    // Financial widgets - hide for inventory_manager
    if (!hasPermission('payments', 'view') || userRole === 'inventory_manager') {
        hideElementById('revenue-widget');
        hideElementById('profit-widget');
        hideElementById('tax-widget');
        hideElementById('total-sales-widget');
        hideElementById('total-revenue-widget');
        console.log('🚫 Financial widgets hidden');
    }
    
    // Inventory widgets
    if (!hasPermission('inventory', 'view')) {
        hideElementById('stock-widget');
        hideElementById('low-stock-widget');
        console.log('🚫 Inventory widgets hidden');
    }
    
    // Sales widgets - hide for inventory_manager
    if (!hasPermission('sales', 'view') || userRole === 'inventory_manager') {
        hideElementById('sales-chart');
        hideElementById('recent-sales');
        hideElementById('quick-sale-btn');
        hideElementById('export-sales-btn');
        hideElementById('financial-summary');
        hideElementById('performance-analytics');
        console.log('🚫 Sales widgets hidden');
    }
    
    // 🔥 SPECIFIC FIX: Hide all sales-related elements in overview
    hideSalesElementsInOverview();
}

// 🔥 NEW: Hide specific sales elements in overview/dashboard
function hideSalesElementsInOverview() {
    console.log('🎯 Hiding sales elements in overview...');
    
    // Only apply to inventory_manager
    if (currentUser.role !== 'inventory_manager') {
        return;
    }
    
    // Hide Total Sales elements
    const totalSalesElements = document.querySelectorAll(`
        .sales-card,
        .revenue-card,
        [data-widget="total-sales"],
        [data-metric="sales"],
        .sales-total,
        .revenue-total
    `);
    
    totalSalesElements.forEach(element => {
        element.style.display = 'none';
        element.classList.add('d-none');
        console.log('🚫 Hiding Total Sales element');
    });
    
    // Hide Total Revenue elements
    const totalRevenueElements = document.querySelectorAll(`
        #total-revenue,
        .total-revenue,
        [data-widget="total-revenue"],
        [data-metric="revenue"],
        .revenue-widget
    `);
    
    totalRevenueElements.forEach(element => {
        element.style.display = 'none';
        element.classList.add('d-none');
        console.log('🚫 Hiding Total Revenue element');
    });
    
    // Hide Quick Sale buttons
    const quickSaleButtons = document.querySelectorAll(`
        #quick-sale-btn,
        .quick-sale-btn,
        [data-action="quick-sale"],
        .btn[onclick*="quickSale"],
        .btn[onclick*="createSale"]
    `);
    
    quickSaleButtons.forEach(button => {
        button.style.display = 'none';
        button.classList.add('d-none');
        console.log('🚫 Hiding Quick Sale button');
    });
    
    // Hide Financial Summary sections
    const financialSections = document.querySelectorAll(`
        #financial-summary,
        .financial-summary-card,
        [data-section="financial"],
        .finance-section,
        .revenue-section
    `);
    
    financialSections.forEach(section => {
        section.style.display = 'none';
        section.classList.add('d-none');
        console.log('🚫 Hiding Financial Summary section');
    });
    
    // Hide Performance Analytics charts
    const analyticsCharts = document.querySelectorAll(`
        #performance-analytics,
        .Performance-analytics-card,
        [data-chart="performance"],
        .analytics-chart,
        .sales-chart,
        .revenue-chart,
        .chart-container
    `);
    
    analyticsCharts.forEach(chart => {
        chart.style.display = 'none';
        chart.classList.add('d-none');
        console.log('🚫 Hiding Performance Analytics chart');
    });
    
    // Hide any elements containing sales/revenue text
    const salesTextElements = document.querySelectorAll(`
        .card, .widget, .metric, .stat
    `);
    
    salesTextElements.forEach(element => {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('sales') || text.includes('revenue') || text.includes('profit')) {
            // Check if it's inventory-related (keep those)
            if (!text.includes('inventory') && !text.includes('stock') && !text.includes('purchase')) {
                element.style.display = 'none';
                element.classList.add('d-none');
                console.log('🚫 Hiding sales-related element:', text.substring(0, 50));
            }
        }
    });
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

// Monitor and reapply permissions when DOM changes
function setupPermissionMonitor() {
    // Reapply permissions when new content is loaded
    const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReapply = true;
            }
        });
        
        if (shouldReapply) {
            setTimeout(() => {
                applyRoleBasedAccess();
            }, 100);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also reapply on route changes
    window.addEventListener('hashchange', applyRoleBasedAccess);
    window.addEventListener('popstate', applyRoleBasedAccess);
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 Initializing app with page persistence...');
    
    // Load saved state first
    const savedState = loadAppState();
    
    // Wait for user data to load
    setTimeout(() => {
        applyRoleBasedAccess();
        setupPermissionMonitor();
        
        // Setup navigation after permissions are applied
        setupNavigation();
        
        // Save state periodically
        setInterval(saveAppState, 30000); // Every 30 seconds
        
    }, 500);
});

// Also apply when user changes business - but don't reset page
function onBusinessChange() {
    setTimeout(() => {
        applyRoleBasedAccess();
        // Don't change the current page, just update permissions
        const currentPage = sessionStorage.getItem('currentPage') || 'overview';
        showDashboardPage(currentPage);
    }, 300);
}

console.log('✅ Enhanced staff management functions loaded successfully');

// Debug permission system
function debugPermissions() {
    console.group('🔐 Permission Debug Information');
    console.log('👤 Current User:', currentUser);
    console.log('🎯 User Role:', currentUser?.role);
    console.log('🏢 Current Business:', currentBusiness);
    console.log('🔑 Is Business Owner:', currentBusiness?.owner_id === currentUser?.id);
    
    // Test common permissions
    const testPermissions = [
        ['staff', 'create'],
        ['products', 'create'],
        ['sales', 'create'],
        ['reports', 'view'],
        ['settings', 'view']
    ];
    
    testPermissions.forEach(([resource, action]) => {
        console.log(`🔐 ${resource}.${action}:`, hasPermission(resource, action));
    });
    
    console.groupEnd();
}

// Check what pages are accessible
function listAccessiblePages() {
    const pages = ['overview', 'sales', 'inventory', 'customers', 'staff', 'reports', 'settings', 'purchases', 'expenses'];
    
    console.group('📄 Accessible Pages');
    pages.forEach(page => {
        console.log(`${page}: ${canAccessPage(page) ? '✅' : '❌'}`);
    });
    console.groupEnd();
}

// Make debugging functions available globally
window.debugPermissions = debugPermissions;
window.listAccessiblePages = listAccessiblePages;

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