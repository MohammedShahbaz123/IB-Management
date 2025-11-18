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
    const setupVisibilityHandlers = () => {
        if (!initialLoadComplete) {
            setTimeout(setupVisibilityHandlers, 100);
            return;
        }
        
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                console.log('Page is now visible - restoring state');
                restoreApplicationState();
            } else {
                saveCurrentState();
            }
        });
        
        window.addEventListener('focus', function() {
            console.log('Window focused - restoring state');
            restoreApplicationState();
        });
        
        window.addEventListener('beforeunload', function() {
            saveCurrentState();
        });
    };
    
    setupVisibilityHandlers();
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
        console.log('🔄 Restoring application state...');
        const { data } = await supabase.auth.getSession();
        
        if (data.session && data.session.user) {
            currentUser = data.session.user;
            
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

async function checkAuthStatus() {
    try {
        console.log('🔐 Checking auth status...');
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
            
            // 🔥 CRITICAL: Load businesses BEFORE showing dashboard
            console.log('🔄 Loading user businesses before dashboard...');
            await loadUserBusinesses();
            await setActiveBusinessOnLoad();
            
            console.log('✅ User authenticated:', currentUser.email);
            
            const lastSection = localStorage.getItem(STATE_KEYS.LAST_VISIBLE_SECTION);
            if (lastSection === 'dashboard') {
                await showDashboard();
            } else {
                await showDashboard();
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
    const businessName = document.getElementById('business-name').value;
    
    if (!isValidEmail(email)) {
        showNotification('Invalid Email', 'Please enter a valid email address.', 'error');
        return;
    }
    
    if (!businessName.trim()) {
        showNotification('Business Name Required', 'Please enter your business name to continue.', 'error');
        document.getElementById('business-name').focus();
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
                        business_name: businessName,
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
            currentUser = { email, businessName };
            
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

// Update login form to handle staff emails
async function handleLogin(e) {
    if (e) e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    
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
        
        // First check if user is a staff member
        const staffBusinesses = await checkStaffMembership(email);
        
        if (staffBusinesses.length > 0) {
            // User is a staff member - proceed with staff login
            console.log('👥 Staff member detected, proceeding with login');
            await handleStaffLogin(email);
            return;
        }
        
        // Regular user flow (existing code)
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
                setTimeout(() => {
                    document.getElementById('business-name').focus();
                }, 300);
            }, 2000);
            
            return;
        }
        
        if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
            showNotification('Too Many Attempts', 'Please wait a few minutes before requesting another OTP.', 'warning', 6000);
            return;
        }
        
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            showNotification('Connection Error', 'Please check your internet connection and try again.', 'error');
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
        } else if (error.message) {
            userMessage = 'We encountered an issue. Please try again in a moment.';
        }
        
        showNotification('Login Issue', userMessage, 'error');
    } finally {
        setLoadingState(loginText, loginLoading, loginSubmit, false);
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
            
            // Check if this is a staff member without a user profile
            if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
                console.log('👥 Checking if staff member without profile...');
                const staffBusinesses = await checkStaffMembership(currentEmail);
                
                if (staffBusinesses.length > 0) {
                    console.log('✅ Staff member found, creating user profile...');
                    await createStaffUserProfile(currentEmail, staffBusinesses);
                    // Retry OTP verification after creating profile
                    return await handleOtpVerification(e);
                }
            }
            throw error;
        }
        
        console.log('🎉 OTP verified successfully:', data);
        
        currentUser = data.user;
        console.log('👤 User after OTP verification:', currentUser);
        
        // Check if user is staff member in any business
        const staffBusinesses = await checkStaffMembership(currentEmail);
        
        if (isNewUser) {
            // New user - check if they were added as staff
            if (staffBusinesses.length > 0) {
                // New staff member
                console.log('👥 New staff member detected');
                userBusinesses = staffBusinesses;
                await setActiveBusiness(staffBusinesses[0].id);
                await showDashboard();
            } else {
                // New regular user - show profile setup
                console.log('🆕 New business owner, showing profile setup');
                showProfilePage();
            }
        } else {
            // Existing user - check staff membership first
            if (staffBusinesses.length > 0) {
                console.log('✅ Existing staff member, loading dashboard');
                userBusinesses = staffBusinesses;
                await setActiveBusiness(staffBusinesses[0].id);
                await showDashboard();
            } else {
                // Check if user owns any businesses
                const userRoles = await loadUserRoles();
                if (Object.keys(userRoles).length > 0) {
                    console.log('✅ Existing user with businesses, loading dashboard');
                    await showDashboard();
                } else {
                    // Existing user but no businesses - show create business
                    console.log('📝 Existing user without businesses, showing create business');
                    showCreateBusinessOnboarding();
                }
            }
        }
        
        showNotification('Success', 'Successfully authenticated!', 'success');
        
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        showNotification('Verification Failed', 'Invalid OTP code.', 'error');
    } finally {
        setLoadingState(otpText, otpLoading, otpSubmit, false);
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
        
        const { data: staffRoles, error } = await supabase
            .from('staff_roles')
            .select(`
                *,
                businesses (*)
            `)
            .eq('email', email)
            .eq('is_active', true)
            .eq('status', 'active');

        if (error) {
            console.error('❌ Error checking staff membership:', error);
            return [];
        }

        console.log('📊 Staff roles found:', staffRoles);

        if (staffRoles && staffRoles.length > 0) {
            // User is a staff member - return their businesses
            const staffBusinesses = staffRoles.map(role => ({
                ...role.businesses,
                access_type: 'staff',
                staff_role: role.role,
                staff_role_id: role.id
            }));
            
            console.log('✅ Staff businesses:', staffBusinesses);
            return staffBusinesses;
        }

        return [];
        
    } catch (error) {
        console.error('❌ Error in checkStaffMembership:', error);
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
                    <h2>Welcome to BizManager!</h2>
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
                    <h2>Welcome to BizManager!</h2>
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
    console.log('💾 Completing profile...');
    
    const fullName = document.getElementById('full-name').value;
    const phone = document.getElementById('phone').value;
    const businessType = document.getElementById('business-type').value;
    
    const profileSubmit = document.getElementById('profile-submit');
    const profileText = document.getElementById('profile-text');
    const profileLoading = document.getElementById('profile-loading');
    
    setLoadingState(profileText, profileLoading, profileSubmit, true);
    
    try {
        console.log('👤 Creating profile for user:', currentUser.id);
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: currentUser.id,
                        email: currentUser.email,
                        full_name: fullName,
                        phone: phone,
                        business_name: currentUser.businessName,
                        business_type: businessType,
                        role: 'owner'
                    }
                ]);
            
            if (error) {
                console.warn('⚠️ Profile creation warning:', error.message);
            } else {
                console.log('✅ Profile created successfully');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }
        
        console.log('🎉 Profile completion successful, showing dashboard');
        await showDashboard();
        showNotification('Profile Completed!', 'Your account has been set up successfully.', 'success');
        
    } catch (error) {
        console.error('❌ Profile completion error:', error);
        showNotification('Setup Error', 'Error completing profile: ' + error.message, 'error');
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
    console.log('🚪 Logging out...');
    
    // Clear all user-specific data
    clearAllUserData();
    
    // Clear global variables
    currentUser = null;
    currentBusiness = null;
    userBusinesses = [];
    userRoles = {};
    currentEmail = '';
    isNewUser = false;
    
    supabase.auth.signOut();
    showLandingPage();
    
    showNotification('Logged Out', 'You have been successfully logged out.', 'info');
}

// Auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
        if (authStateChangeHandled && currentUser?.id === session.user.id) {
            console.log('🔄 Auth state change already handled for this user, skipping...');
            return;
        }
        
        currentUser = session.user;
        authStateChangeHandled = true;
        console.log('✅ User signed in via auth state change');
        
        setTimeout(() => {
            showDashboard();
        }, 100);
        
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        authStateChangeHandled = false;
        console.log('✅ User signed out');
        showLandingPage();
    } else if (event === 'INITIAL_SESSION') {
        if (!currentUser && session?.user) {
            currentUser = session.user;
            console.log('🔐 Initial session found');
        }
    }
});