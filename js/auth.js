let isCompletingProfile = false;
let isCreatingBusiness = false;

// Add this function at the top of your auth.js file, after your variable declarations
async function getCurrentUser() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Make it globally available
window.getCurrentUser = getCurrentUser;

// Authentication Functions
async function initializeApp() {
    if (appInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }
    
    console.log('Initializing app...');
    appInitialized = true;
    
    try {
        setupPageVisibilityHandler();   
        await checkAuthStatus();
        setupEventListeners();
        
        document.body.classList.add('app-loaded');
        
        setTimeout(() => {
            const loadingElement = document.getElementById('app-loading');
            if (loadingElement) {
                loadingElement.classList.add('hidden');
                setTimeout(() => {
                    loadingElement.remove();
                }, 300);
            }
            initialLoadComplete = true;
            const partiesPage = document.getElementById('parties-page');
    if (partiesPage && !partiesPage.classList.contains('d-none')) {
        initializePartiesSystem();
    }
        }, 200);
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
            setTimeout(() => loadingElement.remove(), 300);
        }
        document.body.classList.add('app-loaded');
        showLandingPage();
    }
}

function setupPageVisibilityHandler() {
    let isTabSwitch = false;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Tab switched away - just save state, don't change anything
            isTabSwitch = true;
            saveCurrentState();
        } else {
            // Tab switched back - restore UI but don't reload
            if (isTabSwitch) {
                console.log('🔍 Tab focused - restoring UI state without reload');
                restoreUIState();
                isTabSwitch = false;
            }
        }
    });
    
    // Prevent reloads on focus
    window.addEventListener('focus', function() {
        console.log('🎯 Window focused - maintaining current state');
        // Just update any real-time data, don't reload pages
        updateRealtimeData();
    });
}

function updateRealtimeData() {
    // Only update data that changes frequently
    // Don't reload entire pages
    if (currentPage === 'overview') {
        loadDashboardData(); // This should be lightweight
    }
}

function restoreUIState() {
    // Just update the UI elements that might need refreshing
    // but don't reload the entire page content
    updateDashboardMetrics();
    
    // Update any real-time indicators
    if (window.updateRealtimeIndicators) {
        updateRealtimeIndicators();
    }
}

function saveCurrentState() {
    let currentSection = 'landing';
    if (!landingPage.classList.contains('d-none')) {
        currentSection = 'landing';
    } else if (!authPages.classList.contains('d-none')) {
        currentSection = 'auth';
    } else if (!dashboard.classList.contains('d-none')) {
        currentSection = 'dashboard';
    }
    
    localStorage.setItem(STATE_KEYS.LAST_VISIBLE_SECTION, currentSection);
    console.log('💾 Saved current state:', currentSection);
}

