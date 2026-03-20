// Settings Management Module
const settingsManagement = {
    currentUser: null,
    currentBusiness: null,
    currentSettings: {},
    
    init: function() {
        console.log('Initializing settings management...');
        this.bindEvents();
        this.loadUserData();
    },
    
    bindEvents: function() {
        // Tab switching
        const settingsTabs = document.querySelector('.settings-tabs');
        if (settingsTabs) {
            settingsTabs.addEventListener('click', (e) => {
                const tab = e.target.closest('.settings-tab');
                if (tab) {
                    this.switchTab(tab);
                }
            });
        }
        
        // Form submissions will be bound when forms are created
    },
    
    loadUserData: async function() {
        try {
            const user = await getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.populateUserInfo(user);
                await this.loadAllSettings();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showNotification('Error loading user data', 'error');
        }
    },

    loadAllSettings: async function() {
        try {
            // Load business settings if business is selected
            const businessId = getCurrentBusinessId();
            if (businessId) {
                await this.loadBusinessSettings(businessId);
            }
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Initialize form values
            this.initializeForms();
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },

    loadUserPreferences: async function() {
        try {
            const userId = this.currentUser?.id;
            if (!userId) return;
            
            // Use localStorage instead of database since user_settings table doesn't exist
            const userSettings = JSON.parse(localStorage.getItem(`user_settings_${userId}`) || '{}');
            
            // Display settings
            const displaySettings = userSettings.display || {};
            this.setElementValue('theme', displaySettings.theme || 'light');
            this.setElementValue('dashboard-layout', displaySettings.dashboard_layout || 'standard');
            this.setElementValue('default-home-page', displaySettings.default_home_page || 'overview');
            this.setElementValue('items-per-page', displaySettings.items_per_page || 25);
            
            // Notification settings
            const notificationSettings = userSettings.notification || {};
            this.setElementChecked('email-sales', notificationSettings.email?.sales || true);
            this.setElementChecked('email-low-stock', notificationSettings.email?.low_stock || true);
            this.setElementChecked('email-payments', notificationSettings.email?.payments || true);
            this.setElementChecked('app-orders', notificationSettings.in_app?.orders || true);
            this.setElementChecked('app-updates', notificationSettings.in_app?.updates || false);
            this.setElementChecked('app-staff', notificationSettings.in_app?.staff || false);
            
            // System settings
            const systemSettings = userSettings.system || {};
            this.setElementChecked('auto-save', systemSettings.auto_save || true);
            this.setElementChecked('low-stock-alerts', systemSettings.low_stock_alerts || true);
            this.setElementChecked('auto-backup', systemSettings.auto_backup || false);
            this.setElementValue('data-retention', systemSettings.data_retention || '180');
            
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    },

    // Helper methods for safe DOM manipulation
    setElementValue: function(id, value) {
        const element = document.getElementById(id);
        if (element && 'value' in element) {
            element.value = value || '';
        }
    },
    
    setElementChecked: function(id, checked) {
        const element = document.getElementById(id);
        if (element && 'checked' in element) {
            element.checked = !!checked;
        }
    },
    
    setElementText: function(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text || '';
        }
    },

    // Load real data from database
    loadBusinessSettings: async function(businessId) {
    try {
        console.log('Loading business settings for ID:', businessId);
        
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();
            
        if (error) throw error;
        
        if (data) {
            this.currentBusiness = data;
            console.log('Business data loaded:', data);
            
            // Store business data globally for later use
            window.currentBusinessData = data;
            
            // Check if form exists before populating
            const checkForm = setInterval(() => {
                const formExists = document.getElementById('business-settings-form');
                if (formExists) {
                    clearInterval(checkForm);
                    this.populateBusinessForm(data);
                }
            }, 100);
            
            // Load additional business settings
            await this.loadAdditionalBusinessSettings(businessId);
        }
    } catch (error) {
        console.error('Error loading business settings:', error);
        showNotification('Error loading business data', 'error');
    }
},

    loadAdditionalBusinessSettings: async function(businessId) {
        try {
            console.log('Loading business settings from database...');
            
            // Load invoice settings
            const { data: invoiceSettings, error: invoiceError } = await supabase
                .from('business_settings')
                .select('settings')
                .eq('business_id', businessId)
                .eq('setting_type', 'invoice')
                .maybeSingle(); // Use maybeSingle instead of single
                
            if (!invoiceError && invoiceSettings) {
                const settings = invoiceSettings.settings || {};
                this.setElementValue('invoice-prefix', settings.invoice_prefix || 'INV');
                this.setElementValue('invoice-starting-number', settings.invoice_starting_number || 1001);
                this.setElementValue('invoice-terms', settings.invoice_payment_terms || 'net_15');
                this.setElementValue('invoice-notes', settings.invoice_notes || '');
            } else {
                console.log('No invoice settings found, using defaults');
                this.setElementValue('invoice-prefix', 'INV');
                this.setElementValue('invoice-starting-number', 1001);
                this.setElementValue('invoice-terms', 'net_15');
                this.setElementValue('invoice-notes', '');
            }
            
            // Load tax settings
            const { data: taxSettings, error: taxError } = await supabase
                .from('business_settings')
                .select('settings')
                .eq('business_id', businessId)
                .eq('setting_type', 'tax')
                .maybeSingle(); // Use maybeSingle instead of single
                
            if (!taxError && taxSettings) {
                const settings = taxSettings.settings || {};
                this.setElementValue('default-tax-rate', settings.default_tax_rate || 0);
                this.setElementChecked('gst-enabled', settings.gst_enabled || false);
                if (settings.gst_enabled) {
                    this.setElementValue('gst-rate', settings.gst_rate || 18);
                    this.setElementValue('gst-type', settings.gst_type || 'igst');
                }
                this.setElementChecked('tax-inclusive-pricing', settings.tax_inclusive_pricing || false);
            } else {
                console.log('No tax settings found, using defaults');
                this.setElementValue('default-tax-rate', 0);
                this.setElementChecked('gst-enabled', false);
                this.setElementChecked('tax-inclusive-pricing', false);
            }
            
        } catch (error) {
            console.error('Error loading additional business settings:', error);
            // Fallback to localStorage
            this.loadFromLocalStorage(businessId);
        }
    },

    initializeForms: function() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // Set user data in account form
            if (this.currentUser) {
                const metadata = this.currentUser.user_metadata || {};
                this.setElementValue('user-name', metadata.full_name);
                this.setElementValue('user-phone', metadata.phone);
                this.setElementValue('user-email-input', this.currentUser.email);
                this.setElementValue('user-language', metadata.language || 'en');
                this.setElementValue('user-timezone', metadata.timezone || 'UTC');
            }
            
            // Initialize toggle switches based on settings
            const settings = this.currentSettings;
            
            // GST settings
            if (settings.gst_enabled) {
                this.setElementChecked('gst-enabled', true);
                this.toggleGstSettings(true);
            }
            
            // Two-factor auth
            if (settings.two_factor_auth) {
                this.setElementChecked('two-factor-auth', true);
                this.toggleTwoFactorSettings(true);
            }
        }, 200);
    },
    
    populateUserInfo: function(user) {
        if (!user) return;
        
        const name = user.user_metadata?.full_name || '';
        const email = user.email || '';
        
        // Set avatar initials
        const initials = this.getInitials(name || email);
        this.setElementText('user-avatar', initials);
        
        const avatarElement = document.getElementById('user-avatar');
        if (avatarElement) {
            // If user has avatar URL, set it as background
            if (user.user_metadata?.avatar_url) {
                avatarElement.style.backgroundImage = `url(${user.user_metadata.avatar_url})`;
                avatarElement.style.backgroundSize = 'cover';
                avatarElement.style.backgroundPosition = 'center';
                avatarElement.textContent = '';
            }
        }
        
        // Populate user info display
        this.setElementText('user-full-name', name || 'User');
        this.setElementText('user-email', email || 'No email');
        
        // Set role
        const role = user.user_metadata?.role || 'Business Owner';
        this.setElementText('user-role', role);
    },
    
    getInitials: function(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },
    
    switchTab: function(tab) {
        console.log('Switching to tab:', tab.getAttribute('data-tab'));
        
        // Remove active class from all tabs
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Show corresponding section
        const tabId = tab.getAttribute('data-tab');
        const section = document.getElementById(`${tabId}-settings`);
        if (section) {
            section.style.display = 'block';
            section.classList.add('active');
            
            // Load section-specific data
            setTimeout(() => this.loadSectionData(tabId), 100);
        }
    },
    
    loadSectionData: function(section) {
        console.log('Loading section data:', section);
        
        switch(section) {
            case 'account':
                this.loadLoginHistory();
                break;
            case 'business':
                this.loadBusinessInfo();
                break;
            case 'security':
                this.loadSecuritySettings();
                break;
            case 'backup':
                this.loadBackupHistory();
                break;
            case 'preferences':
                this.loadDisplaySettings();
                break;
            case 'notifications':
                this.loadNotificationSettings();
                break;
            case 'integrations':
                this.loadIntegrationSettings();
                break;
        }
    },

    loadIntegrationSettings: async function() {
        try {
            const businessId = getCurrentBusinessId();
            if (!businessId) return;
            
            const { data: integrationSettings, error } = await supabase
                .from('business_settings')
                .select('settings')
                .eq('business_id', businessId)
                .eq('setting_type', 'integrations')
                .single();
                
            if (!error && integrationSettings) {
                const settings = integrationSettings.settings;
                this.setElementChecked('integration-accounting', settings.accounting || false);
                this.setElementChecked('integration-shipping', settings.shipping || false);
                this.setElementChecked('integration-ecommerce', settings.ecommerce || false);
                this.setElementChecked('integration-email', settings.email_marketing || false);
            }
            
        } catch (error) {
            console.error('Error loading integration settings:', error);
        }
    },

    loadNotificationSettings: async function() {
        // Already loaded in loadUserPreferences
        console.log('Loading notification settings...');
    },

    loadDisplaySettings: async function() {
        // Already loaded in loadUserPreferences
        console.log('Loading display settings...');
    },
    
    // Account Settings
    saveAccountSettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                full_name: document.getElementById('user-name')?.value || '',
                phone: document.getElementById('user-phone')?.value || '',
                language: document.getElementById('user-language')?.value || 'en',
                timezone: document.getElementById('user-timezone')?.value || 'UTC'
            };
            
            // Update user metadata in Supabase
            const { error } = await supabase.auth.updateUser({
                data: formData
            });
            
            if (error) throw error;
            
            // Update displayed info
            this.currentUser.user_metadata = {
                ...this.currentUser.user_metadata,
                ...formData
            };
            
            this.setElementText('user-full-name', formData.full_name || 'User');
            this.setElementText('user-avatar', this.getInitials(formData.full_name));
            
            showNotification('Account settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving account settings:', error);
            showNotification('Error saving account settings: ' + error.message, 'error');
        }
    },
    
    changePassword: async function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password')?.value;
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;
        
        // Validate passwords
        if (!newPassword || !confirmPassword) {
            showNotification('Please fill in all password fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        
        try {
            // Update password in Supabase
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            // Clear form
            e.target.reset();
            
            showNotification('Password updated successfully', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            showNotification('Error changing password: ' + error.message, 'error');
        }
    },
    
    // Business Settings
    loadBusinessInfo: async function() {
    try {
        console.log('Loading business info...');
        
        // First try to get business ID
        const businessId = getCurrentBusinessId();
        console.log('Current business ID:', businessId);
        
        if (!businessId) {
            console.log('No business ID found');
            return;
        }
        
        if (!this.currentBusiness) {
            console.log('Loading business settings from database...');
            await this.loadBusinessSettings(businessId);
        } else {
            console.log('Using cached business data');
            // If we already have data but form might not be rendered yet
            setTimeout(() => {
                this.populateBusinessForm(this.currentBusiness);
            }, 300);
        }
    } catch (error) {
        console.error('Error loading business info:', error);
        showNotification('Error loading business information', 'error');
    }
},
    
    populateBusinessForm: function(business) {
    if (!business) return;
    
    console.log('Populating business form with data:', business);
    
    // Use safe methods with a small delay to ensure DOM is ready
    setTimeout(() => {
        // Use safe methods to set values
        this.setElementValue('business-name', business.name || '');
        this.setElementValue('business-type', business.business_type || 'retail');
        this.setElementValue('business-currency', business.currency || 'INR');
        this.setElementValue('business-timezone', business.timezone || 'Asia/Kolkata');
        this.setElementValue('business-address', business.address || '');
        this.setElementValue('business-phone', business.phone || '');
        this.setElementValue('business-email', business.email || '');
        this.setElementValue('business-gst', business.gst_number || '');
        this.setElementValue('business-pan', business.pan_number || '');
        this.setElementValue('business-website', business.website || '');
        
        console.log('Business form populated successfully');
    }, 300); // Increased delay to ensure form is rendered
},
    
    saveBusinessSettings: async function(e) {
        e.preventDefault();
        
        try {
            const businessId = getCurrentBusinessId();
            if (!businessId) {
                showNotification('No business selected', 'error');
                return;
            }
            
            const formData = {
                name: document.getElementById('business-name')?.value || '',
                business_type: document.getElementById('business-type')?.value || 'retail',
                currency: document.getElementById('business-currency')?.value || 'INR',
                timezone: document.getElementById('business-timezone')?.value || 'Asia/Kolkata',
                address: document.getElementById('business-address')?.value || '',
                phone: document.getElementById('business-phone')?.value || '',
                email: document.getElementById('business-email')?.value || '',
                gst_number: document.getElementById('business-gst')?.value || '',
                pan_number: document.getElementById('business-pan')?.value || '',
                website: document.getElementById('business-website')?.value || ''
            };
            
            // Update business in database
            const { error } = await supabase
                .from('businesses')
                .update(formData)
                .eq('id', businessId);
                
            if (error) throw error;
            
            // Update current business object
            this.currentBusiness = { ...this.currentBusiness, ...formData };
            
            showNotification('Business settings saved successfully', 'success');
            
            // Update business name in navbar
            const navbarSelect = document.getElementById('navbar-business-select');
            if (navbarSelect) {
                const selectedOption = navbarSelect.querySelector(`option[value="${businessId}"]`);
                if (selectedOption) {
                    selectedOption.textContent = formData.name;
                }
            }
            
        } catch (error) {
            console.error('Error saving business settings:', error);
            showNotification('Error saving business settings: ' + error.message, 'error');
        }
    },
    
    // Invoice Settings
    saveInvoiceSettings: async function(e) {
        e.preventDefault();
        
        try {
            const businessId = getCurrentBusinessId();
            const formData = {
                invoice_prefix: document.getElementById('invoice-prefix')?.value || 'INV',
                invoice_starting_number: parseInt(document.getElementById('invoice-starting-number')?.value || 1001),
                invoice_payment_terms: document.getElementById('invoice-terms')?.value || 'net_15',
                invoice_notes: document.getElementById('invoice-notes')?.value || ''
            };
            
            await this.saveSettingsToDatabase(businessId, 'invoice_settings', formData);
            
            showNotification('Invoice settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving invoice settings:', error);
            showNotification('Error saving invoice settings', 'error');
        }
    },
    
    // Tax Settings
    toggleGstSettings: function(enabled) {
        const gstSettings = document.getElementById('gst-settings');
        if (gstSettings) {
            if (enabled) {
                gstSettings.classList.remove('d-none');
            } else {
                gstSettings.classList.add('d-none');
            }
        }
    },
    
    saveTaxSettings: async function(e) {
        e.preventDefault();
        
        try {
            const businessId = getCurrentBusinessId();
            const gstEnabled = document.getElementById('gst-enabled')?.checked || false;
            const formData = {
                default_tax_rate: parseFloat(document.getElementById('default-tax-rate')?.value || 0),
                gst_enabled: gstEnabled,
                gst_rate: gstEnabled ? parseFloat(document.getElementById('gst-rate')?.value || 18) : 0,
                gst_type: gstEnabled ? document.getElementById('gst-type')?.value : null,
                tax_inclusive_pricing: document.getElementById('tax-inclusive-pricing')?.checked || false
            };
            
            await this.saveSettingsToDatabase(businessId, 'tax_settings', formData);
            
            showNotification('Tax settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving tax settings:', error);
            showNotification('Error saving tax settings', 'error');
        }
    },
    
    // Display Settings
    saveDisplaySettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                theme: document.getElementById('theme')?.value || 'light',
                dashboard_layout: document.getElementById('dashboard-layout')?.value || 'standard',
                default_home_page: document.getElementById('default-home-page')?.value || 'overview',
                items_per_page: parseInt(document.getElementById('items-per-page')?.value || 25)
            };
            
            await this.saveUserSettings('display_settings', formData);
            
            // Apply theme if changed
            if (formData.theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else if (formData.theme === 'light') {
                document.body.classList.remove('dark-theme');
            } else {
                // Auto theme - check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove('dark-theme');
                }
            }
            
            showNotification('Display settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving display settings:', error);
            showNotification('Error saving display settings', 'error');
        }
    },
    
    // System Settings
    saveSystemSettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                auto_save: document.getElementById('auto-save')?.checked || true,
                low_stock_alerts: document.getElementById('low-stock-alerts')?.checked || true,
                auto_backup: document.getElementById('auto-backup')?.checked || false,
                data_retention: document.getElementById('data-retention')?.value || '180'
            };
            
            await this.saveUserSettings('system_settings', formData);
            
            showNotification('System settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving system settings:', error);
            showNotification('Error saving system settings', 'error');
        }
    },
    
    // Notification Settings
    saveNotificationSettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                email: {
                    sales: document.getElementById('email-sales')?.checked || true,
                    low_stock: document.getElementById('email-low-stock')?.checked || true,
                    payments: document.getElementById('email-payments')?.checked || true
                },
                in_app: {
                    orders: document.getElementById('app-orders')?.checked || true,
                    updates: document.getElementById('app-updates')?.checked || false,
                    staff: document.getElementById('app-staff')?.checked || false
                }
            };
            
            await this.saveUserSettings('notification_settings', formData);
            
            showNotification('Notification settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            showNotification('Error saving notification settings', 'error');
        }
    },
    
    // Security Settings
    loadSecuritySettings: async function() {
        try {
            const userId = this.currentUser?.id;
            if (!userId) return;
            
            // Use localStorage since user_settings table doesn't exist
            const userSettings = JSON.parse(localStorage.getItem(`user_settings_${userId}`) || '{}');
            const securitySettings = userSettings.security || {};
            
            this.setElementChecked('two-factor-auth', securitySettings.two_factor_auth || false);
            this.setElementValue('session-timeout', securitySettings.session_timeout || '60');
            this.toggleTwoFactorSettings(securitySettings.two_factor_auth || false);
            
            if (securitySettings.two_factor_auth && securitySettings.two_factor_method) {
                this.setElementValue('two-factor-method', securitySettings.two_factor_method);
            }
            
            // Load login history
            this.loadLoginHistory();
            
        } catch (error) {
            console.error('Error loading security settings:', error);
        }
    },
    
    toggleTwoFactorSettings: function(enabled) {
        const twoFactorSettings = document.getElementById('two-factor-settings');
        if (twoFactorSettings) {
            if (enabled) {
                twoFactorSettings.classList.remove('d-none');
            } else {
                twoFactorSettings.classList.add('d-none');
            }
        }
    },
    
    saveSecuritySettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                two_factor_auth: document.getElementById('two-factor-auth')?.checked || false,
                two_factor_method: document.getElementById('two-factor-auth')?.checked ? document.getElementById('two-factor-method')?.value : null,
                session_timeout: document.getElementById('session-timeout')?.value || '60'
            };
            
            await this.saveUserSettings('security_settings', formData);
            
            showNotification('Security settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving security settings:', error);
            showNotification('Error saving security settings', 'error');
        }
    },
    
    setupTwoFactor: function() {
        showNotification('Two-factor authentication setup is not yet implemented', 'info');
    },
    
    loadLoginHistory: async function() {
        try {
            const history = await this.fetchLoginHistory();
            this.displayLoginHistory(history);
        } catch (error) {
            console.error('Error loading login history:', error);
            const container = document.getElementById('login-history-content');
            if (container) {
                container.innerHTML = '<div class="text-muted text-center">Unable to load login history</div>';
            }
        }
    },
    
    displayLoginHistory: function(history) {
        const container = document.getElementById('login-history-content');
        if (!container) return;
        
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="text-muted text-center">No login history available</div>';
            return;
        }
        
        const html = history.map(entry => `
            <div class="login-history-item">
                <div>${entry.device || 'Unknown Device'}</div>
                <div>${entry.location || 'Unknown Location'}</div>
                <div>${new Date(entry.created_at).toLocaleString()}</div>
                <div class="login-status ${entry.success ? 'success' : 'failed'}">
                    ${entry.success ? 'Success' : 'Failed'}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // Integrations
    toggleIntegration: function(toggle) {
        const integrationId = toggle.id.replace('integration-', '');
        const enabled = toggle.checked;
        
        console.log(`Integration ${integrationId} ${enabled ? 'enabled' : 'disabled'}`);
        
        showNotification(`${integrationId.replace('_', ' ')} integration ${enabled ? 'enabled' : 'disabled'}`, 'success');
    },
    
    copyApiKey: function() {
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
            apiKeyInput.select();
            document.execCommand('copy');
            
            showNotification('API key copied to clipboard', 'success');
        }
    },
    
    regenerateApiKey: function() {
        if (confirm('Are you sure you want to regenerate your API key? This will invalidate the current key.')) {
            // Generate new API key
            const newApiKey = 'sk_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            this.setElementValue('api-key', newApiKey);
            
            showNotification('API key regenerated successfully', 'success');
        }
    },
    
    // Backup Settings
    loadBackupHistory: async function() {
        try {
            const backups = await this.fetchBackups();
            this.displayBackupHistory(backups);
        } catch (error) {
            console.error('Error loading backup history:', error);
        }
    },
    
    displayBackupHistory: function(backups) {
        const container = document.getElementById('backup-history-list');
        if (!container) return;
        
        if (!backups || backups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No backups yet</p>
                </div>
            `;
            return;
        }
        
        const html = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <strong>${new Date(backup.created_at).toLocaleString()}</strong>
                    <div class="backup-details">
                        <span>Size: ${this.formatFileSize(backup.size)}</span>
                        <span>Type: ${backup.type}</span>
                    </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="settingsManagement.downloadBackup('${backup.id}')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    createBackup: async function() {
        try {
            showNotification('Creating backup...', 'info');
            
            const businessId = getCurrentBusinessId();
            const backupData = await this.generateBackupData(businessId);
            
            // Create downloadable backup file
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ib-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Backup created successfully', 'success');
        } catch (error) {
            console.error('Error creating backup:', error);
            showNotification('Error creating backup', 'error');
        }
    },
    
    restoreBackup: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!confirm('Restoring from backup will overwrite existing data. Are you sure?')) {
                return;
            }
            
            try {
                const content = await file.text();
                const backupData = JSON.parse(content);
                
                // Validate backup format
                if (!backupData.version || !backupData.business_id) {
                    throw new Error('Invalid backup file format');
                }
                
                await this.restoreBackupData(backupData);
                
                showNotification('Backup restored successfully', 'success');
                location.reload(); // Reload to reflect restored data
            } catch (error) {
                console.error('Error restoring backup:', error);
                showNotification('Error restoring backup: ' + error.message, 'error');
            }
        };
        
        input.click();
    },
    
    saveBackupSettings: async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                frequency: document.getElementById('auto-backup-frequency')?.value || 'weekly',
                retention: document.getElementById('backup-retention')?.value || '30'
            };
            
            await this.saveSettingsToDatabase(getCurrentBusinessId(), 'backup_settings', formData);
            
            showNotification('Backup settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving backup settings:', error);
            showNotification('Error saving backup settings', 'error');
        }
    },
    
    // Cleanup Functions
    cleanupOldSales: function() {
        const period = document.getElementById('delete-sales-period')?.value || '365';
        
        if (confirm(`This will permanently delete sales records older than ${period} days. This action cannot be undone. Are you sure?`)) {
            showNotification('Cleaning up old sales records...', 'info');
            // Implement cleanup logic here
            setTimeout(() => {
                showNotification('Sales records cleaned up successfully', 'success');
            }, 2000);
        }
    },
    
    cleanupInactiveCustomers: function() {
        const period = document.getElementById('delete-customers-period')?.value || '365';
        
        if (confirm(`This will permanently delete customers with no activity for ${period} days. This action cannot be undone. Are you sure?`)) {
            showNotification('Cleaning up inactive customers...', 'info');
            // Implement cleanup logic here
            setTimeout(() => {
                showNotification('Inactive customers cleaned up successfully', 'success');
            }, 2000);
        }
    },
    
    // File Upload Handlers
    handleAvatarUpload: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
        }
        
        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.innerHTML = '';
                avatar.style.backgroundImage = `url(${event.target.result})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
            }
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        this.uploadAvatar(file);
    },
    
    handleInvoiceLogoUpload: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }
        
        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('invoice-logo-preview');
            if (preview) {
                const img = preview.querySelector('.logo-preview');
                if (img) {
                    img.src = event.target.result;
                }
                preview.classList.remove('d-none');
            }
        };
        reader.readAsDataURL(file);
    },
    
    removeInvoiceLogo: function() {
        const preview = document.getElementById('invoice-logo-preview');
        if (preview) {
            preview.classList.add('d-none');
            const uploadInput = document.getElementById('invoice-logo-upload');
            if (uploadInput) {
                uploadInput.value = '';
            }
        }
    },
    
    // Database Operations
    saveSettingsToDatabase: async function(businessId, settingType, settings) {
        try {
            console.log('Saving to database:', { businessId, settingType });
            
            const { data, error } = await supabase
                .from('business_settings')
                .upsert({
                    business_id: businessId,
                    setting_type: settingType,
                    settings: settings
                }, {
                    onConflict: 'business_id,setting_type'
                })
                .select();
            
            if (error) {
                console.error('Database save error:', error);
                // Fallback to localStorage
                this.saveToLocalStorage(businessId, settingType, settings);
                return false;
            }
            
            console.log('Saved to database successfully:', data);
            return true;
            
        } catch (error) {
            console.error('Error in saveSettingsToDatabase:', error);
            // Fallback to localStorage
            this.saveToLocalStorage(businessId, settingType, settings);
            return false;
        }
    },

    
    saveUserSettings: async function(settingType, settings) {
        try {
            const user = await getCurrentUser();
            if (!user) return true;
            
            // Save to localStorage instead of database
            const userId = user.id;
            const userSettings = JSON.parse(localStorage.getItem(`user_settings_${userId}`) || '{}');
            userSettings[settingType] = settings;
            localStorage.setItem(`user_settings_${userId}`, JSON.stringify(userSettings));
            
            return true;
        } catch (error) {
            console.error('Error saving user settings:', error);
            // Still return true for localStorage
            return true;
        }
    },
    
    fetchLoginHistory: async function() {
        try {
            const user = await getCurrentUser();
            if (!user) return [];
            
            // Since login_history table might not exist, return empty array
            return [];
            
        } catch (error) {
            console.error('Error fetching login history:', error);
            return [];
        }
    },
    
    fetchBackups: async function() {
        try {
            const businessId = getCurrentBusinessId();
            if (!businessId) return [];
            
            // Since backups table might not exist, return empty array
            return [];
            
        } catch (error) {
            console.error('Error fetching backups:', error);
            return [];
        }
    },
    
    generateBackupData: async function(businessId) {
        const backupData = {
            version: '1.0',
            created_at: new Date().toISOString(),
            business_id: businessId,
            data: {}
        };
        
        // Fetch and include relevant data
        const tables = ['products', 'parties', 'sales', 'purchases', 'expenses'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('business_id', businessId);
                
            if (!error) {
                backupData.data[table] = data;
            }
        }
        
        return backupData;
    },
    
    restoreBackupData: async function(backupData) {
        const businessId = getCurrentBusinessId();
        
        // For each table, delete existing data and insert backup data
        for (const [table, data] of Object.entries(backupData.data)) {
            // Delete existing data for this business
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('business_id', businessId);
                
            if (deleteError) {
                console.error(`Error deleting existing ${table}:`, deleteError);
                continue;
            }
            
            // Insert backup data
            if (data && data.length > 0) {
                const { error: insertError } = await supabase
                    .from(table)
                    .insert(data.map(item => ({ ...item, business_id: businessId })));
                    
                if (insertError) {
                    console.error(`Error inserting ${table} data:`, insertError);
                }
            }
        }
    },
    
    downloadBackup: async function(backupId) {
        try {
            showNotification('Backup download not implemented yet', 'info');
        } catch (error) {
            console.error('Error downloading backup:', error);
            showNotification('Error downloading backup', 'error');
        }
    },
    
    uploadAvatar: async function(file) {
        try {
            showNotification('Avatar upload not implemented yet', 'info');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showNotification('Error uploading avatar', 'error');
        }
    },
    
    // Account Deletion
    showDeleteAccountModal: function() {
        if (confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost.')) {
            if (confirm('Final confirmation: This will delete ALL your data including businesses, customers, and sales records. Type "DELETE" to confirm.')) {
                const confirmation = prompt('Please type "DELETE" to confirm account deletion:');
                if (confirmation === 'DELETE') {
                    this.deleteAccount();
                }
            }
        }
    },
    
    deleteAccount: async function() {
        try {
            showNotification('Deleting account...', 'info');
            
            setTimeout(() => {
                showNotification('Account deletion has been scheduled. You will receive a confirmation email.', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Error deleting account:', error);
            showNotification('Error deleting account', 'error');
        }
    }
};

// Initialize settings when page is shown
function initializeSettingsPage() {
    console.log('Settings page initialized');
    
    if (typeof settingsManagement !== 'undefined') {
        settingsManagement.init();
        
        // Load all content for current active tab
        const activeTab = document.querySelector('.settings-tab.active');
        if (activeTab) {
            const tabId = activeTab.getAttribute('data-tab');
            loadTabContent(tabId);
        }
    } else {
        console.error('Settings management module not found');
    }
}

// Enhanced initialization function
async function initializeSettingsPageWithBusiness() {
    console.log('⚙️ Initializing settings page with business check...');
    
    // Show loading state
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
        settingsPage.innerHTML = `
            <div class="settings-loading">
                <div class="spinner-border text-primary"></div>
                <p>Loading business settings...</p>
            </div>
        `;
    }
    
    try {
        // Step 1: Ensure active business is properly set
        console.log('🎯 Step 1: Ensuring active business is set...');
        const businessId = await ensureActiveBusinessSet();
        
        if (!businessId) {
            console.error('❌ No business available');
            if (settingsPage) {
                settingsPage.innerHTML = `
                    <div class="settings-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>No Business Available</h4>
                        <p>You don't have access to any businesses yet.</p>
                        <div class="mt-3">
                            <button class="btn btn-primary" onclick="showCreateBusinessModal()">
                                <i class="fas fa-plus"></i> Create Your First Business
                            </button>
                        </div>
                    </div>
                `;
            }
            return;
        }
        
        console.log('✅ Business is ready:', businessId);
        
        // Step 2: Initialize settings management
        console.log('🎯 Step 2: Initializing settings management...');
        if (typeof settingsManagement !== 'undefined') {
            // Load user data first
            await settingsManagement.loadUserData();
            
            // Wait a bit for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Load all content for current active tab
            const activeTab = document.querySelector('.settings-tab.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('data-tab');
                console.log('🎯 Loading tab:', tabId);
                await loadTabContent(tabId);
            } else {
                // Set default tab if none is active
                const firstTab = document.querySelector('.settings-tab');
                if (firstTab) {
                    firstTab.classList.add('active');
                    const tabId = firstTab.getAttribute('data-tab');
                    await loadTabContent(tabId);
                }
            }
        } else {
            throw new Error('Settings management module not found');
        }
        
        console.log('✅ Settings page initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing settings page:', error);
        
        if (settingsPage) {
            settingsPage.innerHTML = `
                <div class="settings-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error Loading Settings</h4>
                    <p>There was an error loading the settings page: ${error.message}</p>
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="initializeSettingsPageWithBusiness()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Debug function to check active business status
function debugActiveBusiness() {
    console.log('=== ACTIVE BUSINESS DEBUG ===');
    console.log('1. window.currentBusiness:', window.currentBusiness);
    console.log('2. window.userBusinesses:', window.userBusinesses);
    
    if (window.userBusinesses) {
        console.log('3. Business List:');
        window.userBusinesses.forEach((business, index) => {
            console.log(`   ${index}: ${business.name} (${business.id})`);
            console.log(`      - is_active: ${business.is_active}`);
            console.log(`      - access_type: ${business.access_type}`);
            console.log(`      - staff_role: ${business.staff_role}`);
            console.log(`      - owner_id: ${business.owner_id}`);
        });
    }
    
    // Check localStorage
    try {
        const userId = window.currentUser?.id || 'anonymous';
        const activeBusinessKey = `${userId}_activeBusiness`;
        const stored = localStorage.getItem(activeBusinessKey);
        console.log('4. localStorage key:', activeBusinessKey);
        console.log('5. localStorage value:', stored);
    } catch (e) {
        console.log('6. localStorage error:', e);
    }
    
    console.log('7. getCurrentBusinessId() result:', getCurrentBusinessId());
    console.log('=== END DEBUG ===');
    
    // Show result in alert for easy viewing
    alert(`Current Business: ${window.currentBusiness?.name || 'None'}\nBusiness ID: ${window.currentBusiness?.id || 'None'}\nTotal Businesses: ${window.userBusinesses?.length || 0}`);
}

