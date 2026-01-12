// shortcuts.js - Comprehensive Keyboard Shortcuts System (Updated with Alt key combos)
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        this.modalOpen = false;
        this.inputFocused = false;
        this.helpVisible = false;
        
        this.init();
    }
    
    init() {
        console.log('⌨️ Initializing keyboard shortcuts system...');
        
        // Add global event listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Register default shortcuts
        this.registerDefaultShortcuts();
        
        // Create help modal
        this.createHelpModal();
        
        console.log('✅ Keyboard shortcuts system ready');
    }
    
    registerDefaultShortcuts() {
        // Global shortcuts using Alt key
        this.register('Alt+/', 'Focus search bar', () => this.focusSearch());
        this.register('Alt+s', 'Create new sale (anywhere)', () => this.createNewSale());
        this.register('Alt+p', 'Create new purchase (anywhere)', () => this.createNewPurchase());
        this.register('Alt+i', 'Create new inventory item (anywhere)', () => this.createNewInventoryItem());
        this.register('Alt+c', 'Create new party (anywhere)', () => this.createNewParty());
        this.register('Alt+d', 'Go to dashboard', () => this.navigateTo('overview'));
        this.register('Alt+e', 'Export current data', () => this.exportCurrentData());
        this.register('Alt+r', 'Refresh current page', () => this.refreshCurrentPage());
        this.register('Alt+t', 'Scroll to top', () => {
    if (window.scrollToTop) {
        window.scrollToTop.scrollToTop();
    } else {
        // Fallback
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
});
        
        // Form actions
        this.register('Alt+Enter', 'Save current form/invoice', (e) => {
            e.preventDefault();
            this.saveCurrentForm();
        });
        
        // Navigation
        this.register('Escape', 'Close modal/cancel', () => this.closeModal());
        this.register('F1', 'Show shortcuts help', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        
        // Quick page navigation with Alt + first letter
        this.register('Alt+1', 'Go to Inventory', () => this.navigateTo('inventory'));
        this.register('Alt+2', 'Go to Parties', () => this.navigateTo('parties'));
        this.register('Alt+3', 'Go to Sales', () => this.navigateTo('sales'));
        this.register('Alt+4', 'Go to Purchases', () => this.navigateTo('purchases'));
        this.register('Alt+5', 'Go to Expenses', () => this.navigateTo('expenses'));
        this.register('Alt+6', 'Go to Reports', () => this.navigateTo('reports'));
        this.register('Alt+7', 'Go to Business', () => this.navigateTo('businesses'));
        this.register('Alt+8', 'Go to Staff', () => this.navigateTo('staff'));
        this.register('Alt+9', 'Go to Settings', () => this.navigateTo('settings'));
        
        // Page-specific shortcuts
        this.register('Alt+f', 'Focus search (context-aware)', () => this.focusContextSearch());
        this.register('Alt+x', 'Export (context-aware)', () => this.exportCurrentData());
        this.register('Alt+a', 'Add new (context-aware)', () => this.contextAddNew());
        
        // Sales invoice specific shortcuts
        this.register('Alt+n', 'Add new item to invoice', () => this.addItemToInvoice());
        this.register('Alt+delete', 'Clear invoice', () => this.clearInvoice());
    }
    
    register(key, description, callback) {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, { callback, description });
    }
    
    normalizeKey(key) {
        return key.toLowerCase()
            .replace('control', this.isMac ? 'meta' : 'control')
            .replace('cmd', 'meta')
            .replace('command', 'meta')
            .replace('opt', 'alt')
            .replace('option', 'alt')
            .replace('delete', 'delete');
    }
    
    handleKeyDown(event) {
        // Don't trigger shortcuts if user is typing in an input/textarea
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' ||
            event.target.tagName === 'SELECT' ||
            event.target.isContentEditable) {
            
            // Special handling for Enter key in forms
            if (event.key === 'Enter' && event.altKey) {
                // Allow Alt+Enter to save forms even in inputs
                event.preventDefault();
                this.saveCurrentForm();
                return;
            }
            
            // Allow Alt shortcuts even in inputs (except for certain keys)
            if (!event.altKey || event.key === 'Tab') {
                return;
            }
        }
        
        // Check for modal open
        const modalOpen = document.querySelector('.modal:not(.d-none)');
        if (modalOpen && event.key === 'Escape') {
            this.closeModal();
            return;
        }
        
        // Build key combination
        const keys = [];
        if (event.ctrlKey) keys.push('control');
        if (event.metaKey) keys.push('meta');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');
        
        // Don't include modifier-only keys
        if (!['Control', 'Meta', 'Alt', 'Shift', 'CapsLock'].includes(event.key)) {
            keys.push(event.key.toLowerCase());
        }
        
        const keyCombination = keys.join('+');
        
        // Special handling for Enter key
        if (event.key === 'Enter') {
            if (event.altKey) {
                event.preventDefault();
                this.saveCurrentForm();
                return;
            }
        }
        
        // Check for exact match
        if (this.shortcuts.has(keyCombination)) {
            event.preventDefault();
            const shortcut = this.shortcuts.get(keyCombination);
            console.log(`⌨️ Executing shortcut: ${keyCombination} - ${shortcut.description}`);
            shortcut.callback(event);
            return;
        }
    }
    
    // Action Methods
    focusSearch() {
        const searchInput = document.querySelector('#inventory-search, #party-search, #staff-search, #sales-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    createNewSale() {
        console.log('🛒 Creating new sale from anywhere...');
        
        // First, navigate to sales page if not already there
        const currentPage = this.getCurrentPage();
        if (currentPage !== 'sales') {
            this.navigateTo('sales');
            
            // Wait a moment for page to load, then trigger new sale
            setTimeout(() => {
                if (salesManagement) {
                    salesManagement.showCreateInvoice();
                } else {
                    // Fallback: click the new sale button
                    const saleBtn = document.querySelector('#create-sale-btn, [onclick*="showCreateInvoice"], [onclick*="createNewSale"]');
                    if (saleBtn) saleBtn.click();
                }
            }, 500);
        } else {
            // Already on sales page
            if (salesManagement) {
                salesManagement.showCreateInvoice();
            }
        }
    }
    
    saveCurrentForm() {
        console.log('💾 Attempting to save current form...');
        
        // Check if we're on sales invoice page
        const onInvoicePage = document.getElementById('sales-invoice-page') && 
                              !document.getElementById('sales-invoice-page').classList.contains('d-none');
        
        if (onInvoicePage) {
            // Save sales invoice
            console.log('💾 Saving sales invoice...');
            this.saveSalesInvoice();
            return;
        }
        
        // Check if any modal is open
        const modal = document.querySelector('.modal:not(.d-none)');
        if (modal) {
            console.log('💾 Saving modal form...');
            this.saveModalForm(modal);
            return;
        }
        
        // Check for any visible form
        const visibleForm = document.querySelector('form:not([style*="display: none"]):not(.d-none)');
        if (visibleForm) {
            console.log('💾 Saving visible form...');
            this.submitForm(visibleForm);
            return;
        }
        
        console.log('⚠️ No form found to save');
    }
    
    saveSalesInvoice() {
        // Try to find the save invoice button
        const saveBtn = document.getElementById('save-invoice-btn');
        if (saveBtn && !saveBtn.disabled) {
            console.log('✅ Found save invoice button, clicking...');
            saveBtn.click();
        } else if (salesManagement && typeof salesManagement.saveInvoice === 'function') {
            console.log('✅ Using salesManagement.saveInvoice()');
            salesManagement.saveInvoice();
        } else {
            console.log('❌ Could not find save invoice method');
        }
    }
    
    saveModalForm(modal) {
        const form = modal.querySelector('form');
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                console.log('✅ Found submit button in modal, clicking...');
                submitButton.click();
            } else {
                // Try to trigger submit event
                console.log('✅ Triggering form submit event...');
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
            }
        } else {
            console.log('❌ No form found in modal');
        }
    }
    
    submitForm(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.disabled) {
            console.log('✅ Clicking submit button...');
            submitButton.click();
        } else {
            // Try to submit the form programmatically
            console.log('✅ Submitting form programmatically...');
            if (typeof form.submit === 'function') {
                form.submit();
            } else {
                console.log('❌ Form cannot be submitted');
            }
        }
    }
    
    addItemToInvoice() {
        // Check if we're on sales invoice page
        const onInvoicePage = document.getElementById('sales-invoice-page') && 
                              !document.getElementById('sales-invoice-page').classList.contains('d-none');
        
        if (onInvoicePage) {
            const addItemBtn = document.getElementById('add-item-btn');
            if (addItemBtn && !addItemBtn.disabled) {
                console.log('➕ Adding item to invoice...');
                addItemBtn.click();
            } else if (salesManagement && typeof salesManagement.addItemToInvoice === 'function') {
                salesManagement.addItemToInvoice();
            }
        }
    }
    
    clearInvoice() {
        // Check if we're on sales invoice page
        const onInvoicePage = document.getElementById('sales-invoice-page') && 
                              !document.getElementById('sales-invoice-page').classList.contains('d-none');
        
        if (onInvoicePage) {
            const clearBtn = document.getElementById('clear-invoice-btn');
            if (clearBtn) {
                if (confirm('Are you sure you want to clear the invoice?')) {
                    console.log('🗑️ Clearing invoice...');
                    clearBtn.click();
                }
            } else if (salesManagement && typeof salesManagement.clearInvoice === 'function') {
                if (confirm('Are you sure you want to clear the invoice?')) {
                    salesManagement.clearInvoice();
                }
            }
        }
    }
    
    createNewPurchase() {
        console.log('📦 Creating new purchase from anywhere...');
        
        // Navigate to purchases page
        this.navigateTo('purchases');
        
        // Note: You'll need to implement purchase creation in purchases.js
        setTimeout(() => {
            const purchaseBtn = document.querySelector('#create-purchase-btn, [onclick*="createPurchase"], [onclick*="newPurchase"]');
            if (purchaseBtn) {
                purchaseBtn.click();
            }
        }, 500);
    }
    
    createNewInventoryItem() {
        console.log('📦 Creating new inventory item from anywhere...');
        
        // First, navigate to inventory page if not already there
        const currentPage = this.getCurrentPage();
        if (currentPage !== 'inventory') {
            this.navigateTo('inventory');
            
            // Wait a moment for page to load, then trigger new product
            setTimeout(() => {
                showAddProductModal();
            }, 500);
        } else {
            // Already on inventory page
            showAddProductModal();
        }
    }
    
    createNewParty() {
        console.log('👥 Creating new party from anywhere...');
        
        // First, navigate to parties page if not already there
        const currentPage = this.getCurrentPage();
        if (currentPage !== 'parties') {
            this.navigateTo('parties');
            
            // Wait a moment for page to load, then trigger new party
            setTimeout(() => {
                showAddPartyModal();
            }, 500);
        } else {
            // Already on parties page
            showAddPartyModal();
        }
    }
    
    closeModal() {
        const modal = document.querySelector('.modal:not(.d-none)');
        if (modal) {
            const closeButton = modal.querySelector('.close-btn, .btn-outline, [onclick*="hide"], [onclick*="close"]');
            if (closeButton) {
                closeButton.click();
            } else {
                modal.classList.add('d-none');
            }
        }
    }
    
    showHelp() {
        const helpModal = document.getElementById('keyboard-help-modal');
        if (helpModal) {
            helpModal.classList.remove('d-none');
            this.helpVisible = true;
        }
    }
    
    navigateTo(page) {
        const sidebarLink = document.querySelector(`.sidebar-menu a[data-page="${page}"]`);
        if (sidebarLink) {
            sidebarLink.click();
        }
    }
    
    getPageName(page) {
        const pageNames = {
            'overview': 'Dashboard',
            'inventory': 'Inventory',
            'parties': 'Parties',
            'sales': 'Sales',
            'purchases': 'Purchases',
            'expenses': 'Expenses',
            'reports': 'Reports',
            'businesses': 'Business Management',
            'staff': 'Staff Management',
            'settings': 'Settings'
        };
        
        // If page is a number, get by index
        if (!isNaN(page)) {
            const pages = Object.keys(pageNames);
            return pageNames[pages[page]] || `Page ${page}`;
        }
        
        return pageNames[page] || page;
    }
    
    getCurrentPage() {
        const activePage = document.querySelector('.page-content:not(.d-none)');
        if (activePage) {
            return activePage.id.replace('-page', '');
        }
        return 'overview';
    }
    
    focusContextSearch() {
        const currentPage = this.getCurrentPage();
        let searchInput;
        
        switch(currentPage) {
            case 'inventory':
                searchInput = document.getElementById('inventory-search');
                break;
            case 'parties':
                searchInput = document.getElementById('party-search');
                break;
            case 'sales':
                searchInput = document.querySelector('#sales-search, [placeholder*="Search sales"]');
                break;
            case 'staff':
                searchInput = document.getElementById('staff-search');
                break;
            default:
                searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
        }
        
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    exportCurrentData() {
        const currentPage = this.getCurrentPage();
        
        switch(currentPage) {
            case 'inventory':
                exportData('inventory');
                break;
            case 'parties':
                exportParties();
                break;
            case 'sales':
                const exportBtn = document.getElementById('export-sales-btn');
                if (exportBtn) {
                    exportBtn.click();
                }
                break;
            default:
                // Try to find any export button
                const exportButton = document.querySelector('[onclick*="export"], [onclick*="Export"]');
                if (exportButton) {
                    exportButton.click();
                }
        }
    }
    
    refreshCurrentPage() {
        const currentPage = this.getCurrentPage();
        
        switch(currentPage) {
            case 'inventory':
                refreshInventory();
                break;
            case 'parties':
                loadParties();
                break;
            case 'sales':
                if (salesManagement) {
                    salesManagement.loadSalesData();
                }
                break;
            default:
                // Try to find any refresh button
                const refreshBtn = document.querySelector('[onclick*="refresh"], [onclick*="Refresh"], [onclick*="load"]');
                if (refreshBtn) {
                    refreshBtn.click();
                }
        }
    }
    
    contextAddNew() {
        const currentPage = this.getCurrentPage();
        
        switch(currentPage) {
            case 'inventory':
                showAddProductModal();
                break;
            case 'parties':
                showAddPartyModal();
                break;
            case 'sales':
                if (salesManagement) {
                    salesManagement.showCreateInvoice();
                }
                break;
            case 'staff':
                showAddStaffModal();
                break;
            case 'businesses':
                showCreateBusinessModal();
                break;
            default:
                // Try to find any "Add" or "New" button
                const addButton = document.querySelector('.btn-primary:not(.btn-outline), [onclick*="add"], [onclick*="new"], [onclick*="create"]');
                if (addButton) {
                    addButton.click();
                }
        }
    }
    
    showShortcutFeedback(message) {
        // Create or update feedback element
        let feedback = document.getElementById('shortcut-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'shortcut-feedback';
        }
        
        feedback.textContent = `⌨️ ${message}`;
        feedback.style.opacity = '1';
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-10px)';
        }, 2000);
    }
    
    createHelpModal() {
        if (document.getElementById('keyboard-help-modal')) return;
        
        const modalHTML = `
            <div id="keyboard-help-modal" class="modal d-none">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                        <button class="close-btn" onclick="keyboardShortcuts.hideHelp()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="shortcuts-grid">
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-bolt"></i> Quick Actions (Anywhere)</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + S</span>
                                        <span class="shortcut-description">Create New Sale</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + P</span>
                                        <span class="shortcut-description">Create New Purchase</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + I</span>
                                        <span class="shortcut-description">Create New Inventory Item</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + C</span>
                                        <span class="shortcut-description">Create New Party</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + A</span>
                                        <span class="shortcut-description">Add New (Context-aware)</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + F</span>
                                        <span class="shortcut-description">Focus Search</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + E</span>
                                        <span class="shortcut-description">Export Current Data</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + R</span>
                                        <span class="shortcut-description">Refresh Current Page</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-file-invoice-dollar"></i> Sales Invoice Shortcuts</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + Enter</span>
                                        <span class="shortcut-description">Save Invoice</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + N</span>
                                        <span class="shortcut-description">Add Item to Invoice</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + Delete</span>
                                        <span class="shortcut-description">Clear Invoice</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-compass"></i> Quick Navigation</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + 1</span>
                                        <span class="shortcut-description">Go to Inventory</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + 2</span>
                                        <span class="shortcut-description">Go to Parties</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + 3</span>
                                        <span class="shortcut-description">Go to Sales</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + 4</span>
                                        <span class="shortcut-description">Go to Purchases</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Alt + 5</span>
                                        <span class="shortcut-description">Go to Expenses</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-globe"></i> Global Shortcuts</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Esc</span>
                                        <span class="shortcut-description">Close Modal/Cancel</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">F1</span>
                                        <span class="shortcut-description">Show This Help</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="shortcuts-footer">
                            <p><i class="fas fa-info-circle"></i> <strong>Tip:</strong> Most shortcuts use the <kbd>Alt</kbd> key to avoid browser conflicts.</p>
                            <p><small>Press <kbd>Esc</kbd> to close this help dialog.</small></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .shortcuts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .shortcuts-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                border: 1px solid #e9ecef;
            }
            
            .shortcuts-section h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #495057;
                font-size: 16px;
                border-bottom: 2px solid #dee2e6;
                padding-bottom: 8px;
            }
            
            .shortcuts-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #dee2e6;
                transition: all 0.2s;
            }
            
            .shortcut-item:hover {
                background: #f8f9fa;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .shortcut-key {
                background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: bold;
                min-width: 80px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .shortcut-description {
                flex: 1;
                margin-left: 15px;
                color: #495057;
                font-size: 14px;
            }
            
            .shortcuts-footer {
                margin-top: 20px;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 8px;
            }
            
            .shortcuts-footer p {
                margin: 5px 0;
            }
            
            .shortcuts-footer kbd {
                background-color: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
            }
            
            kbd {
                background-color: #f8f9fa;
                border: 1px solid #ced4da;
                border-radius: 3px;
                box-shadow: 0 1px 1px rgba(0,0,0,.2);
                color: #495057;
                display: inline-block;
                font-family: monospace;
                font-size: 11px;
                line-height: 1;
                padding: 2px 5px;
                margin: 0 2px;
            }
        `;
        document.head.appendChild(style);
    }
    
    hideHelp() {
        const helpModal = document.getElementById('keyboard-help-modal');
        if (helpModal) {
            helpModal.classList.add('d-none');
            this.helpVisible = false;
        }
    }
    
    // Public API
    showCheatSheet() {
        console.log('📋 Available shortcuts:');
        this.shortcuts.forEach((shortcut, key) => {
            console.log(`  ${key}: ${shortcut.description}`);
        });
    }
}

