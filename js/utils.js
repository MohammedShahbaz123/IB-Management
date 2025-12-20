// Just check if supabase is initialized
if (!window.supabase || !window.supabase.__initialized) {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase.__initialized = true;
}

// Use window.supabase or create a local reference WITHOUT const
var supabase = window.supabase;

// Add these constants at the top of your file if not already present
const STATE_KEYS = {
    ACTIVE_DASHBOARD_PAGE: 'activeDashboardPage',
    USER_BUSINESSES: 'userBusinesses',
    ACTIVE_BUSINESS: 'activeBusiness'
};

// Global variables
let currentUser = null;
let currentEmail = '';
let countdownInterval = null;
let isNewUser = false;
let userBusinesses = [];
let isDashboardInitializing = false;
let pendingDashboardShow = false;
let authStateChangeHandled = false;
let appInitialized = false;
let initialLoadComplete = false;

// Business configuration with defaults
const BUSINESS_CONFIG = {
    currency: 'INR',
    taxRate: 18,
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    invoicePrefix: 'INV',
    purchasePrefix: 'PO'
};

// Enhanced current business object
let currentBusiness = {
    ...BUSINESS_CONFIG,
    id: null,
    name: '',
    settings: {}
};

// Enhanced data structures
let businessData = {
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    expenses: []
};

// User roles storage
let userRoles = {};

// DOM Elements
const landingPage = document.getElementById('landing-page');
const authPages = document.getElementById('auth-pages');
const dashboard = document.getElementById('dashboard');

// Business-aware utility functions
function getBusinessFilter() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business found for filtering');
        return {};
    }
    return { business_id: currentBusiness.id };
}

function getUserFilter() {
    if (!currentUser) {
        console.warn('⚠️ No current user found for filtering');
        return {};
    }
    return { owner_id: currentUser.id };
}

// Security check function
function validateUserAccess(resourceOwnerId) {
    if (!currentUser) {
        throw new Error('User not authenticated');
    }
    if (resourceOwnerId !== currentUser.id) {
        throw new Error('Access denied: User does not have permission to access this resource');
    }
    return true;
}

