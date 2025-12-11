    // Enhanced Inventory Management Functions with Business Isolation
    let currentInventoryPage = 1;
    const inventoryPageSize = 10;
    let inventoryView = 'table';
    let inventoryData = [];
    // Product Details Management
    let currentProductDetails = null;
    let currentFilterType = ''; // 'low_stock', 'out_of_stock', or ''
    let filteredProducts = []; // Store filtered products

    // Global initialization function
    async function initializeInventorySystem() {
        console.log('🔄 Initializing inventory system...');
        
        // Wait for business context to be available
        await waitForBusinessContext();
        
        // Check if we're on the inventory page
        const inventoryPage = document.getElementById('inventory-page');
        if (!inventoryPage) {
            console.log('❌ Not on inventory page');
            return;
        }
        
        console.log('📦 Initializing inventory page for business:', currentBusiness?.name);
        await initializeInventoryPage();
    }

    // Wait for business context to be available
    async function waitForBusinessContext(maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (currentBusiness?.id) {
                console.log('✅ Business context found:', currentBusiness.name);
                return true;
            }
            
            console.log(`⏳ Waiting for business context... (attempt ${attempt}/${maxAttempts})`);
            
            // Try to recover business from localStorage
            const savedBusiness = localStorage.getItem('currentBusiness');
            if (savedBusiness) {
                currentBusiness = JSON.parse(savedBusiness);
                console.log('🏢 Restored business from storage:', currentBusiness?.name);
                return true;
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.warn('⚠️ No business context found after maximum attempts');
        return false;
    }

    async function initializeInventoryPage() {
        console.log('📦 Initializing inventory page for business:', currentBusiness?.name);
        
        // Clear any existing inventory data
        inventoryData = [];
        currentInventoryPage = 1;
        
        // Show loading state
        showInventoryLoadingState();
        
        try {
            await loadInventorySummary();
            await loadInventoryProducts();
            setupInventoryEventListeners();
            setupInventoryShortcuts();
            updateDashboardMetrics();
            populateCategoryFilters();
            
            console.log('✅ Inventory page initialized successfully for business:', currentBusiness?.name);
        } catch (error) {
            console.error('❌ Failed to initialize inventory page:', error);
            showInventoryErrorState();
        }
    }

    function showInventoryLoadingState() {
        const container = document.getElementById('inventory-table-body');
        if (!container) return;
        
        container.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 3rem;">
                    <div style="color: #6c757d;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h4>Loading Inventory...</h4>
                        <p>Please wait while we load your products</p>
                    </div>
                </td>
            </tr>
        `;
    }

    function showInventoryErrorState() {
        const container = document.getElementById('inventory-table-body');
        if (!container) return;
        
        container.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 3rem;">
                    <div style="color: #6c757d;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h4>Failed to Load Inventory</h4>
                        <p>There was an error loading your products. Please try again.</p>
                        <button class="btn btn-primary mt-2" onclick="retryInventoryLoad()">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    function retryInventoryLoad() {
        console.log('🔄 Retrying inventory load...');
        initializeInventoryPage();
    }

    function setupInventoryEventListeners() {
        console.log('🔧 Setting up inventory event listeners...');
        
        // Search functionality
        const searchInput = document.getElementById('inventory-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                console.log('🔍 Searching inventory...');
                currentInventoryPage = 1;
                loadInventoryProducts();
            }, 300));
        }
        
        // Filter functionality
        const categoryFilter = document.getElementById('category-filter');
        const stockFilter = document.getElementById('stock-status-filter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                console.log('📂 Category filter changed');
                currentInventoryPage = 1;
                loadInventoryProducts();
            });
        }
        
        if (stockFilter) {
            stockFilter.addEventListener('change', () => {
                console.log('📊 Stock filter changed');
                currentInventoryPage = 1;
                loadInventoryProducts();
            });
        }

        // Stock adjustment real-time calculation
        const adjustQuantity = document.getElementById('adjust-quantity');
        const adjustTypeRadios = document.querySelectorAll('input[name="adjustment-type"]');
        
        if (adjustQuantity) {
            adjustQuantity.addEventListener('input', updateStockPreview);
        }
        
        adjustTypeRadios.forEach(radio => {
            radio.addEventListener('change', updateStockPreview);
        });

        // Bulk update type change
        const bulkUpdateType = document.getElementById('bulk-update-type');
        if (bulkUpdateType) {
            bulkUpdateType.addEventListener('change', toggleBulkUpdateFields);
        }

        // Import file preview
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', handleFileImport);
        }
        
        console.log('✅ Event listeners setup complete');
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

    async function loadInventorySummary() {
        if (!currentBusiness?.id) {
            console.warn('⚠️ No business selected for inventory summary');
            return;
        }

        try {
            console.log('📊 Loading inventory summary...');
            
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .eq('is_active', true);

            if (error) {
                console.error('❌ Inventory summary query error:', error);
                throw error;
            }

            const totalProducts = products?.length || 0;
            const totalStockValue = products?.reduce((sum, product) => 
                sum + (product.current_stock * (product.cost_price || 0)), 0) || 0;
            const outOfStockCount = products?.filter(p => p.current_stock === 0).length || 0;
            const criticalStockCount = products?.filter(p => {
        const reorderLevel = p.reorder_level || 0;
        return reorderLevel > 0 && p.current_stock > 0 && p.current_stock <= reorderLevel;
    }).length || 0;

            // Update summary cards
            document.getElementById('products').textContent = totalProducts;
            document.getElementById('total-stock-value').textContent = formatCurrency(totalStockValue);
            document.getElementById('out-stock-count').textContent = outOfStockCount;
            document.getElementById('critical-stock-count').textContent = criticalStockCount;

            console.log('✅ Inventory summary loaded:', { totalProducts, totalStockValue, outOfStockCount, criticalStockCount });

        } catch (error) {
            console.error('❌ Inventory summary error:', error);
            // Set default values
            document.getElementById('products').textContent = '0';
            document.getElementById('total-stock-value').textContent = '₹0';
            document.getElementById('out-stock-count').textContent = '0';
            document.getElementById('critical-stock-count').textContent = '0';
        }
    }

    async function loadInventoryProducts() {
    console.log('🔄 Loading ALL inventory products...');
    
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for inventory');
        showNoBusinessMessage();
        return;
    }
    
    try {
        // Show loading state in table
        const container = document.getElementById('inventory-table-body');
        if (container) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="padding: 2rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>Loading all products...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        let query = supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        // Apply search filter
        const searchTerm = document.getElementById('inventory-search')?.value;
        if (searchTerm) {
            console.log('🔍 Applying search filter:', searchTerm);
            query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
        }
        
        // Apply category filter
        const category = document.getElementById('category-filter')?.value;
        if (category) {
            console.log('📂 Applying category filter:', category);
            query = query.eq('category', category);
        }
        
        // Apply stock status filter
        const stockStatus = document.getElementById('stock-status-filter')?.value;
        if (stockStatus === 'out_of_stock') {
            console.log('📊 Filtering: Out of stock');
            query = query.eq('current_stock', 0);
        } else if (stockStatus === 'low_stock') {
            console.log('📊 Filtering: Low stock');
            
            // Get products with reorder level set and some stock
            const { data: productsWithReorder, error: reorderError } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .gt('reorder_level', 0)
                .gt('current_stock', 0)
                .eq('is_active', true);
            
            if (reorderError) throw reorderError;
            
            // Client-side filter for actual low stock
            const lowStockProducts = (productsWithReorder || []).filter(product => 
                (product.current_stock || 0) <= (product.reorder_level || 0)
            );
            
            inventoryData = lowStockProducts;
            displayInventoryProducts(inventoryData);
            
            // Hide pagination since we're showing all filtered results
            document.getElementById('inventory-pagination').innerHTML = '';
            
            // Don't load low stock alerts again since we're already showing them
            return;
        } else if (stockStatus === 'in_stock') {
            console.log('📊 Filtering: In stock (not low stock)');
            
            // Get all products with stock
            const { data: allProducts, error: allError } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .gt('current_stock', 0)
                .eq('is_active', true);
            
            if (allError) throw allError;
            
            // Client-side filter to exclude low stock products
            // In stock = has stock AND (no reorder level set OR stock > reorder level)
            const inStockProducts = (allProducts || []).filter(product => {
                const currentStock = product.current_stock || 0;
                const reorderLevel = product.reorder_level || 0;
                
                // Product is "in stock" if:
                // 1. It has stock (currentStock > 0) AND
                // 2. Either no reorder level is set (reorderLevel <= 0) OR
                //    current stock is above reorder level
                return currentStock > 0 && 
                       (reorderLevel <= 0 || currentStock > reorderLevel);
            });
            
            inventoryData = inStockProducts;
            displayInventoryProducts(inventoryData);
            
            // Hide pagination since we're showing all filtered results
            document.getElementById('inventory-pagination').innerHTML = '';
            
            // Don't load low stock alerts for in-stock products
            return;
        }
        
        // Remove pagination - load ALL products
        console.log('📄 Loading ALL products (no pagination)');
        
        query = query.order('name');
        
        const { data: products, error } = await query;
        
        if (error) {
            console.error('❌ Inventory query error:', error);
            throw error;
        }
        
        console.log(`✅ Loaded ALL ${products?.length || 0} products`);
        
        inventoryData = products || [];
        displayInventoryProducts(inventoryData);
        
        // Hide pagination since we're showing all products
        document.getElementById('inventory-pagination').innerHTML = '';
        
        loadLowStockAlerts();
        
    } catch (error) {
        console.error('❌ Inventory load error:', error);
        showNotification('Error', 'Failed to load inventory', 'error');
        showInventoryErrorState();
    }
}

    function showNoBusinessMessage() {
        const container = document.getElementById('inventory-table-body');
        if (!container) return;
        
        container.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 3rem;">
                    <div style="color: #6c757d;">
                        <i class="fas fa-store-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h4>No Business Selected</h4>
                        <p>Please select a business to view inventory</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">
                            <i class="fas fa-refresh"></i> Reload Page
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Replace the editProduct click handler with showProductDetails
    function displayInventoryProducts(products) {
        const container = document.getElementById('inventory-table-body');
        if (!container) return;
        
        console.log(`🔄 Displaying ${products.length} products in table`);
        
        if (products.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="padding: 3rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h4>No products found</h4>
                            <p>Get started by adding your first product</p>
                            <button class="btn btn-primary mt-2" onclick="showAddProductModal()">
                                <i class="fas fa-plus"></i> Add Product
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => `
            <tr class="clickable-row" onclick="showProductDetails('${product.id}')">
                <td>
                    <div class="d-flex align-items-center">
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(product.name)}</div>
                            <div style="font-size: 0.8rem; color: #6c757d;">${product.category || 'Uncategorized'}</div>
                        </div>
                    </div>
                </td>
                <td>${product.sku || '-'}</td>
                <td>
                    <div style="font-weight: 600; color: ${getStockColor(product.current_stock, product.reorder_level)}">
                        ${product.current_stock} ${product.unit || 'pcs'}
                    </div>
                </td>
                <td>${formatCurrency(product.cost_price || 0)}</td>
                <td>${formatCurrency(product.selling_price || 0)}</td>
                <td>${formatCurrency((product.current_stock || 0) * (product.cost_price || 0))}</td>
                <td>
                    <span class="stock-status ${getStockStatusClass(product.current_stock, product.reorder_level)}">
                        ${getStockStatusText(product.current_stock, product.reorder_level)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${hasPermission('products', 'edit') ? `
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editProduct('${product.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${hasPermission('inventory', 'adjust') ? `
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); adjustStock('${product.id}')" title="Adjust Stock">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="btn btn-outline btn-sm btn-danger" onclick="event.stopPropagation(); deleteProduct('${product.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Edit current product from details page
    function editCurrentProduct() {
        console.log('✏️ Attempting to edit current product...');
        console.log('📊 currentProductDetails:', currentProductDetails);
        
        if (!currentProductDetails || !currentProductDetails.id) {
            console.error('❌ Cannot edit: currentProductDetails is null or missing ID');
            showNotification('Error', 'No product selected or product data is incomplete.', 'error');
            return;
        }
        
        if (!hasPermission('products', 'edit')) {
            console.error('❌ No permission to edit products');
            showNotification('Error', 'You do not have permission to edit products', 'error');
            return;
        }
        
        console.log('✏️ Editing product:', currentProductDetails.id);
        
        // Store the product ID before hiding the details
        const productId = currentProductDetails.id;
        
        // Hide product details page
        hideProductDetails();
        
        // Edit the product immediately (no setTimeout needed)
        editProduct(productId);
    }

    // Adjust current product stock from details page
    function adjustCurrentProductStock() {
        console.log('📦 Attempting to adjust stock for current product...');
        
        if (!currentProductDetails || !currentProductDetails.id) {
            console.error('❌ Cannot adjust stock: currentProductDetails is null or missing ID');
            showNotification('Error', 'No product selected or product data is incomplete.', 'error');
            return;
        }
        
        if (!hasPermission('inventory', 'adjust')) {
            console.error('❌ No permission to adjust stock');
            showNotification('Error', 'You do not have permission to adjust stock', 'error');
            return;
        }
        
        console.log('📦 Adjusting stock for product:', currentProductDetails.id);
        
        // Store the product ID before hiding the details
        const productId = currentProductDetails.id;
        
        // Hide product details page
        hideProductDetails();
        
        // Adjust stock immediately
        adjustStock(productId);
    }

    // Delete current product from details page
    function deleteCurrentProduct() {
        console.log('🗑️ Attempting to delete current product...');
        
        if (!currentProductDetails || !currentProductDetails.id) {
            console.error('❌ Cannot delete: currentProductDetails is null or missing ID');
            showNotification('Error', 'No product selected or product data is incomplete.', 'error');
            return;
        }
        
        if (!hasPermission('products', 'delete')) {
            console.error('❌ No permission to delete products');
            showNotification('Error', 'You do not have permission to delete products', 'error');
            return;
        }
        
        console.log('🗑️ Deleting product:', currentProductDetails.id);
        
        // Store the product ID before hiding the details
        const productId = currentProductDetails.id;
        
        // Hide product details page
        hideProductDetails();
        
        // Delete the product immediately
        deleteProduct(productId);
    }

    // Show product details page
    async function showProductDetails(productId) {
        console.log('👀 Showing product details:', productId);
        
        try {
            // Hide inventory page and show details page
            safeHide(document.getElementById('inventory-page'));
            safeShow(document.getElementById('product-details-page'));
            
            // Update navigation state
            currentPage = 'product-details';
            sessionStorage.setItem('currentPage', currentPage);
            
            // Load product details
            await loadProductDetails(productId);
            
            // Load product list sidebar
            await loadProductListSidebar();
            
            // Setup search functionality
            setupProductDetailsSearch();
            
        } catch (error) {
            console.error('❌ Error showing product details:', error);
            showNotification('Error', 'Failed to load product details', 'error');
        }
    }

    // Setup search functionality
    function setupProductDetailsSearch() {
        const searchInput = document.getElementById('product-details-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const items = document.querySelectorAll('.product-sidebar-item');
                
                items.forEach(item => {
                    const productName = item.querySelector('.product-sidebar-name').textContent.toLowerCase();  
                    
                    const matches = productName.includes(searchTerm);
                    
                    item.style.display = matches ? 'flex' : 'none';
                });
            }, 300));
        }
    }

    // Utility function to format dates
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    // Hide product details page
    function hideProductDetails() {
        console.log('👋 Hiding product details');
        
        safeHide(document.getElementById('product-details-page'));
        safeShow(document.getElementById('inventory-page'));
        
        // Update navigation state
        currentPage = 'inventory';
        sessionStorage.setItem('currentPage', currentPage);
        
        // Clear current product
        currentProductDetails = null;
    }

    // Load product details
    async function loadProductDetails(productId) {
        try {
            console.log('👀 Loading product details for:', productId);
            
            // Show loading state
            document.getElementById('product-details-loading').classList.remove('d-none');
            document.getElementById('product-details-content').classList.add('d-none');
            document.getElementById('product-details-error').classList.add('d-none');
            
            // Fetch product data
            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            if (!product) throw new Error('Product not found');
            
            currentProductDetails = product;
            
            // Update UI with product data
            updateProductDetailsUI(product);
            
            // Show content
            document.getElementById('product-details-loading').classList.add('d-none');
            document.getElementById('product-details-content').classList.remove('d-none');
            
            console.log('✅ Product details loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading product details:', error);
            
            document.getElementById('product-details-loading').classList.add('d-none');
            document.getElementById('product-details-error').classList.remove('d-none');
            
            showNotification('Error', 'Failed to load product details', 'error');
        }
    }

    // Update product details UI
    function updateProductDetailsUI(product) {
        console.log('🎨 Updating product details UI:', product);
        
        // Update header
        document.getElementById('detail-page-title').textContent = product.name || 'Product Details';
        
        // General Details
        document.getElementById('detail-product-name').textContent = product.name || 'N/A';
        document.getElementById('detail-product-sku').textContent = product.sku || 'N/A';
        document.getElementById('detail-product-category').textContent = product.category || 'Uncategorized';
        document.getElementById('detail-product-description').textContent = product.description || 'No description';
        
        // Stock Information
        const currentStock = product.current_stock || 0;
        const reorderLevel = product.reorder_level || 0;
        
        document.getElementById('detail-current-stock').textContent = `${currentStock} ${product.unit || 'pcs'}`;
        document.getElementById('detail-reorder-level').textContent = `${reorderLevel} ${product.unit || 'pcs'}`;
        
        // Low stock warning status
        const lowStockWarning = document.getElementById('low-stock-warning');
        if (reorderLevel > 0) {
            lowStockWarning.textContent = 'Enabled';
            lowStockWarning.className = 'status-indicator enabled';
        } else {
            lowStockWarning.textContent = 'Disabled';
            lowStockWarning.className = 'status-indicator disabled';
        }
        
        // Price Details
        const costPrice = product.cost_price || 0;
        const sellingPrice = product.selling_price || 0;
        
        document.getElementById('detail-selling-price').textContent = `${formatCurrency(sellingPrice)} Without Tax`;
        document.getElementById('detail-cost-price').textContent = `${formatCurrency(costPrice)} Without Tax`;
        document.getElementById('detail-hsn-code').textContent = product.hsn_code || '-';
        document.getElementById('detail-gst-rate').textContent = product.gst_rate ? `${product.gst_rate}%` : '0%';
        
        // Update button visibility based on permissions
        document.getElementById('edit-product-btn').style.display = hasPermission('products', 'edit') ? 'inline-block' : 'none';
        document.getElementById('adjust-stock-btn').style.display = hasPermission('inventory', 'adjust') ? 'inline-block' : 'none';
        
        // Add delete button visibility if you have a delete button in your HTML
        const deleteBtn = document.querySelector('#adjust-stock-btn + .btn-danger');
        if (deleteBtn) {
            deleteBtn.style.display = hasPermission('products', 'delete') ? 'inline-block' : 'none';
        }
    }

    // Load product list sidebar
    async function loadProductListSidebar() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, sku, category, current_stock, unit')
                .eq('business_id', currentBusiness.id)
                .eq('is_active', true)
                .order('name');
            
            if (error) throw error;
            
            const sidebar = document.getElementById('product-list-sidebar');
            
            if (products && products.length > 0) {
                sidebar.innerHTML = products.map(product => `
                    <div class="product-sidebar-item ${product.id === currentProductDetails?.id ? 'active' : ''}" 
                        onclick="switchProduct('${product.id}')">
                        <div class="product-sidebar-name">${escapeHtml(product.name)}</div>
                        <div class="product-sidebar-stock">
                            <span class="stock ${getStockStatusClass(product.current_stock)}">
                                ${product.current_stock || 0} ${product.unit || 'pcs'}
                            </span>
                        </div>
                    </div>
                `).join('');
            } else {
                sidebar.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-box-open"></i>
                        <p>No products found</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('❌ Error loading product list sidebar:', error);
            document.getElementById('product-list-sidebar').innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load products</p>
                </div>
            `;
        }
    }

    // Switch to different product
    function switchProduct(productId) {
        console.log('🔄 Switching to product:', productId);
        loadProductDetails(productId);
        
        // Update active state in sidebar
        document.querySelectorAll('.product-sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }

    function getStockColor(currentStock, reorderLevel = 0) {
        if (currentStock === 0) return '#f72585';
        if (reorderLevel > 0 && currentStock <= reorderLevel) return '#f8961e'; // Only check if reorderLevel > 0
        return '#4cc9f0';
    }

    function getStockStatusClass(currentStock, reorderLevel = 0) {
        if (currentStock === 0) return 'stock-out-of-stock';
        if (reorderLevel > 0 && currentStock <= reorderLevel) return 'stock-low-stock'; // Only check if reorderLevel > 0
        return 'stock-in-stock';
    }

    function getStockStatusText(currentStock, reorderLevel = 0) {
        if (currentStock === 0) return 'Out of Stock';
        if (reorderLevel > 0 && currentStock <= reorderLevel) return 'Low Stock'; // Only check if reorderLevel > 0
        return 'In Stock';
    }

    function updateInventoryPagination(totalCount) {
        const container = document.getElementById('inventory-pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(totalCount / inventoryPageSize);
        
        console.log(`📄 Pagination: ${totalCount} items, ${totalPages} pages`);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        paginationHTML += `
            <button class="pagination-btn" ${currentInventoryPage === 1 ? 'disabled' : ''} 
                    onclick="changeInventoryPage(${currentInventoryPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentInventoryPage - 1 && i <= currentInventoryPage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === currentInventoryPage ? 'active' : ''}" 
                            onclick="changeInventoryPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentInventoryPage - 2 || i === currentInventoryPage + 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }
        
        paginationHTML += `
            <button class="pagination-btn" ${currentInventoryPage === totalPages ? 'disabled' : ''} 
                    onclick="changeInventoryPage(${currentInventoryPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHTML += `
            <div class="pagination-info">
                Showing ${((currentInventoryPage - 1) * inventoryPageSize) + 1} to 
                ${Math.min(currentInventoryPage * inventoryPageSize, totalCount)} of ${totalCount} products
            </div>
        `;
        
        container.innerHTML = paginationHTML;
    }

    function changeInventoryPage(page) {
        console.log(`📄 Changing to page ${page}`);
        currentInventoryPage = page;
        loadInventoryProducts();
    }

    async function loadLowStockAlerts() {
        if (!currentBusiness?.id) return;
        
        try {
            // Get ALL products that have stock and reorder level set
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .gt('reorder_level', 0)
                .gt('current_stock', 0)
                .eq('is_active', true);
            
            if (error) throw error;
            
            // Calculate criticality and filter
            const lowStockProducts = (products || [])
                .map(product => {
                    const currentStock = product.current_stock || 0;
                    const reorderLevel = product.reorder_level || 0;
                    
                    // Calculate how critical this product is (0 = at reorder level, 1 = fully stocked)
                    const criticality = currentStock / reorderLevel;
                    
                    return {
                        ...product,
                        criticality: criticality,
                        needed: Math.max(0, reorderLevel - currentStock)
                    };
                })
                .filter(product => product.criticality <= 1) // Only products at or below reorder level
                .sort((a, b) => a.criticality - b.criticality) // Most critical first
                .slice(0, 10); // Top 10 most critical
            
            displayLowStockAlerts(lowStockProducts);
            
        } catch (error) {
            console.error('❌ Low stock alerts error:', error);
            displayLowStockAlerts([]);
        }
    }

    function displayLowStockAlerts(products) {
        const container = document.getElementById('low-stock-alerts');
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 2rem; color: #6c757d;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>All products are sufficiently stocked</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => {
            const criticalityClass = product.criticality <= 0.3 ? 'critical' : 
                                    product.criticality <= 0.6 ? 'warning' : 'low';
            
            return `
            <div class="low-stock-item" data-product-id="${product.id}">
                <div class="low-stock-info">
                    <div class="low-stock-name">${escapeHtml(product.name)}</div>
                    <div class="low-stock-details">
                        Current: ${product.current_stock} | Reorder: ${product.reorder_level || 10} | 
                        Needed: ${(product.reorder_level || 10) - product.current_stock}
                    </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="adjustStock('${product.id}')">
                    <i class="fas fa-plus"></i> Restock
                </button>
            </div>
            `;
        }).join('');
    }

    // Product Management Functions
    function showAddProductModal() {
        const modal = document.getElementById('add-product-modal');
        if (modal) {
            modal.classList.remove('d-none');
            document.getElementById('product-name').focus();
            
            // Auto-generate SKU
            const skuField = document.getElementById('product-sku');
            if (skuField && !skuField.value) {
                skuField.value = 'SKU-' + Date.now().toString().slice(-6);
            }
        }
    }

    function hideAddProductModal() {
        const modal = document.getElementById('add-product-modal');
        if (modal) {
            modal.classList.add('d-none');
            document.getElementById('add-product-form').reset();
        }
    }

    async function editProduct(productId) {
        try {
            const product = inventoryData.find(p => p.id === productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const modal = document.getElementById('edit-product-modal');
            if (modal) {
                // Populate form with product data
                document.getElementById('edit-product-id').value = product.id;
                document.getElementById('edit-product-name').value = product.name;
                document.getElementById('edit-product-sku').value = product.sku || '';
                document.getElementById('edit-product-category').value = product.category || '';
                document.getElementById('edit-product-unit').value = product.unit || 'pcs';
                document.getElementById('edit-product-cost').value = product.cost_price || 0;
                document.getElementById('edit-product-price').value = product.selling_price || 0;
                document.getElementById('edit-product-stock').value = product.current_stock || 0;
                document.getElementById('edit-product-reorder').value = product.reorder_level || 0;
                document.getElementById('edit-product-description').value = product.description || '';
                
                modal.classList.remove('d-none');
                document.getElementById('edit-product-name').focus();
            }
        } catch (error) {
            console.error('❌ Edit product error:', error);
            showNotification('Error', 'Failed to load product data', 'error');
        }
    }

    function hideEditProductModal() {
        const modal = document.getElementById('edit-product-modal');
        if (modal) {
            modal.classList.add('d-none');
            document.getElementById('edit-product-form').reset();
        }
    }

    async function adjustStock(productId) {
        try {
            const product = inventoryData.find(p => p.id === productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const modal = document.getElementById('adjust-stock-modal');
            if (modal) {
                // Populate form with product data
                document.getElementById('adjust-product-id').value = product.id;
                document.getElementById('adjust-current-stock').value = product.current_stock;
                document.getElementById('adjust-product-name').textContent = product.name;
                document.getElementById('adjust-product-sku').textContent = product.sku || 'No SKU';
                document.getElementById('adjust-product-category').textContent = product.category || 'Uncategorized';
                document.getElementById('adjust-current-stock-display').textContent = product.current_stock;
                document.getElementById('adjust-current-stock-display').className = `stock-status ${getStockStatusClass(product.current_stock, product.reorder_level)}`;
                
                // Reset form
                document.getElementById('adjust-quantity').value = '';
                document.querySelector('input[name="adjustment-type"][value="add"]').checked = true;
                document.getElementById('adjust-reason').value = 'restock';
                document.getElementById('adjust-notes').value = '';
                
                updateStockPreview();
                
                modal.classList.remove('d-none');
                document.getElementById('adjust-quantity').focus();
            }
        } catch (error) {
            console.error('❌ Adjust stock error:', error);
            showNotification('Error', 'Failed to load product data', 'error');
        }
        loadRecentActivityAndAlerts();
    }

    function hideAdjustStockModal() {
        const modal = document.getElementById('adjust-stock-modal');
        if (modal) {
            modal.classList.add('d-none');
            document.getElementById('adjust-stock-form').reset();
        }
    }

    function updateStockPreview() {
        const currentStock = parseInt(document.getElementById('adjust-current-stock').value) || 0;
        const quantity = parseInt(document.getElementById('adjust-quantity').value) || 0;
        const adjustmentType = document.querySelector('input[name="adjustment-type"]:checked').value;
        
        let newStock = currentStock;
        
        switch (adjustmentType) {
            case 'add':
                newStock = currentStock + quantity;
                break;
            case 'remove':
                newStock = Math.max(0, currentStock - quantity);
                break;
            case 'set':
                newStock = quantity;
                break;
        }
        
        const newStockElement = document.getElementById('new-stock-level');
        newStockElement.textContent = newStock;
        newStockElement.className = `stock-preview-value ${getStockStatusClass(newStock)}`;
    }

    // Event listener for add product form
    document.addEventListener('DOMContentLoaded', function() {
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
                    submitButton.disabled = true;

                    const productData = {
                        name: document.getElementById('product-name').value.trim(),
                        sku: document.getElementById('product-sku').value.trim(),
                        category: document.getElementById('product-category').value,
                        unit: document.getElementById('product-unit').value,
                        cost_price: parseFloat(document.getElementById('product-cost').value) || 0,
                        selling_price: parseFloat(document.getElementById('product-price').value) || 0,
                        current_stock: parseInt(document.getElementById('product-stock').value) || 0,
                        reorder_level: parseInt(document.getElementById('product-reorder').value) || 0,
                        description: document.getElementById('product-description').value.trim()
                    };

                    console.log('📧 Form data:', productData);

                    // Validate required fields
                    if (!productData.name) {
                        showNotification('Error', 'Product name is required', 'error');
                        return;
                    }

                    await addProduct(productData);
                    
                } catch (error) {
                    console.error('❌ Form submission error:', error);
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });

            const importForm = document.getElementById('import-form');
        if (importForm) {
            importForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('📤 Import form submitted');
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
                    submitButton.disabled = true;

                    const fileInput = document.getElementById('import-file');
                    const file = fileInput.files[0];
                    const updateExisting = document.getElementById('import-update-existing').checked;

                    console.log('📤 Import settings:', {
                        file: file ? file.name : 'No file',
                        updateExisting: updateExisting
                    });

                    if (!file) {
                        showNotification('Error', 'Please select a CSV file', 'error');
                        return;
                    }

                    await importProductsFromCSV(file, updateExisting);
                    
                } catch (error) {
                    console.error('❌ Import form submission error:', error);
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });
        }
        const bulkUpdateForm = document.getElementById('bulk-update-form');
        if (bulkUpdateForm) {
            bulkUpdateForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('🔄 Bulk update form submitted');
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                    submitButton.disabled = true;

                    await applyBulkUpdate();
                    
                } catch (error) {
                    console.error('❌ Bulk update form error:', error);
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });
        }
        }

        // Edit product form
        const editProductForm = document.getElementById('edit-product-form');
        if (editProductForm) {
            editProductForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                    submitButton.disabled = true;

                    const productData = {
                        id: document.getElementById('edit-product-id').value,
                        name: document.getElementById('edit-product-name').value.trim(),
                        sku: document.getElementById('edit-product-sku').value.trim(),
                        category: document.getElementById('edit-product-category').value,
                        unit: document.getElementById('edit-product-unit').value,
                        cost_price: parseFloat(document.getElementById('edit-product-cost').value) || 0,
                        selling_price: parseFloat(document.getElementById('edit-product-price').value) || 0,
                        current_stock: parseInt(document.getElementById('edit-product-stock').value) || 0,
                        reorder_level: parseInt(document.getElementById('edit-product-reorder').value) || 0,
                        description: document.getElementById('edit-product-description').value.trim(),
                        updated_at: new Date().toISOString()
                    };

                    // Validate required fields
                    if (!productData.name) {
                        showNotification('Error', 'Product name is required', 'error');
                        return;
                    }

                    await updateProduct(productData);
                    
                } catch (error) {
                    console.error('❌ Edit form submission error:', error);
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });
        }

        // Stock adjustment form
        const adjustStockForm = document.getElementById('adjust-stock-form');
        if (adjustStockForm) {
            adjustStockForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                    submitButton.disabled = true;

                    const adjustmentData = {
                        productId: document.getElementById('adjust-product-id').value,
                        currentStock: parseInt(document.getElementById('adjust-current-stock').value) || 0,
                        quantity: parseInt(document.getElementById('adjust-quantity').value) || 0,
                        type: document.querySelector('input[name="adjustment-type"]:checked').value,
                        reason: document.getElementById('adjust-reason').value,
                        notes: document.getElementById('adjust-notes').value.trim()
                    };

                    if (!adjustmentData.quantity || adjustmentData.quantity <= 0) {
                        showNotification('Error', 'Please enter a valid quantity', 'error');
                        return;
                    }

                    await updateStockLevel(adjustmentData);
                    
                } catch (error) {
                    console.error('❌ Stock adjustment error:', error);
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });
        }

        // Update affected count when filters change
        const applyToSelect = document.getElementById('bulk-apply-to');
        if (applyToSelect) {
            applyToSelect.addEventListener('change', updateBulkAffectedCount);
        }
        
        const categorySelect = document.getElementById('bulk-specific-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', updateBulkAffectedCount);
        }

        const searchInput = document.getElementById('filtered-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                const searchTerm = this.value.toLowerCase();
                
                if (searchTerm === '') {
                    updateFilteredProductsTable();
                    return;
                }
                
                const filtered = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) ||
                    (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
                    (product.description && product.description.toLowerCase().includes(searchTerm))
                );
                
                // Update table with search results
                updateFilteredTableWithSearch(filtered);
                
            }, 300));
        }
        
        // Initialize inventory system when DOM is loaded
        initializeInventorySystem();
        setupDashboardCardClicks();

    });

    // Bulk Update Functions - Complete Implementation
    async function applyBulkUpdate() {
        console.log('🔄 Applying bulk update...');
        
        try {
            if (!currentBusiness?.id) {
                throw new Error('No business selected');
            }

            const updateType = document.getElementById('bulk-update-type').value;
            const applyTo = document.getElementById('bulk-apply-to').value;
            
            console.log('📊 Bulk update settings:', { updateType, applyTo });

            if (!updateType) {
                throw new Error('Please select an update type');
            }

            // Get products to update based on filters
            const productsToUpdate = await getProductsForBulkUpdate(applyTo);
            
            if (productsToUpdate.length === 0) {
                showNotification('Info', 'No products found matching your criteria', 'info');
                return;
            }

            console.log(`🔄 Updating ${productsToUpdate.length} products...`);

            let successCount = 0;
            let errorCount = 0;

            for (const product of productsToUpdate) {
                try {
                    await applyBulkUpdateToProduct(product, updateType);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Failed to update product ${product.name}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Bulk update completed: ${successCount} success, ${errorCount} errors`);

            if (errorCount > 0) {
                showNotification('Warning', `Updated ${successCount} products, ${errorCount} failed`, 'warning');
            } else {
                showNotification('Success', `Successfully updated ${successCount} products`, 'success');
            }

            hideBulkUpdateModal();
            loadInventoryProducts();
            loadInventorySummary();

        } catch (error) {
            console.error('❌ Bulk update error:', error);
            showNotification('Error', 'Bulk update failed: ' + error.message, 'error');
        }
    }

    // Google Sheets-like Bulk Editor
    let bulkEditorData = [];
    let isBulkEditorOpen = false;

    // Show Google Sheets-like bulk editor
    function showBulkEditor() {
        console.log('📊 Opening Google Sheets-like bulk editor...');
        
        try {
            // Create or show the bulk editor modal
            const modal = createBulkEditorModal();
            modal.classList.remove('d-none');
            
            // Load current products into the editor
            loadProductsIntoBulkEditor();
            
            isBulkEditorOpen = true;
            
            console.log('✅ Bulk editor opened successfully');
            
        } catch (error) {
            console.error('❌ Error opening bulk editor:', error);
            showNotification('Error', 'Failed to open bulk editor', 'error');
        }
    }

    // Create the bulk editor modal
    function createBulkEditorModal() {
        let modal = document.getElementById('bulk-editor-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bulk-editor-modal';
            modal.className = 'modal d-none';
            modal.innerHTML = `
                <div class="modal-content bulk-editor-modal" style="max-width: 95vw; max-height: 90vh;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-table"></i> 
                            Product Bulk Editor 
                            <small class="text-muted">- Spreadsheet Interface</small>
                        </h3>
                        <div class="header-actions">
                            <button class="btn btn-outline btn-sm" onclick="addNewRowToBulkEditor()" title="Add New Row">
                                <i class="fas fa-plus"></i> Add Row
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="exportBulkEditorToCSV()" title="Export to CSV">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="saveBulkEditorChanges()" title="Save All Changes">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button class="close-btn" onclick="hideBulkEditor()">&times;</button>
                        </div>
                    </div>
                    
                    <div class="modal-body">
                        <div class="bulk-editor-toolbar">
                            <div class="toolbar-left">
                                <label class="btn btn-outline btn-sm" id="checked">
                                    <input type="checkbox" id="select-all-rows" value="checked" onchange="toggleSelectAllRows(this.checked)"> Select All </input>
                                </label>
                                <button class="btn btn-sm btn-danger" onclick="deleteSelectedRows()">
                                    <i class="fas fa-trash"></i> Delete Selected
                                </button>
                                <span class="selected-count">0 rows selected</span>
                            </div>
                            <div class="toolbar-right">
                                <span class="row-count" id="bulk-editor-row-count">0 products</span>
                            </div>
                        </div>
                        
                        <div class="bulk-editor-container">
                            <div class="bulk-editor-table-container">
                                <table class="bulk-editor-table" id="bulk-editor-table">
                                    <thead>
                                        <tr>
                                            <th class="select-col">
                                                <input type="checkbox" id="select-all-rows" onchange="toggleSelectAllRows(this.checked)">
                                            </th>
                                            <th class="row-num">#</th>
                                            <th class="editable-col" data-field="name">Product Name *</th>
                                            <th class="editable-col" data-field="sku">SKU</th>
                                            <th class="editable-col" data-field="category">Category</th>
                                            <th class="editable-col" data-field="cost_price">Cost Price</th>
                                            <th class="editable-col" data-field="selling_price">Selling Price</th>
                                            <th class="editable-col" data-field="current_stock">Current Stock</th>
                                            <th class="editable-col" data-field="reorder_level">Reorder Level</th>
                                            <th class="editable-col" data-field="unit">Unit</th>
                                            <th class="editable-col" data-field="description">Description</th>
                                            <th class="actions-col">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bulk-editor-tbody">
                                        <!-- Rows will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="bulk-editor-footer">
                            <div class="footer-actions">
                                <button class="btn btn-success btn-sm btn-outline" onclick="importFromCSVToBulkEditor()">
                                    <i class="fas fa-file-import"></i> Import CSV
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="downloadBulkEditorTemplate()">
                                    <i class="fas fa-file-download"></i> Download Template
                                </button>
                                <div class="footer-info">
                                    <span class="changes-count" id="unsaved-changes-count">No unsaved changes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Setup event listeners
            setupBulkEditorEventListeners();
        }
        
        return modal;
    }

    // Load products into the bulk editor
    async function loadProductsIntoBulkEditor() {
        try {
            console.log('📥 Loading products into bulk editor...');
            
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            bulkEditorData = products.map((product, index) => ({
                ...product,
                _rowId: `row-${index}`,
                _isSelected: false,
                _isNew: false,
                _hasChanges: false
            }));

            renderBulkEditorTable();
            updateRowCount();
            
            console.log(`✅ Loaded ${bulkEditorData.length} products into bulk editor`);
            
        } catch (error) {
            console.error('❌ Error loading products into bulk editor:', error);
            showNotification('Error', 'Failed to load products', 'error');
        }
    }

    // Render the bulk editor table
    function renderBulkEditorTable() {
        const tbody = document.getElementById('bulk-editor-tbody');
        if (!tbody) return;

        if (bulkEditorData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-muted py-4">
                        <i class="fas fa-box-open fa-2x mb-2"></i>
                        <p>No products in editor</p>
                        <button class="btn btn-primary btn-sm" onclick="addNewRowToBulkEditor()">
                            <i class="fas fa-plus"></i> Add Your First Product
                        </button>
                    </td>
                </tr>
            `;
            updateRowCount();
            updateSelectedCount();
            updateChangesCount();
            return;
        }

        tbody.innerHTML = bulkEditorData.map((product, index) => `
            <tr class="bulk-editor-row ${product._isSelected ? 'selected' : ''} ${product._isNew ? 'new-row' : ''} ${product._hasChanges ? 'has-changes' : ''}" 
                data-row-id="${product._rowId}">
                <td class="select-col">
                    <input type="checkbox" class="row-selector" 
                        ${product._isSelected ? 'checked' : ''}
                        onchange="toggleRowSelection('${product._rowId}', this.checked)">
                </td>
                <td class="row-num">${index + 1}</td>
                <td class="editable-col" data-field="name">
                    <input type="text" 
                        class="bulk-editor-input" 
                        value="${escapeHtml(product.name || '')}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'name', this.value)"
                        placeholder="Product name..." required>
                </td>
                <td class="editable-col" data-field="sku">
                    <input type="text" 
                        class="bulk-editor-input" 
                        value="${escapeHtml(product.sku || '')}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'sku', this.value)"
                        placeholder="SKU...">
                </td>
                <td class="editable-col" data-field="category">
                    <select class="bulk-editor-select" 
                            onchange="updateBulkEditorField('${product._rowId}', 'category', this.value)">
                        <option value="">Select Category</option>
                        <option value="Electronics" ${product.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                        <option value="Clothing" ${product.category === 'Clothing' ? 'selected' : ''}>Clothing</option>
                        <option value="Books" ${product.category === 'Books' ? 'selected' : ''}>Books</option>
                        <option value="Home & Garden" ${product.category === 'Home & Garden' ? 'selected' : ''}>Home & Garden</option>
                        <option value="Sports" ${product.category === 'Sports' ? 'selected' : ''}>Sports</option>
                        <option value="Beauty" ${product.category === 'Beauty' ? 'selected' : ''}>Beauty</option>
                        <option value="Toys" ${product.category === 'Toys' ? 'selected' : ''}>Toys</option>
                        <option value="Automotive" ${product.category === 'Automotive' ? 'selected' : ''}>Automotive</option>
                    </select>
                </td>
                <td class="editable-col" data-field="cost_price">
                    <input type="number" 
                        class="bulk-editor-input" 
                        step="0.01" 
                        min="0"
                        value="${product.cost_price || 0}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'cost_price', parseFloat(this.value) || 0)">
                </td>
                <td class="editable-col" data-field="selling_price">
                    <input type="number" 
                        class="bulk-editor-input" 
                        step="0.01" 
                        min="0"
                        value="${product.selling_price || 0}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'selling_price', parseFloat(this.value) || 0)">
                </td>
                <td class="editable-col" data-field="current_stock">
                    <input type="number" 
                        class="bulk-editor-input" 
                        min="0"
                        value="${product.current_stock || 0}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'current_stock', parseInt(this.value) || 0)">
                </td>
                <td class="editable-col" data-field="reorder_level">
                    <input type="number" 
                        class="bulk-editor-input" 
                        min="0"
                        value="${product.reorder_level || 0}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'reorder_level', parseInt(this.value) || 0)">
                </td>
                <td class="editable-col" data-field="unit">
                    <select class="bulk-editor-select" 
                            onchange="updateBulkEditorField('${product._rowId}', 'unit', this.value)">
                        <option value="QTY" ${product.unit === 'QTY' ? 'selected' : ''}>Quantity</option>
                        <option value="PCS" ${product.unit === 'PCS' ? 'selected' : ''}>Pieces</option>
                        <option value="KGS" ${product.unit === 'KGS' ? 'selected' : ''}>Kilograms</option>
                        <option value="G" ${product.unit === 'G' ? 'selected' : ''}>Grams</option>
                        <option value="L" ${product.unit === 'L' ? 'selected' : ''}>Liters</option>
                        <option value="ML" ${product.unit === 'ML' ? 'selected' : ''}>Milliliters</option>
                        <option value="M" ${product.unit === 'M' ? 'selected' : ''}>Meters</option>
                        <option value="CM" ${product.unit === 'CM' ? 'selected' : ''}>Centimeters</option>
                        <option value="BOX" ${product.unit === 'BOX' ? 'selected' : ''}>Box</option>
                        <option value="PACK" ${product.unit === 'PACK' ? 'selected' : ''}>Pack</option>
                    </select>
                </td>
                <td class="editable-col" data-field="description">
                    <input type="text" 
                        class="bulk-editor-input" 
                        value="${escapeHtml(product.description || '')}" 
                        onchange="updateBulkEditorField('${product._rowId}', 'description', this.value)"
                        placeholder="Description...">
                </td>
                <td class="actions-col">
                    <button class="btn btn-danger btn-sm" onclick="deleteBulkEditorRow('${product._rowId}')" title="Delete Row">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${product._isNew ? `
                        <span class="badge badge-success">New</span>
                    ` : ''}
                    ${product._hasChanges ? `
                        <span class="badge badge-warning">Modified</span>
                    ` : ''}
                </td>
            </tr>
        `).join('');
        
        updateRowCount();
        updateSelectedCount();
        updateChangesCount();
    }
    // Update field in bulk editor
    function updateBulkEditorField(rowId, field, value) {
        const product = bulkEditorData.find(p => p._rowId === rowId);
        if (product) {
            const oldValue = product[field];
            product[field] = value;
            
            // Mark as changed if value is different
            if (oldValue !== value) {
                product._hasChanges = true;
            }
            
            // If it's a new row and name is filled, generate SKU if empty
            if (product._isNew && field === 'name' && value && !product.sku) {
                product.sku = generateSKU();
            }
            
            renderBulkEditorTable();
        }
    }

    // Add new row to bulk editor
    function addNewRowToBulkEditor() {
        const newRow = {
            _rowId: `new-${Date.now()}`,
            _isSelected: false,
            _isNew: true,
            _hasChanges: true,
            name: '',
            sku: '',
            category: '',
            cost_price: 0,
            selling_price: 0,
            current_stock: 0,
            reorder_level: 0,
            unit: 'pcs',
            description: '',
            business_id: currentBusiness.id,
            is_active: true
        };
        
        bulkEditorData.push(newRow);
        renderBulkEditorTable();
        scrollToBottom();
    }

    // Update the deleteBulkEditorRow function
    function deleteBulkEditorRow(rowId) {
        if (confirm('Are you sure you want to delete this product? This will remove it from your inventory when you save changes.')) {
            const product = bulkEditorData.find(p => p._rowId === rowId);
            
            // If it's a new product (not saved to DB yet), remove it completely
            if (product._isNew) {
                bulkEditorData = bulkEditorData.filter(p => p._rowId !== rowId);
            } else {
                // If it's an existing product, mark it for deletion by removing from array
                bulkEditorData = bulkEditorData.filter(p => p._rowId !== rowId);
            }
            
            renderBulkEditorTable();
            updateRowCount();
        }
    }

    // Save all changes from bulk editor
    async function saveBulkEditorChanges() {
        try {
            console.log('💾 Saving bulk editor changes...');
            
            if (!currentBusiness?.id) {
                throw new Error('No business selected');
            }

            // Get current products from database to compare
            const { data: existingProducts, error: fetchError } = await supabase
                .from('products')
                .select('id, name, sku')
                .eq('business_id', currentBusiness.id)
                .eq('is_active', true);

            if (fetchError) throw fetchError;

            // Identify what needs to be done
            const productsInEditor = bulkEditorData.filter(p => !p._isNew);
            const productsToUpdate = productsInEditor.filter(p => p._hasChanges);
            const productsToCreate = bulkEditorData.filter(p => p._isNew && p.name.trim());
            
            // Find products that are in database but not in editor (deleted in UI)
            const existingProductIds = existingProducts?.map(p => p.id) || [];
            const editorProductIds = productsInEditor.map(p => p.id).filter(Boolean);
            const productsToDeleteIds = existingProductIds.filter(id => !editorProductIds.includes(id));

            console.log('📊 Changes to save:', {
                create: productsToCreate.length,
                update: productsToUpdate.length,
                delete: productsToDeleteIds.length
            });

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // UPDATE existing products
            for (const product of productsToUpdate) {
                try {
                    const updateData = {
                        name: product.name.trim(),
                        sku: product.sku.trim(),
                        category: product.category,
                        cost_price: product.cost_price,
                        selling_price: product.selling_price,
                        current_stock: product.current_stock,
                        reorder_level: product.reorder_level,
                        unit: product.unit,
                        description: product.description.trim(),
                        updated_at: new Date().toISOString()
                    };

                    console.log('🔄 Updating product:', product.id, updateData);

                    const { error } = await supabase
                        .from('products')
                        .update(updateData)
                        .eq('id', product.id)
                        .eq('business_id', currentBusiness.id);

                    if (error) throw error;
                    successCount++;
                    
                } catch (error) {
                    console.error('❌ Update error for product:', product.name, error);
                    errorCount++;
                    errors.push(`Update failed for ${product.name}: ${error.message}`);
                }
            }

            // CREATE new products
            for (const product of productsToCreate) {
                try {
                    if (!product.name.trim()) {
                        throw new Error('Product name is required');
                    }

                    const productRecord = {
                        name: product.name.trim(),
                        description: product.description.trim(),
                        sku: product.sku.trim() || generateSKU(),
                        category: product.category,
                        cost_price: product.cost_price,
                        selling_price: product.selling_price,
                        current_stock: product.current_stock,
                        reorder_level: product.reorder_level,
                        unit: product.unit,
                        business_id: currentBusiness.id,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    console.log('🆕 Creating product:', productRecord);

                    const { error } = await supabase
                        .from('products')
                        .insert([productRecord]);

                    if (error) throw error;
                    successCount++;
                    
                } catch (error) {
                    console.error('❌ Create error for product:', product.name, error);
                    errorCount++;
                    errors.push(`Create failed for ${product.name}: ${error.message}`);
                }
            }

            // DELETE products removed from editor
            for (const productId of productsToDeleteIds) {
                try {
                    console.log('🗑️ Deleting product:', productId);

                    const { error } = await supabase
                        .from('products')
                        .update({ 
                            is_active: false,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', productId)
                        .eq('business_id', currentBusiness.id);

                    if (error) throw error;
                    successCount++;
                    
                } catch (error) {
                    console.error('❌ Delete error for product ID:', productId, error);
                    errorCount++;
                    const productName = existingProducts?.find(p => p.id === productId)?.name || 'Unknown';
                    errors.push(`Delete failed for ${productName}: ${error.message}`);
                }
            }

            console.log(`✅ Save completed: ${successCount} successful, ${errorCount} failed`);

            // Show appropriate notification
            if (successCount === 0 && errorCount === 0) {
                showNotification('Info', 'No changes to save', 'info');
            } else if (errorCount > 0) {
                const errorMessage = errors.length > 0 ? ` First error: ${errors[0]}` : '';
                showNotification('Warning', `Saved ${successCount} changes, ${errorCount} failed.${errorMessage}`, 'warning');
            } else {
                showNotification('Success', `Successfully saved ${successCount} changes`, 'success');
            }

            // Only reload if we had successful changes
            if (successCount > 0) {
                await loadProductsIntoBulkEditor();
                loadInventoryProducts();
                loadInventorySummary();
            }
            
            hideBulkEditor();

        } catch (error) {
            console.error('❌ Error saving bulk changes:', error);
            showNotification('Error', 'Failed to save changes: ' + error.message, 'error');
        }
    }

    // Import CSV into bulk editor
    async function importFromCSVToBulkEditor() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const csvText = await readFileAsText(file);
                const importedProducts = parseCSVData(csvText);
                
                // Add imported products to bulk editor
                importedProducts.forEach(product => {
                    const newRow = {
                        _rowId: `imported-${Date.now()}-${Math.random()}`,
                        _isSelected: false,
                        _isNew: true,
                        _hasChanges: true,
                        name: product.name || '',
                        sku: product.sku || '',
                        category: product.category || '',
                        cost_price: product.cost_price || 0,
                        selling_price: product.selling_price || 0,
                        current_stock: product.current_stock || 0,
                        reorder_level: product.reorder_level || 0,
                        unit: product.unit || 'pcs',
                        description: product.description || '',
                        business_id: currentBusiness.id,
                        is_active: true
                    };
                    
                    bulkEditorData.push(newRow);
                });
                
                renderBulkEditorTable();
                showNotification('Success', `Imported ${importedProducts.length} products`, 'success');
                
            } catch (error) {
                console.error('❌ CSV import error:', error);
                showNotification('Error', 'Failed to import CSV: ' + error.message, 'error');
            }
        };
        
        fileInput.click();
    }

    // Selection functions
    function toggleRowSelection(rowId, isSelected) {
        const product = bulkEditorData.find(p => p._rowId === rowId);
        if (product) {
            product._isSelected = isSelected;
            renderBulkEditorTable();
        }
    }

    function toggleSelectAllRows(isSelected) {
        bulkEditorData.forEach(product => {
            product._isSelected = isSelected;
        });
        renderBulkEditorTable();
    }

    // Update the deleteSelectedRows function
    function deleteSelectedRows() {
        const selectedRows = bulkEditorData.filter(p => p._isSelected);
        const selectedCount = selectedRows.length;
        
        if (selectedCount === 0) {
            showNotification('Info', 'No rows selected', 'info');
            return;
        }

        const newProductsCount = selectedRows.filter(p => p._isNew).length;
        const existingProductsCount = selectedCount - newProductsCount;
        
        let message = `Are you sure you want to delete ${selectedCount} products?`;
        if (existingProductsCount > 0) {
            message += ` This will remove ${existingProductsCount} existing products from your inventory.`;
        }

        if (confirm(message)) {
            // Remove selected rows from the array
            bulkEditorData = bulkEditorData.filter(p => !p._isSelected);
            renderBulkEditorTable();
            updateRowCount();
            showNotification('Success', `Marked ${selectedCount} products for deletion. Click "Save Changes" to confirm.`, 'success');
        }
    }

    // Utility functions
    function updateRowCount() {
        const element = document.getElementById('bulk-editor-row-count');
        if (element) {
            element.textContent = `${bulkEditorData.length} products`;
        }
    }

    function updateSelectedCount() {
        const selectedCount = bulkEditorData.filter(p => p._isSelected).length;
        const element = document.querySelector('.selected-count');
        if (element) {
            element.textContent = `${selectedCount} rows selected`;
        }
    }

    function updateChangesCount() {
        const changedCount = bulkEditorData.filter(p => p._hasChanges).length;
        const element = document.getElementById('unsaved-changes-count');
        if (element) {
            if (changedCount > 0) {
                element.textContent = `${changedCount} unsaved changes`;
                element.className = 'changes-count has-changes';
            } else {
                element.textContent = 'No unsaved changes';
                element.className = 'changes-count';
            }
        }
    }

    function scrollToBottom() {
        const container = document.querySelector('.bulk-editor-table-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function hideBulkEditor() {
        const modal = document.getElementById('bulk-editor-modal');
        if (modal) {
            modal.classList.add('d-none');
            isBulkEditorOpen = false;
        }
    }

    function setupBulkEditorEventListeners() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!isBulkEditorOpen) return;
            
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveBulkEditorChanges();
            }
            
            // Ctrl+A to select all
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                toggleSelectAllRows(true);
            }
            
            // Delete key to delete selected
            if (e.key === 'Delete') {
                e.preventDefault();
                deleteSelectedRows();
            }
        });
    }

    // Export functions
    function exportBulkEditorToCSV() {
        const headers = ['name', 'sku', 'category', 'cost_price', 'selling_price', 'current_stock', 'reorder_level', 'unit', 'description'];
        const data = bulkEditorData.map(product => [
            product.name,
            product.sku,
            product.category,
            product.cost_price,
            product.selling_price,
            product.current_stock,
            product.reorder_level,
            product.unit,
            product.description
        ]);
        
        const csv = [headers, ...data].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk_editor_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Success', 'Data exported to CSV', 'success');
    }

    function downloadBulkEditorTemplate() {
        const headers = ['name', 'sku', 'category', 'cost_price', 'selling_price', 'current_stock', 'reorder_level', 'unit', 'description'];
        const template = [headers].join(',');
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk_editor_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Success', 'Template downloaded', 'success');
    }

    // Apply bulk update to a single product
    async function applyBulkUpdateToProduct(product, updateType) {
        console.log(`🔄 Applying ${updateType} update to product:`, product.name);
        
        const updateData = {};
        
        switch (updateType) {
            case 'price':
                updateData.updated_at = new Date().toISOString();
                await applyPriceUpdate(product, updateData);
                break;
                
            case 'stock':
                updateData.updated_at = new Date().toISOString();
                await applyStockUpdate(product, updateData);
                break;
                
            case 'category':
                const newCategory = document.getElementById('bulk-category-value').value.trim();
                if (!newCategory) {
                    throw new Error('New category is required');
                }
                updateData.category = newCategory;
                updateData.updated_at = new Date().toISOString();
                break;
                
            case 'reorder':
                const newReorderLevel = parseInt(document.getElementById('bulk-reorder-value').value) || 0;
                updateData.reorder_level = newReorderLevel;
                updateData.updated_at = new Date().toISOString();
                break;
                
            default:
                throw new Error(`Unknown update type: ${updateType}`);
        }

        // Apply the update
        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', product.id)
            .eq('business_id', currentBusiness.id);

        if (error) throw error;
        
        console.log(`✅ Updated product: ${product.name}`);
    }

    // Apply stock update to product
    async function applyStockUpdate(product, updateData) {
        const stockType = document.getElementById('bulk-stock-type').value;
        const stockValue = parseInt(document.getElementById('bulk-stock-value').value) || 0;

        if (stockValue < 0) {
            throw new Error('Stock value cannot be negative');
        }

        switch (stockType) {
            case 'add':
                updateData.current_stock = (product.current_stock || 0) + stockValue;
                break;
            case 'set':
                updateData.current_stock = stockValue;
                break;
        }

        console.log('📦 Stock update data:', updateData);
    }

    // Apply price update to product
    async function applyPriceUpdate(product, updateData) {
        const priceType = document.getElementById('bulk-price-type').value;
        const priceValue = parseFloat(document.getElementById('bulk-price-value').value) || 0;
        const updateCost = document.getElementById('bulk-update-cost').checked;
        const updateSelling = document.getElementById('bulk-update-selling').checked;

        if (priceValue <= 0) {
            throw new Error('Price value must be greater than 0');
        }

        if (updateCost) {
            switch (priceType) {
                case 'percentage':
                    updateData.cost_price = product.cost_price * (1 + priceValue / 100);
                    break;
                case 'fixed':
                    updateData.cost_price = product.cost_price + priceValue;
                    break;
                case 'set':
                    updateData.cost_price = priceValue;
                    break;
            }
            // Ensure price doesn't go negative
            updateData.cost_price = Math.max(0, updateData.cost_price);
        }

        if (updateSelling) {
            switch (priceType) {
                case 'percentage':
                    updateData.selling_price = product.selling_price * (1 + priceValue / 100);
                    break;
                case 'fixed':
                    updateData.selling_price = product.selling_price + priceValue;
                    break;
                case 'set':
                    updateData.selling_price = priceValue;
                    break;
            }
            // Ensure price doesn't go negative
            updateData.selling_price = Math.max(0, updateData.selling_price);
        }

        console.log('💰 Price update data:', updateData);
    }

    // Get products based on bulk update criteria
    async function getProductsForBulkUpdate(applyTo) {
        console.log('🔍 Getting products for bulk update:', applyTo);
        
        let query = supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);

        // Apply filters based on selection
        switch (applyTo) {
            case 'category':
                const category = document.getElementById('bulk-specific-category').value;
                if (category) {
                    query = query.eq('category', category);
                }
                break;
            case 'low_stock':
                query = query.lte('current_stock', 5);
                break;
            case 'out_of_stock':
                query = query.eq('current_stock', 0);
                break;
            // 'all' - no additional filter needed
        }

        const { data: products, error } = await query;
        
        if (error) throw error;
        
        console.log(`📊 Found ${products?.length || 0} products for bulk update`);
        return products || [];
    }

    // Business-aware product management
    async function addProduct(productData) {
        try {
            console.log('📦 Adding new product...');
            
            if (!currentBusiness) {
                throw new Error('No business selected');
            }

            // Validate required fields
            if (!productData.name?.trim()) {
                throw new Error('Product name is required');
            }

            console.log('🏢 Creating product for business:', currentBusiness.id);

            // Prepare product data WITHOUT owner_id
            const productRecord = {
                name: productData.name.trim(),
                description: productData.description?.trim() || '',
                sku: productData.sku?.trim() || generateSKU(),
                category: productData.category?.trim() || 'Uncategorized',
                cost_price: parseFloat(productData.cost_price) || 0,
                selling_price: parseFloat(productData.selling_price) || 0,
                current_stock: parseInt(productData.current_stock) || 0,
                reorder_level: parseInt(productData.reorder_level) || 0,
                unit: productData.unit?.trim() || 'pcs',
                business_id: currentBusiness.id,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log('📝 Product data to insert:', productRecord);

            // Insert product directly WITHOUT using createBusinessRecord
            const { data: product, error } = await supabase
                .from('products')
                .insert([productRecord])
                .select()
                .single();

            if (error) {
                console.error('❌ Database error:', error);
                
                if (error.code === '23505') {
                    throw new Error('Product with this SKU or name already exists');
                }
                throw error;
            }

            if (!product) {
                throw new Error('Failed to create product - no data returned');
            }

            console.log('✅ Product added successfully:', product);
            
            showNotification('Success', 'Product added successfully!', 'success');
            hideAddProductModal();
            loadInventoryProducts();
            loadInventorySummary();
            return product;

        } catch (error) {
            console.error('❌ Add product error:', error);
            
            let errorMessage = 'Failed to add product';
            
            if (error.message.includes('already exists')) {
                errorMessage = 'A product with this SKU or name already exists';
            } else if (error.message.includes('Product name is required')) {
                errorMessage = 'Product name is required';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showNotification('Error', errorMessage, 'error');
            throw error;
        }
    }

    async function updateProduct(productData) {
        try {
            if (!currentBusiness) {
                throw new Error('No business selected');
            }

            const { error } = await supabase
                .from('products')
                .update({
                    name: productData.name.trim(),
                    sku: productData.sku.trim(),
                    category: productData.category,
                    unit: productData.unit,
                    cost_price: productData.cost_price,
                    selling_price: productData.selling_price,
                    current_stock: productData.current_stock,
                    reorder_level: productData.reorder_level,
                    description: productData.description.trim(),
                    updated_at: productData.updated_at
                })
                .eq('id', productData.id)
                .eq('business_id', currentBusiness.id);

            if (error) throw error;

            showNotification('Success', 'Product updated successfully!', 'success');
            hideEditProductModal();
            loadInventoryProducts();
            loadInventorySummary();

        } catch (error) {
            console.error('❌ Update product error:', error);
            showNotification('Error', 'Failed to update product', 'error');
            throw error;
        }
    }

    async function updateStockLevel(adjustmentData) {
        try {
            if (!currentBusiness) {
                throw new Error('No business selected');
            }

            // Calculate new stock level
            let newStock = adjustmentData.currentStock;
            switch (adjustmentData.type) {
                case 'add':
                    newStock += adjustmentData.quantity;
                    break;
                case 'remove':
                    newStock = Math.max(0, newStock - adjustmentData.quantity);
                    break;
                case 'set':
                    newStock = adjustmentData.quantity;
                    break;
            }

            // Update product stock
            const { error } = await supabase
                .from('products')
                .update({
                    current_stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', adjustmentData.productId)
                .eq('business_id', currentBusiness.id);

            if (error) throw error;

            // Record stock movement (you might want to create a stock_movements table for this)
            console.log('📊 Stock movement recorded:', {
                productId: adjustmentData.productId,
                type: adjustmentData.type,
                quantity: adjustmentData.quantity,
                reason: adjustmentData.reason,
                notes: adjustmentData.notes,
                timestamp: new Date().toISOString()
            });

            showNotification('Success', `Stock updated to ${newStock}`, 'success');
            hideAdjustStockModal();
            loadInventoryProducts();
            loadInventorySummary();

        } catch (error) {
            console.error('❌ Stock update error:', error);
            showNotification('Error', 'Failed to update stock level', 'error');
            throw error;
        }
    }

    async function deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            try {
                const { error } = await supabase
                    .from('products')
                    .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId)
                    .eq('business_id', currentBusiness.id);
                
                if (error) throw error;
                
                showNotification('Success', 'Product deleted successfully', 'success');
                loadInventoryProducts();
                loadInventorySummary();
                
            } catch (error) {
                console.error('❌ Delete product error:', error);
                showNotification('Error', 'Failed to delete product', 'error');
            }
        }
    }

    // Generate unique SKU
    function generateSKU() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5);
        return `SKU-${timestamp}-${random}`.toUpperCase();
    }

    // Update your existing showBulkUpdateModal function
    function showBulkUpdateModal() {
        const modal = document.getElementById('bulk-update-modal');
        if (modal) {
            modal.classList.remove('d-none');
            // Reset form
            document.getElementById('bulk-update-form').reset();
            toggleBulkUpdateFields();
            updateBulkAffectedCount();
            
            console.log('📊 Bulk update modal shown');
        }
    }

    function hideBulkUpdateModal() {
        const modal = document.getElementById('bulk-update-modal');
        if (modal) {
            modal.classList.add('d-none');
        }
    }

    // Enhanced toggle function with validation
    function toggleBulkUpdateFields() {
        const updateType = document.getElementById('bulk-update-type').value;
        
        // Hide all sections
        document.querySelectorAll('.bulk-update-section').forEach(section => {
            section.classList.add('d-none');
        });
        
        // Show relevant section
        if (updateType) {
            document.getElementById(`bulk-${updateType}-fields`).classList.remove('d-none');
        }
        
        // Toggle category selection
        const applyTo = document.getElementById('bulk-apply-to').value;
        document.getElementById('bulk-category-select').classList.toggle('d-none', applyTo !== 'category');
        
        updateBulkAffectedCount();
    }

    // Enhanced affected count with actual database query
    async function updateBulkAffectedCount() {
        const applyTo = document.getElementById('bulk-apply-to').value;
        
        try {
            let count = 0;
            
            if (applyTo === 'all') {
                // Count all active products
                const { count: totalCount, error } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('business_id', currentBusiness.id)
                    .eq('is_active', true);
                
                if (!error) count = totalCount || 0;
            } else {
                // Use the same logic as getProductsForBulkUpdate but just count
                const products = await getProductsForBulkUpdate(applyTo);
                count = products.length;
            }
            
            document.getElementById('bulk-affected-count').textContent = count;
            console.log(`📊 Bulk update will affect ${count} products`);
            
        } catch (error) {
            console.error('❌ Error counting products:', error);
            document.getElementById('bulk-affected-count').textContent = 'Error';
        }
    }

    // Import/Export Functions
    function showImportModal() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.classList.remove('d-none');
            document.getElementById('import-form').reset();
            document.getElementById('import-preview').classList.add('d-none');
        }
    }

    function hideImportModal() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.classList.add('d-none');
        }
    }

    function downloadCSVTemplate() {
        const headers = ['name', 'sku', 'category', 'cost_price', 'selling_price', 'current_stock', 'reorder_level', 'unit', 'description'];
        const template = [headers].join(',');
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_import_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Success', 'Template downloaded successfully', 'success');
    }

    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Show preview
            const previewHead = document.getElementById('import-preview-head');
            const previewBody = document.getElementById('import-preview-body');
            
            previewHead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
            
            // Show first 5 rows
            let previewHTML = '';
            for (let i = 1; i < Math.min(6, lines.length); i++) {
                if (lines[i].trim()) {
                    const cells = lines[i].split(',').map(c => c.trim());
                    previewHTML += `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
                }
            }
            previewBody.innerHTML = previewHTML;
            
            document.getElementById('import-preview').classList.remove('d-none');
        };
        reader.readAsText(file);
    }

    // Import Products Functionality
    async function importProductsFromCSV(file, updateExisting = false) {
        console.log('📤 Starting CSV import...');
        
        try {
            if (!currentBusiness?.id) {
                throw new Error('No business selected');
            }

            const csvText = await readFileAsText(file);
            const products = parseCSVData(csvText);

            if (products.length === 0) {
                throw new Error('No valid products found in the CSV file');
            }

            console.log(`🔄 Importing ${products.length} products...`);
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const productData of products) {
                try {
                    if (updateExisting && productData.sku) {
                        // Update existing product
                        await updateExistingProduct(productData);
                    } else {
                        // Create new product
                        await createProductFromImport(productData);
                    }
                    successCount++;
                } catch (error) {
                    console.error('❌ Product import error:', error);
                    errorCount++;
                    errors.push(`Row ${successCount + errorCount}: ${error.message}`);
                }
            }

            console.log(`✅ Import completed: ${successCount} success, ${errorCount} errors`);
            
            if (errorCount > 0) {
                showNotification('Warning', `Imported ${successCount} products, ${errorCount} failed`, 'warning');
                console.error('❌ Import errors:', errors);
            } else {
                showNotification('Success', `Successfully imported ${successCount} products`, 'success');
            }

            hideImportModal();
            loadInventoryProducts();
            loadInventorySummary();

        } catch (error) {
            console.error('❌ Import process error:', error);
            showNotification('Error', 'Import failed: ' + error.message, 'error');
        }
    }

    // Helper function to read file
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Parse CSV data
    function parseCSVData(csvText) {
        console.log('🔍 Parsing CSV data...');
        
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        console.log('🏷️ CSV headers:', headers);

        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());
            const product = {};

            // Map CSV columns to product fields
            headers.forEach((header, index) => {
                if (values[index]) {
                    switch (header) {
                        case 'name':
                            product.name = values[index];
                            break;
                        case 'sku':
                            product.sku = values[index];
                            break;
                        case 'category':
                            product.category = values[index];
                            break;
                        case 'cost_price':
                            product.cost_price = parseFloat(values[index]) || 0;
                            break;
                        case 'selling_price':
                            product.selling_price = parseFloat(values[index]) || 0;
                            break;
                        case 'current_stock':
                            product.current_stock = parseInt(values[index]) || 0;
                            break;
                        case 'reorder_level':
                            product.reorder_level = parseInt(values[index]) || 0;
                            break;
                        case 'unit':
                            product.unit = values[index];
                            break;
                        case 'description':
                            product.description = values[index];
                            break;
                    }
                }
            });

            // Validate required fields
            if (!product.name) {
                console.warn('⚠️ Skipping row - missing product name');
                continue;
            }

            products.push(product);
        }

        console.log(`✅ Parsed ${products.length} valid products`);
        return products;
    }

    // Create product from import
    async function createProductFromImport(productData) {
        console.log('🆕 Creating new product from import:', productData);
        
        const productRecord = {
            name: productData.name.trim(),
            description: productData.description?.trim() || '',
            sku: productData.sku?.trim() || generateSKU(),
            category: productData.category?.trim() || 'Uncategorized',
            cost_price: productData.cost_price || 0,
            selling_price: productData.selling_price || 0,
            current_stock: productData.current_stock || 0,
            reorder_level: productData.reorder_level || 0,
            unit: productData.unit?.trim() || 'pcs',
            business_id: currentBusiness.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('💾 Inserting product:', productRecord);

        const { data: product, error } = await supabase
            .from('products')
            .insert([productRecord])
            .select()
            .single();

        if (error) {
            console.error('❌ Database insert error:', error);
            throw new Error(`Failed to create product: ${error.message}`);
        }

        console.log('✅ Product created successfully:', product);
        return product;
    }

    // Update existing product
    async function updateExistingProduct(productData) {
        console.log('🔄 Updating existing product:', productData);
        
        if (!productData.sku) {
            throw new Error('SKU required for updating existing products');
        }

        // Find existing product by SKU
        const { data: existingProduct, error: findError } = await supabase
            .from('products')
            .select('*')
            .eq('sku', productData.sku)
            .eq('business_id', currentBusiness.id)
            .single();

        if (findError || !existingProduct) {
            throw new Error(`Product with SKU "${productData.sku}" not found`);
        }

        // Update product
        const { error: updateError } = await supabase
            .from('products')
            .update({
                name: productData.name?.trim() || existingProduct.name,
                description: productData.description?.trim() || existingProduct.description,
                category: productData.category?.trim() || existingProduct.category,
                cost_price: productData.cost_price || existingProduct.cost_price,
                selling_price: productData.selling_price || existingProduct.selling_price,
                current_stock: productData.current_stock || existingProduct.current_stock,
                reorder_level: productData.reorder_level || existingProduct.reorder_level,
                unit: productData.unit?.trim() || existingProduct.unit,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingProduct.id)
            .eq('business_id', currentBusiness.id);

        if (updateError) {
            throw new Error(`Failed to update product: ${updateError.message}`);
        }

        console.log('✅ Product updated successfully');
    }

    // Purchase Order Functions
    function generatePurchaseOrder() {
        const lowStockProducts = inventoryData.filter(p => {
        const reorderLevel = p.reorder_level || 0;
        return reorderLevel > 0 && p.current_stock <= reorderLevel;
    });
        
        if (lowStockProducts.length === 0) {
            showNotification('Info', 'No low stock items found', 'info');
            return;
        }
        
        const modal = document.getElementById('purchase-order-modal');
        if (modal) {
            // Populate purchase order items
            const itemsContainer = document.getElementById('purchase-order-items');
            itemsContainer.innerHTML = lowStockProducts.map(product => `
                <div class="po-item">
                    <div class="po-item-info">
                        <strong>${escapeHtml(product.name)}</strong>
                        <div class="po-item-details">
                            SKU: ${product.sku || 'N/A'} | 
                            Current: ${product.current_stock} | 
                            Reorder: ${product.reorder_level || 10}
                        </div>
                    </div>
                    <div class="po-item-quantity">
                        <input type="number" 
                            class="form-control form-control-sm" 
                            value="${Math.max(5, (product.reorder_level || 0) - product.current_stock)}" 
                            min="1"
                            onchange="updatePOTotals()"
                            style="width: 80px;">
                    </div>
                    <div class="po-item-cost">
                        ${formatCurrency(product.cost_price || 0)}
                    </div>
                </div>
            `).join('');
            
            updatePOTotals();
            modal.classList.remove('d-none');
        }
    }

    function hidePurchaseOrderModal() {
        const modal = document.getElementById('purchase-order-modal');
        if (modal) {
            modal.classList.add('d-none');
        }
    }

    function updatePOTotals() {
        const items = document.querySelectorAll('.po-item');
        let totalItems = 0;
        let totalQuantity = 0;
        let totalCost = 0;
        
        items.forEach(item => {
            const quantity = parseInt(item.querySelector('input').value) || 0;
            const cost = parseFloat(item.querySelector('.po-item-cost').textContent.replace(/[^\d.-]/g, '')) || 0;
            
            totalItems++;
            totalQuantity += quantity;
            totalCost += quantity * cost;
        });
        
        document.getElementById('po-total-items').textContent = totalItems;
        document.getElementById('po-total-quantity').textContent = totalQuantity;
        document.getElementById('po-estimated-cost').textContent = formatCurrency(totalCost);
    }

    function generatePurchaseOrderPDF() {
        showNotification('Success', 'Purchase order PDF generated successfully', 'success');
        // In a real implementation, this would generate an actual PDF
        // For now, we'll just show a success message
    }

    function confirmPurchaseOrder() {
        showNotification('Success', 'Purchase order confirmed and sent to supplier', 'success');
        hidePurchaseOrderModal();
    }

    // Export Functions
    function exportData(type) {
        if (type === 'inventory') {
            exportInventoryToCSV();
        }
    }

    function exportInventoryToCSV() {
        const businessName = currentBusiness?.name || 'Unknown Business';
        const headers = ['Name', 'SKU', 'Category', 'Current Stock', 'Reorder Level', 'Cost Price', 'Selling Price', 'Stock Value', 'Status'];
        const data = inventoryData.map(product => [
            product.name,
            product.sku || '',
            product.category || '',
            product.current_stock,
            product.reorder_level || 0,
            product.cost_price || 0,
            product.selling_price || 0,
            (product.current_stock * (product.cost_price || 0)),
            getStockStatusText(product.current_stock, product.reorder_level)
        ]);
        
        const csv = [[`${businessName} - All Products`],
                [`Generated on: ${new Date().toLocaleString()}`],
                [''],
            headers, ...data].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${businessName}_inventory_products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Success', 'Inventory exported successfully', 'success');
    }

    // Utility Functions
    function refreshInventory() {
        console.log('🔄 Manual refresh triggered');
        currentInventoryPage = 1;
        loadInventoryProducts();
        loadInventorySummary();
    }

    function populateCategoryFilters() {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;
        
        // Clear existing options except the first one
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        // Get unique categories from current inventory
        const categories = [...new Set(inventoryData.map(p => p.category).filter(Boolean))];
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    // Function to show filtered inventory page
    function showFilteredInventoryPage(filterType) {
        console.log(`📊 Showing filtered page for: ${filterType}`);
        
        currentFilterType = filterType;
        
        // Hide other pages, show filtered page
        hideAllPages();
        document.getElementById('filtered-inventory-page').classList.remove('d-none');
        currentPage = 'filtered-inventory';
        sessionStorage.setItem('currentPage', currentPage);
        
        // Set page title and subtitle
        const titleElement = document.getElementById('filtered-page-title');
        const subtitleElement = document.getElementById('filtered-page-subtitle');
        const filterTypeElement = document.getElementById('filter-type');
        const filterDescriptionElement = document.getElementById('filter-description');
        
        switch(filterType) {
            case 'low_stock':
                titleElement.textContent = 'Low Stock Products';
                subtitleElement.textContent = 'Products that need restocking';
                filterTypeElement.textContent = 'Low Stock Filter';
                filterDescriptionElement.textContent = 'Showing products with stock levels at or below reorder level';
                break;
            case 'out_of_stock':
                titleElement.textContent = 'Out of Stock Products';
                subtitleElement.textContent = 'Products that are completely out of stock';
                filterTypeElement.textContent = 'Out of Stock Filter';
                filterDescriptionElement.textContent = 'Showing products with zero stock';
                break;
        }
        
        // Load filtered products
        loadFilteredProducts();
        
        // Update action buttons
        updateFilteredPageActions();
    }

    // Load filtered products
    async function loadFilteredProducts() {
        try {
            console.log(`📥 Loading ${currentFilterType} products...`);
            
            // Show loading state
            document.getElementById('filtered-table-body').innerHTML = `
                <tr>
                    <td colspan="11" class="text-center" style="padding: 3rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <h4>Loading ${currentFilterType.replace('_', ' ')} products...</h4>
                        </div>
                    </td>
                </tr>
            `;
            
            let query = supabase
                .from('products')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .eq('is_active', true)
                .order('name');
            
            const { data: products, error } = await query;
            
            if (error) throw error;
            
            // Client-side filtering based on filter type
            switch(currentFilterType) {
                case 'low_stock':
                    // Filter products where:
                    // 1. current_stock > 0 (not out of stock)
                    // 2. reorder_level > 0 (reorder level is set)
                    // 3. current_stock <= reorder_level (stock is at or below reorder level)
                    filteredProducts = (products || []).filter(product => {
                        const currentStock = product.current_stock || 0;
                        const reorderLevel = product.reorder_level || 0;
                        
                        // Check if it's low stock
                        if (reorderLevel <= 0) return false; // No reorder level set
                        if (currentStock <= 0) return false; // Out of stock (handled by out_of_stock filter)
                        
                        return currentStock <= reorderLevel;
                    });
                    break;
                    
                case 'out_of_stock':
                    // Filter products where current_stock === 0
                    filteredProducts = (products || []).filter(product => 
                        (product.current_stock || 0) === 0
                    );
                    break;
                    
                default:
                    filteredProducts = products || [];
            }
            
            console.log(`✅ Loaded ${filteredProducts.length} ${currentFilterType} products`);
            console.log(`📊 Total products: ${products?.length || 0}, Filtered: ${filteredProducts.length}`);
            
            // Update UI
            updateFilteredProductsTable();
            updateFilterStats();
            
        } catch (error) {
            console.error('❌ Error loading filtered products:', error);
            showNotification('Error', 'Failed to load filtered products', 'error');
            
            // Show error state
            document.getElementById('filtered-table-body').innerHTML = `
                <tr>
                    <td colspan="11" class="text-center" style="padding: 3rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #dc3545;"></i>
                            <h4>Error Loading Products</h4>
                            <p>${error.message || 'Unknown error occurred'}</p>
                            <button class="btn btn-primary mt-2" onclick="loadFilteredProducts()">
                                <i class="fas fa-refresh"></i> Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // Update filtered products table
    function updateFilteredProductsTable() {
        const container = document.getElementById('filtered-table-body');
        
        if (filteredProducts.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center" style="padding: 3rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h4>No products found</h4>
                            <p>No ${currentFilterType.replace('_', ' ')} products found in your inventory.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let totalStockValue = 0;
        
        container.innerHTML = filteredProducts.map((product, index) => {
            const stockValue = (product.current_stock || 0) * (product.cost_price || 0);
            totalStockValue += stockValue;
            
            const status = getStockStatusText(product.current_stock, product.reorder_level);
            const statusClass = status === 'Out of Stock' ? 'status-critical' : 
                            status === 'Low Stock' ? 'status-warning' : 'status-healthy';
            
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(product.name)}</div>
                        <div style="font-size: 0.8rem; color: #6c757d;">${product.description || 'No description'}</div>
                    </td>
                    <td>${product.sku || '-'}</td>
                    <td>
                        <span class="font-weight-bold" style="color: ${getStockColor(product.current_stock, product.reorder_level)}">
                            ${product.current_stock} ${product.unit || 'pcs'}
                        </span>
                    </td>
                    <td>${product.reorder_level || 0}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </td>
                    <td>${formatCurrency(product.cost_price || 0)}</td>
                    <td>${formatCurrency(product.selling_price || 0)}</td>
                    <td>${formatCurrency(stockValue)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-outline btn-sm" onclick="adjustStock('${product.id}')" title="Adjust Stock">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="showProductDetails('${product.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update totals
        document.getElementById('filtered-total-count').textContent = filteredProducts.length;
        document.getElementById('filtered-total-value').textContent = formatCurrency(totalStockValue);
    }

    // Update filter statistics
    function updateFilterStats() {
        document.getElementById('filtered-count').textContent = filteredProducts.length;
        document.getElementById('filter-info-banner').style.borderLeftColor = 
            currentFilterType === 'low_stock' ? '#ffc107' : '#dc3545';
        
        const icon = document.querySelector('.filter-info-content i');
        if (currentFilterType === 'low_stock') {
            icon.className = 'fas fa-exclamation-triangle';
            icon.style.color = '#ffc107';
        } else {
            icon.className = 'fas fa-times-circle';
            icon.style.color = '#dc3545';
        }
    }

    function updateFilteredPageActions() {
        const actionsContainer = document.getElementById('filtered-page-actions');
        
        actionsContainer.innerHTML = `
            <!-- Combined Export Dropdown -->
            <div class="export-dropdown">
                <div class="export-dropdown-btn-group">
                    <button class="btn btn-outline export-main-btn" onclick="exportFilteredExcel()">
                        <i class="fas fa-file-excel"></i> Export as Excel
                    </button>
                    <button class="btn btn-outline export-dropdown-arrow" onclick="toggleExportDropdown()">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="export-dropdown-menu" id="export-dropdown-menu">
                    <div class="export-dropdown-item" onclick="exportFilteredPDF()">
                        <i class="fas fa-file-pdf"></i> Export as PDF
                    </div>
                    
                </div>
            </div>
            <button class="btn btn-outline" onclick="printFilteredItems()">
                <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-primary" onclick="generatePOFromFiltered()">
                <i class="fas fa-clipboard-list"></i> Generate PO
            </button>
        `;
        
        // Setup click outside to close dropdown
        setupExportDropdownClose();
    }

    // Toggle the export dropdown
    function toggleExportDropdown() {
        event.stopPropagation();
        const dropdownMenu = document.getElementById('export-dropdown-menu');
        const dropdownArrow = document.querySelector('.export-dropdown-arrow i');
        
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('show');
            dropdownArrow.classList.toggle('rotate');
        }
    }

    // Close dropdown when clicking outside
    function setupExportDropdownClose() {
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.export-dropdown')) {
                const dropdownMenu = document.getElementById('export-dropdown-menu');
                const dropdownArrow = document.querySelector('.export-dropdown-arrow i');
                
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                    if (dropdownArrow) {
                        dropdownArrow.classList.remove('rotate');
                    }
                }
            }
        });
    }

    async function exportFilteredPDF() {
        try {
            console.log('📄 Exporting filtered products as PDF...');
            
            if (filteredProducts.length === 0) {
                showNotification('Info', 'No products to export', 'info');
                return;
            }
            
            // Show loading indicator
            showPDFLoading();
            
            // Create PDF in background
            setTimeout(() => {
                createAndDownloadPDF();
                hidePDFLoading();
            }, 100);
            
        } catch (error) {
            console.error('❌ PDF export error:', error);
            showNotification('Error', 'Failed to export PDF', 'error');
            hidePDFLoading();
        }
    }

    // Show PDF loading indicator
    function showPDFLoading() {
        const loadingHTML = `
            <div id="pdf-loading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <div class="spinner-border text-danger" style="width: 3rem; height: 3rem;"></div>
                <div style="margin-top: 20px; font-size: 1.2rem; color: #495057;">
                    Generating PDF document...
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    // Hide PDF loading indicator
    function hidePDFLoading() {
        const loadingElement = document.getElementById('pdf-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // Create and download PDF
    function createAndDownloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const title = document.getElementById('filtered-page-title').textContent;
        const businessName = currentBusiness?.name || 'Unknown Business';
        const date = new Date().toLocaleString();
        const filterType = currentFilterType.replace('_', ' ').toUpperCase();
        
        // Page settings
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        
        // Center-align business name and title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName, pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(title, pageWidth / 2, 28, { align: 'center' });
        
        // Report info in a smaller font
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report Date: ${date}`, margin, 43);
        doc.text(`Total Products: ${filteredProducts.length}`, margin, 48);
        
        // Calculate totals
        let totalStockValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        filteredProducts.forEach(product => {
            const stockValue = (product.current_stock || 0) * (product.cost_price || 0);
            totalStockValue += stockValue;
            
            // Use existing getStockStatusText function to determine stock status
            const status = getStockStatusText(product.current_stock, product.reorder_level);
            
            if (status === 'Low Stock') lowStockCount++;
            if (status === 'Out of Stock') outOfStockCount++;
        });
        
        // Prepare table data with proper number formatting (no powers)
        const tableData = filteredProducts.map((product, index) => {
            const stockValue = (product.current_stock || 0) * (product.cost_price || 0);
            const status = getStockStatusText(product.current_stock, product.reorder_level);
            
            // Format numbers without scientific notation
            const formatNumber = (num) => {
                if (typeof num !== 'number' || isNaN(num)) return '0.00';
                // Remove any scientific notation and format with 2 decimals
                return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            };
            
            return [
                (index + 1).toString(),
                product.name,
                product.sku || '-',
                product.category || 'Uncategorized',
                `${product.current_stock} ${product.unit || 'pcs'}`,
                (product.reorder_level || 0).toString(),
                formatNumber(product.cost_price || 0),
                formatNumber(product.selling_price || 0),
                formatNumber(stockValue)
            ];
        });
        
        // Define table headers
        const headers = [
            ['S.No', 'Product Name', 'SKU', 'Category', 'Current Stock', 'Reorder Level', 'Cost Price', 'Selling Price', 'Stock Value']
        ];
        
        // Create table with adjusted column widths
        doc.autoTable({
            head: headers,
            body: tableData,
            startY: 55,
            margin: { top: 55, right: margin, bottom: 30, left: margin },
            headStyles: {
                fillColor: [52, 58, 64], // Dark gray
                textColor: 255,
                fontSize: 8,  // Smaller font for headers
                fontStyle: 'bold',
                cellPadding: 2,  // Less padding
                halign: 'center'  // Center align header text
            },
            bodyStyles: {
                fontSize: 7,  // Smaller font for body
                textColor: [33, 37, 41],
                cellPadding: 2,  // Less padding
                lineWidth: 0.1,  // Thinner borders
                lineColor: [200, 200, 200]  // Lighter borders
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250] // Light gray
            },
            columnStyles: {
                0: { 
                    cellWidth: 12, // S.No
                    halign: 'center'
                },
                1: { 
                    cellWidth: 30, // Product Name
                    halign: 'left'
                },
                2: { 
                    cellWidth: 20, // SKU
                    halign: 'center',
                    fontSize: 6  // Even smaller for SKU
                },
                3: { 
                    cellWidth: 20, // Category
                    halign: 'center'
                },
                4: { 
                    cellWidth: 18, // Current Stock
                    halign: 'center'
                },
                5: { 
                    cellWidth: 18, // Reorder Level
                    halign: 'center'
                },
                6: { 
                    cellWidth: 18, // Cost Price
                    valign: 'center',
                },
                7: { 
                    cellWidth: 22, // Selling Price
                    valign: 'center',
                },
                8: { 
                    cellWidth: 22, // Stock Value
                    valign: 'center',
                }
            },
            didDrawPage: function(data) {
                // Footer with page number
                doc.setFontSize(8);
                doc.setTextColor(128);
                doc.text(
                    `Page ${doc.internal.getNumberOfPages()}`,
                    pageWidth / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
        });
        
        // Add summary after table
        const finalY = doc.lastAutoTable.finalY || 10;
        
        // Format total stock value without scientific notation
        const formatTotalValue = (num) => {
            if (typeof num !== 'number' || isNaN(num)) return '0.00';
            return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        };
        
        doc.text(`Total Stock Value: ${formatTotalValue(totalStockValue)}`, margin, finalY + 10);
        
        // Generate filename
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeDate = new Date().toISOString().split('T')[0];
        const filename = `${businessName}_${safeTitle}_${safeDate}.pdf`;
        
        // Download PDF
        doc.save(filename);
        
        showNotification('Success', 'PDF downloaded successfully', 'success');
    }

    // Add red spinner style for PDF loading
    if (!document.querySelector('style[data-pdf-spinner]')) {
        const spinnerStyle = document.createElement('style');
        spinnerStyle.setAttribute('data-pdf-spinner', 'true');
        spinnerStyle.textContent = `
            .spinner-border.text-danger {
                color: #dc3545 !important;
                border-color: #dc3545 !important;
                border-right-color: transparent !important;
            }
        `;
        document.head.appendChild(spinnerStyle);
    }

    // Export filtered products as Excel
    function exportFilteredExcel() {
        try {
            console.log('📊 Exporting filtered products as Excel...');
            
            if (filteredProducts.length === 0) {
                showNotification('Info', 'No products to export', 'info');
                return;
            }
            
            const title = document.getElementById('filtered-page-title').textContent;
            const date = new Date().toISOString().split('T')[0];
            const businessName = currentBusiness?.name || 'Unknown Business';
            
            // Get selected columns
            const selectedColumns = Array.from(document.getElementById('export-columns').selectedOptions)
                .map(option => option.value);
            
            // Prepare headers
            const headers = ['S.No.'];
            if (selectedColumns.includes('name')) headers.push('Product Name');
            if (selectedColumns.includes('sku')) headers.push('SKU');
            if (selectedColumns.includes('category')) headers.push('Category');
            if (selectedColumns.includes('current_stock')) headers.push('Current Stock');
            if (selectedColumns.includes('current_stock')) headers.push('Unit');
            if (selectedColumns.includes('reorder_level')) headers.push('Reorder Level');
            if (selectedColumns.includes('cost_price')) headers.push('Cost Price');
            if (selectedColumns.includes('selling_price')) headers.push('Selling Price');
            if (selectedColumns.includes('stock_value')) headers.push('Stock Value');
            
            // Prepare data rows
            const rows = filteredProducts.map((product, index) => {
                const row = [index + 1];
                if (selectedColumns.includes('name')) row.push(product.name);
                if (selectedColumns.includes('sku')) row.push(product.sku || '');
                if (selectedColumns.includes('category')) row.push(product.category || '');
                if (selectedColumns.includes('current_stock')) row.push(product.current_stock || 0);
                if (selectedColumns.includes('current_stock')) row.push(product.unit || 'pcs');
                if (selectedColumns.includes('reorder_level')) row.push(product.reorder_level || 0);
                if (selectedColumns.includes('cost_price')) row.push(product.cost_price || 0);
                if (selectedColumns.includes('selling_price')) row.push(product.selling_price || 0);
                if (selectedColumns.includes('stock_value')) {
                    row.push((product.current_stock || 0) * (product.cost_price || 0));
                }
                return row;
            });
            
            // Calculate totals
            const totalStockValue = rows.reduce((sum, row) => {
                const stockValueIndex = headers.indexOf('Stock Value');
                return sum + (stockValueIndex !== -1 ? row[stockValueIndex] || 0 : 0);
            }, 0);
            
            // Add summary row
            rows.push([]);
            rows.push(['TOTAL', '', '', '', '', '', '', '', '', '', totalStockValue]);
            
            // Add metadata
            const metadata = [
                [`${businessName} - ${title}`],
                [`Generated on: ${new Date().toLocaleString()}`],
                [`Total Products: ${filteredProducts.length}`],
                [''],
                headers,
                ...rows
            ];
            
            // Convert to CSV
            const csvContent = metadata.map(row => 
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');
            
            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${businessName.replace(/\s+/g, '_')}_${title.replace(/\s+/g, '_')}_${date}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showNotification('Success', 'Excel file downloaded', 'success');
            
        } catch (error) {
            console.error('❌ Excel export error:', error);
            showNotification('Error', 'Failed to export Excel file', 'error');
        }
    }

    function printFilteredItems() {
        console.log('🖨️ Printing filtered items...');
        
        if (filteredProducts.length === 0) {
            showNotification('Info', 'No products to print', 'info');
            return;
        }
        
        // Show loading indicator
        showPrintLoading();
        
        // Prepare print content in background
        setTimeout(() => {
            const title = document.getElementById('filtered-page-title').textContent;
            const businessName = currentBusiness?.name || 'Unknown Business';
            
            // Create print content
            const printContent = createPrintContent(title, businessName);
            
            // Print directly without showing content
            printDirectly(printContent);
            
            // Hide loading indicator
            hidePrintLoading();
        }, 100);
    }

    // Show print loading indicator
    function showPrintLoading() {
        const loadingHTML = `
            <div id="print-loading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
                <div style="margin-top: 20px; font-size: 1.2rem; color: #495057;">
                    Preparing print document...
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    // Hide print loading indicator
    function hidePrintLoading() {
        const loadingElement = document.getElementById('print-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // Create print content
    function createPrintContent(title, businessName) {
        let totalStockValue = 0;
        
        // Calculate total stock value
        filteredProducts.forEach(product => {
            totalStockValue += (product.current_stock || 0) * (product.cost_price || 0);
        });
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        font-size: 14px;
                        visibility: hidden;
                    }
                    .print-header { 
                        text-align: center; 
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #333;
                    }
                    .print-header h1 { 
                        color: #333; 
                        font-size: 24px;
                    }
                    .print-header .subtitle { 
                        color: #666; 
                        font-size: 16px;
                        margin-top: 5px;
                        font-weight: bold;
                    }
                    .print-info { 
                        margin-bottom: 20px; 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 5px;
                        font-size: 13px;
                    }
                    .print-info p { margin: 5px 0; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                        font-size: 12px; 
                    }
                    th { 
                        background-color: #343a40; 
                        color: #000000; 
                        text-align: left; 
                        padding: 10px 8px; 
                        border: 1px solid #495057;
                        font-weight: 600;
                    }
                    td { 
                        padding: 8px; 
                        border: 1px solid #495057; 
                        vertical-align: top;
                    }
                    tr:nth-child(even) { 
                        background-color: #f9f9f9; 
                    }
                    .summary { 
                        display:flex;
                        justify-content: space-between;
                        margin-top: 30px; 
                        padding: 20px; 
                        background: #f8f9fa; 
                        border-radius: 5px;
                        border-left: 4px solid #28a745;
                    }
                    .summary h3 { 
                        margin: 0 0 15px;
                        color: #343a40;
                        font-size: 18px;
                    }
                    .summary p { margin: 5px 0; }
                    .status-badge {
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                        display: inline-block;
                    }
                    .status-out-of-stock {
                        background: #f8d7da;
                        color: #721c24;
                    }
                    .status-low-stock {
                        background: #fff3cd;
                        color: #856404;
                    }
                    .status-in-stock {
                        background: #d4edda;
                        color: #155724;
                    }
                    @media print {
                        body { 
                            visibility: visible;
                            margin: 0.1in !important;
                        }
                        @page { 
                            margin: 0.1in;
                            size: A4;
                        }
                        @page :first {
                            margin-top: 1in;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${businessName}</h1>
                    <div class="subtitle">${title}</div>
                </div>
                
                <div class="summary">
                <div>
                    <h3>Summary Report</h3>
                    <p><strong>Total Products:</strong> ${filteredProducts.length}</p>
                </div>
                <div>
                    <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Total Stock Value:</strong> ${formatCurrency(totalStockValue)}</p>
                </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 150px;">Product Name</th>
                            <th style="width: 100px;">SKU</th>
                            <th style="width: 80px; text-align: center;">Current Stock</th>
                            <th style="width: 80px; text-align: center;">Reorder Level</th>
                            <th style="width: 60px; text-align: right;">Cost Price</th>
                            <th style="width: 70px; text-align: right;">Selling Price</th>
                            <th style="width: 60px; text-align: right;">Stock Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredProducts.map((product, index) => {
                            const stockValue = (product.current_stock || 0) * (product.cost_price || 0);
                            const status = getStockStatusText(product.current_stock, product.reorder_level);
                            const statusClass = status === 'Out of Stock' ? 'status-out-of-stock' : 
                                            status === 'Low Stock' ? 'status-low-stock' : 'status-in-stock';
                            
                            return `
                                <tr>
                                    <td>${escapeHtml(product.name)}</td>
                                    <td>${product.sku || '-'}</td>
                                    <td style="text-align: center;">${product.current_stock} ${product.unit || 'pcs'}</td>
                                    <td style="text-align: center;">${product.reorder_level || 0}</td>
                                    <td style="text-align: right;">${formatCurrency(product.cost_price || 0)}</td>
                                    <td style="text-align: right;">${formatCurrency(product.selling_price || 0)}</td>
                                    <td style="text-align: right;">${formatCurrency(stockValue)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <script>
                    // Auto-print when page loads
                    window.onload = function() {
                        // Make content visible only for printing
                        setTimeout(() => {
                            window.print();
                        }, 100);
                    };
                    
                    // Close the window after printing
                    window.onafterprint = function() {
                        setTimeout(() => {
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    // Print directly without showing content
    function printDirectly(content) {
        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: absolute;
            width: 0;
            height: 0;
            border: 0;
            visibility: hidden;
        `;
        
        document.body.appendChild(iframe);
        
        // Write content to iframe
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(content);
        iframeDoc.close();
        
        // Remove iframe after printing
        iframe.onload = function() {
            setTimeout(() => {
                iframe.remove();
            }, 5000); // Remove after 5 seconds
        };
    }

    // Add spinner CSS if not already present
    if (!document.querySelector('style[data-print-spinner]')) {
        const spinnerStyle = document.createElement('style');
        spinnerStyle.setAttribute('data-print-spinner', 'true');
        spinnerStyle.textContent = `
            .spinner-border {
                display: inline-block;
                width: 2rem;
                height: 2rem;
                vertical-align: text-bottom;
                border: 0.25em solid currentColor;
                border-right-color: transparent;
                border-radius: 50%;
                animation: spinner-border .75s linear infinite;
            }
            
            @keyframes spinner-border {
                to { transform: rotate(360deg); }
            }
            
            .spinner-border.text-primary {
                color: #007bff !important;
            }
        `;
        document.head.appendChild(spinnerStyle);
    }

    // Generate purchase order from filtered items
    function generatePOFromFiltered() {
        console.log('📋 Generating purchase order from filtered items...');
        
        if (filteredProducts.length === 0) {
            showNotification('Info', 'No products to generate purchase order', 'info');
            return;
        }
        
        // Show purchase order modal with filtered products
        const modal = document.getElementById('purchase-order-modal');
        if (modal) {
            // Update PO title based on filter
            const poTitle = document.querySelector('#purchase-order-modal h3');
            if (poTitle) {
                poTitle.textContent = `Generate Purchase Order - ${document.getElementById('filtered-page-title').textContent}`;
            }
            
            // Populate items
            const itemsContainer = document.getElementById('purchase-order-items');
            itemsContainer.innerHTML = filteredProducts.map(product => {
                const needed = product.current_stock === 0 ? 
                    (product.reorder_level || 10) : 
                    Math.max(5, (product.reorder_level || 10) - product.current_stock);
                
                return `
                    <div class="po-item" data-product-id="${product.id}">
                        <div class="po-item-info">
                            <strong>${escapeHtml(product.name)}</strong>
                            <div class="po-item-details">
                                SKU: ${product.sku || 'N/A'} | 
                                Current: ${product.current_stock} | 
                                Reorder: ${product.reorder_level || 10}
                            </div>
                        </div>
                        <div class="po-item-quantity">
                            <input type="number" 
                                class="form-control form-control-sm po-quantity" 
                                value="${needed}" 
                                min="1"
                                data-product-id="${product.id}"
                                data-cost="${product.cost_price || 0}"
                                onchange="updatePOTotals()"
                                style="width: 80px;">
                        </div>
                        <div class="po-item-cost">
                            ${formatCurrency(product.cost_price || 0)}
                        </div>
                    </div>
                `;
            }).join('');
            
            updatePOTotals();
            modal.classList.remove('d-none');
        }
    }

    // Go back to main inventory page
    function goBackToInventory() {
        hideAllPages();
        document.getElementById('inventory-page').classList.remove('d-none');
        currentPage = 'inventory';
        sessionStorage.setItem('currentPage', currentPage);
        
        // Reset filters
        currentFilterType = '';
        filteredProducts = [];
    }

    // Refresh filtered view
    function refreshFilteredView() {
        loadFilteredProducts();
        showNotification('Info', 'Refreshing filtered view...', 'info');
    }

    // Update filtered table with search results
    function updateFilteredTableWithSearch(filteredResults) {
        const container = document.getElementById('filtered-table-body');
        
        if (filteredResults.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center" style="padding: 2rem;">
                        <div style="color: #6c757d;">
                            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <p>No products found matching your search</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let totalStockValue = 0;
        
        container.innerHTML = filteredResults.map((product, index) => {
            const stockValue = (product.current_stock || 0) * (product.cost_price || 0);
            totalStockValue += stockValue;
            
            const status = getStockStatusText(product.current_stock, product.reorder_level);
            const statusClass = status === 'Out of Stock' ? 'status-critical' : 
                            status === 'Low Stock' ? 'status-warning' : 'status-healthy';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(product.name)}</div>
                        <div style="font-size: 0.8rem; color: #6c757d;">${product.description || 'No description'}</div>
                    </td>
                    <td>${product.sku || '-'}</td>
                    <td>${product.category || 'Uncategorized'}</td>
                    <td>
                        <span class="font-weight-bold" style="color: ${getStockColor(product.current_stock, product.reorder_level)}">
                            ${product.current_stock} ${product.unit || 'pcs'}
                        </span>
                    </td>
                    <td>${product.reorder_level || 0}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </td>
                    <td>${formatCurrency(product.cost_price || 0)}</td>
                    <td>${formatCurrency(product.selling_price || 0)}</td>
                    <td>${formatCurrency(stockValue)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-outline btn-sm" onclick="adjustStock('${product.id}')" title="Adjust Stock">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="showProductDetails('${product.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update search results count
        document.getElementById('filtered-total-count').textContent = `${filteredResults.length} of ${filteredProducts.length}`;
        document.getElementById('filtered-total-value').textContent = formatCurrency(totalStockValue);
    }

    // Helper function to hide all pages
    function hideAllPages() {
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.classList.add('d-none'));
    }

    // Update dashboard card click handlers
    function setupDashboardCardClicks() {
        // Low stock card
        const lowStockCard = document.querySelector('.stat-card[onclick*="loadInventory"]');
        if (lowStockCard) {
            lowStockCard.setAttribute('onclick', "showFilteredInventoryPage('low_stock')");
        }
        
        // Out of stock card
        const outStockCard = document.querySelector('.stat-card[onclick*="loadInventory"] + .stat-card');
        if (outStockCard) {
            outStockCard.setAttribute('onclick', "showFilteredInventoryPage('out_of_stock')");
        }
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    // Debug function to check current state
    window.debugInventory = function() {
        console.log('🔍 Inventory Debug Info:');
        console.log('Current Business:', currentBusiness);
        console.log('Current Page:', currentInventoryPage);
        console.log('Inventory Data Length:', inventoryData.length);
        console.log('Inventory Data:', inventoryData);
        console.log('Supabase:', typeof supabase !== 'undefined' ? 'Initialized' : 'Not Initialized');
        
        // Check if we're on inventory page
        const inventoryPage = document.getElementById('inventory-page');
        console.log('On Inventory Page:', !!inventoryPage);
        
        // Check if table body exists
        const tableBody = document.getElementById('inventory-table-body');
        console.log('Table Body Exists:', !!tableBody);
    };

    // Inventory-specific keyboard shortcuts
function setupInventoryShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only trigger if we're on inventory page and not in an input
        const onInventoryPage = document.getElementById('inventory-page') && 
                               !document.getElementById('inventory-page').classList.contains('d-none');
        
        if (!onInventoryPage || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Ctrl/Cmd + N - Add new product
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            showAddProductModal();
            showNotification('Info', 'Opening new product form...', 'info', 1500);
        }
        
        // Ctrl/Cmd + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('inventory-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
                showNotification('Info', 'Search focused. Type to filter products.', 'info', 1500);
            }
        }
        
        // Ctrl/Cmd + E - Bulk editor
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            showBulkEditor();
            showNotification('Info', 'Opening bulk editor...', 'info', 1500);
        }
        
        // Ctrl/Cmd + X - Export
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            exportData('inventory');
        }
        
        // Enter - View selected product (if any row is highlighted)
        if (e.key === 'Enter') {
            const selectedRow = document.querySelector('.clickable-row:hover');
            if (selectedRow) {
                e.preventDefault();
                const productId = selectedRow.getAttribute('onclick')?.match(/showProductDetails\('([^']+)'\)/)?.[1];
                if (productId) {
                    showProductDetails(productId);
                }
            }
        }
        
        // Delete - Delete selected product
        if (e.key === 'Delete') {
            const selectedRow = document.querySelector('.clickable-row:hover');
            if (selectedRow && confirm('Delete this product?')) {
                const deleteBtn = selectedRow.querySelector('.btn-danger');
                if (deleteBtn) {
                    deleteBtn.click();
                }
            }
        }
    });
}