// Initialize global keyboard shortcuts
let keyboardShortcuts = null;

function initializeKeyboardShortcuts() {
    if (!keyboardShortcuts) {
        keyboardShortcuts = new KeyboardShortcuts();
        window.keyboardShortcuts = keyboardShortcuts;
    }
}

// Add to utils.js for backward compatibility
window.showKeyboardHelp = function() {
    if (keyboardShortcuts) {
        keyboardShortcuts.showHelp();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeKeyboardShortcuts();
        
        // Add cheat sheet button
        const cheatSheetBtn = document.createElement('button');
        cheatSheetBtn.className = 'cheat-sheet-btn';
        cheatSheetBtn.innerHTML = '<i class="fas fa-keyboard"></i>';
        cheatSheetBtn.title = 'Keyboard Shortcuts (F1)';
        cheatSheetBtn.onclick = () => keyboardShortcuts.showHelp();
        
        // Add styles for cheat sheet button
        const style = document.createElement('style');
        style.textContent = `
            .cheat-sheet-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                font-size: 15px;
            }
            
            .cheat-sheet-btn:hover {
                transform: scale(1.1) rotate(5deg);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .cheat-sheet-btn:active {
                transform: scale(0.95);
            }
            
            /* Shortcut indicators on buttons */
            .btn-with-shortcut {
                position: relative;
                padding-right: 50px !important;
            }
            
            .btn-shortcut {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.1);
                color: #6c757d;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                pointer-events: none;
                border: 1px solid #dee2e6;
                font-family: 'Courier New', monospace;
            }
            
            .btn-primary .btn-shortcut {
                background: rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.9);
                border: 1px solid rgba(255,255,255,0.3);
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(cheatSheetBtn);
        
    }, 1000); // Wait for other systems to initialize
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KeyboardShortcuts };
}