import React, { useEffect, useState, useRef } from 'react'
import './Header.css'
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, API_BASE } from "../../api";
import { getCartTotal, getCartItemsCount } from "../../utils/cart";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faShoppingCart, faSearch, faUser, faBars, faTimes, faChevronDown, faSignInAlt, faSignOutAlt, faUserCircle, faReceipt } from '@fortawesome/free-solid-svg-icons';
import logo from '../../assets/logo.png';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../utils/currency';

const Header = () => {
    const { currency, exchangeRate } = useCurrency();

    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [cartTotal, setCartTotal] = useState(0);
    const [cartItemsCount, setCartItemsCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const searchRef = useRef(null);
    const profileRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        api.getCategories()
            .then(res => setCategories(res.categories || []))
            .catch(err => console.error("Header categories load failed", err));
    }, []);

    // Load cart data
    useEffect(() => {
        const updateCartDisplay = () => {
            setCartTotal(getCartTotal());
            setCartItemsCount(getCartItemsCount());
        };

        // Initial load
        updateCartDisplay();

        // Listen for cart updates
        window.addEventListener('cartUpdated', updateCartDisplay);

        return () => {
            window.removeEventListener('cartUpdated', updateCartDisplay);
        };
    }, []);

    // Check authentication status
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('authToken');
            const userData = localStorage.getItem('user');
            
            if (token && userData) {
                try {
                    setUser(JSON.parse(userData));
                    setIsLoggedIn(true);
                } catch (e) {
                    console.error('Error parsing user data:', e);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                }
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        };

        checkAuth();

        // Listen for auth changes (e.g., after login/logout)
        window.addEventListener('authChanged', checkAuth);

        return () => {
            window.removeEventListener('authChanged', checkAuth);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        // Close mobile menu when clicking outside
        const handleClickOutside = (event) => {
            const mobileMenu = document.querySelector('.mobile-menu');
            const menuBtn = document.querySelector('.menu-btn');
            if (isMobileMenuOpen && 
                mobileMenu && 
                !mobileMenu.contains(event.target) && 
                menuBtn && 
                !menuBtn.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden'; // Prevent body scroll when menu is open
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        // Search with any input, or show all products if empty
        api.searchProducts(query)
            .then(res => {
                const products = res.products || [];
                console.log(`Search for "${query}" returned ${products.length} products`);
                console.log(`Product IDs received: ${products.map(p => p.id).join(', ')}`);
                console.log(`Product names received: ${products.map(p => p.name).join(', ')}`);
                setSearchResults(products);
                setShowSuggestions(products.length > 0);
            })
            .catch(err => {
                console.error("Search failed", err);
                setSearchResults([]);
                setShowSuggestions(false);
            });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to a search results page or handle search
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowSuggestions(false);
        }
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
        setShowSuggestions(false);
        setSearchQuery("");
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
        setIsMobileDropdownOpen(false);
    };

    const toggleMobileDropdown = () => {
        setIsMobileDropdownOpen(!isMobileDropdownOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUser(null);
        setShowProfileDropdown(false);
        window.dispatchEvent(new CustomEvent('authChanged'));
        navigate('/');
    };

    const toggleProfileDropdown = () => {
        setShowProfileDropdown(!showProfileDropdown);
    };

    return (
        <div className="header-wrapper">
            <div className="top-bar">
                <div className="top-left">
                    <div className="contact-item">
                        <FontAwesomeIcon icon={faPhone} className="contact-icon" />
                        <a href="tel:+918685933785" className="contact-link">+91-8685933785</a>
                        <span className="contact-separator">,</span>
                        <a href="tel:+919896099653" className="contact-link">+91-9896099653</a>
                    </div>
                    <span className="divider">|</span>
                    <div className="contact-item">
                        <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                        <a href="mailto:sales@rkindustriesexports.com" className="contact-link">sales@rkindustriesexports.com</a>
                    </div>
                </div>
                <div className="top-right">
                    <div className="iso-badge">
                        <span className="iso-text">ISO Certified 9001:2015</span>
                    </div>
                </div>
            </div>

            <header className="main-header">
                <Link to="/" className="logo">
                    <img src={logo} alt="RK Industries" className="logo-image" />
                </Link>

                <nav className="nav">
                    <Link to="/">Home</Link>
                    <Link to="/about">About Us</Link>

                    <div className="dropdown">
                        <Link to="">Products <FontAwesomeIcon icon={faChevronDown} /></Link>
                        <div className="dropdown-menu">
                            {categories.map((cat) => (
                                <Link key={cat.id} to={`/category/${cat.slug}`} className='items-list'>
                                    {cat.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Link to="/contact">Contact Us</Link>
                    <Link to="/bank-details">Bank Details</Link>
                    {user?.isAdmin && <Link to="/admin">Admin</Link>}
                    <Link to="/cart">Cart</Link>

                </nav>

                <div className="header-actions">
                    <Link to="/cart" className="cart">
                        <FontAwesomeIcon icon={faShoppingCart} /> {formatPrice(cartTotal, currency, exchangeRate)} <span className="badge">{cartItemsCount}</span>
                    </Link>
                    <div className="search" ref={searchRef}>
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex' }}>
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => {
                                    // Load all products when focused if search is empty
                                    if (!searchQuery || searchQuery.trim() === "") {
                                        api.searchProducts("")
                                            .then(res => {
                                                setSearchResults(res.products || []);
                                                setShowSuggestions(res.products && res.products.length > 0);
                                            })
                                            .catch(err => {
                                                console.error("Search failed", err);
                                            });
                                    }
                                }}
                            />
                            <button type="submit"><FontAwesomeIcon icon={faSearch} /></button>
                        </form>
                        {showSuggestions && searchResults.length > 0 && (
                            <div className="search-suggestions">
                                {(() => {
                                    // Deduplicate products by ID to ensure unique products
                                    const uniqueProducts = [];
                                    const seenIds = new Set();
                                    
                                    searchResults.forEach(product => {
                                        if (product && product.id && !seenIds.has(product.id)) {
                                            seenIds.add(product.id);
                                            uniqueProducts.push(product);
                                        }
                                    });
                                    
                                    console.log(`Rendering ${uniqueProducts.length} unique products out of ${searchResults.length} total`);
                                    
                                    return uniqueProducts.map(product => {
                                        const imageUrl = product.image?.startsWith("http")
                                            ? product.image
                                            : `${API_BASE}${product.image}`;
                                        return (
                                            <div
                                                key={product.id}
                                                className="suggestion-item"
                                                onClick={() => handleProductClick(product.id)}
                                            >
                                                <img src={imageUrl} alt={product.name} />
                                                <div className="suggestion-info">
                                                    <div className="suggestion-name">{product.name}</div>
                                                    <div className="suggestion-category">{product.categoryName || "Uncategorized"}</div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Login/Profile Button */}
                    <div className="profile-wrapper" ref={profileRef}>
                        {isLoggedIn ? (
                            <div className="profile-container">
                                <button className="profile-btn" onClick={toggleProfileDropdown}>
                                    <FontAwesomeIcon icon={faUserCircle} /> {user?.name || 'Profile'}
                                </button>
                                {showProfileDropdown && (
                                    <div className="profile-dropdown">
                                        <div className="profile-header">
                                            <div className="profile-avatar"><FontAwesomeIcon icon={faUserCircle} /></div>
                                            <div className="profile-info">
                                                <div className="profile-name">{user?.name || 'User'}</div>
                                                <div className="profile-email">{user?.email || ''}</div>
                                            </div>
                                        </div>
                                        <div className="profile-menu">
                                            <Link to="/profile" className="profile-menu-item" onClick={() => setShowProfileDropdown(false)}>
                                                <FontAwesomeIcon icon={faUser} /> My Profile
                                            </Link>
                                            <Link to="/orders" className="profile-menu-item" onClick={() => setShowProfileDropdown(false)}>
                                                <FontAwesomeIcon icon={faReceipt} /> My Orders
                                            </Link>
                                            <button className="profile-menu-item logout-btn" onClick={handleLogout}>
                                                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="login-btn">
                                <FontAwesomeIcon icon={faSignInAlt} /> Login
                            </Link>
                        )}
                    </div>

                    
                    <button className="menu-btn" onClick={toggleMobileMenu}>
                        <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="mobile-menu-overlay" 
                    onClick={closeMobileMenu}
                ></div>
            )}

            {/* Mobile Menu */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <nav className="mobile-nav">
                    <Link to="/" onClick={closeMobileMenu}>Home</Link>
                    <Link to="/about" onClick={closeMobileMenu}>About Us</Link>
                    <Link to="/bank-details" onClick={closeMobileMenu}>Bank Details</Link>
                    <div className="mobile-dropdown">
                        <div 
                            className="mobile-dropdown-header" 
                            onClick={toggleMobileDropdown}
                        >
                            Products <FontAwesomeIcon icon={faChevronDown} style={{ transform: isMobileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </div>
                        <div className={`mobile-dropdown-menu ${isMobileDropdownOpen ? 'open' : ''}`}>
                            {categories.map((cat) => (
                                <Link 
                                    key={cat.id} 
                                    to={`/category/${cat.slug}`} 
                                    className='mobile-items-list'
                                    onClick={closeMobileMenu}
                                >
                                    {cat.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <Link to="/contact" onClick={closeMobileMenu}>Contact Us</Link>
                    {user?.isAdmin && <Link to="/admin" onClick={closeMobileMenu}>Admin</Link>}
                    <Link to="/Cart" onClick={closeMobileMenu}>Cart</Link>
                    {isLoggedIn ? (
                        <>
                            <Link to="/profile" onClick={closeMobileMenu}>My Profile</Link>
                            <Link to="/orders" onClick={closeMobileMenu}>My Orders</Link>
                            <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="mobile-logout-btn">
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" onClick={closeMobileMenu}>Login</Link>
                    )}

                </nav>
            </div>

            {/* Mobile Floating Cart Button - Hidden on homepage */}
            {cartItemsCount > 0 && location.pathname !== "/" && (
                <Link to="/cart" className="mobile-cart-button">
                    <div className="mobile-cart-content">
                        <span className="mobile-cart-icon"><FontAwesomeIcon icon={faShoppingCart} /></span>
                        <div className="mobile-cart-info">
                            <span className="mobile-cart-text">View Cart</span>
                            <span className="mobile-cart-total">{formatPrice(cartTotal, currency, exchangeRate)}</span>
                        </div>
                        <span className="mobile-cart-badge">{cartItemsCount}</span>
                    </div>
                </Link>
            )}
        </div>
    )
}

export default Header