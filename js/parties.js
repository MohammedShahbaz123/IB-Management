// Parties Management System
let currentParties = [];
let currentPartyPage = 1;
const partiesPageSize = 20;
let selectedParties = new Set();
let currentPartyView = 'grid';
let isAddingParty = false;

// Initialize parties system
function initializePartiesSystem() {
    console.log('👥 Initializing parties management system...');
    
    if (document.getElementById('parties-page')) {
        setupPartiesEventListeners();
        setupPartiesShortcuts();
        loadPartiesStats();
        loadParties();
        loadRecentPartyTransactions();
    }
}

// Setup event listeners
function setupPartiesEventListeners() {
    // Remove existing listeners first to prevent duplicates
    const searchInput = document.getElementById('party-search');
    const addPartyForm = document.getElementById('add-party-form');
    const editPartyForm = document.getElementById('edit-party-form');
    
    // Clone and replace elements to remove all event listeners
    if (searchInput) {
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        // Add fresh listener
        newSearchInput.addEventListener('input', debounce(() => {
            console.log('🔍 Searching parties...');
            currentPartyPage = 1;
            loadParties();
        }, 300));
    }
    
    // For forms, remove all listeners and add fresh ones
    if (addPartyForm) {
        // Remove all existing listeners by replacing the form
        const newAddForm = addPartyForm.cloneNode(true);
        addPartyForm.parentNode.replaceChild(newAddForm, addPartyForm);
        
        // Add fresh listener
        newAddForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation(); // Prevent other listeners
            console.log('📝 Add party form submitted (single time)');
            await addParty();
        });
    }
    
    if (editPartyForm) {
        const newEditForm = editPartyForm.cloneNode(true);
        editPartyForm.parentNode.replaceChild(newEditForm, editPartyForm);
        
        newEditForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('📝 Edit party form submitted (single time)');
            await updateParty();
        });
    }
    
    console.log('✅ Parties event listeners setup complete (fresh)');
}

// Load parties statistics
async function loadPartiesStats() {
    if (!currentBusiness?.id) return;
    
    try {
        const { data: parties, error } = await supabase
            .from('parties')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        if (error) throw error;
        
        const customers = parties.filter(p => p.type === 'customer');
        const suppliers = parties.filter(p => p.type === 'supplier');
        const activeParties = parties.filter(p => p.status === 'active');
        
        let totalCredit = 0;
        parties.forEach(party => {
            const balance = parseFloat(party.balance || 0);
            if (balance > 0) totalCredit += balance;
        });
        
        // Update stats
        document.getElementById('total-customers').textContent = customers.length;
        document.getElementById('total-suppliers').textContent = suppliers.length;
        document.getElementById('active-parties').textContent = activeParties.length;
        document.getElementById('total-credit').textContent = formatCurrency(totalCredit);
        
    } catch (error) {
        console.error('❌ Error loading parties stats:', error);
    }
}

// Load parties with pagination
async function loadParties() {
    if (!currentBusiness?.id) {
        showNoBusinessMessage();
        return;
    }
    
    try {
        let query = supabase
            .from('parties')
            .select('*', { count: 'exact' })
            .eq('business_id', currentBusiness.id)
            .eq('is_active', true);
        
        // Apply filters
        const typeFilter = document.getElementById('party-type-filter')?.value;
        if (typeFilter === 'customer') {
            query = query.eq('type', 'customer');
        } else if (typeFilter === 'supplier') {
            query = query.eq('type', 'supplier');
        } else if (typeFilter === 'both') {
            // No filter needed for both
        }
        
        const statusFilter = document.getElementById('party-status-filter')?.value;
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }
        
        const balanceFilter = document.getElementById('party-balance-filter')?.value;
        if (balanceFilter) {
            if (balanceFilter === 'credit') {
                query = query.gt('balance', 0);
            } else if (balanceFilter === 'debit') {
                query = query.lt('balance', 0);
            } else if (balanceFilter === 'zero') {
                query = query.eq('balance', 0);
            }
        }
        
        // Apply search
        const searchTerm = document.getElementById('party-search')?.value;
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
        }
        
        // Add pagination
        const from = (currentPartyPage - 1) * partiesPageSize;
        const to = from + partiesPageSize - 1;
        
        query = query.order('name').range(from, to);
        
        const { data: parties, count, error } = await query;
        
        if (error) throw error;
        
        currentParties = parties || [];
        displayParties(currentParties);
        updatePartiesPagination(count || 0);
        loadPartiesStats();
        
    } catch (error) {
        console.error('❌ Error loading parties:', error);
        showNotification('Error', 'Failed to load parties', 'error');
    }
}

