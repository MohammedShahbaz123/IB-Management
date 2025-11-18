// Enhanced Inventory Management Functions with Business Isolation
let currentInventoryPage = 1;
const inventoryPageSize = 10;
let inventoryView = 'table';

async function initializeInventoryPage() {
    console.log('📦 Initializing inventory page for business:', currentBusiness?.name);
    await loadInventorySummary();
    await loadInventoryProducts();
    setupInventoryEventListeners();
    updateDashboardMetrics();
}

function setupInventoryEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentInventoryPage = 1;
            loadInventoryProducts();
        }, 300));
    }
    
    // Filter functionality
    const categoryFilter = document.getElementById('category-filter');
    const stockFilter = document.getElementById('stock-status-filter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentInventoryPage = 1;
            loadInventoryProducts();
        });
    }
    
    if (stockFilter) {
        stockFilter.addEventListener('change', () => {
            currentInventoryPage = 1;
            loadInventoryProducts();
        });
    }
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

async function loadInventoryProducts() {
    if (!currentBusiness?.id) {
        console.warn('⚠️ No current business selected for inventory');
        displayInventoryProducts([]);
        return;
    }
    
    try {
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        // Apply search filter
        const searchTerm = document.getElementById('inventory-search')?.value;
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
        }
        
        // Apply category filter
        const category = document.getElementById('category-filter')?.value;
        if (category) {
            query = query.eq('category', category);
        }
        
        // Apply stock status filter
        const stockStatus = document.getElementById('stock-status-filter')?.value;
        if (stockStatus === 'out_of_stock') {
            query = query.eq('current_stock', 0);
        } else if (stockStatus === 'low_stock') {
            query = query.lte('current_stock', 5);
        } else if (stockStatus === 'in_stock') {
            query = query.gt('current_stock', 0);
        }
        
        // Apply pagination
        const from = (currentInventoryPage - 1) * inventoryPageSize;
        const to = from + inventoryPageSize - 1;
        
        query = query.range(from, to).order('name');
        
        const { data: products, error, count } = await query;
        
        if (error) throw error;
        
        displayInventoryProducts(products || []);
        updateInventoryPagination(count || 0);
        loadLowStockAlerts();
        
    } catch (error) {
        console.error('❌ Inventory load error:', error);
        showNotification('Error', 'Failed to load inventory', 'error');
        displayInventoryProducts([]);
    }
}