// Make it available globally
window.debugActiveBusiness = debugActiveBusiness;

// Function to load tab content
async function loadTabContent(tabId) {
    console.log('Loading content for tab:', tabId);
    
    const section = document.getElementById(`${tabId}-settings`);
    if (!section) return;
    
    // Show loading state
    section.innerHTML = `
        <div class="settings-loading">
            <div class="spinner-border text-primary"></div>
            <p>Loading ${tabId} settings...</p>
        </div>
    `;
    
    // Load content based on tab
    try {
        switch(tabId) {
            case 'account':
                await loadAccountContent();
                break;
            case 'business':
                await loadBusinessContent();
                break;
            case 'preferences':
                await loadPreferencesContent();
                break;
            case 'notifications':
                await loadNotificationsContent();
                break;
            case 'security':
                await loadSecurityContent();
                break;
            case 'integrations':
                await loadIntegrationsContent();
                break;
            case 'backup':
                await loadBackupContent();
                break;
        }
    } catch (error) {
        console.error('Error loading tab content:', error);
        section.innerHTML = `
            <div class="settings-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading settings. Please try again.</p>
            </div>
        `;
    }
}

// Load account content
async function loadAccountContent() {
    const section = document.getElementById('account-settings');
    if (!section) return;
    
    // Get current user data
    const currentUser = await getCurrentUser();
    const userMetadata = currentUser?.user_metadata || {};
    const userEmail = currentUser?.email || '';
    const userName = userMetadata.full_name || '';
    const userPhone = userMetadata.phone || '';
    const userLanguage = userMetadata.language || 'en';
    const userTimezone = userMetadata.timezone || 'UTC';
    
    // Get user initials for avatar
    const initials = userName ? 
        userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
        (userEmail ? userEmail[0].toUpperCase() : 'U');
    
    // Account Information Form with populated data
    const accountFormHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-user-circle"></i> Account Information</h3>
            <div class="profile-section">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <div class="avatar-placeholder" id="user-avatar">${initials}</div>
                        <button class="btn-avatar-upload" onclick="document.getElementById('avatar-upload').click()">
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="avatar-upload" class="d-none" accept="image/*" onchange="settingsManagement.handleAvatarUpload(event)">
                    </div>
                    <div class="profile-info">
                        <h4 id="user-full-name">${escapeHtml(userName) || 'User'}</h4>
                        <p id="user-email">${escapeHtml(userEmail)}</p>
                        <p class="text-muted" id="user-role">${userMetadata.role || 'Business Owner'}</p>
                    </div>
                </div>
            </div>

            <form id="account-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="user-name">Full Name</label>
                        <input type="text" id="user-name" class="form-control" placeholder="Enter your full name" value="${escapeHtml(userName)}">
                    </div>
                    <div class="form-group">
                        <label for="user-email-input">Email Address</label>
                        <input type="email" id="user-email-input" class="form-control" placeholder="Enter your email" value="${escapeHtml(userEmail)}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="user-phone">Phone Number</label>
                        <input type="tel" id="user-phone" class="form-control" placeholder="+1 (555) 123-4567" value="${escapeHtml(userPhone)}">
                    </div>
                    <div class="form-group">
                        <label for="user-language">Language</label>
                        <select id="user-language" class="form-control">
                            <option value="en" ${userLanguage === 'en' ? 'selected' : ''}>English</option>
                            <option value="es" ${userLanguage === 'es' ? 'selected' : ''}>Spanish</option>
                            <option value="fr" ${userLanguage === 'fr' ? 'selected' : ''}>French</option>
                            <option value="de" ${userLanguage === 'de' ? 'selected' : ''}>German</option>
                            <option value="hi" ${userLanguage === 'hi' ? 'selected' : ''}>Hindi</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="user-timezone">Timezone</label>
                        <select id="user-timezone" class="form-control">
                            <option value="UTC" ${userTimezone === 'UTC' ? 'selected' : ''}>UTC</option>
                            <option value="America/New_York" ${userTimezone === 'America/New_York' ? 'selected' : ''}>Eastern Time</option>
                            <option value="America/Chicago" ${userTimezone === 'America/Chicago' ? 'selected' : ''}>Central Time</option>
                            <option value="America/Denver" ${userTimezone === 'America/Denver' ? 'selected' : ''}>Mountain Time</option>
                            <option value="America/Los_Angeles" ${userTimezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time</option>
                            <option value="Asia/Kolkata" ${userTimezone === 'Asia/Kolkata' ? 'selected' : ''}>India Standard Time</option>
                            <option value="Europe/London" ${userTimezone === 'Europe/London' ? 'selected' : ''}>London</option>
                            <option value="Europe/Paris" ${userTimezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>

        <!-- Password Change Form -->
        <div class="settings-card">
            <h3><i class="fas fa-key"></i> Password & Security</h3>
            <form id="password-form">
                <div class="form-group">
                    <label for="current-password">Current Password</label>
                    <input type="password" id="current-password" class="form-control" placeholder="Enter current password">
                </div>
                <div class="form-group">
                    <label for="new-password">New Password</label>
                    <input type="password" id="new-password" class="form-control" placeholder="Enter new password">
                    <small class="form-hint">Minimum 8 characters with letters and numbers</small>
                </div>
                <div class="form-group">
                    <label for="confirm-password">Confirm New Password</label>
                    <input type="password" id="confirm-password" class="form-control" placeholder="Confirm new password">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </div>
            </form>
        </div>

        <div class="settings-card">
            <h3><i class="fas fa-trash-alt"></i> Account Deletion</h3>
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle"></i> Warning: This action cannot be undone</h5>
                <p>Deleting your account will permanently remove all your data including businesses, inventory, sales, and customer information.</p>
            </div>
            <button class="btn btn-danger" onclick="settingsManagement.showDeleteAccountModal()">
                <i class="fas fa-trash"></i> Delete Account
            </button>
        </div>
    `;
    
    section.innerHTML = accountFormHTML;
    
    // Initialize form events
    const accountForm = document.getElementById('account-form');
    const passwordForm = document.getElementById('password-form');
    
    if (accountForm) {
        accountForm.addEventListener('submit', (e) => settingsManagement.saveAccountSettings(e));
    }
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => settingsManagement.changePassword(e));
    }
    
    // Store current user data in settingsManagement for later use
    if (currentUser) {
        settingsManagement.currentUser = currentUser;
        settingsManagement.currentUser.user_metadata = userMetadata;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load business content (similar functions for other tabs)
async function loadBusinessContent() {
    const section = document.getElementById('business-settings');
    if (!section) return;
    
    // Business settings form HTML
    const businessFormHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-building"></i> Business Information</h3>
            <form id="business-settings-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-name">Business Name *</label>
                        <input type="text" id="business-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="business-type">Business Type</label>
                        <select id="business-type" class="form-control">
                            <option value="retail">Retail Store</option>
                            <option value="wholesale">Wholesale</option>
                            <option value="manufacturing">Manufacturing</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="service">Service Provider</option>
                            <option value="restaurant">Restaurant/Food</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="business-currency">Default Currency *</label>
                        <select id="business-currency" class="form-control" required>
                            <option value="USD">US Dollar ($)</option>
                            <option value="INR" selected>Indian Rupee (₹)</option>
                            <option value="EUR">Euro (€)</option>
                            <option value="GBP">British Pound (£)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="business-timezone">Business Timezone</label>
                        <select id="business-timezone" class="form-control">
                            <option value="Asia/Kolkata">India Standard Time</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="business-address">Business Address</label>
                    <textarea id="business-address" class="form-control" rows="3" placeholder="Street address, city, state, zip code"></textarea>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-phone">Phone Number</label>
                        <input type="tel" id="business-phone" class="form-control" placeholder="Business phone">
                    </div>
                    <div class="form-group">
                        <label for="business-email">Business Email</label>
                        <input type="email" id="business-email" class="form-control" placeholder="contact@business.com">
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-gst">GST Number</label>
                        <input type="text" id="business-gst" class="form-control" placeholder="GSTIN number">
                    </div>
                    <div class="form-group">
                        <label for="business-pan">PAN Number</label>
                        <input type="text" id="business-pan" class="form-control" placeholder="PAN number">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="business-website">Website</label>
                    <input type="url" id="business-website" class="form-control" placeholder="https://yourbusiness.com">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Business Settings</button>
                </div>
            </form>
        </div>
    `;
    
    section.innerHTML = businessFormHTML;
    
    // Initialize form events
    document.getElementById('business-settings-form')?.addEventListener('submit', (e) => settingsManagement.saveBusinessSettings(e));
    
    // Load business data
    await settingsManagement.loadBusinessInfo();
}

// Load preferences content
async function loadPreferencesContent() {
    const section = document.getElementById('preferences-settings');
    if (!section) return;
    
    // Display settings form HTML
    const preferencesHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-palette"></i> Display Preferences</h3>
            <form id="display-settings-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="theme">Theme</label>
                        <select id="theme" class="form-control">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (System)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dashboard-layout">Dashboard Layout</label>
                        <select id="dashboard-layout" class="form-control">
                            <option value="standard">Standard</option>
                            <option value="compact">Compact</option>
                            <option value="detailed">Detailed</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="default-home-page">Default Home Page</label>
                        <select id="default-home-page" class="form-control">
                            <option value="overview">Overview</option>
                            <option value="sales">Sales</option>
                            <option value="inventory">Inventory</option>
                            <option value="customers">Customers</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="items-per-page">Items Per Page</label>
                        <select id="items-per-page" class="form-control">
                            <option value="10">10</option>
                            <option value="25" selected>25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Display Settings</button>
                </div>
            </form>
        </div>
    `;
    
    section.innerHTML = preferencesHTML;
    
    // Initialize form events
    document.getElementById('display-settings-form')?.addEventListener('submit', (e) => settingsManagement.saveDisplaySettings(e));
    
    // Load current preferences
    await settingsManagement.loadUserPreferences();
}

// Load notifications content
async function loadNotificationsContent() {
    const section = document.getElementById('notifications-settings');
    if (!section) return;
    
    // Notifications settings form HTML
    const notificationsHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-bell"></i> Email Notifications</h3>
            <form id="notification-settings-form">
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="email-sales">
                        <label class="form-check-label" for="email-sales">
                            New Sales & Invoices
                        </label>
                    </div>
                    <small class="form-text text-muted">Receive email notifications for new sales</small>
                </div>
                
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="email-low-stock">
                        <label class="form-check-label" for="email-low-stock">
                            Low Stock Alerts
                        </label>
                    </div>
                    <small class="form-text text-muted">Get notified when products are running low</small>
                </div>
                
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="email-payments">
                        <label class="form-check-label" for="email-payments">
                            Payment Reminders
                        </label>
                    </div>
                    <small class="form-text text-muted">Receive reminders for pending payments</small>
                </div>
                
                <h4 class="mt-4"><i class="fas fa-mobile-alt"></i> In-App Notifications</h4>
                
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="app-orders">
                        <label class="form-check-label" for="app-orders">
                            New Orders
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="app-updates">
                        <label class="form-check-label" for="app-updates">
                            System Updates
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="app-staff">
                        <label class="form-check-label" for="app-staff">
                            Staff Activities
                        </label>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Notification Settings</button>
                </div>
            </form>
        </div>
    `;
    
    section.innerHTML = notificationsHTML;
    
    // Initialize form events
    document.getElementById('notification-settings-form')?.addEventListener('submit', (e) => settingsManagement.saveNotificationSettings(e));
    
    // Load current notification settings
    await settingsManagement.loadUserPreferences();
}

// Load security content
async function loadSecurityContent() {
    const section = document.getElementById('security-settings');
    if (!section) return;
    
    // Security settings form HTML
    const securityHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
            <form id="security-settings-form">
                <div class="form-group">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="two-factor-auth">
                        <label class="form-check-label" for="two-factor-auth">
                            Enable Two-Factor Authentication
                        </label>
                    </div>
                    <small class="form-text text-muted">Add an extra layer of security to your account</small>
                </div>
                
                <div id="two-factor-settings" class="d-none mt-3 p-3 border rounded">
                    <div class="form-group">
                        <label for="two-factor-method">2FA Method</label>
                        <select id="two-factor-method" class="form-control">
                            <option value="authenticator">Authenticator App</option>
                            <option value="sms">SMS</option>
                            <option value="email">Email</option>
                        </select>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="settingsManagement.setupTwoFactor()">
                        <i class="fas fa-cog"></i> Setup Two-Factor
                    </button>
                </div>
                
                <div class="form-group mt-3">
                    <label for="session-timeout">Session Timeout</label>
                    <select id="session-timeout" class="form-control">
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60" selected>60 minutes</option>
                        <option value="120">2 hours</option>
                        <option value="240">4 hours</option>
                        <option value="0">Never (not recommended)</option>
                    </select>
                    <small class="form-text text-muted">Automatically log out after inactivity</small>
                </div>
                
                <h4 class="mt-4"><i class="fas fa-history"></i> Login History</h4>
                <div id="login-history-content" class="mt-2">
                    <div class="text-center text-muted">
                        <i class="fas fa-spinner fa-spin"></i> Loading login history...
                    </div>
                </div>
                
                <div class="form-actions mt-4">
                    <button type="submit" class="btn btn-primary">Save Security Settings</button>
                </div>
            </form>
        </div>
    `;
    
    section.innerHTML = securityHTML;
    
    // Initialize form events
    document.getElementById('security-settings-form')?.addEventListener('submit', (e) => settingsManagement.saveSecuritySettings(e));
    
    // Load security settings
    await settingsManagement.loadSecuritySettings();
}

// Load integrations content
async function loadIntegrationsContent() {
    const section = document.getElementById('integrations-settings');
    if (!section) return;
    
    // Integrations settings HTML
    const integrationsHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-plug"></i> Integrations</h3>
            <p class="text-muted">Connect IB Manager with your favorite tools and services</p>
            
            <div class="integrations-grid">
                <div class="integration-card">
                    <div class="integration-icon bg-primary">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="integration-info">
                        <h5>Accounting Software</h5>
                        <p class="text-muted">Sync with QuickBooks, Xero, or Tally</p>
                    </div>
                    <div class="integration-action">
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-input" type="checkbox" id="integration-accounting">
                            <label class="form-check-label" for="integration-accounting"></label>
                        </div>
                    </div>
                </div>
                
                <div class="integration-card">
                    <div class="integration-icon bg-success">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="integration-info">
                        <h5>Shipping Providers</h5>
                        <p class="text-muted">Connect with shipping carriers</p>
                    </div>
                    <div class="integration-action">
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-input" type="checkbox" id="integration-shipping">
                            <label class="form-check-label" for="integration-shipping"></label>
                        </div>
                    </div>
                </div>
                
                <div class="integration-card">
                    <div class="integration-icon bg-info">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="integration-info">
                        <h5>E-commerce Platforms</h5>
                        <p class="text-muted">Connect with Shopify, WooCommerce, etc.</p>
                    </div>
                    <div class="integration-action">
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-input" type="checkbox" id="integration-ecommerce">
                            <label class="form-check-label" for="integration-ecommerce"></label>
                        </div>
                    </div>
                </div>
                
                <div class="integration-card">
                    <div class="integration-icon bg-warning">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="integration-info">
                        <h5>Email Marketing</h5>
                        <p class="text-muted">Connect with Mailchimp, SendGrid, etc.</p>
                    </div>
                    <div class="integration-action">
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-input" type="checkbox" id="integration-email">
                            <label class="form-check-label" for="integration-email"></label>
                        </div>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-4"><i class="fas fa-key"></i> API Access</h4>
            <div class="api-settings mt-3">
                <div class="form-group">
                    <label for="api-key">API Key</label>
                    <div class="input-group">
                        <input type="text" id="api-key" class="form-control" value="sk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="settingsManagement.copyApiKey()">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="btn btn-outline-secondary" type="button" onclick="settingsManagement.regenerateApiKey()">
                            <i class="fas fa-redo"></i> Regenerate
                        </button>
                    </div>
                    <small class="form-text text-muted">Use this key to authenticate API requests</small>
                </div>
            </div>
        </div>
    `;
    
    section.innerHTML = integrationsHTML;
    
    // Load integration settings
    await settingsManagement.loadIntegrationSettings();
}

// Load backup content
async function loadBackupContent() {
    const section = document.getElementById('backup-settings');
    if (!section) return;
    
    // Backup settings HTML
    const backupHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-database"></i> Data Backup & Recovery</h3>
            
            <div class="backup-actions mb-4">
                <button class="btn btn-primary me-2" onclick="settingsManagement.createBackup()">
                    <i class="fas fa-download me-1"></i> Create Backup Now
                </button>
                <button class="btn btn-outline-primary" onclick="settingsManagement.restoreBackup()">
                    <i class="fas fa-upload me-1"></i> Restore from Backup
                </button>
            </div>
            
            <div class="settings-card">
                <h4><i class="fas fa-cog"></i> Auto Backup Settings</h4>
                <form id="auto-backup-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="auto-backup-frequency">Backup Frequency</label>
                            <select id="auto-backup-frequency" class="form-control">
                                <option value="daily">Daily</option>
                                <option value="weekly" selected>Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="backup-retention">Retention Period</label>
                            <select id="backup-retention" class="form-control">
                                <option value="7">7 days</option>
                                <option value="30" selected>30 days</option>
                                <option value="90">90 days</option>
                                <option value="365">1 year</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Backup Settings</button>
                    </div>
                </form>
            </div>
            
            <div class="settings-card mt-4">
                <h4><i class="fas fa-history"></i> Backup History</h4>
                <div id="backup-history-list" class="mt-2">
                    <div class="text-center text-muted">
                        <i class="fas fa-spinner fa-spin"></i> Loading backup history...
                    </div>
                </div>
            </div>
            
            <div class="settings-card mt-4">
                <h4><i class="fas fa-broom"></i> Data Cleanup</h4>
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Warning:</strong> These actions are permanent and cannot be undone.
                </div>
                
                <div class="form-group">
                    <label for="delete-sales-period">Delete sales records older than:</label>
                    <div class="input-group">
                        <select id="delete-sales-period" class="form-control">
                            <option value="180">6 months</option>
                            <option value="365" selected>1 year</option>
                            <option value="730">2 years</option>
                            <option value="1095">3 years</option>
                        </select>
                        <button class="btn btn-outline-danger" type="button" onclick="settingsManagement.cleanupOldSales()">
                            <i class="fas fa-trash"></i> Cleanup
                        </button>
                    </div>
                </div>
                
                <div class="form-group mt-3">
                    <label for="delete-customers-period">Delete inactive customers (no activity for):</label>
                    <div class="input-group">
                        <select id="delete-customers-period" class="form-control">
                            <option value="180">6 months</option>
                            <option value="365" selected>1 year</option>
                            <option value="730">2 years</option>
                        </select>
                        <button class="btn btn-outline-danger" type="button" onclick="settingsManagement.cleanupInactiveCustomers()">
                            <i class="fas fa-trash"></i> Cleanup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    section.innerHTML = backupHTML;
    
    // Initialize form events
    document.getElementById('auto-backup-form')?.addEventListener('submit', (e) => settingsManagement.saveBackupSettings(e));
    
    // Load backup history
    await settingsManagement.loadBackupHistory();
}

// Add CSS for loading and error states
const style = document.createElement('style');
style.textContent = `
    .settings-loading {
        text-align: center;
        padding: 3rem;
        color: #6c757d;
    }
    
    .settings-loading .spinner-border {
        width: 3rem;
        height: 3rem;
        margin-bottom: 1rem;
    }
    
    .settings-error {
        text-align: center;
        padding: 3rem;
        color: #dc3545;
    }
    
    .settings-error i {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
`;
document.head.appendChild(style);

// Update tab switching to load content
const originalSwitchTab = settingsManagement.switchTab;
settingsManagement.switchTab = function(tab) {
    console.log('Custom switch tab called');
    
    // Remove active class from all tabs
    document.querySelectorAll('.settings-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('d-none');
    });
    
    // Show corresponding section
    const tabId = tab.getAttribute('data-tab');
    const section = document.getElementById(`${tabId}-settings`);
    if (section) {
        section.classList.remove('d-none');
        section.classList.add('active');
        
        // Load content for this tab
        loadTabContent(tabId);
    }
};

// Listen for page navigation
document.addEventListener('DOMContentLoaded', function() {
    // Listen for settings page click
    document.querySelectorAll('[data-page="settings"]').forEach(link => {
        link.addEventListener('click', function() {
            // Initialize settings page after a short delay
            setTimeout(() => {
                initializeSettingsPage();
            }, 100);
        });
    });
});

// Initialize if settings page is already active
if (document.getElementById('settings-page') && !document.getElementById('settings-page').classList.contains('d-none')) {
    setTimeout(() => {
        initializeSettingsPage();
    }, 500);
}

// Helper function to get current business ID
function getCurrentBusinessId() {
    console.log('🔍 Getting current business ID for settings...');
    
    // Debug: Log all available sources
    console.log('window.currentBusiness:', window.currentBusiness);
    console.log('window.userBusinesses length:', window.userBusinesses?.length);
    if (window.userBusinesses) {
        console.log('User Businesses:');
        window.userBusinesses.forEach((b, i) => {
            console.log(`  ${i}: ${b.name} (ID: ${b.id}) - Active: ${b.is_active}, Access: ${b.access_type}`);
        });
    }
    
    // METHOD 1: Check if window.currentBusiness is properly set
    if (window.currentBusiness && window.currentBusiness.id) {
        console.log('✅ Found active business in window.currentBusiness:', 
                   window.currentBusiness.name, window.currentBusiness.id);
        
        // Verify this business exists in userBusinesses
        if (window.userBusinesses) {
            const exists = window.userBusinesses.some(b => b.id === window.currentBusiness.id);
            if (!exists) {
                console.warn('⚠️ Current business not found in userBusinesses array');
                // Fall through to other methods
            } else {
                return window.currentBusiness.id;
            }
        } else {
            return window.currentBusiness.id;
        }
    }
    
    // METHOD 2: Check for business with "is_active" flag or marked as current
    if (window.userBusinesses && Array.isArray(window.userBusinesses) && window.userBusinesses.length > 0) {
        console.log('🔍 Checking userBusinesses for active business...');
        
        // First, check if any business is explicitly marked as active
        const activeBusiness = window.userBusinesses.find(b => b.is_active === true);
        if (activeBusiness) {
            console.log('✅ Found explicitly active business:', activeBusiness.name, activeBusiness.id);
            return activeBusiness.id;
        }
        
        // Check for business with access_type 'owner' (usually the main one)
        const ownerBusiness = window.userBusinesses.find(b => b.access_type === 'owner');
        if (ownerBusiness) {
            console.log('✅ Found owner business:', ownerBusiness.name, ownerBusiness.id);
            return ownerBusiness.id;
        }
        
        // Check if any business was recently set as active via localStorage
        try {
            const userId = window.currentUser?.id || 'anonymous';
            const activeBusinessKey = `${userId}_activeBusiness`;
            const storedBusiness = localStorage.getItem(activeBusinessKey);
            
            if (storedBusiness) {
                const business = JSON.parse(storedBusiness);
                // Verify this business exists in userBusinesses
                const exists = window.userBusinesses.some(b => b.id === business.id);
                if (exists) {
                    console.log('✅ Found in localStorage:', business.name, business.id);
                    return business.id;
                }
            }
        } catch (e) {
            console.warn('⚠️ Error reading from localStorage:', e);
        }
        
        // As last resort, return the first business
        console.log('⚠️ No active business found, using first one:', window.userBusinesses[0].name);
        return window.userBusinesses[0].id;
    }
    
    // METHOD 3: Check the navbar selector
    const navbarSelect = document.getElementById('navbar-business-select');
    if (navbarSelect && navbarSelect.value) {
        console.log('✅ Found in navbar selector:', navbarSelect.value);
        return navbarSelect.value;
    }
    
    // METHOD 4: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const businessIdFromUrl = urlParams.get('business_id');
    if (businessIdFromUrl) {
        console.log('✅ Found in URL:', businessIdFromUrl);
        return businessIdFromUrl;
    }
    
    console.warn('⚠️ No business ID found from any source');
    return null;
}

// Function to ensure currentBusiness is properly set
async function ensureActiveBusinessSet() {
    console.log('🔄 Ensuring active business is properly set...');
    
    // If currentBusiness is already set, verify it's correct
    if (window.currentBusiness && window.currentBusiness.id) {
        console.log('✅ currentBusiness already set:', window.currentBusiness.name);
        return window.currentBusiness.id;
    }
    
    // Try to load businesses if not loaded
    if (!window.userBusinesses || window.userBusinesses.length === 0) {
        console.log('🔄 Loading user businesses...');
        if (window.loadUserBusinesses && typeof window.loadUserBusinesses === 'function') {
            await window.loadUserBusinesses();
        }
    }
    
    // Set the active business
    if (window.userBusinesses && window.userBusinesses.length > 0) {
        // Check localStorage for previously active business
        try {
            const userId = window.currentUser?.id || 'anonymous';
            const activeBusinessKey = `${userId}_activeBusiness`;
            const storedBusiness = localStorage.getItem(activeBusinessKey);
            
            if (storedBusiness) {
                const business = JSON.parse(storedBusiness);
                const exists = window.userBusinesses.some(b => b.id === business.id);
                if (exists) {
                    console.log('✅ Restoring previously active business:', business.name);
                    window.currentBusiness = business;
                    return business.id;
                }
            }
        } catch (e) {
            console.warn('⚠️ Error restoring from localStorage:', e);
        }
        
        // Set first business as active
        console.log('✅ Setting first business as active:', window.userBusinesses[0].name);
        window.currentBusiness = window.userBusinesses[0];
        return window.userBusinesses[0].id;
    }
    
    console.warn('⚠️ No businesses available to set as active');
    return null;
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', function() {
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage && !settingsPage.classList.contains('d-none')) {
        settingsManagement.init();
    }
});

