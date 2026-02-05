import React, { useEffect, useState } from 'react'
import './Footer.css'
import { Link } from 'react-router-dom';
import { api } from '../../api';
import logo from '../../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

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
                            <img src={logo} alt="RK Industries" className="footer-logo" />
                        </Link>
                        <div className="social-media-icons">
                            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                                <FontAwesomeIcon icon={faInstagram} />
                            </a>
                            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                                <FontAwesomeIcon icon={faFacebook} />
                            </a>
                            <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
                                <FontAwesomeIcon icon={faYoutube} />
                            </a>
                            <a href="mailto:rkindustriesexports@gmail.com" className="social-icon" aria-label="Email">
                                <FontAwesomeIcon icon={faEnvelope} />
                            </a>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><Link to="/" onClick={handleLinkClick}>Home</Link></li>
                            <li><Link to="/about" onClick={handleLinkClick}>About Us</Link></li>
                            <li><Link to="/bank-details" onClick={handleLinkClick}>Bank Details</Link></li>
                            <li><Link to="/contact" onClick={handleLinkClick}>Contact Us</Link></li>
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
                            <li>📞 +91-8685933785</li>
                            <li>✉️ rkindustriesexports@gmail.com</li>
                            <li>
                                📍 MADHUBAN COLONY, Jagadhri, Yamunanagar, Haryana, 135003
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