function displayInventoryProducts(products) {
    const container = document.getElementById('inventory-table-body');
    if (!container) return;
    
    if (inventoryView === 'table') {
        container.innerHTML = products.map(product => `
            <tr class="clickable-row" onclick="editProduct('${product.id}')">
                <td>
                    <div class="d-flex align-items-center">
                        <div class="product-avatar" style="width: 40px; height: 40px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                            <i class="fas fa-box" style="color: #6c757d;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${product.name}</div>
                            <div style="font-size: 0.8rem; color: #6c757d;">${product.category || 'Uncategorized'}</div>
                        </div>
                    </div>
                </td>
                <td>${product.sku}</td>
                <td>${product.category || '-'}</td>
                <td>
                    <div style="font-weight: 600; color: ${getStockColor(product.current_stock, product.reorder_level)}">
                        ${product.current_stock}
                    </div>
                </td>
                <td>${product.reorder_level || 10}</td>
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
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); adjustStock('${product.id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } else {
        // Grid view implementation
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-card-header">
                    <div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-sku">${product.sku}</div>
                    </div>
                    <span class="stock-status ${getStockStatusClass(product.current_stock, product.reorder_level)}">
                        ${getStockStatusText(product.current_stock, product.reorder_level)}
                    </span>
                </div>
                
                <div class="product-stock ${getStockLevelClass(product.current_stock, product.reorder_level)}">
                    <div style="font-size: 1.5rem; font-weight: 600;">${product.current_stock}</div>
                    <div style="font-size: 0.8rem;">in stock</div>
                </div>
                
                <div class="product-prices">
                    <div class="product-cost">Cost: ${formatCurrency(product.cost_price || 0)}</div>
                    <div class="product-price">${formatCurrency(product.selling_price || 0)}</div>
                </div>
                
                <div class="action-buttons" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm" onclick="editProduct('${product.id}')" style="flex: 1;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="adjustStock('${product.id}')" style="flex: 1;">
                        <i class="fas fa-exchange-alt"></i> Stock
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function getStockColor(currentStock, reorderLevel = 10) {
    if (currentStock === 0) return '#f72585';
    if (currentStock <= reorderLevel) return '#f8961e';
    return '#4cc9f0';
}

function getStockStatusClass(currentStock, reorderLevel = 10) {
    if (currentStock === 0) return 'stock-out-of-stock';
    if (currentStock <= reorderLevel) return 'stock-low-stock';
    return 'stock-in-stock';
}

function getStockStatusText(currentStock, reorderLevel = 10) {
    if (currentStock === 0) return 'Out of Stock';
    if (currentStock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
}

function getStockLevelClass(currentStock, reorderLevel = 10) {
    if (currentStock === 0) return 'critical';
    if (currentStock <= reorderLevel) return 'warning';
    return 'healthy';
}

function updateInventoryPagination(totalCount) {
    const container = document.getElementById('inventory-pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(totalCount / inventoryPageSize);
    
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
    currentInventoryPage = page;
    loadInventoryProducts();
}

async function loadLowStockAlerts() {
    if (!currentBusiness?.id) return;
    
    try {
        const { data: lowStockProducts, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .lte('current_stock', 5)
            .eq('is_active', true)
            .order('current_stock', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        
        displayLowStockAlerts(lowStockProducts || []);
        
    } catch (error) {
        console.error('❌ Low stock alerts error:', error);
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
    
    container.innerHTML = products.map(product => `
        <div class="low-stock-item">
            <div class="low-stock-info">
                <div class="low-stock-name">${product.name}</div>
                <div class="low-stock-details">
                    Current: ${product.current_stock} | Reorder: ${product.reorder_level || 10} | 
                    Needed: ${(product.reorder_level || 10) - product.current_stock}
                </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="adjustStock('${product.id}')">
                <i class="fas fa-plus"></i> Restock
            </button>
        </div>
    `).join('');
}

// Business-aware product management
async function addProduct(productData) {
    try {
        const product = await createBusinessRecord('products', productData);
        showNotification('Success', 'Product added successfully!', 'success');
        hideAddProductModal();
        loadInventoryProducts();
        loadInventorySummary();
        return product;
    } catch (error) {
        console.error('❌ Add product error:', error);
        showNotification('Error', 'Failed to add product', 'error');
        throw error;
    }
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

// Event listener for add product form
document.addEventListener('DOMContentLoaded', function() {
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productData = {
                name: document.getElementById('product-name').value,
                sku: document.getElementById('product-sku').value,
                category: document.getElementById('product-category').value,
                unit: document.getElementById('product-unit').value,
                cost_price: parseFloat(document.getElementById('product-cost').value) || 0,
                selling_price: parseFloat(document.getElementById('product-price').value) || 0,
                current_stock: parseInt(document.getElementById('product-stock').value) || 0,
                reorder_level: parseInt(document.getElementById('product-reorder').value) || 10,
                description: document.getElementById('product-description').value
            };
            
            addProduct(productData);
        });
    }
});

function editProduct(productId) {
    showNotification('Edit Product', `Editing product ${productId}`, 'info');
    // Implementation for edit product modal
}

function adjustStock(productId) {
    showNotification('Adjust Stock', `Adjusting stock for product ${productId}`, 'info');
    // Implementation for stock adjustment modal
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: false })
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

function refreshInventory() {
    currentInventoryPage = 1;
    clearBusinessData('inventory');
    clearBusinessData('inventory_summary');
    clearBusinessData('low_stock_alerts');
    loadInventoryProducts();
    showNotification('Refreshed', 'Inventory data refreshed', 'success');
}

function generatePurchaseOrder() {
    showNotification('Purchase Order', 'Generating purchase order for low stock items...', 'info');
    // Implementation for purchase order generation
}

function showBulkUpdateModal() {
    showNotification('Bulk Update', 'Opening bulk update interface...', 'info');
    // Implementation for bulk update modal
}

function showImportModal() {
    showNotification('Import', 'Opening import interface...', 'info');
    // Implementation for import modal
}

function switchInventoryView(view) {
    inventoryView = view;
    loadInventoryProducts();
    
    // Update active view button
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}