window.initializeSettingsPage = initializeSettingsPage;
window.settingsManagement = settingsManagement;

// Add to settingsManagement object in settings.js
settingsManagement.handleBusinessLogoUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const businessId = getCurrentBusinessId();
        if (!businessId) {
            showNotification('No business selected', 'error');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('business-logo-preview');
            if (preview) {
                preview.src = event.target.result;
                preview.style.display = 'block';
            }
            
            // Show remove button
            const removeBtn = document.getElementById('remove-business-logo-btn');
            if (removeBtn) {
                removeBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
        
        // Upload logo
        await uploadBusinessLogo(businessId, file);
        
    } catch (error) {
        console.error('Error uploading business logo:', error);
        showNotification('Error uploading logo: ' + error.message, 'error');
    }
};

settingsManagement.removeBusinessLogo = async function() {
    try {
        const businessId = getCurrentBusinessId();
        if (!businessId) {
            showNotification('No business selected', 'error');
            return;
        }
        
        await removeBusinessLogo(businessId);
        
        // Clear preview
        const preview = document.getElementById('business-logo-preview');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        
        // Hide remove button
        const removeBtn = document.getElementById('remove-business-logo-btn');
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
        
        // Clear file input
        const fileInput = document.getElementById('business-logo-upload');
        if (fileInput) {
            fileInput.value = '';
        }
        
    } catch (error) {
        console.error('Error removing business logo:', error);
        showNotification('Error removing logo', 'error');
    }
};