async function restoreApplicationState() {
    try {
        console.log('🔄 Restoring application state with staff support...');
        const { data } = await supabase.auth.getSession();
        
        if (data.session && data.session.user) {
            currentUser = data.session.user;
            
            // Check for staff session first
            const staffSession = loadStaffSession();
            if (staffSession && staffSession.user_id === currentUser.id) {
                console.log('🔍 Restoring staff session on visibility change...');
                await restoreStaffSession(staffSession);
                return;
            }
            
            if (dashboard.classList.contains('d-none')) {
                console.log('🔄 Restoring dashboard for logged-in user');
                await showDashboard();
            } else {
                const savedPage = localStorage.getItem(STATE_KEYS.ACTIVE_DASHBOARD_PAGE) || 'overview';
                console.log('🔄 Restoring dashboard page:', savedPage);
                showDashboardPage(savedPage);
            }
        } else {
            currentUser = null;
            const lastSection = localStorage.getItem(STATE_KEYS.LAST_VISIBLE_SECTION);
            
            if (lastSection === 'auth' && !authPages.classList.contains('d-none')) {
                console.log('🔄 User on auth pages - maintaining state');
            } else if (lastSection === 'auth') {
                console.log('🔄 Restoring auth pages');
                showAuthPages();
            } else {
                if (landingPage.classList.contains('d-none')) {
                    console.log('🔄 Restoring landing page');
                    showLandingPage();
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error restoring application state:', error);
        showLandingPage();
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth navigation
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const heroSignup = document.getElementById('hero-signup');
    const toLogin = document.getElementById('to-login');
    const toSignup = document.getElementById('to-signup');
    const logoutBtn = document.getElementById('logout-btn');
    const resendOtpBtn = document.getElementById('resend-otp');
    
    if (loginBtn) loginBtn.addEventListener('click', showLogin);
    if (signupBtn) signupBtn.addEventListener('click', showSignup);
    if (heroSignup) heroSignup.addEventListener('click', showSignup);
    if (toLogin) toLogin.addEventListener('click', showLogin);
    if (toSignup) toSignup.addEventListener('click', showSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (resendOtpBtn) resendOtpBtn.addEventListener('click', handleResendOtp);
    
    // Form submissions
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const otpForm = document.getElementById('otp-form');
    const profileForm = document.getElementById('profile-form');
    
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (otpForm) otpForm.addEventListener('submit', handleOtpVerification);
    if (profileForm) profileForm.addEventListener('submit', handleProfileCompletion);

    // Cancel buttons
    const signupCancel = document.getElementById('signup-cancel');
    const loginCancel = document.getElementById('login-cancel');
    const otpCancel = document.getElementById('otp-cancel');
    const profileCancel = document.getElementById('profile-cancel');
    
    if (signupCancel) signupCancel.addEventListener('click', handleCancel);
    if (loginCancel) loginCancel.addEventListener('click', handleCancel);
    if (otpCancel) otpCancel.addEventListener('click', handleCancel);
    if (profileCancel) profileCancel.addEventListener('click', handleCancel);
    
    // Dashboard navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-page]');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showDashboardPage(page);
            
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    console.log('Event listeners setup complete');
}

// Smart navigation that maintains state
function setupNavigation() {
    console.log('🔗 Setting up smart navigation...');
    
    // Use event delegation for navigation
    document.addEventListener('click', function(e) {
        const navLink = e.target.closest('.sidebar-menu a[data-page]');
        if (navLink) {
            e.preventDefault();
            const page = navLink.getAttribute('data-page');
            showDashboardPage(page);
        }
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', function() {
        const page = window.location.hash.replace('#', '') || 'overview';
        if (page !== currentPage) {
            showDashboardPage(page);
        }
    });
}

async function checkAuthStatus() {
    try {
        console.log('🔐 Checking auth status with staff session support...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Session error:', error);
            const lastSection = localStorage.getItem(STATE_KEYS.LAST_VISIBLE_SECTION);
            console.log('📋 Last known section:', lastSection);
            
            if (lastSection === 'auth') {
                setTimeout(() => showAuthPages(), 50);
            } else {
                setTimeout(() => showLandingPage(), 50);
            }
            return;
        }
        
        console.log('📋 Session data:', data);
        
        if (data.session && data.session.user) {
            currentUser = data.session.user;
            
            // Check for existing staff session first
            const staffSession = loadStaffSession();
            if (staffSession && staffSession.user_id === currentUser.id) {
                console.log('🔍 Staff session found, restoring...');
                await restoreStaffSession(staffSession);
            } else {
                // Regular user flow
                await checkUserBusinessesAndProfile();
            }
            
        } else {
            console.log('❌ No active session');
            currentUser = null;
            
            const lastSection = localStorage.getItem(STATE_KEYS.LAST_VISIBLE_SECTION);
            console.log('📋 Last known section:', lastSection);
            
            if (lastSection === 'auth') {
                setTimeout(() => showAuthPages(), 50);
            } else {
                setTimeout(() => showLandingPage(), 50);
            }
        }
    } catch (error) {
        console.error('❌ Auth check error:', error);
        setTimeout(() => showLandingPage(), 50);
    }
}

function showLandingPage() {
    console.log('🏠 Showing landing page');
    safeHide(authPages);
    safeHide(dashboard);
    safeShow(landingPage);
    localStorage.setItem(STATE_KEYS.LAST_VISIBLE_SECTION, 'landing');
}

function showAuthPages() {
    console.log('🔑 Showing auth pages');
    safeHide(landingPage);
    safeHide(dashboard);
    safeShow(authPages);
    localStorage.setItem(STATE_KEYS.LAST_VISIBLE_SECTION, 'auth');
}

function showSignup(e) {
    if (e) e.preventDefault();
    console.log('📝 Showing signup page');
    showAuthPages();
    safeShow(document.getElementById('signup-page'));
    safeHide(document.getElementById('login-page'));
    safeHide(document.getElementById('otp-page'));
    safeHide(document.getElementById('profile-page'));
    autoFocusFirstInput('signup-page'); 
}

function showLogin(e) {
    if (e) e.preventDefault();
    console.log('🔐 Showing login page');
    showAuthPages();
    safeShow(document.getElementById('login-page'));
    safeHide(document.getElementById('signup-page'));
    safeHide(document.getElementById('otp-page'));
    safeHide(document.getElementById('profile-page'));
    autoFocusFirstInput('login-page');
}

function showOtpPage(email) {
    console.log('📧 Showing OTP page for:', email);
    showAuthPages();
    safeShow(document.getElementById('otp-page'));
    safeHide(document.getElementById('signup-page'));
    safeHide(document.getElementById('login-page'));
    safeHide(document.getElementById('profile-page'));
    autoFocusFirstInput('otp-page');
    
    document.getElementById('user-email').textContent = email;
    currentEmail = email;
    
    startResendTimer();
}

function showProfilePage() {
    console.log('👤 Showing profile page');
    showAuthPages();
    safeShow(document.getElementById('profile-page'));
    safeHide(document.getElementById('signup-page'));
    safeHide(document.getElementById('login-page'));
    safeHide(document.getElementById('otp-page'));
}

async function handleSignup(e) {
    e.preventDefault();
    console.log('🚀 Starting signup process...');
    
    const email = document.getElementById('signup-email').value;
    
    if (!isValidEmail(email)) {
        showNotification('Invalid Email', 'Please enter a valid email address.', 'error');
        return;
    }
    
    const signupSubmit = document.getElementById('signup-submit');
    const signupText = document.getElementById('signup-text');
    const signupLoading = document.getElementById('signup-loading');
    
    setLoadingState(signupText, signupLoading, signupSubmit, true);
    
    try {
        console.log('📤 Checking if user exists before sending OTP...', email);
        
        const { data, error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (!error) {
            console.log('✅ User already exists, redirecting to login');
            
            showNotification('Welcome Back!', `We found your existing account with ${email}. Redirecting to login...`, 'info', 4000);
            
            setTimeout(() => {
                showLogin();
                document.getElementById('login-email').value = email;
                
                setTimeout(() => {
                    console.log('🔄 Auto-sending OTP to existing user...');
                    document.getElementById('login-form').dispatchEvent(new Event('submit'));
                }, 800);
            }, 2000);
            
            return;
        }
        
        if (error.message?.includes('not found') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('user not found') ||
            error.message?.includes('Signups not allowed')) {
            
            console.log('🆕 New user, proceeding with signup');
            
            const { data: signupData, error: signupError } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    data: {
                        user_type: 'owner',
                        is_new_user: true
                    },
                    shouldCreateUser: true
                }
            });
            
            if (signupError) {
                console.error('❌ Signup OTP error:', signupError);
                
                if (signupError.message?.includes('rate limit')) {
                    throw new Error('Too many signup attempts. Please wait a few minutes.');
                } else if (signupError.message?.includes('already exists')) {
                    throw new Error('This email is already registered. Please try logging in.');
                } else {
                    throw signupError;
                }
            }
            
            console.log('✅ Signup OTP sent successfully:', signupData);
            
            isNewUser = true;
            currentUser = { email };
            
            showOtpPage(email);
            showNotification('Almost There!', `We sent a verification code to ${email}. Please check your inbox to complete signup.`, 'success', 6000);
            
        } else {
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        
        let userMessage = 'Unable to create your account. Please try again.';
        let title = 'Signup Failed';
        
        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
            userMessage = 'Too many attempts. Please wait a few minutes before trying again.';
            title = 'Slow Down';
        } else if (error.message?.includes('already exists')) {
            userMessage = 'This email is already registered. Please try logging in instead.';
            title = 'Account Exists';
        } else if (error.message?.includes('invalid email')) {
            userMessage = 'Please enter a valid email address.';
            title = 'Invalid Email';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            userMessage = 'Please check your internet connection and try again.';
            title = 'Connection Issue';
        }
        
        showNotification(title, userMessage, 'error');
    } finally {
        setLoadingState(signupText, signupLoading, signupSubmit, false);
    }
}

// Enhanced login function with direct staff login
async function handleLogin(e) {
    if (e) e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    
    if (!isValidEmail(email)) {
        showNotification('Invalid Email', 'Please enter a valid email address.', 'error');
        return;
    }
    
    const loginSubmit = document.getElementById('login-submit');
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    
    setLoadingState(loginText, loginLoading, loginSubmit, true);
    
    try {
        console.log('🔐 Checking user type for:', email);
        
        // First check if user is a staff member in any business
        const staffBusinesses = await checkStaffMembership(email);
        
        if (staffBusinesses.length > 0) {
            // User is a staff member - proceed with direct staff login
            console.log('👥 Staff member detected, proceeding with direct login');
            await handleDirectStaffLogin(email, staffBusinesses);
            return;
        }
        
        // Regular user flow
        console.log('👤 Regular user, checking existence...');
        
        const { data, error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (!error) {
            console.log('✅ Existing user logging in, sending OTP');
            
            isNewUser = false;
            currentUser = { email };
            
            showOtpPage(email);
            showNotification('Login OTP Sent', 'We sent a verification code to your email.', 'success');
            return;
        }
        
        if (error.message?.includes('not found') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('user not found') ||
            error.message?.includes('Signups not allowed')) {
            
            console.log('🆕 New user trying to login, redirecting to signup');
            
            showNotification('No Account Found', `We couldn't find an account with ${email}. Let's create one for you!`, 'info', 5000);
            
            setTimeout(() => {
                showSignup();
                document.getElementById('signup-email').value = email;
            }, 2000);
            
            return;
        }
        
        throw error;
        
    } catch (error) {
        console.error('❌ Login check error:', error);
        
        let userMessage = 'Unable to process your request. Please try again.';
        
        if (error.message?.includes('invalid email')) {
            userMessage = 'Please enter a valid email address.';
        } else if (error.message?.includes('disabled')) {
            userMessage = 'This account has been disabled. Please contact support.';
        } else if (error.message?.includes('rate limit')) {
            userMessage = 'Too many attempts. Please wait a few minutes.';
        }
        
        showNotification('Login Issue', userMessage, 'error');
    } finally {
        setLoadingState(loginText, loginLoading, loginSubmit, false);
    }
}

// Direct staff login - creates account automatically if needed
async function handleDirectStaffLogin(email, staffBusinesses) {
    try {
        console.log('🔐 Handling direct staff login for:', email);
        
        currentEmail = email;
        
        // Check if staff member already has a Supabase auth account
        try {
            const { data: existingUser, error: userCheckError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            if (!userCheckError && existingUser) {
                // Staff member has existing account - send OTP normally
                console.log('✅ Staff member has existing account, sending OTP');
                
                const { data, error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        shouldCreateUser: false
                    }
                });
                
                if (error) throw error;
                
                showOtpPage(email);
                showNotification('OTP Sent', 'Verification code sent to your email', 'success');
                
            } else {
                // Staff member doesn't have an account - create one automatically via OTP
                console.log('🆕 Staff member without account, creating automatically via OTP');
                
                const { data, error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        data: {
                            user_type: 'staff',
                            is_staff: true,
                            staff_name: staffBusinesses[0]?.staff_name || email.split('@')[0],
                            staff_businesses: staffBusinesses.map(b => b.id)
                        },
                        shouldCreateUser: true
                    }
                });
                
                if (error) {
                    console.error('❌ OTP send error:', error);
                    throw error;
                }
                
                showOtpPage(email);
                showNotification(
                    'Welcome Staff Member!', 
                    'Verification code sent to your email. Your staff account will be created automatically.',
                    'success'
                );
            }
            
        } catch (checkError) {
            console.log('⚠️ Profile check failed, proceeding with OTP:', checkError);
            
            // If profile check fails, still try to send OTP
            const { data, error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    data: {
                        user_type: 'staff',
                        is_staff: true
                    },
                    shouldCreateUser: true
                }
            });
            
            if (error) throw error;
            
            showOtpPage(email);
            showNotification('OTP Sent', 'Verification code sent to your email', 'success');
        }
        
    } catch (error) {
        console.error('❌ Direct staff login error:', error);
        showNotification('Login Error', 'Failed to process staff login. Please try again.', 'error');
    }
}

