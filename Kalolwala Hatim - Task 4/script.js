// Initialization: Fetch or set up local user storage database
// We use localStorage to store our user profiles (behaves like our users.json file)
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify({}));
}

// Helper function to load registered users from localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem('users'));
}

// Helper function to save users back to localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Display flash notification alerts
let alertTimeout;
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alertMessage = document.getElementById('alert-message');
    
    alertMessage.className = `alert alert-${type}`;
    alertMessage.innerText = message;
    alertContainer.style.display = 'block';

    // Clear previous timeout if it exists
    if (alertTimeout) {
        clearTimeout(alertTimeout);
    }

    // Auto-hide alert after 4 seconds
    alertTimeout = setTimeout(() => {
        alertContainer.style.display = 'none';
    }, 4000);
}

// Routing & View Switcher (Login, Register, Dashboard)
function navigateTo(viewName) {
    // Hide all active views
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    
    // Check authentication guards
    if (viewName === 'dashboard') {
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (!loggedInUser) {
            showAlert('Access denied. Please log in to view the dashboard.', 'danger');
            navigateTo('login');
            return;
        }
        document.getElementById('welcome-message').innerText = `Welcome, ${loggedInUser}`;
        document.title = 'Dashboard - Authentication System';
    } else if (viewName === 'login') {
        document.title = 'Login - Authentication System';
    } else if (viewName === 'register') {
        document.title = 'Register - Authentication System';
    }

    // Show active card
    const activeCard = document.getElementById(`${viewName}-view`);
    if (activeCard) {
        activeCard.classList.add('active');
    }
}

// Handle Account Registration
document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('register-username').value.trim();
    const passwordInput = document.getElementById('register-password').value;
    const confirmPasswordInput = document.getElementById('register-confirm-password').value;

    if (!usernameInput || !passwordInput) {
        showAlert('Username and password are required.', 'danger');
        return;
    }

    if (passwordInput !== confirmPasswordInput) {
        showAlert('Passwords do not match.', 'danger');
        return;
    }

    const users = getUsers();

    if (users[usernameInput]) {
        showAlert('Username already exists. Please choose a different one.', 'danger');
        return;
    }

    // Save user profile (for simplicity, passwords stored client side in localStorage)
    users[usernameInput] = { password: passwordInput };
    saveUsers(users);

    showAlert('Registration successful! Please login.', 'success');
    
    // Reset form and navigate to login
    document.getElementById('register-form').reset();
    navigateTo('login');
});

// Handle Login Auth check
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value;

    const users = getUsers();

    // Check if username exists and the password matches
    if (users[usernameInput] && users[usernameInput].password === passwordInput) {
        // Save user in sessionStorage to mark active session
        sessionStorage.setItem('loggedInUser', usernameInput);
        showAlert('Welcome back! You logged in successfully.', 'success');
        
        document.getElementById('login-form').reset();
        navigateTo('dashboard');
    } else {
        showAlert('Invalid username or password.', 'danger');
    }
});

// Handle Logout Action
document.getElementById('logout-btn').addEventListener('click', function() {
    // Remove user credentials session
    sessionStorage.removeItem('loggedInUser');
    showAlert('You have been logged out successfully.', 'success');
    navigateTo('login');
});

// Initial App Load Authentication Guard
window.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        navigateTo('dashboard');
    } else {
        navigateTo('login');
    }
});