// Display parties in grid view
function displayParties(parties) {
    const gridView = document.getElementById('parties-grid-content');
    const tableView = document.getElementById('parties-table-body');
    
    if (currentPartyView === 'grid') {
        displayPartiesGrid(parties, gridView);
    } else {
        displayPartiesTable(parties, tableView);
    }
}

// Display parties in grid view
function displayPartiesGrid(parties, container) {
    if (!container) return;
    
    if (parties.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h4>No Parties Found</h4>
                <p class="text-muted">${document.getElementById('party-search')?.value ? 'Try a different search term' : 'Add your first party to get started'}</p>
                <button class="btn btn-primary mt-2" onclick="showAddPartyModal()">
                    <i class="fas fa-plus"></i> Add Party
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = parties.map(party => `
        <div class="party-card" data-party-id="${party.id}">
            <div class="party-header">
                <h4 class="party-name">${escapeHtml(party.name)}</h4>
                <span class="party-type-badge party-type-${party.type}">
                    ${party.type === 'customer' ? 'Customer' : 'Supplier'}
                </span>
            </div>
            
            <div class="party-details">
                ${party.phone ? `
                    <div class="party-detail-item">
                        <span class="party-detail-label">Phone</span>
                        <span class="party-detail-value">${party.phone}</span>
                    </div>
                ` : ''}
                
                ${party.email ? `
                    <div class="party-detail-item">
                        <span class="party-detail-label">Email</span>
                        <span class="party-detail-value">${party.email}</span>
                    </div>
                ` : ''}
                
                ${party.company ? `
                    <div class="party-detail-item">
                        <span class="party-detail-label">Company</span>
                        <span class="party-detail-value">${party.company}</span>
                    </div>
                ` : ''}
            </div>
            
            ${party.address ? `
                <div class="party-detail-item">
                    <span class="party-detail-label">Address</span>
                    <span class="party-detail-value" style="font-size: 0.9rem;">${escapeHtml(party.address)}</span>
                </div>
            ` : ''}
            
            <div class="party-balance ${getBalanceClass(party.balance)}">
                Balance: ${formatCurrency(party.balance || 0)}
            </div>
            
            <div class="party-actions">
                <button class="btn btn-outline btn-sm" onclick="showPartyDetails('${party.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-outline btn-sm" onclick="editParty('${party.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline btn-sm" onclick="quickTransaction('${party.id}')">
                    <i class="fas fa-exchange-alt"></i> Transaction
                </button>
            </div>
        </div>
    `).join('');
}

// Display parties in table view
function displayPartiesTable(parties, container) {
    if (!container) return;
    
    if (parties.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h4>No Parties Found</h4>
                        <p class="text-muted">${document.getElementById('party-search')?.value ? 'Try a different search term' : 'Add your first party to get started'}</p>
                        <button class="btn btn-primary mt-2" onclick="showAddPartyModal()">
                            <i class="fas fa-plus"></i> Add Party
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = parties.map(party => `
        <tr data-party-id="${party.id}">
            <td>
                <input type="checkbox" class="party-select-checkbox" 
                       onchange="togglePartySelection('${party.id}', this.checked)">
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="party-avatar">
                        ${party.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(party.name)}</div>
                        <small class="text-muted">${party.company || 'No company'}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="party-type-badge party-type-${party.type}">
                    ${party.type === 'customer' ? 'Customer' : 'Supplier'}
                </span>
            </td>
            <td>
                <div>
                    ${party.phone ? `<div><i class="fas fa-phone"></i> ${party.phone}</div>` : ''}
                    ${party.email ? `<div><i class="fas fa-envelope"></i> ${party.email}</div>` : ''}
                </div>
            </td>
            <td>
                <span class="${getBalanceClass(party.balance)}">
                    ${formatCurrency(party.balance || 0)}
                </span>
            </td>
            <td>
                <span class="badge ${party.status === 'active' ? 'badge-success' : 'badge-secondary'}">
                    ${party.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                ${party.last_transaction_date ? formatDate(party.last_transaction_date) : 'Never'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" onclick="showPartyDetails('${party.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="editParty('${party.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get balance class for styling
function getBalanceClass(balance) {
    const numBalance = parseFloat(balance || 0);
    if (numBalance > 0) return 'balance-positive';
    if (numBalance < 0) return 'balance-negative';
    return 'balance-zero';
}

// Update parties pagination
function updatePartiesPagination(totalCount) {
    const container = document.getElementById('parties-pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(totalCount / partiesPageSize);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <nav aria-label="Parties pagination">
            <ul class="pagination justify-content-center">
    `;
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPartyPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePartyPage(${currentPartyPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPartyPage - 1 && i <= currentPartyPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentPartyPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePartyPage(${i}); return false;">
                        ${i}
                    </a>
                </li>
            `;
        } else if (i === currentPartyPage - 2 || i === currentPartyPage + 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPartyPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePartyPage(${currentPartyPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationHTML += `
            </ul>
        </nav>
        <div class="text-muted text-center mt-2">
            Showing ${((currentPartyPage - 1) * partiesPageSize) + 1} to 
            ${Math.min(currentPartyPage * partiesPageSize, totalCount)} of ${totalCount} parties
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

// Change party page
function changePartyPage(page) {
    currentPartyPage = page;
    loadParties();
}

// Show party groups
// Show party groups
function showPartyGroup(group) {
    // Update active tab
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Store current filter
    localStorage.setItem('partyActiveGroup', group);
    
    // Apply group filtering
    switch(group) {
        case 'all':
            // Reset filters
            document.getElementById('party-type-filter').value = '';
            document.getElementById('party-status-filter').value = '';
            document.getElementById('party-balance-filter').value = '';
            break;
            
        case 'favorites':
            // You might need a "is_favorite" field in your parties table
            // For now, just filter by type
            document.getElementById('party-type-filter').value = 'customer';
            break;
            
        case 'recent':
            // Filter parties created in last 7 days
            // This would require date filtering in loadParties()
            break;
    }
    
    console.log(`Showing party group: ${group}`);
    loadParties();
}

// Toggle party view
function togglePartyView(view) {
    currentPartyView = view;
    
    // Update active button
    document.querySelectorAll('.view-toggle .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide views
    const gridView = document.getElementById('parties-grid-view');
    const tableView = document.getElementById('parties-table-view');
    
    if (view === 'grid') {
        gridView.classList.remove('d-none');
        tableView.classList.add('d-none');
        displayPartiesGrid(currentParties, document.getElementById('parties-grid-content'));
    } else {
        gridView.classList.add('d-none');
        tableView.classList.remove('d-none');
        displayPartiesTable(currentParties, document.getElementById('parties-table-body'));
    }
}

// Toggle party selection
function togglePartySelection(partyId, isSelected) {
    if (isSelected) {
        selectedParties.add(partyId);
    } else {
        selectedParties.delete(partyId);
    }
    
    updateBulkActionsBar();
}

// Toggle select all parties
function toggleSelectAllParties(isSelected) {
    const checkboxes = document.querySelectorAll('.party-select-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = isSelected;
        const partyId = checkbox.closest('tr').dataset.partyId;
        if (isSelected) {
            selectedParties.add(partyId);
        } else {
            selectedParties.delete(partyId);
        }
    });
    
    updateBulkActionsBar();
}

// Update bulk actions bar
function updateBulkActionsBar() {
    const bulkBar = document.getElementById('bulk-actions-bar');
    const countSpan = bulkBar.querySelector('.bulk-selected-count');
    
    if (selectedParties.size > 0) {
        bulkBar.classList.remove('d-none');
        countSpan.textContent = `${selectedParties.size} parties selected`;
    } else {
        bulkBar.classList.add('d-none');
    }
}

// Clear party selection
function clearPartySelection() {
    selectedParties.clear();
    const checkboxes = document.querySelectorAll('.party-select-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    document.getElementById('select-all-parties').checked = false;
    updateBulkActionsBar();
}

// Add party
async function addParty() {
    // 🔥 PREVENT MULTIPLE SUBMISSIONS
    if (isAddingParty) {
        console.log('⚠️ Party submission already in progress, skipping...');
        return;
    }
    
    isAddingParty = true;
    
    try {
        if (!currentBusiness?.id) {
            throw new Error('No business selected');
        }
        
        const partyData = {
            name: document.getElementById('party-name').value.trim(),
            type: document.querySelector('input[name="party-type"]:checked').value,
            email: document.getElementById('party-email').value.trim() || null,
            phone: document.getElementById('party-phone').value.trim(),
            company: document.getElementById('party-company').value.trim() || null,
            address: document.getElementById('party-address').value.trim() || null,
            gst_number: document.getElementById('party-gst').value.trim() || null,
            pan_number: document.getElementById('party-pan').value.trim() || null,
            opening_balance: parseFloat(document.getElementById('party-opening-balance').value) || 0,
            balance_type: document.getElementById('balance-type').value,
            balance: document.getElementById('balance-type').value === 'credit' ? 
                    parseFloat(document.getElementById('party-opening-balance').value) || 0 :
                    -parseFloat(document.getElementById('party-opening-balance').value) || 0,
            credit_limit: parseFloat(document.getElementById('party-credit-limit').value) || null,
            notes: document.getElementById('party-notes').value.trim() || null,
            status: 'active',
            business_id: currentBusiness.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Validate required fields
        if (!partyData.name) {
            throw new Error('Party name is required');
        }
        if (!partyData.phone) {
            throw new Error('Phone number is required');
        }
        
        console.log('📝 Creating party:', partyData);
        
        const { data: party, error } = await supabase
            .from('parties')
            .insert([partyData])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Party created successfully:', party);
        
        showNotification('Success', 'Party added successfully', 'success');
        hideAddPartyModal();
        loadParties();
        loadPartiesStats();
        
    } catch (error) {
        console.error('❌ Error adding party:', error);
        showNotification('Error', error.message || 'Failed to add party', 'error');
    } finally {
        isAddingParty = false; // 🔥 RELEASE LOCK
    }
}

// Edit party
async function editParty(partyId) {
    try {
        const party = currentParties.find(p => p.id === partyId);
        if (!party) {
            throw new Error('Party not found');
        }
        
        // Populate form
        document.getElementById('edit-party-id').value = party.id;
        document.getElementById('edit-party-name').value = party.name;
        
        // Set radio button
        if (party.type === 'customer') {
            document.getElementById('edit-party-type-customer').checked = true;
        } else {
            document.getElementById('edit-party-type-supplier').checked = true;
        }
        
        // Fill other fields...
        document.getElementById('edit-party-email').value = party.email || '';
        document.getElementById('edit-party-phone').value = party.phone || '';
        document.getElementById('edit-party-company').value = party.company || '';
        document.getElementById('edit-party-address').value = party.address || '';
        document.getElementById('edit-party-gst').value = party.gst_number || '';
        document.getElementById('edit-party-pan').value = party.pan_number || '';
        document.getElementById('edit-party-credit-limit').value = party.credit_limit || '';
        document.getElementById('edit-party-notes').value = party.notes || '';
        
        showEditPartyModal();
        
    } catch (error) {
        console.error('❌ Error editing party:', error);
        showNotification('Error', 'Failed to load party data', 'error');
    }
}

// Update party
async function updateParty() {
    try {
        const partyId = document.getElementById('edit-party-id').value;
        
        const partyData = {
            name: document.getElementById('edit-party-name').value.trim(),
            type: document.querySelector('input[name="edit-party-type"]:checked').value,
            email: document.getElementById('edit-party-email').value.trim() || null,
            phone: document.getElementById('edit-party-phone').value.trim(),
            company: document.getElementById('edit-party-company').value.trim() || null,
            address: document.getElementById('edit-party-address').value.trim() || null,
            gst_number: document.getElementById('edit-party-gst').value.trim() || null,
            pan_number: document.getElementById('edit-party-pan').value.trim() || null,
            credit_limit: parseFloat(document.getElementById('edit-party-credit-limit').value) || null,
            notes: document.getElementById('edit-party-notes').value.trim() || null,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('parties')
            .update(partyData)
            .eq('id', partyId)
            .eq('business_id', currentBusiness.id);
        
        if (error) throw error;
        
        showNotification('Success', 'Party updated successfully', 'success');
        hideEditPartyModal();
        loadParties();
        loadPartiesStats();
        
    } catch (error) {
        console.error('❌ Error updating party:', error);
        showNotification('Error', error.message || 'Failed to update party', 'error');
    }
}

// Show party details
async function showPartyDetails(partyId) {
    try {
        const party = currentParties.find(p => p.id === partyId);
        if (!party) {
            throw new Error('Party not found');
        }
        
        // Update modal with party data
        document.getElementById('party-details-name').textContent = party.name;
        document.getElementById('party-details-type').textContent = party.type === 'customer' ? 'Customer' : 'Supplier';
        document.getElementById('party-avatar').textContent = party.name.charAt(0).toUpperCase();
        
        // Contact info
        document.getElementById('details-party-phone').textContent = party.phone || '-';
        document.getElementById('details-party-email').textContent = party.email || '-';
        document.getElementById('details-party-company').textContent = party.company || '-';
        document.getElementById('details-party-address').textContent = party.address || '-';
        
        // Financial info
        document.getElementById('details-party-balance').textContent = formatCurrency(party.balance || 0);
        document.getElementById('details-party-credit-limit').textContent = party.credit_limit ? formatCurrency(party.credit_limit) : '-';
        document.getElementById('details-party-gst').textContent = party.gst_number || '-';
        document.getElementById('details-party-pan').textContent = party.pan_number || '-';
        
        // Load transaction data
        await loadPartyTransactions(partyId);
        
        showPartyDetailsModal();
        
    } catch (error) {
        console.error('❌ Error showing party details:', error);
        showNotification('Error', 'Failed to load party details', 'error');
    }
}

// Load party transactions
async function loadPartyTransactions(partyId) {
    try {
        // Load transaction summary
        const { data: summaryData, error: summaryError } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('party_id', partyId)
            .eq('business_id', currentBusiness.id)
            .eq('status', 'completed');
        
        if (summaryError) throw summaryError;
        
        let totalSales = 0;
        let totalPurchases = 0;
        let totalReceipts = 0;
        let totalPayments = 0;
        
        summaryData.forEach(transaction => {
            const amount = parseFloat(transaction.amount || 0);
            switch (transaction.type) {
                case 'sale':
                    totalSales += amount;
                    break;
                case 'purchase':
                    totalPurchases += amount;
                    break;
                case 'receipt':
                    totalReceipts += amount;
                    break;
                case 'payment':
                    totalPayments += amount;
                    break;
            }
        });
        
        // Update summary
        document.getElementById('party-transaction-summary').innerHTML = `
            <div class="party-details">
                <div class="party-detail-item">
                    <span class="party-detail-label">Total Sales</span>
                    <span class="party-detail-value">${formatCurrency(totalSales)}</span>
                </div>
                <div class="party-detail-item">
                    <span class="party-detail-label">Total Purchases</span>
                    <span class="party-detail-value">${formatCurrency(totalPurchases)}</span>
                </div>
                <div class="party-detail-item">
                    <span class="party-detail-label">Total Receipts</span>
                    <span class="party-detail-value">${formatCurrency(totalReceipts)}</span>
                </div>
                <div class="party-detail-item">
                    <span class="party-detail-label">Total Payments</span>
                    <span class="party-detail-value">${formatCurrency(totalPayments)}</span>
                </div>
            </div>
        `;
        
        // Load recent transactions
        const { data: recentTransactions, error: recentError } = await supabase
            .from('transactions')
            .select('*')
            .eq('party_id', partyId)
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (recentError) throw recentError;
        
        let recentHTML = '';
        if (recentTransactions && recentTransactions.length > 0) {
            recentHTML = recentTransactions.map(transaction => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <h6>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</h6>
                        <small>${formatDate(transaction.created_at)}</small>
                    </div>
                    <div class="transaction-amount ${transaction.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                        ${formatCurrency(Math.abs(transaction.amount))}
                    </div>
                </div>
            `).join('');
        } else {
            recentHTML = '<p class="text-muted">No transactions found</p>';
        }
        
        document.getElementById('party-recent-transactions').innerHTML = recentHTML;
        
    } catch (error) {
        console.error('❌ Error loading party transactions:', error);
        document.getElementById('party-transaction-summary').innerHTML = '<p class="text-muted">Failed to load transactions</p>';
        document.getElementById('party-recent-transactions').innerHTML = '<p class="text-muted">Failed to load transactions</p>';
    }
}

// Load recent party transactions for dashboard
async function loadRecentPartyTransactions() {
    try {
        if (!currentBusiness?.id) return;
        
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*, parties(name)')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const container = document.getElementById('recent-party-transactions');
        if (!container) return;
        
        if (transactions && transactions.length > 0) {
            container.innerHTML = transactions.map(transaction => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <h6>${transaction.parties?.name || 'Unknown'} - ${transaction.type}</h6>
                        <small>${formatDate(transaction.created_at)} • ${transaction.reference || 'No reference'}</small>
                    </div>
                    <div class="transaction-amount ${transaction.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                        ${formatCurrency(transaction.amount)}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center">No recent transactions</p>';
        }
        
    } catch (error) {
        console.error('❌ Error loading recent transactions:', error);
    }
}

// Quick transaction for a party
function quickTransaction(partyId = null) {
    console.log('Quick transaction for party:', partyId);
    // Implement quick transaction functionality
    showNotification('Info', 'Quick transaction feature coming soon', 'info');
}

// Export parties
function exportParties() {
    console.log('Exporting parties...');
    // Implement export functionality
    showNotification('Info', 'Export feature coming soon', 'info');
}

// Show no business message
function showNoBusinessMessage() {
    const container = document.getElementById('parties-grid-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-building"></i>
            <h4>No Business Selected</h4>
            <p class="text-muted">Please select a business to manage parties</p>
            <button class="btn btn-primary mt-2" onclick="showCreateBusinessModal()">
                <i class="fas fa-plus"></i> Create Business
            </button>
        </div>
    `;
}

// Modal functions
function showAddPartyModal() {
    document.getElementById('add-party-modal').classList.remove('d-none');
    document.getElementById('party-name').focus();
}

function hideAddPartyModal() {
    document.getElementById('add-party-modal').classList.add('d-none');
    document.getElementById('add-party-form').reset();
}

function showEditPartyModal() {
    document.getElementById('edit-party-modal').classList.remove('d-none');
}

function hideEditPartyModal() {
    document.getElementById('edit-party-modal').classList.add('d-none');
    document.getElementById('edit-party-form').reset();
}

function showPartyDetailsModal() {
    document.getElementById('party-details-modal').classList.remove('d-none');
}

function hidePartyDetailsModal() {
    document.getElementById('party-details-modal').classList.add('d-none');
}

function editPartyFromDetails() {
    hidePartyDetailsModal();
    const partyId = document.getElementById('party-details-name').dataset.partyId;
    editParty(partyId);
}

// Clear party filters
function clearPartyFilters() {
    document.getElementById('party-search').value = '';
    document.getElementById('party-type-filter').value = '';
    document.getElementById('party-status-filter').value = '';
    document.getElementById('party-balance-filter').value = '';
    loadParties();
}

// Initialize when parties page is loaded
document.addEventListener('DOMContentLoaded', function() {
    const partiesPage = document.getElementById('parties-page');
    if (partiesPage && !partiesPage.classList.contains('d-none')) {
        initializePartiesSystem();
    }
});

// Delete selected parties
async function deleteSelectedParties() {
    if (selectedParties.size === 0) {
        showNotification('Info', 'No parties selected for deletion', 'info');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedParties.size} parties? This action cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
        console.log(`🗑️ Deleting ${selectedParties.size} parties...`);
        
        const partyIds = Array.from(selectedParties);
        let successCount = 0;
        let errorCount = 0;
        
        // Delete parties one by one (or use bulk delete if supported)
        for (const partyId of partyIds) {
            try {
                // Soft delete - set is_active to false
                const { error } = await supabase
                    .from('parties')
                    .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', partyId)
                    .eq('business_id', currentBusiness.id);
                
                if (error) throw error;
                successCount++;
                
            } catch (error) {
                console.error(`❌ Error deleting party ${partyId}:`, error);
                errorCount++;
            }
        }
        
        // Clear selection
        selectedParties.clear();
        clearPartySelection();
        
        // Show results
        if (successCount > 0) {
            showNotification('Success', `Successfully deleted ${successCount} parties`, 'success');
            loadParties();
            loadPartiesStats();
        }
        
        if (errorCount > 0) {
            showNotification('Warning', `${successCount} deleted, ${errorCount} failed`, 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error in bulk delete:', error);
        showNotification('Error', 'Failed to delete parties', 'error');
    }
}

// Also add the other missing bulk action functions:

// Send bulk email to selected parties
async function sendBulkEmail() {
    if (selectedParties.size === 0) {
        showNotification('Info', 'No parties selected for email', 'info');
        return;
    }
    
    // Get parties with email addresses
    const partiesWithEmails = currentParties.filter(party => 
        selectedParties.has(party.id) && party.email
    );
    
    if (partiesWithEmails.length === 0) {
        showNotification('Info', 'No selected parties have email addresses', 'info');
        return;
    }
    
    console.log(`📧 Sending email to ${partiesWithEmails.length} parties...`);
    
    // You can implement email sending logic here
    // For now, just show a notification
    showNotification(
        'Email Ready', 
        `Ready to send email to ${partiesWithEmails.length} parties. Email addresses: ${partiesWithEmails.map(p => p.email).join(', ')}`,
        'info'
    );
}

// Export selected parties
function exportSelectedParties() {
    if (selectedParties.size === 0) {
        showNotification('Info', 'No parties selected for export', 'info');
        return;
    }
    
    const selectedPartiesData = currentParties.filter(party => 
        selectedParties.has(party.id)
    );
    
    console.log(`📤 Exporting ${selectedPartiesData.length} parties...`);
    
    // Create CSV content
    const headers = ['Name', 'Type', 'Email', 'Phone', 'Company', 'Balance', 'Status'];
    const rows = selectedPartiesData.map(party => [
        party.name,
        party.type,
        party.email || '',
        party.phone || '',
        party.company || '',
        party.balance || 0,
        party.status || 'active'
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_parties_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Success', `Exported ${selectedPartiesData.length} parties to CSV`, 'success');
}

// Also add this function to handle bulk operations
function showContactAdmin() {
    showNotification('Contact Admin', 'Please contact your business administrator for assistance.', 'info');
}

// Add function to get role badge class
function getRoleBadgeClass(role) {
    switch(role) {
        case 'owner': return 'badge-primary';
        case 'admin': return 'badge-warning';
        case 'manager': return 'badge-info';
        case 'staff': return 'badge-secondary';
        default: return 'badge-light';
    }
}

// Parties-specific keyboard shortcuts
function setupPartiesShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only trigger if we're on parties page and not in an input
        const onPartiesPage = document.getElementById('parties-page') && 
                             !document.getElementById('parties-page').classList.contains('d-none');
        
        if (!onPartiesPage || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Ctrl/Cmd + N - Add new party
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            showAddPartyModal();
            showNotification('Info', 'Opening new party form...', 'info', 1500);
        }
        
        // Ctrl/Cmd + E - Edit selected party
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const selectedParty = document.querySelector('.party-card:hover, .party-select-checkbox:checked');
            if (selectedParty) {
                const partyCard = selectedParty.closest('.party-card, tr[data-party-id]');
                if (partyCard) {
                    const partyId = partyCard.dataset.partyId;
                    if (partyId) {
                        editParty(partyId);
                    }
                }
            }
        }
        
        // Ctrl/Cmd + V - View party details
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            const hoveredParty = document.querySelector('.party-card:hover');
            if (hoveredParty) {
                const partyId = hoveredParty.dataset.partyId;
                if (partyId) {
                    showPartyDetails(partyId);
                }
            }
        }
        
        // Ctrl/Cmd + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('party-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
                showNotification('Info', 'Search focused. Type to filter parties.', 'info', 1500);
            }
        }
        
        // Space - Toggle selection
        if (e.key === ' ') {
            e.preventDefault();
            const hoveredRow = e.target.closest('tr[data-party-id]');
            if (hoveredRow) {
                const checkbox = hoveredRow.querySelector('.party-select-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}

// Make functions globally available
window.initializePartiesSystem = initializePartiesSystem;
window.showAddPartyModal = showAddPartyModal;
window.hideAddPartyModal = hideAddPartyModal;
window.showEditPartyModal = showEditPartyModal;
window.hideEditPartyModal = hideEditPartyModal;
window.showPartyDetailsModal = showPartyDetailsModal;
window.hidePartyDetailsModal = hidePartyDetailsModal;
window.editPartyFromDetails = editPartyFromDetails;
window.clearPartyFilters = clearPartyFilters;
window.togglePartyView = togglePartyView;
window.toggleSelectAllParties = toggleSelectAllParties;
window.togglePartySelection = togglePartySelection;
window.clearPartySelection = clearPartySelection;
window.changePartyPage = changePartyPage;
window.showPartyGroup = showPartyGroup;
window.deleteSelectedParties = deleteSelectedParties;
window.sendBulkEmail = sendBulkEmail;
window.exportSelectedParties = exportSelectedParties;
window.exportParties = exportParties;
window.quickTransaction = quickTransaction;
window.editParty = editParty;
window.showPartyDetails = showPartyDetails;
window.showContactAdmin = showContactAdmin;

console.log('✅ Parties management system loaded successfully');