// After successful login, load user role
async function loadUserRoleAfterLogin() {
    await loadCurrentUserRole();
    applyRoleBasedAccess();
}   
// Enhanced authentication with staff onboarding
async function handleOtpVerification(e) {
    e.preventDefault();
    console.log('🔢 Starting OTP verification...');
    
    const otp = document.getElementById('otp-code').value;
    
    const otpSubmit = document.getElementById('otp-submit');
    const otpText = document.getElementById('otp-text');
    const otpLoading = document.getElementById('otp-loading');
    
    setLoadingState(otpText, otpLoading, otpSubmit, true);
    
    try {
        console.log('✅ Verifying OTP for:', currentEmail);
        
        const { data, error } = await supabase.auth.verifyOtp({
            email: currentEmail,
            token: otp,
            type: 'email'
        });
        
        if (error) {
            console.error('❌ OTP verification error:', error);
            throw error;
        }
        
        console.log('🎉 OTP verified successfully:', data);
        
        currentUser = data.user;
        console.log('👤 User after OTP verification:', {
            id: currentUser.id,
            email: currentUser.email
        });
        
        // 🔥 CRITICAL: Wait for session to propagate
        console.log('⏳ Waiting for session to establish...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 🔥 CRITICAL: Check staff membership with retry logic
        let staffBusinesses = [];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            console.log(`🔍 Staff check attempt ${retryCount + 1}/${maxRetries}...`);
            
            staffBusinesses = await checkStaffMembership(currentUser.email);
            
            if (staffBusinesses && staffBusinesses.length > 0) {
                console.log('✅ Staff found on attempt', retryCount + 1);
                break;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`⏳ Retrying in 1 second...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (staffBusinesses && staffBusinesses.length > 0) {
            console.log('👥 STAFF MEMBER DETECTED - bypassing all flows');
            
            // Set staff properties
            currentUser.is_staff = true;
            currentUser.user_type = 'staff';
            currentUser.role = staffBusinesses[0].staff_role;
            
            // Set businesses
            userBusinesses = staffBusinesses;
            currentBusiness = staffBusinesses[0];
            
            // Save staff session
            saveStaffSessionData(staffBusinesses);
            
            // Set flags
            localStorage.setItem('profile_completed', 'true');
            localStorage.setItem('user_has_businesses', 'true');
            
            // Reset flags
            isCompletingProfile = false;
            isCreatingBusiness = false;
            
            showNotification('Success', `Welcome ${staffBusinesses[0].staff_name || 'Staff Member'}!`, 'success');
            
            // Clear any pending state
            clearAuthForms();
            
            // Go directly to dashboard
            setTimeout(async () => {
                await showDashboard();
            }, 500);
            
            return;
        }
        
        // Regular user flow - only if no staff found after all retries
        console.log('👤 No staff found after', maxRetries, 'attempts, checking profile...');
        await checkUserBusinessesAndProfile();
        
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        showNotification('Verification Failed', error.message || 'Invalid OTP code.', 'error');
    } finally {
        setLoadingState(otpText, otpLoading, otpSubmit, false);
    }
}

async function handleStaffMemberPostLogin(staffBusinesses) {
    try {
        console.log('👥 Processing staff member post-login with session persistence...');
        
        // Ensure staff profile exists in profiles table
        await ensureStaffProfileExists(staffBusinesses);
        
        // Set user businesses and active business
        userBusinesses = staffBusinesses;
        
        // Set the first staff business as active
        if (staffBusinesses.length > 0) {
            await setActiveBusiness(staffBusinesses[0].id);
        }
        
        // Mark as staff user and set role
        currentUser.is_staff = true;
        currentUser.user_type = 'staff';
        
        // 🔥 CRITICAL: Load user role immediately
        await loadCurrentUserRole();
        
        // 🔥 CRITICAL: Save staff session data to localStorage
        saveStaffSessionData(staffBusinesses);
        
        // Apply role-based access
        applyRoleBasedAccess();
        
        // Show dashboard
        await showDashboard();
        
        // Reset the completion flag
        isCompletingProfile = false;
        
    } catch (error) {
        console.error('❌ Staff post-login error:', error);
        isCompletingProfile = false;
        throw error;
    }
}

// Save staff session data to localStorage for persistence
function saveStaffSessionData(staffBusinesses) {
    try {
        console.log('💾 Saving staff session data...');
        
        const staffSession = {
            user_id: currentUser.id,
            email: currentUser.email,
            business_id: currentBusiness?.id,
            business_name: currentBusiness?.name,
            role: currentUser.role,
            is_staff: true,
            user_type: 'staff',
            staff_businesses: staffBusinesses,
            login_time: new Date().toISOString()
        };
        
        localStorage.setItem('staffSession', JSON.stringify(staffSession));
        localStorage.setItem('profile_completed', 'true');
        localStorage.setItem('user_has_businesses', 'true');
        
        console.log('✅ Staff session data saved:', staffSession);
        
    } catch (error) {
        console.error('❌ Error saving staff session:', error);
    }
}

// Ensure staff profile exists in profiles table
async function ensureStaffProfileExists(staffBusinesses) {
    try {
        console.log('🔍 Ensuring staff profile exists...');
        
        const { data: existingProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error || !existingProfile) {
            console.log('📝 Creating staff profile...');
            
            // Get staff details from staff_roles
            const staffDetails = staffBusinesses[0];
            
            const staffProfile = {
                id: currentUser.id,
                email: currentUser.email,
                full_name: staffDetails?.staff_name || currentUser.email.split('@')[0],
                role: staffDetails?.staff_role || 'staff',
                is_staff: true,
                user_type: 'staff',
                business_name: staffDetails?.name || 'Staff Business'
            };
            
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([staffProfile]);
            
            if (insertError) {
                console.warn('⚠️ Staff profile creation warning:', insertError);
                // Don't throw error - we can continue without profile
            } else {
                console.log('✅ Staff profile created successfully');
            }
        } else {
            console.log('✅ Staff profile already exists');
        }
        
    } catch (error) {
        console.error('❌ Staff profile check error:', error);
        // Don't throw error - we can continue without profile
    }
}

// Create user profile for staff members
async function createStaffUserProfile(email, staffBusinesses) {
    try {
        console.log('👤 Creating user profile for staff:', email);
        
        // Sign up the staff member (this will create the auth user)
        const { data, error } = await supabase.auth.signUp({
            email: email,
            options: {
                data: {
                    user_type: 'staff',
                    is_staff: true
                }
            }
        });
        
        if (error) {
            console.error('❌ Staff user creation error:', error);
            throw error;
        }
        
        console.log('✅ Staff user created:', data);
        
        // Create profile entry
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        email: email,
                        full_name: email.split('@')[0], // Default name from email
                        role: 'staff',
                        is_staff: true
                    }
                ]);
            
            if (profileError) {
                console.warn('⚠️ Profile creation warning:', profileError);
            }
            
            // Update staff_roles with user_id
            for (const business of staffBusinesses) {
                const { error: updateError } = await supabase
                    .from('staff_roles')
                    .update({ user_id: data.user.id })
                    .eq('id', business.staff_role_id);
                
                if (updateError) {
                    console.warn('⚠️ Staff role update warning:', updateError);
                }
            }
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Staff profile creation error:', error);
        throw error;
    }
}

async function loadUserRoles() {
    try {
        if (!currentUser) {
            console.warn('⚠️ No current user for role loading');
            return {};
        }

        const userRoles = {};

        // Load owned businesses
        const { data: ownedBusinesses, error: ownedError } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', currentUser.id)
            .eq('is_active', true);

        if (!ownedError && ownedBusinesses) {
            ownedBusinesses.forEach(business => {
                userRoles[business.id] = {
                    id: business.id,
                    business_id: business.id,
                    user_id: currentUser.id,
                    role: 'owner',
                    is_active: true,
                    businesses: business
                };
            });
        }

        // Load staff roles
        const { data: staffRoles, error: staffError } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);

        if (!staffError && staffRoles) {
            // Get business details for staff roles
            const businessIds = staffRoles.map(role => role.business_id);
            if (businessIds.length > 0) {
                const { data: staffBusinesses, error: businessesError } = await supabase
                    .from('businesses')
                    .select('*')
                    .in('id', businessIds)
                    .eq('is_active', true);

                if (!businessesError && staffBusinesses) {
                    staffRoles.forEach(role => {
                        const business = staffBusinesses.find(b => b.id === role.business_id);
                        if (business) {
                            userRoles[business.id] = {
                                id: role.id,
                                business_id: role.business_id,
                                user_id: role.user_id,
                                role: role.role,
                                is_active: role.is_active,
                                businesses: business
                            };
                        }
                    });
                }
            }
        }

        console.log('✅ Loaded user roles:', Object.keys(userRoles).length);
        return userRoles;
        
    } catch (error) {
        console.error('❌ Error loading user roles:', error);
        return {};
    }
}

// Function to handle staff login directly
async function handleStaffLogin(email) {
    try {
        console.log('🔐 Handling staff login for:', email);
        
        currentEmail = email;
        
        // Check if staff member exists
        const staffBusinesses = await checkStaffMembership(email);
        
        if (staffBusinesses.length > 0) {
            console.log('✅ Staff member found in businesses:', staffBusinesses.length);
            
            // Try to send OTP - this will fail if user doesn't exist, which is fine
            try {
                const { data, error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        shouldCreateUser: false
                    }
                });
                
                if (error) {
                    if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
                        console.log('👤 Staff member needs profile creation');
                        // This is expected - staff will create profile during OTP verification
                    } else {
                        throw error;
                    }
                }
                
                console.log('✅ OTP process initiated for staff');
                showOtpPage(email);
                showNotification('OTP Sent', 'Verification code sent to your email', 'success');
                
            } catch (otpError) {
                console.log('⚠️ OTP send issue (may be expected):', otpError.message);
                // Still show OTP page - the verification will handle profile creation
                showOtpPage(email);
                showNotification('OTP Sent', 'Verification code sent to your email', 'success');
            }
            
        } else {
            // Not a staff member
            console.log('❌ Not a staff member');
            showNotification('Access Denied', 'You are not registered as staff in any business.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Staff login error:', error);
        showNotification('Error', 'Failed to process staff login', 'error');
    }
}

// Enhanced staff membership check
async function checkStaffMembership(email) {
    try {
        console.log('🔍 Checking staff membership for:', email);
        
        // Get fresh session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('❌ No valid session yet');
            return [];
        }
        
        const userId = session.user.id;
        console.log('🔑 Session user ID:', userId);
        
        // 🔥 DIRECT QUERY WITHOUT ANY JOINS FIRST
        const { data: staffRole, error: staffError } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .eq('status', 'active')
            .maybeSingle();
        
        console.log('📊 Staff role query result:', staffRole);
        
        if (staffError) {
            console.error('❌ Staff role error:', staffError);
            return [];
        }
        
        if (!staffRole) {
            console.log('❌ No staff role found for user_id:', userId);
            return [];
        }
        
        // Now get the business
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', staffRole.business_id)
            .eq('is_active', true)
            .single();
        
        if (businessError || !business) {
            console.error('❌ Business error:', businessError);
            return [];
        }
        
        console.log('✅ Staff member verified:', {
            name: staffRole.staff_name,
            role: staffRole.role,
            business: business.name
        });
        
        return [{
            ...business,
            access_type: 'staff',
            staff_role: staffRole.role,
            staff_name: staffRole.staff_name,
            staff_email: staffRole.email,
            staff_role_id: staffRole.id,
            added_by_owner_id: staffRole.owner_id
        }];
        
    } catch (error) {
        console.error('❌ Error in checkStaffMembership:', error);
        return [];
    }
}

// Alternative method for staff membership check
async function checkStaffMembershipAlternative(email) {
    try {
        console.log('🔍 Using alternative staff membership check for:', email);
        
        // Simple query without complex joins
        const { data: staffRoles, error } = await supabase
            .from('staff_roles')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .eq('status', 'active');

        if (error) {
            console.error('❌ Alternative staff check failed:', error);
            return [];
        }

        if (!staffRoles || staffRoles.length === 0) {
            return [];
        }

        const staffBusinesses = [];
        
        // Get business details one by one (less efficient but more reliable)
        for (const role of staffRoles) {
            const { data: business, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', role.business_id)
                .eq('is_active', true)
                .single();

            if (!businessError && business) {
                staffBusinesses.push({
                    ...business,
                    access_type: 'staff',
                    staff_role: role.role,
                    staff_name: role.staff_name,
                    staff_email: role.email,
                    staff_role_id: role.id,
                    added_by_owner_id: role.owner_id
                });
            }
        }

        console.log('✅ Alternative staff businesses found:', staffBusinesses.length);
        return staffBusinesses;
        
    } catch (error) {
        console.error('❌ Error in alternative staff check:', error);
        return [];
    }
}

function showCreateBusinessOnboarding() {
    console.log('🚀 Showing create business onboarding');
    
    // Hide all auth pages
    document.querySelectorAll('#auth-pages > div').forEach(page => {
        page.classList.add('d-none');
    });
    
    const onboardingHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-title">
                    <h2>Welcome to IB Management</h2>
                    <p>Let's create your first business</p>
                </div>
                <div class="onboarding-content">
                    <div class="onboarding-step">
                        <div class="step-icon">
                            <i class="fas fa-store"></i>
                        </div>
                        <div class="step-content">
                            <h4>Create Your Business</h4>
                            <p>Set up your first business profile to start managing inventory, sales, and expenses.</p>
                        </div>
                    </div>
                    <div class="onboarding-step">
                        <div class="step-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="step-content">
                            <h4>Add Your Team</h4>
                            <p>Invite staff members and assign roles like manager, salesman, or inventory manager.</p>
                        </div>
                    </div>
                    <div class="onboarding-step">
                        <div class="step-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="step-content">
                            <h4>Grow Your Business</h4>
                            <p>Track performance, manage operations, and make data-driven decisions.</p>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary btn-block" onclick="showCreateBusinessModal()">
                    <i class="fas fa-plus"></i> Create My First Business
                </button>
            </div>
        </div>
    `;
    
    const onboardingPage = document.createElement('div');
    onboardingPage.id = 'onboarding-page';
    onboardingPage.innerHTML = onboardingHTML;
    document.getElementById('auth-pages').appendChild(onboardingPage);
}

// Business selection for staff members
function showBusinessSelectionPage(userRoles) {
    console.log('🏢 Showing business selection for staff');
    
    // Hide all auth pages
    document.querySelectorAll('#auth-pages > div').forEach(page => {
        page.classList.add('d-none');
    });
    
    // Create business selection UI
    const businesses = Object.values(userRoles).map(role => ({
        id: role.business_id,
        name: role.businesses.name,
        business_type: role.businesses.business_type,
        role: role.role
    }));
    
    const businessSelectionHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-title">
                    <h2>    </h2>
                    <p>Select a business to get started</p>
                </div>
                <div class="businesses-selection-grid">
                    ${businesses.map(business => `
                        <div class="business-selection-card" onclick="selectBusinessForAccess('${business.id}')">
                            <div class="business-selection-icon">
                                <i class="fas fa-building"></i>
                            </div>
                            <div class="business-selection-info">
                                <h4>${business.name}</h4>
                                <p>${business.business_type}</p>
                                <span class="badge badge-${getRoleBadgeClass(business.role)}">${business.role}</span>
                            </div>
                            <div class="business-selection-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="auth-footer">
                    <p>Not seeing your business? <a href="#" onclick="showContactAdmin()">Contact administrator</a></p>
                </div>
            </div>
        </div>
    `;
    
    const businessSelectionPage = document.createElement('div');
    businessSelectionPage.id = 'business-selection-page';
    businessSelectionPage.innerHTML = businessSelectionHTML;
    document.getElementById('auth-pages').appendChild(businessSelectionPage);
}

function selectBusinessForAccess(businessId) {
    const selectedRole = userRoles[businessId];
    if (selectedRole) {
        currentBusiness = selectedRole.businesses;
        setCurrentStaffRole(businessId);
        showDashboard();
    }
}

async function handleResendOtp(e) {
    e.preventDefault();
    console.log('🔄 Resending OTP...');
    
    const resendTimer = document.getElementById('resend-timer');
    const resendOtpBtn = document.getElementById('resend-otp');
    
    if (resendTimer.classList.contains('d-none')) {
        try {
            const { data, error } = await supabase.auth.signInWithOtp({
                email: currentEmail,
                options: {
                    shouldCreateUser: false
                }
            });
            
            if (error) {
                throw error;
            }
            
            showNotification('New OTP sent to your email!', 'success');
            startResendTimer();
            
        } catch (error) {
            console.error('❌ Resend OTP error:', error);
            showNotification('Error resending OTP: ' + error.message, 'error');
        }
    }
}

async function handleProfileCompletion(e) {
    e.preventDefault();
    console.log('💾 Completing profile and creating business...');
    
    const fullName = document.getElementById('full-name').value;
    const phone = document.getElementById('phone').value;
    const businessName = document.getElementById('profile-business-name').value;
    const businessType = document.getElementById('business-type').value;
    
    if (!businessName.trim()) {
        showNotification('Business Name Required', 'Please enter your business name to continue.', 'error');
        document.getElementById('profile-business-name').focus();
        return;
    }
    
    const profileSubmit = document.getElementById('profile-submit');
    const profileText = document.getElementById('profile-text');
    const profileLoading = document.getElementById('profile-loading');
    
    setLoadingState(profileText, profileLoading, profileSubmit, true);
    isCompletingProfile = true;
    
    try {
        console.log('👤 Creating profile and business for user:', currentUser.id);
        
        // Create profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: currentUser.id,
                    email: currentUser.email,
                    full_name: fullName,
                    phone: phone,
                    business_name: businessName,
                    business_type: businessType,
                    role: 'owner'
                }
            ]);
        
        if (profileError) {
            console.warn('⚠️ Profile creation warning:', profileError.message);
        } else {
            console.log('✅ Profile created successfully');
        }
        
        // Create the actual business
        console.log('🏢 Creating business:', businessName);
        const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .insert([
                {
                    name: businessName,
                    business_type: businessType,
                    owner_id: currentUser.id,
                    currency: 'USD', // default currency
                    is_active: true
                }
            ])
            .select()
            .single();
        
        if (businessError) {
            console.error('❌ Business creation error:', businessError);
            throw new Error('Failed to create business: ' + businessError.message);
        }
        
        console.log('✅ Business created successfully:', businessData);
        
        // Set as active business
        currentBusiness = businessData;
        userBusinesses = [businessData];
        
        // Mark profile as completed in localStorage
        localStorage.setItem('profile_completed', 'true');
        localStorage.setItem('user_has_businesses', 'true');
        
        // Reset the flag
        isCompletingProfile = false;
        
        console.log('🎉 Profile and business setup successful, showing dashboard');
        
        // 🔥 CRITICAL: Show success message and redirect
        showNotification('Setup Complete!', 'Your business has been created successfully.', 'success');
        
        // Wait for notification to show, then redirect
        setTimeout(async () => {
            await showDashboard();
            
            // Force load dashboard data
            if (window.loadDashboardData) {
                await loadDashboardData();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Profile completion error:', error);
        isCompletingProfile = false;
        showNotification('Setup Error', error.message, 'error');
    } finally {
        setLoadingState(profileText, profileLoading, profileSubmit, false);
    }
}

function handleCancel(e) {
    e.preventDefault();
    console.log('🚫 Cancel button clicked');
    
    const currentPage = document.querySelector('#auth-pages > div:not(.d-none)');
    if (currentPage && (currentPage.id === 'otp-page' || currentPage.id === 'profile-page')) {
        if (!confirm('Are you sure you want to cancel? Any unsaved progress will be lost.')) {
            return;
        }
    }
    
    clearAuthForms();
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    currentEmail = '';
    isNewUser = false;
    
    showLandingPage();
    
    showNotification('Cancelled', 'You have cancelled the authentication process.', 'info', 3000);
}

// Add this to your handleLogout function in auth.js
function handleLogout() {
    console.log('🚪 Performing comprehensive logout with data cleanup...');
    
    try {
        // 1. Clear all Supabase sessions first
        supabase.auth.signOut().then(() => {
            console.log('✅ Supabase auth session cleared');
        });
        
        // 2. Clear ALL global variables
        currentUser = null;
        currentBusiness = null;
        currentEmail = '';
        userBusinesses = [];
        userRoles = {};
        isNewUser = false;
        isCompletingProfile = false;
        isCreatingBusiness = false;
        authStateChangeHandled = false;
        
        // 3. Clear ALL localStorage data
        localStorage.clear();
        
        // 4. Clear ALL sessionStorage data  
        sessionStorage.clear();
        
        // 5. Clear specific business-related data
        clearAllBusinessData();
        
        // 6. Clear any remaining cached data
        clearAllCachedData();
        
        // 7. Reset UI state
        resetUIState();
        
        // 8. Clear any intervals or timeouts
        clearAllIntervals();
        
        console.log('✅ Comprehensive logout completed');
        
        // 9. Show landing page
        showLandingPage();
        
        // 10. Show logout confirmation
        showNotification('Logged Out', 'You have been successfully logged out. All data has been cleared.', 'info', 3000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Force cleanup even if there's an error
        forceCleanup();
        showLandingPage();
    }
}

// Enhanced cleanup functions
function clearAllBusinessData() {
    console.log('🧹 Clearing all business data...');
    
    // Clear all business-specific localStorage keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.includes('business') || 
            key.includes('inventory') ||
            key.includes('sales') ||
            key.includes('products') ||
            key.includes('customers') ||
            key.includes('staff') ||
            key.includes('financial') ||
            key.includes('analytics') ||
            key.includes('dashboard')
        )) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Removed:', key);
    });
}

function clearAllCachedData() {
    console.log('🧹 Clearing all cached data...');
    
    // Clear any module-level caches
    if (window.clearBusinessData) {
        clearBusinessData('all');
    }
    
    // Clear any chart instances
    if (window.salesChart) {
        window.salesChart.destroy();
        window.salesChart = null;
    }
    if (window.revenueChart) {
        window.revenueChart.destroy();
        window.revenueChart = null;
    }
    
    // Clear any data arrays
    if (window.businessData) {
        window.businessData = {
            products: [],
            customers: [],
            suppliers: [],
            sales: [],
            purchases: [],
            expenses: []
        };
    }
}

function resetUIState() {
    console.log('🔄 Resetting UI state...');
    
    // Reset all forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
    
    // Clear all table data
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    });
    
    // Reset dashboard metrics
    const metricElements = document.querySelectorAll('[data-metric]');
    metricElements.forEach(element => {
        element.textContent = '0';
    });
    
    // Hide modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.add('d-none');
    });
}