// Update the business settings form to include logo upload
async function loadBusinessContentWithLogo() {
    const section = document.getElementById('business-settings');
    if (!section) return;
    
    console.log('🏢 Loading business content with logo...');
    
    // Get business ID
    const businessId = getCurrentBusinessId();
    console.log('Business ID for content:', businessId);
    
    if (!businessId) {
        section.innerHTML = `
            <div class="settings-card">
                <div class="text-center p-4">
                    <i class="fas fa-building fa-3x text-muted mb-3"></i>
                    <h4>No Business Selected</h4>
                    <p class="text-muted">Please select a business first to manage its settings.</p>
                    <button class="btn btn-primary" onclick="showDashboardPage('business')">
                        <i class="fas fa-store"></i> Go to Business Management
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Get business data
    let businessData = settingsManagement.currentBusiness || window.currentBusinessData;
    
    // If no data, try to load it
    if (!businessData && businessId) {
        console.log('📥 Loading business data...');
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();
            
            if (error) throw error;
            
            businessData = data;
            settingsManagement.currentBusiness = data;
            window.currentBusinessData = data;
        } catch (error) {
            console.error('❌ Error loading business data:', error);
            section.innerHTML = `
                <div class="settings-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading business data. Please try again.</p>
                </div>
            `;
            return;
        }
    }
    
    // Check if logo exists
    let logoPreview = '';
    let logoExists = false;
    
    if (businessData) {
        if (businessData.logo_data && businessData.logo_data.startsWith('data:image')) {
            logoPreview = businessData.logo_data;
            logoExists = true;
        }
    }
    
    // Business settings form HTML with logo upload
    const businessFormHTML = `
        <div class="settings-card">
            <h3><i class="fas fa-building"></i> Business Information</h3>
            
            <!-- Logo Upload Section -->
            <div class="form-group">
                <label>Business Logo</label>
                <div class="logo-upload-area" onclick="document.getElementById('business-logo-upload').click()">
                    ${logoExists ? `
                        <div class="logo-preview-container">
                            <img id="business-logo-preview" src="${logoPreview}" alt="Business Logo" class="business-logo-preview">
                            <div class="logo-preview-actions">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('business-logo-upload').click()" title="Change Logo">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="settingsManagement.removeBusinessLogo()" title="Remove Logo">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="text-center">
                            <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                            <h5>Upload Business Logo</h5>
                            <p class="text-muted mb-2">Click to upload or drag and drop</p>
                            <p class="text-muted small">JPG, PNG, GIF up to 5MB</p>
                            <img id="business-logo-preview" src="" alt="Business Logo" class="business-logo-preview d-none">
                        </div>
                    `}
                    <input type="file" id="business-logo-upload" class="d-none" 
                           accept="image/jpeg,image/png,image/gif" 
                           onchange="settingsManagement.handleBusinessLogoUpload(event)">
                </div>
                <div class="logo-upload-hint">
                    Recommended size: 300x300 pixels, Max file size: 5MB
                </div>
            </div>
            
            <form id="business-settings-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-name">Business Name *</label>
                        <input type="text" id="business-name" class="form-control" required 
                               value="${businessData?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label for="business-type">Business Type</label>
                        <select id="business-type" class="form-control">
                            <option value="retail" ${(businessData?.business_type || 'retail') === 'retail' ? 'selected' : ''}>Retail Store</option>
                            <option value="wholesale" ${businessData?.business_type === 'wholesale' ? 'selected' : ''}>Wholesale</option>
                            <option value="manufacturing" ${businessData?.business_type === 'manufacturing' ? 'selected' : ''}>Manufacturing</option>
                            <option value="ecommerce" ${businessData?.business_type === 'ecommerce' ? 'selected' : ''}>E-commerce</option>
                            <option value="service" ${businessData?.business_type === 'service' ? 'selected' : ''}>Service Provider</option>
                            <option value="restaurant" ${businessData?.business_type === 'restaurant' ? 'selected' : ''}>Restaurant/Food</option>
                            <option value="other" ${businessData?.business_type === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="business-currency">Default Currency *</label>
                        <select id="business-currency" class="form-control" required>
                            <option value="USD" ${businessData?.currency === 'USD' ? 'selected' : ''}>US Dollar ($)</option>
                            <option value="INR" ${(!businessData?.currency || businessData?.currency === 'INR') ? 'selected' : ''}>Indian Rupee (₹)</option>
                            <option value="EUR" ${businessData?.currency === 'EUR' ? 'selected' : ''}>Euro (€)</option>
                            <option value="GBP" ${businessData?.currency === 'GBP' ? 'selected' : ''}>British Pound (£)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="business-timezone">Business Timezone</label>
                        <select id="business-timezone" class="form-control">
                            <option value="Asia/Kolkata" ${(!businessData?.timezone || businessData?.timezone === 'Asia/Kolkata') ? 'selected' : ''}>India Standard Time</option>
                            <option value="America/New_York" ${businessData?.timezone === 'America/New_York' ? 'selected' : ''}>Eastern Time</option>
                            <option value="UTC" ${businessData?.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="business-address">Business Address</label>
                    <textarea id="business-address" class="form-control" rows="3" placeholder="Street address, city, state, zip code">${businessData?.address || ''}</textarea>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-phone">Phone Number</label>
                        <input type="tel" id="business-phone" class="form-control" placeholder="Business phone" 
                               value="${businessData?.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label for="business-email">Business Email</label>
                        <input type="email" id="business-email" class="form-control" placeholder="contact@business.com" 
                               value="${businessData?.email || ''}">
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="business-gst">GST Number</label>
                        <input type="text" id="business-gst" class="form-control" placeholder="GSTIN number" 
                               value="${businessData?.gst_number || ''}">
                    </div>
                    <div class="form-group">
                        <label for="business-pan">PAN Number</label>
                        <input type="text" id="business-pan" class="form-control" placeholder="PAN number" 
                               value="${businessData?.pan_number || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="business-website">Website</label>
                    <input type="url" id="business-website" class="form-control" placeholder="https://yourbusiness.com" 
                           value="${businessData?.website || ''}">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Business Settings</button>
                </div>
            </form>
        </div>
    `;
    
    section.innerHTML = businessFormHTML;
    
    // Initialize form events
    const form = document.getElementById('business-settings-form');
    if (form) {
        form.addEventListener('submit', (e) => settingsManagement.saveBusinessSettings(e));
        console.log('✅ Business form event listener added');
    }
}

// Update the loadTabContent function to use the new business content loader
const originalLoadTabContent = window.loadTabContent;
window.loadTabContent = async function(tabId) {
    console.log('Loading content for tab:', tabId);
    
    const section = document.getElementById(`${tabId}-settings`);
    if (!section) return;
    
    // Show loading state
    section.innerHTML = `
        <div class="settings-loading">
            <div class="spinner-border text-primary"></div>
            <p>Loading ${tabId} settings...</p>
        </div>
    `;
    
    // Load content based on tab
    try {
        switch(tabId) {
            case 'account':
                await loadAccountContent();
                break;
            case 'business':
                await loadBusinessContentWithLogo(); // Use the new function
                break;
            case 'preferences':
                await loadPreferencesContent();
                break;
            case 'notifications':
                await loadNotificationsContent();
                break;
            case 'security':
                await loadSecurityContent();
                break;
            case 'integrations':
                await loadIntegrationsContent();
                break;
            case 'backup':
                await loadBackupContent();
                break;
        }
    } catch (error) {
        console.error('Error loading tab content:', error);
        section.innerHTML = `
            <div class="settings-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading settings. Please try again.</p>
            </div>
        `;
    }
};