// Business-aware notification system
function showNotification(title, message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <strong>${title}</strong>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-body">${message}</div>
    `;
    
    // Add business context if available
    if (currentBusiness) {
        notification.setAttribute('data-business', currentBusiness.id);
    }
    
    // Add to notification container
    const container = document.getElementById('notification-container') || createNotificationContainer();
    container.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    return notification;
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

// State persistence functions
function saveAppState() {
    const state = {
        currentPage: currentPage,
        currentBusiness: currentBusiness?.id,
        userBusinesses: userBusinesses.map(b => b.id),
        lastUpdate: new Date().toISOString()
    };
    
    sessionStorage.setItem('appState', JSON.stringify(state));
    console.log('💾 App state saved:', state);
}

function loadAppState() {
    try {
        const state = JSON.parse(sessionStorage.getItem('appState') || '{}');
        
        if (state.currentPage && Date.now() - new Date(state.lastUpdate).getTime() < 300000) { // 5 minutes
            console.log('📋 Loaded app state:', state);
            return state;
        }
    } catch (error) {
        console.error('❌ Error loading app state:', error);
    }
    
    return null;
}

function clearAppState() {
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('currentPage');
}

// Enhanced safeShow/safeHide with state tracking
function safeShow(element) {
    if (element) {
        element.classList.remove('d-none');
        element.style.display = 'block';
        
        // Track which sections are visible
        if (element.id === 'dashboard') {
            sessionStorage.setItem('activeSection', 'dashboard');
        }
        
        console.log('👀 Showing element:', element.id);
    }
}

function safeHide(element) {
    if (element) {
        element.classList.add('d-none');
        element.style.display = 'none';
        console.log('🙈 Hiding element:', element.id);
    }
}

function autoFocusFirstInput(containerId) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container) {
            const firstInput = container.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }, 300);
}

function setLoadingState(textElement, loadingElement, button, isLoading) {
    if (textElement && loadingElement && button) {
        if (isLoading) {
            textElement.classList.add('d-none');
            loadingElement.classList.remove('d-none');
            button.disabled = true;
        } else {
            textElement.classList.remove('d-none');
            loadingElement.classList.add('d-none');
            button.disabled = false;
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function waitForDOMReady() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
            setTimeout(resolve, 500);
        }
    });
}

function formatCurrency(amount, currency = null) {
    if (!amount || isNaN(amount)) amount = 0;
    
    // Use provided currency, or current business currency, or default to INR
    const targetCurrency = currency || (currentBusiness?.currency) || 'INR';
    
    console.log('💰 Formatting:', {
        amount,
        targetCurrency,
        businessCurrency: currentBusiness?.currency
    });
    
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: targetCurrency
        }).format(amount);
    } catch (error) {
        console.error('❌ Currency formatting error:', error);
        // Fallback to simple formatting
        const symbols = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
        const symbol = symbols[targetCurrency] || '₹';
        return `${symbol}${amount.toFixed(2)}`;
    }
}

function getPeriodStart(period) {
    const now = new Date();
    switch (period) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        case 'week':
            return new Date(now.setDate(now.getDate() - 7)).toISOString();
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        case 'quarter':
            return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
        case 'year':
            return new Date(now.getFullYear(), 0, 1).toISOString();
        default:
            return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
}

function getPeriodEnd(period) {
    return new Date().toISOString();
}

function startResendTimer() {
    let timeLeft = 60;
    const resendTimer = document.getElementById('resend-timer');
    const countdownElement = document.getElementById('countdown');
    const resendOtpBtn = document.getElementById('resend-otp');
    
    if (!resendTimer || !countdownElement || !resendOtpBtn) return;
    
    resendTimer.classList.remove('d-none');
    resendOtpBtn.style.display = 'none';
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            resendTimer.classList.add('d-none');
            resendOtpBtn.style.display = 'inline';
        }
    }, 1000);
}

function clearAuthForms() {
    const signupEmail = document.getElementById('signup-email');
    const businessName = document.getElementById('business-name');
    const loginEmail = document.getElementById('login-email');
    const otpCode = document.getElementById('otp-code');
    const fullName = document.getElementById('full-name');
    const phone = document.getElementById('phone');
    const businessType = document.getElementById('business-type');
    
    if (signupEmail) signupEmail.value = '';
    if (businessName) businessName.value = '';
    if (loginEmail) loginEmail.value = '';
    if (otpCode) otpCode.value = '';
    if (fullName) fullName.value = '';
    if (phone) phone.value = '';
    if (businessType) businessType.value = '';
    
    const resendTimer = document.getElementById('resend-timer');
    const resendOtpBtn = document.getElementById('resend-otp');
    if (resendTimer) resendTimer.classList.add('d-none');
    if (resendOtpBtn) resendOtpBtn.style.display = 'inline';
}

// Business-aware data loading
async function loadBusinessFinancialSummary() {
    if (!currentBusiness?.id) return;
    
    try {
        const cached = loadBusinessData('financial_summary');
        if (cached) {
            console.log('📊 Using cached financial data for business:', currentBusiness.name);
            return cached;
        }
        
        await verifyBusinessAccess(currentBusiness.id);
        
        const { data: financialData, error } = await supabase
            .from('sales')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        if (error) throw error;
        
        const summary = processFinancialData(financialData);
        saveBusinessData('financial_summary', summary);
        
        return summary;
        
    } catch (error) {
        console.error('❌ Financial data load failed for business:', currentBusiness.name, error);
        throw error;
    }
}

function processFinancialData(salesData) {
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalSales = salesData.length;
    const pendingSales = salesData.filter(sale => sale.status === 'pending').length;
    const completedSales = salesData.filter(sale => sale.status === 'completed').length;
    
    return {
        totalRevenue,
        totalSales,
        pendingSales,
        completedSales,
        avgSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0
    };
}

async function loadInventorySummary() {
    if (!currentBusiness?.id) return;
    
    try {
        const cached = loadBusinessData('inventory_summary');
        if (cached) {
            console.log('📦 Using cached inventory summary for business:', currentBusiness.name);
            updateInventoryUI(cached);
            return;
        }
        
        const products = await getBusinessData('products', {
            cacheKey: 'inventory_summary'
        });
        
        const summary = {
            totalProducts: products.length,
            totalStockValue: products.reduce((sum, product) => sum + ((product.current_stock || 0) * (product.cost_price || 0)), 0),
            outOfStockCount: products.filter(p => (p.current_stock || 0) === 0).length,
            lowStockCount: products.filter(p => (p.current_stock || 0) > 0 && (p.current_stock || 0) <= (p.reorder_level || 5)).length
        };
        
        updateInventoryUI(summary);
        
    } catch (error) {
        console.error('❌ Inventory summary error:', error);
    }
}

function updateInventoryUI(summary) {
    const productsElement = document.getElementById('total-products');
    const valueElement = document.getElementById('total-stock-value');
    const outOfStockElement = document.getElementById('out-of-stock-count');
    const lowStockElement = document.getElementById('low-stock-count');
    
    if (productsElement) productsElement.textContent = summary.totalProducts;
    if (valueElement) valueElement.textContent = formatCurrency(summary.totalStockValue);
    if (outOfStockElement) outOfStockElement.textContent = summary.outOfStockCount;
    if (lowStockElement) lowStockElement.textContent = summary.lowStockCount;
}

async function loadSalesAnalytics() {
    console.log('📈 Loading sales analytics for business:', currentBusiness?.name);
    // Implementation for sales analytics
}

// Enhanced updateDashboardMetrics
function updateDashboardMetrics() {
    const businessNameElement = document.getElementById('current-business-name');
    if (businessNameElement && currentBusiness) {
        businessNameElement.textContent = currentBusiness.name;
    }
    
    // Update any other business-specific UI elements
    const businessElements = document.querySelectorAll('[data-business-name]');
    businessElements.forEach(element => {
        if (currentBusiness) {
            element.textContent = currentBusiness.name;
        }
    });
    
    console.log('✅ Dashboard metrics updated for business:', currentBusiness?.name);
}

// Debug function
window.debugAuth = function() {
    console.log('=== DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('Current Email:', currentEmail);
    console.log('Current Business:', currentBusiness);
    console.log('User Businesses:', userBusinesses.length);
    console.log('Landing Visible:', !landingPage.classList.contains('d-none'));
    console.log('Auth Visible:', !authPages.classList.contains('d-none'));
    console.log('Dashboard Visible:', !dashboard.classList.contains('d-none'));
    console.log('==================');
};

// Permission checking for page access
function canAccessPage(page) {
    const pagePermissions = {
        overview: ['view'],
        sales: ['view'],
        inventory: ['view'],
        customers: ['view'],
        staff: ['view'],
        reports: ['view'],
        settings: ['view']
    };
    
    const requiredPermission = pagePermissions[page];
    if (!requiredPermission) return true; // No specific permission required
    
    return hasPermission(page, requiredPermission[0]);
}

// Utility function for formatting dates
function formatDate(dateString) {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

// Add these to your utils.js if they don't exist
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

// Make functions globally available
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.isValidEmail = isValidEmail;

// Enhanced business intelligence loading
async function loadBusinessIntelligence() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for intelligence loading');
        return;
    }
    
    try {
        // Verify user has access to this business
        await verifyBusinessAccess(currentBusiness.id);
        
        await Promise.all([
            loadFinancialSummary(),
            loadInventorySummary(),
            loadSalesAnalytics(),
            loadBusinessAlerts()
        ]);
        updateDashboardMetrics();
        
        console.log('✅ Business intelligence loaded for:', currentBusiness.name);
    } catch (error) {
        console.error('❌ Business intelligence load failed:', error);
    }
}