function clearAllIntervals() {
    console.log('⏰ Clearing all intervals...');
    
    // Get the highest interval ID
    let highestIntervalId = setInterval(() => {}, 0);
    for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
    }
    
    // Clear any specific intervals
    if (window.countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function forceCleanup() {
    console.log('⚠️ Performing forced cleanup...');
    
    // Nuclear option - clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all global variables
    const globals = ['currentUser', 'currentBusiness', 'userBusinesses', 'userRoles', 'currentEmail'];
    globals.forEach(global => {
        window[global] = null;
    });
    
    // Reload the page as last resort
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Enhanced auth state change listener with staff session support
supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event, session);
    
    // Don't interfere if user is completing profile or creating business
    if (isCompletingProfile || isCreatingBusiness) {
        console.log('🔄 Skipping auth state change - profile/business creation in progress');
        return;
    }
    
    if (event === 'SIGNED_IN' && session) {
        if (authStateChangeHandled && currentUser?.id === session.user.id) {
            console.log('🔄 Auth state change already handled for this user, skipping...');
            return;
        }
        
        currentUser = session.user;
        authStateChangeHandled = true;
        console.log('✅ User signed in via auth state change');
        
        // Check if this is a returning staff member with saved session
        const staffSession = loadStaffSession();
        if (staffSession && staffSession.user_id === currentUser.id) {
            console.log('🔍 Returning staff member detected, restoring session...');
            setTimeout(async () => {
                await restoreStaffSession(staffSession);
            }, 100);
        } else {
            // Check if user has completed profile and has businesses
            setTimeout(async () => {
                await checkUserBusinessesAndProfile();
            }, 100);
        }
        
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        authStateChangeHandled = false;
        // Clear all session data on logout
        clearAllSessionData();
        console.log('✅ User signed out');
        showLandingPage();
    } else if (event === 'INITIAL_SESSION') {
        if (!currentUser && session?.user) {
            currentUser = session.user;
            console.log('🔐 Initial session found');
            
            // Check for existing staff session on initial load
            const staffSession = loadStaffSession();
            if (staffSession && staffSession.user_id === currentUser.id) {
                console.log('🔍 Restoring staff session on initial load...');
                setTimeout(async () => {
                    await restoreStaffSession(staffSession);
                }, 100);
            }
        }
    }
});

