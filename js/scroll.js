// scroll.js - Scroll to Top functionality
class ScrollToTop {
    constructor() {
        this.button = null;
        this.scrollThreshold = 300; // Show button after scrolling 300px
        this.init();
    }
    
    init() {
        console.log('🔝 Initializing scroll to top button...');
        
        // Create the button
        this.createButton();
        
        // Add scroll event listener
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Add button click handler
        this.button.addEventListener('click', this.scrollToTop.bind(this));
        
        console.log('✅ Scroll to top button ready');
    }
    
    createButton() {
        // Create button element
        this.button = document.createElement('button');
        this.button.id = 'scroll-to-top-btn';
        this.button.className = 'scroll-to-top-btn d-none';
        this.button.innerHTML = '<i class="fas fa-chevron-up"></i>';
        this.button.title = 'Scroll to Top (Alt+T)';
        
        // Add keyboard shortcut indicator
        const indicator = document.createElement('span');
        indicator.className = 'scroll-shortcut-indicator';
        indicator.textContent = 'Alt+T';
        this.button.appendChild(indicator);
        
        // Add to page
        document.body.appendChild(this.button);
        
        // Add styles
        this.addStyles();
        
        // Register keyboard shortcut
        if (window.keyboardShortcuts) {
            window.keyboardShortcuts.register('Alt+t', 'Scroll to top', () => this.scrollToTop());
        }
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Scroll to Top Button */
            .scroll-to-top-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                z-index: 9999;
                opacity: 0.9;
            }
            
            .scroll-to-top-btn:hover {
                opacity: 1;
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .scroll-to-top-btn:active {
                transform: translateY(0);
            }
            
            .scroll-shortcut-indicator {
                position: absolute;
                top: -5px;
                right: -5px;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                font-size: 9px;
                font-weight: bold;
                padding: 2px 5px;
                border-radius: 8px;
                border: 2px solid white;
                font-family: 'Courier New', monospace;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            /* Animation for appearing */
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 0.9;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeOutDown {
                from {
                    opacity: 0.9;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }
            
            .scroll-to-top-btn.show {
                animation: fadeInUp 0.3s ease forwards;
            }
            
            .scroll-to-top-btn.hide {
                animation: fadeOutDown 0.3s ease forwards;
            }
            
            /* Adjust position if cheat sheet button exists */
            .cheat-sheet-btn ~ .scroll-to-top-btn {
                bottom: 90px;
            }
            
            /* Different positions for different pages */
            .sales-invoice-page .scroll-to-top-btn,
            #sales-invoice-page .scroll-to-top-btn {
                bottom: 80px;
                right: 20px;
            }
            
            .product-details-page .scroll-to-top-btn,
            #product-details-page .scroll-to-top-btn {
                bottom: 80px;
                right: 20px;
            }
        `;
        document.head.appendChild(style);
    }
    
    handleScroll() {
        if (window.scrollY > this.scrollThreshold) {
            this.showButton();
        } else {
            this.hideButton();
        }
    }
    
    showButton() {
        if (!this.button.classList.contains('show')) {
            this.button.classList.remove('d-none', 'hide');
            this.button.classList.add('show');
        }
    }
    
    hideButton() {
        if (this.button.classList.contains('show')) {
            this.button.classList.remove('show');
            this.button.classList.add('hide');
            
            // Remove after animation completes
            setTimeout(() => {
                if (this.button.classList.contains('hide')) {
                    this.button.classList.add('d-none');
                    this.button.classList.remove('hide');
                }
            }, 300);
        }
    }
    
    scrollToTop() {
        // Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // For pages with nested scrollable containers
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // Also scroll any other scrollable elements
        const scrollableElements = document.querySelectorAll('.table-responsive, .page-content, .modal-body');
        scrollableElements.forEach(element => {
            if (element.scrollHeight > element.clientHeight) {
                element.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
        
        // Focus on the first search field if available
        this.focusTopSearch();
    }
    
    focusTopSearch() {
        // Try to focus on the first search input
        const searchInputs = [
            document.querySelector('.search-box input'),
            document.querySelector('input[type="search"]'),
            document.querySelector('input[placeholder*="Search"]'),
            document.querySelector('.form-control[type="text"]')
        ];
        
        for (const input of searchInputs) {
            if (input && input.offsetParent !== null) { // Check if visible
                input.focus();
                input.select();
                break;
            }
        }
    }
    
    // Public method to manually show/hide button
    updatePosition() {
        if (window.scrollY > this.scrollThreshold) {
            this.showButton();
        } else {
            this.hideButton();
        }
    }
}

// Initialize globally
let scrollToTop = null;

function initializeScrollToTop() {
    if (!scrollToTop) {
        scrollToTop = new ScrollToTop();
        window.scrollToTop = scrollToTop;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeScrollToTop();
        
        // Also initialize with keyboard shortcuts if available
        if (typeof initializeKeyboardShortcuts === 'function') {
            initializeKeyboardShortcuts();
            
            // Add Alt+T shortcut if not already added
            setTimeout(() => {
                if (window.keyboardShortcuts) {
                    window.keyboardShortcuts.register('Alt+t', 'Scroll to top', () => {
                        if (scrollToTop) {
                            scrollToTop.scrollToTop();
                        }
                    });
                    
                    // Add indicator to the button
                    if (document.getElementById('scroll-to-top-btn')) {
                        const btn = document.getElementById('scroll-to-top-btn');
                        if (window.keyboardShortcuts.addIndicatorToButton) {
                            window.keyboardShortcuts.addIndicatorToButton(btn, 'Alt+T');
                        }
                    }
                }
            }, 100);
        }
    }, 1000);
});

// Monitor page changes for single-page apps
function monitorPageChanges() {
    const observer = new MutationObserver(() => {
        // Update button position when content changes
        if (scrollToTop) {
            scrollToTop.updatePosition();
        }
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScrollToTop };
}