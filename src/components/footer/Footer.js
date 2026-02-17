import React, { useEffect, useState } from 'react'
import './Footer.css'
import { Link } from 'react-router-dom';
import { api } from '../../api';
import logo from '../../assets/logo.png';
import logoWebp from '../../assets/logo.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faYoutube, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faPhone, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

const Footer = () => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        api.getCategories()
            .then(res => {
                const allCategories = res.categories || [];
                // Get top 10 categories
                const top10Categories = allCategories.slice(0, 10);
                setCategories(top10Categories);
            })
            .catch(err => console.error("Load categories failed", err));
    }, []);

    // Function to handle smooth scroll to top when clicking links
    const handleLinkClick = () => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        });
        // Also ensure document elements scroll to top
        if (document.documentElement) {
            document.documentElement.scrollTop = 0;
        }
        if (document.body) {
            document.body.scrollTop = 0;
        }
    };

    // Split categories into two columns (5 each)
    const firstColumn = categories.slice(0, 5);
    const secondColumn = categories.slice(5, 10);

    return (
        <>
            <footer className="site-footer">
                <div className="footer-container">

                    <div className="footer-col footer-brand">
                        <Link to="/" className="footer-logo-link" onClick={handleLinkClick}>
                            <picture>
                                <source srcSet={logoWebp} type="image/webp" />
                                <img 
                                    src={logo} 
                                    alt="RK Industries" 
                                    className="footer-logo"
                                    loading="lazy"
                                    decoding="async"
                                    width="150"
                                    height="50"
                                />
                            </picture>
                        </Link>
                        <div className="social-media-icons">
                            <a href="https://www.instagram.com/rkindustries851/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                                <FontAwesomeIcon icon={faInstagram} />
                            </a>
                            <a href="https://www.facebook.com/rkindustries851/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                                <FontAwesomeIcon icon={faFacebook} />
                            </a>
                            <a href="https://x.com/RKINDUSTRIES851" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter/X">
                                <FontAwesomeIcon icon={faXTwitter} />
                            </a>
                            <a href="https://youtu.be/4B186pmG3Y4?si=AjrDAJA9L3tIcwE_" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
                                <FontAwesomeIcon icon={faYoutube} />
                            </a>
                        
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><Link to="/" onClick={handleLinkClick}>Home</Link></li>
                            <li><Link to="/about" onClick={handleLinkClick}>About Us</Link></li>
                            <li><Link to="/" onClick={handleLinkClick}>Products</Link></li>
                            <li><Link to="/contact" onClick={handleLinkClick}>Export Services</Link></li>
                            <li><Link to="/dealership" onClick={handleLinkClick}>Become a Distributor</Link></li>
                            <li><Link to="/contact" onClick={handleLinkClick}>Contact Us</Link></li>
                            <li><a href="/catalogue.pdf" target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>Download Catalogue</a></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Policy Links</h4>
                        <ul>
                            <li><Link to="/privacy-policy" onClick={handleLinkClick}>Privacy Policy</Link></li>
                            <li><Link to="/refund-policy" onClick={handleLinkClick}>Refund & Return Policy</Link></li>
                            <li><Link to="/terms-conditions" onClick={handleLinkClick}>Terms & Conditions</Link></li>
                            <li><Link to="/shipping-policy" onClick={handleLinkClick}>International Shipping Policy</Link></li>
                        </ul>
                    </div>

                    {/* First Column - Products */}
                    {firstColumn.length > 0 && (
                        <div className="footer-col">
                            <h4>Products</h4>
                            <ul>
                                {firstColumn.map((cat) => (
                                    <li key={cat.id}>
                                        <Link to={`/category/${cat.slug}`} onClick={handleLinkClick}>{cat.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Second Column - Products */}
                    {secondColumn.length > 0 && (
                        <div className="footer-col">
                            <h4>Products</h4>
                            <ul>
                                {secondColumn.map((cat) => (
                                    <li key={cat.id}>
                                        <Link to={`/category/${cat.slug}`} onClick={handleLinkClick}>{cat.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="footer-col">
                        <h4>Contact Us</h4>
                        <ul className="contact-list">
                            <li>
                                <FontAwesomeIcon icon={faPhone} style={{ marginRight: '8px', color: '#00ACEE' }} />
                                +91-8685933785 <br></br> +91-9896099653
                            </li>
                            <li className="email-row">
                                <a href="mailto:sales@rkindustriesexports.com">
                                    <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px', color: '#00ACEE' }} />
                                    sales@rkindustriesexports.com
                                </a>
                                <a href="mailto:info@rkindustriesexports.com">
                                    <FontAwesomeIcon icon={faEnvelope} style={{ marginLeft: '0px', marginRight: '8px', color: '#00ACEE' }} />
                                    info@rkindustriesexports.com
                                </a>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: '8px', color: '#00ACEE' }} />
                                MADHUBAN COLONY, Jagadhri, Yamunanagar, Haryana, 135003
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="footer-bottom">
                    <p>
                        © 2025 rkindustries Scientific Works | All Rights Reserved
                    </p>
                </div>
            </footer>
        </>
    )
}

export default Footer