// Load staff session from localStorage
function loadStaffSession() {
    try {
        const staffSession = JSON.parse(localStorage.getItem('staffSession') || '{}');
        if (staffSession.user_id && staffSession.is_staff) {
            console.log('🔍 Loaded staff session:', staffSession);
            return staffSession;
        }
        return null;
    } catch (error) {
        console.error('❌ Error loading staff session:', error);
        return null;
    }
}

// Restore staff session from saved data
async function restoreStaffSession(staffSession) {
    try {
        console.log('🔄 Restoring staff session...');
        
        // Set current user properties
        currentUser.is_staff = true;
        currentUser.user_type = 'staff';
        currentUser.role = staffSession.role;
        
        // Load staff businesses
        if (staffSession.staff_businesses) {
            userBusinesses = staffSession.staff_businesses;
        } else {
            // Fallback: reload staff businesses from database
            userBusinesses = await checkStaffMembership(currentUser.email);
        }
        
        // Set active business
        if (staffSession.business_id && userBusinesses.length > 0) {
            const business = userBusinesses.find(b => b.id === staffSession.business_id);
            if (business) {
                currentBusiness = business;
            } else {
                await setActiveBusiness(userBusinesses[0].id);
            }
        } else if (userBusinesses.length > 0) {
            await setActiveBusiness(userBusinesses[0].id);
        }
        
        // Apply role-based access
        applyRoleBasedAccess();
        
        // Show dashboard
        await showDashboard();
        
        console.log('✅ Staff session restored successfully');
        
    } catch (error) {
        console.error('❌ Error restoring staff session:', error);
        // Fallback to regular check
        await checkUserBusinessesAndProfile();
    }
}

