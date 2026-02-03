import React from 'react';
import './About.css';
import { Link } from 'react-router-dom';
import about from '../../assets/about.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAward, faUsers, faGlobe, faCertificate, faMicroscope, faFlask } from '@fortawesome/free-solid-svg-icons';

const About = () => {
    return (
        <div className="about-page">
            {/* Hero Section */}
            <section className="about-hero">
                <div className="about-hero-overlay"></div>
                <div className="about-hero-content">
                    <h1>About RK Industries</h1>
                    <p className="hero-subtitle">Leading Scientific Instrument Manufacturer & Supplier</p>
                </div>
            </section>

            {/* Main Content */}
            <div className="about-page-container">
                {/* Introduction Section with Stats */}
                <section className="about-intro">
                    <div className="about-intro-content">
                        <span className="about-section-tag">WELCOME</span>
                        <h2>Welcome to <strong>RK Industries</strong></h2>
                        <p>
                            RK Industries is a leading scientific instrument manufacturer and supplier in India 
                            with over 75 years of experience in the laboratory equipment industry. We provide 
                            high-quality laboratory equipment at competitive prices, serving schools, colleges, 
                            hospitals, research labs, and industries nationwide.
                        </p>
                        <p>
                            Our commitment to precision engineering, quality assurance, and dependable after-sales 
                            support has made us a trusted partner for thousands of institutions across India. We 
                            focus on delivering reliable, high-performance equipment that meets the rigorous demands 
                            of modern laboratories.
                        </p>
                        <div className="experience-badge-card">
                            <h2>75+</h2>
                            <p>YEARS OF EXPERIENCE</p>
                        </div>
                    </div>
                    <div className="about-stats-inline">
                        <div className="stats-grid-inline">
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faUsers} />
                                </div>
                                <h3>5000+</h3>
                                <p>HAPPY CLIENTS</p>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faGlobe} />
                                </div>
                                <h3>Nationwide</h3>
                                <p>SERVICE NETWORK</p>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faAward} />
                                </div>
                                <h3>ISO 9001:2015</h3>
                                <p>CERTIFIED QUALITY</p>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faMicroscope} />
                                </div>
                                <h3>1000+</h3>
                                <p>PRODUCT RANGE</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="about-values">
                    <div className="about-values-header">
                        <span className="about-section-tag">OUR VALUES</span>
                        <h2>What Sets Us Apart</h2>
                        <p className="about-section-subtitle">
                            Our core values drive everything we do, ensuring excellence in every product and service we deliver.
                        </p>
                    </div>
                    <div className="values-grid">
                        <div className="value-card">
                            <div className="value-icon">
                                <FontAwesomeIcon icon={faCertificate} />
                            </div>
                            <h3>Quality Assurance</h3>
                            <p>
                                Every product undergoes rigorous quality testing to ensure it meets international 
                                standards and performs reliably in real-world laboratory environments.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">
                                <FontAwesomeIcon icon={faFlask} />
                            </div>
                            <h3>Innovation</h3>
                            <p>
                                We continuously invest in research and development to bring you the latest 
                                technologies and innovative solutions for your laboratory needs.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">
                                <FontAwesomeIcon icon={faUsers} />
                            </div>
                            <h3>Customer Support</h3>
                            <p>
                                Our dedicated support team is always ready to assist you with product selection, 
                                installation, maintenance, and troubleshooting throughout the product lifecycle.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">
                                <FontAwesomeIcon icon={faGlobe} />
                            </div>
                            <h3>Reliability</h3>
                            <p>
                                With over 75 years in the industry, we've built a reputation for reliability 
                                and dependability that our customers trust for their critical laboratory operations.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Product Range Section */}
                <section className="about-products">
                    <div className="about-products-header">
                        <span className="about-section-tag">OUR PRODUCTS</span>
                        <h2>Comprehensive Laboratory Solutions</h2>
                        <p className="about-section-subtitle">
                            We offer a wide range of laboratory equipment and scientific instruments
                        </p>
                    </div>
                    <div className="products-list">
                        <div className="product-category-item">
                            <h4>Laboratory Glassware</h4>
                            <p>Beakers, flasks, test tubes, and specialized glass equipment for all laboratory needs</p>
                        </div>
                        <div className="product-category-item">
                            <h4>Physics Labware</h4>
                            <p>Equipment for physics experiments and demonstrations in educational and research settings</p>
                        </div>
                        <div className="product-category-item">
                            <h4>Laboratory Plasticware</h4>
                            <p>Durable plastic equipment including pipettes, containers, and storage solutions</p>
                        </div>
                        <div className="product-category-item">
                            <h4>Pharmacy Equipment</h4>
                            <p>Specialized instruments for pharmaceutical research and quality control</p>
                        </div>
                        <div className="product-category-item">
                            <h4>Microscopes</h4>
                            <p>High-quality microscopes for various applications from education to research</p>
                        </div>
                        <div className="product-category-item">
                            <h4>Anatomical Models</h4>
                            <p>Detailed models for medical and biological education and training</p>
                        </div>
                    </div>
                </section>

                {/* Certification Section */}
                <section className="about-certification">
                    <div className="certification-content">
                        <div className="certification-badge">
                            <FontAwesomeIcon icon={faAward} className="cert-icon" />
                            <h3>ISO Certified 9001:2015</h3>
                            <p>
                                RK Industries is ISO 9001:2015 certified, demonstrating our commitment to 
                                quality management and continuous improvement in all our processes.
                            </p>
                        </div>
                        <div className="certification-details">
                            <h4>Medical Laboratory Technician</h4>
                            <p>
                                Our team includes certified medical laboratory technicians who understand 
                                the unique requirements of modern laboratories and can provide expert guidance 
                                on equipment selection and usage.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact CTA Section */}
                <section className="about-cta">
                    <div className="cta-content">
                        <h2>Let's Work Together</h2>
                        <p>
                            Whether you're setting up a new laboratory or upgrading existing facilities, 
                            we're here to help you find the perfect solutions for your needs.
                        </p>
                        <div className="cta-buttons">
                            <Link to="/contact" className="cta-btn primary">Contact Us</Link>
                            <Link to="/" className="cta-btn secondary">Browse Products</Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About;

