// shortcuts.js - Comprehensive Keyboard Shortcuts System
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
        // Global shortcuts
        this.register('Control+/', 'Focus search bar', () => this.focusSearch());
        this.register('Control+n', 'New item (context-aware)', () => this.createNewItem());
        this.register('Control+s', 'Save current form', (e) => {
            e.preventDefault();
            this.saveCurrentForm();
        });
        this.register('Escape', 'Close modal/cancel', () => this.closeModal());
        this.register('F1', 'Show shortcuts help', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        this.register('Control+d', 'Go to dashboard', () => this.navigateTo('overview'));
        this.register('Control+i', 'Go to inventory', () => this.navigateTo('inventory'));
        this.register('Control+p', 'Go to parties', () => this.navigateTo('parties'));
        this.register('Control+Shift+s', 'Go to sales', () => this.navigateTo('sales'));
        
        // Dashboard page number shortcuts
        for (let i = 0; i <= 9; i++) {
            this.register(`${i}`, `Go to page ${this.getPageName(i)}`, () => this.navigateToPage(i));
        }
        
        // Inventory specific
        this.register('Control+f', 'Focus inventory search', () => this.focusInventorySearch());
        this.register('Control+e', 'Open bulk editor', () => this.openBulkEditor());
        this.register('Control+x', 'Export data', () => this.exportData());
        
        // Sales specific
        this.register('Control+Shift+n', 'New sale invoice', () => this.createNewSale());
        this.register('Control+r', 'Refresh sales list', () => this.refreshSales());
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
            .replace('option', 'alt');
    }
    
    handleKeyDown(event) {
        // Don't trigger shortcuts if user is typing in an input/textarea
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' ||
            event.target.tagName === 'SELECT' ||
            event.target.isContentEditable) {
            return;
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
        
        // Check for exact match
        if (this.shortcuts.has(keyCombination)) {
            event.preventDefault();
            const shortcut = this.shortcuts.get(keyCombination);
            console.log(`⌨️ Executing shortcut: ${keyCombination} - ${shortcut.description}`);
            shortcut.callback(event);
            return;
        }
        
        // Check for number keys on dashboard
        if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[0-9]$/.test(event.key)) {
            const pageIndex = parseInt(event.key);
            this.navigateToPage(pageIndex);
        }
    }
    
    // Action Methods
    focusSearch() {
        const searchInput = document.querySelector('#inventory-search, #party-search, #staff-search, #sales-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
            showNotification('Info', 'Search focused. Start typing to search.', 'info', 2000);
        }
    }
    
    createNewItem() {
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
            default:
                // Try to find any "Add" or "New" button
                const addButton = document.querySelector('.btn-primary:not(.btn-outline), [onclick*="add"], [onclick*="new"], [onclick*="create"]');
                if (addButton) {
                    addButton.click();
                }
        }
    }
    
    saveCurrentForm() {
        // Find the currently open modal form
        const modal = document.querySelector('.modal:not(.d-none)');
        if (modal) {
            const form = modal.querySelector('form');
            if (form) {
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                    showNotification('Info', 'Saving form...', 'info', 1000);
                }
            }
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
            showNotification('Info', `Navigated to ${this.getPageName(page)}`, 'info', 1500);
        }
    }
    
    navigateToPage(number) {
        const pages = [
            'overview', 'inventory', 'parties', 'sales', 
            'purchases', 'expenses', 'reports', 'businesses', 
            'staff', 'settings'
        ];
        
        if (number >= 0 && number < pages.length) {
            const page = pages[number];
            this.navigateTo(page);
        } else if (number === 0) {
            this.navigateTo('settings');
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
    
    focusInventorySearch() {
        if (this.getCurrentPage() === 'inventory') {
            const searchInput = document.getElementById('inventory-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }
    
    openBulkEditor() {
        if (this.getCurrentPage() === 'inventory') {
            showBulkEditor();
        }
    }
    
    exportData() {
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
                if (exportBtn) exportBtn.click();
                break;
        }
    }
    
    createNewSale() {
        if (this.getCurrentPage() === 'sales' && salesManagement) {
            salesManagement.showCreateInvoice();
        }
    }
    
    refreshSales() {
        if (this.getCurrentPage() === 'sales' && salesManagement) {
            salesManagement.loadSalesData();
            showNotification('Info', 'Refreshing sales data...', 'info', 1500);
        }
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
                                <h4><i class="fas fa-globe"></i> Global Shortcuts</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + /</span>
                                        <span class="shortcut-description">Focus search bar</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + N</span>
                                        <span class="shortcut-description">Create new item</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + S</span>
                                        <span class="shortcut-description">Save current form</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">Esc</span>
                                        <span class="shortcut-description">Close modal/cancel</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">F1</span>
                                        <span class="shortcut-description">Show this help</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-tachometer-alt"></i> Dashboard Navigation</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + D</span>
                                        <span class="shortcut-description">Go to Dashboard</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + I</span>
                                        <span class="shortcut-description">Go to Inventory</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + P</span>
                                        <span class="shortcut-description">Go to Parties</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + Shift + S</span>
                                        <span class="shortcut-description">Go to Sales</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">0-9</span>
                                        <span class="shortcut-description">Quick page numbers</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-boxes"></i> Inventory Shortcuts</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + F</span>
                                        <span class="shortcut-description">Focus search</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + E</span>
                                        <span class="shortcut-description">Open bulk editor</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + X</span>
                                        <span class="shortcut-description">Export inventory</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="shortcuts-section">
                                <h4><i class="fas fa-shopping-cart"></i> Sales Shortcuts</h4>
                                <div class="shortcuts-list">
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + Shift + N</span>
                                        <span class="shortcut-description">New sale invoice</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <span class="shortcut-key">${this.isMac ? '⌘' : 'Ctrl'} + R</span>
                                        <span class="shortcut-description">Refresh sales list</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="shortcuts-footer">
                            <p><i class="fas fa-info-circle"></i> <strong>Tip:</strong> Shortcuts are context-aware and change based on the current page.</p>
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
            }
            
            .shortcut-key {
                background: #6c757d;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
                min-width: 80px;
                text-align: center;
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
                background: #e7f3ff;
                border-radius: 6px;
                border-left: 4px solid #007bff;
            }
            
            .shortcuts-footer p {
                margin: 5px 0;
                color: #495057;
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
    }, 1000); // Wait for other systems to initialize
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KeyboardShortcuts };
}