// Clear all session data
function clearAllSessionData() {
    localStorage.removeItem('staffSession');
    localStorage.removeItem('profile_completed');
    localStorage.removeItem('user_has_businesses');
    localStorage.removeItem(STATE_KEYS.LAST_VISIBLE_SECTION);
    localStorage.removeItem(STATE_KEYS.ACTIVE_DASHBOARD_PAGE);
}

async function checkUserBusinessesAndProfile() {
    try {
        console.log('🔍 SMART CHECK: Checking user setup state...');
        
        // 🔥 CRITICAL FIX: FIRST check if this user is a staff member
        // This must happen BEFORE any profile/business checks
        const staffBusinesses = await checkStaffMembership(currentUser.email);
        const isStaff = staffBusinesses && staffBusinesses.length > 0;
        
        if (isStaff) {
            console.log('👥 STAFF USER DETECTED! Bypassing all profile/business checks...');
            
            // Set staff properties
            currentUser.is_staff = true;
            currentUser.user_type = 'staff';
            
            // Load the staff role from the staff_businesses data
            if (staffBusinesses.length > 0) {
                currentUser.role = staffBusinesses[0].staff_role || 'viewer';
                console.log('🎯 Staff role set to:', currentUser.role);
            }
            
            // Set user businesses to staff businesses
            userBusinesses = staffBusinesses;
            
            // Set active business
            if (staffBusinesses.length > 0) {
                // Try to restore last active business from session
                const storedBusiness = loadUserData('activeBusiness');
                if (storedBusiness && staffBusinesses.some(b => b.id === storedBusiness.id)) {
                    currentBusiness = storedBusiness;
                } else {
                    currentBusiness = staffBusinesses[0];
                    saveUserData('activeBusiness', currentBusiness);
                }
                console.log('🏢 Active business set to:', currentBusiness.name);
            }
            
            // 🔥 CRITICAL: Load the user role immediately
            await loadCurrentUserRole();
            
            // Save staff session data
            saveStaffSessionData(staffBusinesses);
            
            // Set flags to prevent profile/business creation
            localStorage.setItem('profile_completed', 'true');
            localStorage.setItem('user_has_businesses', 'true');
            
            // Reset any profile completion flags
            isCompletingProfile = false;
            isCreatingBusiness = false;
            
            console.log('🚀 Staff user ready - going straight to dashboard');
            
            // Short delay then show dashboard
            setTimeout(async () => {
                await showDashboard();
                
                // Load dashboard data
                if (window.loadDashboardData) {
                    await loadDashboardData();
                }
            }, 300);
            
            return; // 🔥 IMPORTANT: Exit early - don't do any other checks
        }
        
        // 🔥 REGULAR USER FLOW (business owners) - Only runs if NOT staff
        console.log('👤 REGULAR USER - checking profile and businesses...');
        
        // Check if user has a profile in the database
        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, business_name')
            .eq('id', currentUser.id)
            .single();
        
        console.log('📋 Profile check result:', existingProfile ? 'FOUND' : 'NOT FOUND');
        
        // If NO profile exists in database → Show profile page (NEW USER)
        if (profileError || !existingProfile) {
            console.log('🆕 NEW USER: No profile in database, showing profile form');
            isCompletingProfile = true;
            showProfilePage();
            
            // Auto-fill email in form
            setTimeout(() => {
                const nameField = document.getElementById('full-name');
                if (nameField && currentUser?.email) {
                    const nameFromEmail = currentUser.email.split('@')[0];
                    const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
                    nameField.value = capitalizedName;
                    nameField.focus();
                }
            }, 100);
            
            return;
        }
        
        // USER HAS PROFILE → Check if they have businesses
        console.log('✅ EXISTING USER: Profile found, checking businesses...');
        
        // Check for owned businesses
        const { data: ownedBusinesses, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', currentUser.id)
            .eq('is_active', true);
        
        const totalBusinesses = [
            ...(ownedBusinesses || [])
        ];
        
        console.log('📊 Businesses found:', {
            owned: ownedBusinesses?.length || 0,
            total: totalBusinesses.length
        });
        
        // If NO businesses → Show business creation
        if (totalBusinesses.length === 0) {
            console.log('🏢 No businesses found, showing business creation');
            showCreateBusinessOnboarding();
            return;
        }
        
        // USER HAS BOTH PROFILE AND BUSINESSES → Go to dashboard
        console.log('🚀 COMPLETE USER: Going to dashboard');
        
        // Save to userBusinesses
        userBusinesses = totalBusinesses;
        
        // Set active business
        if (totalBusinesses.length > 0) {
            const storedBusiness = loadUserData('activeBusiness');
            if (storedBusiness && totalBusinesses.some(b => b.id === storedBusiness.id)) {
                currentBusiness = storedBusiness;
            } else {
                currentBusiness = totalBusinesses[0];
                saveUserData('activeBusiness', currentBusiness);
            }
        }
        
        // Set completion flags
        localStorage.setItem('profile_completed', 'true');
        localStorage.setItem('user_has_businesses', 'true');
        
        // Short delay then show dashboard
        setTimeout(async () => {
            await showDashboard();
            
            if (window.loadDashboardData) {
                await loadDashboardData();
            }
        }, 300);
        
    } catch (error) {
        console.error('❌ Error in user check:', error);
        
        // On error, check if it's a staff user as fallback
        try {
            const staffBusinesses = await checkStaffMembership(currentUser?.email);
            if (staffBusinesses && staffBusinesses.length > 0) {
                console.log('👥 Fallback: Staff user detected after error');
                currentUser.is_staff = true;
                currentUser.user_type = 'staff';
                currentUser.role = staffBusinesses[0].staff_role || 'viewer';
                userBusinesses = staffBusinesses;
                currentBusiness = staffBusinesses[0];
                
                setTimeout(async () => {
                    await showDashboard();
                }, 300);
                return;
            }
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
        
        // Default to safest option
        isCompletingProfile = true;
        showProfilePage();
        showNotification('Setup Issue', 'There was an error checking your account. Please complete your profile.', 'warning');
    }
}

// FAQ functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
    
    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                company: document.getElementById('contact-company').value,
                phone: document.getElementById('contact-phone').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };
            
            // Here you would typically send this to your backend
            console.log('Contact form submitted:', formData);
            
            // Show success message
            showNotification('Thank you! Your message has been sent. We\'ll get back to you soon.', 'success');
            
            // Reset form
            contactForm.reset();
        });
    }
});