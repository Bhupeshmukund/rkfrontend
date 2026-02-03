import React, { useEffect, useState } from 'react'
import './Homepage.css'
import main2 from '../../assets/main2.png'
import about from '../../assets/about.jpg'
import { useNavigate } from 'react-router-dom';
import { api, API_BASE } from "../../api";

const Homepage = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        api.getCategories()
            .then(res => setCategories(res.categories || []))
            .catch(err => console.error("Load categories failed", err));
    }, []);

    return (
        <>
            <section className="lab-banner">
                <div className="lab-banner-overlay"></div>

                <div className="lab-banner-inner">

                    <div className="lab-banner-content">
                        <h1>RK Industries</h1>
                        <p className="subtitle">Trusted Lab Equipment & Scientific Solutions Provider</p>

                        <p className="description">
                            RK Industries is a leading supplier of high-quality laboratory equipment,
                            analytical instruments, Civil lab equipments and scientific solutions for research labs,
                            hospitals, educational institutes, and industries across India.
                            We focus on precision, reliability, and long-term service support.
                        </p>

                        <div className="lab-banner-actions">
                            <a href="/about" className="btn primary">know more About Us</a>
                            <a 
                                href="#our-products" 
                                className="btn secondary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById('our-products')?.scrollIntoView({ 
                                        behavior: 'smooth',
                                        block: 'start'
                                    });
                                }}
                            >
                                Explore Products <i className="fa-solid fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>

                    <div className="lab-banner-image">
                        <img src={main2} alt="Laboratory Equipment" />
                    </div>

                </div>
            </section><section id="our-products" className="our-products">
                <div className="products-overlay"></div>
                <div className="products-container">
                    <div className="products-header">
                        <span className="products-tag">OUR PRODUCTS</span>
                        <h2 className="products-title">Explore Our Product Range</h2>
                        <p className="products-subtitle">
                            Discover high-quality laboratory equipment and scientific solutions for your needs
                        </p>
                    </div>

                    <div className="products-grid">
                        {categories.map((cat) => {
                            const image = cat.image?.startsWith("http")
                                ? cat.image
                                : `${API_BASE}${cat.image}`;

                            return (
                                <div
                                    className="product-card"
                                    key={cat.id}
                                    onClick={() => navigate(`/category/${cat.slug}`)}
                                >
                                    <div className="product-image-wrapper">
                                        <img src={image} alt={cat.name} />
                                        <div className="product-overlay"></div>
                                    </div>
                                    <div className="product-label">
                                        <h3>{cat.name}</h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            <section className="about-us">
                <div className="about-container">

                    <div className="about-image">
                        <div className="experience-badge">
                            <h2>75+</h2>
                            <p>Years Experience of Laboratory</p>
                        </div>

                        <img
                            src={about}
                            alt="Laboratory Microscope"
                        />
                    </div>

                    <div className="about-content">
                        <span className="about-tag">ABOUT US</span>

                        <h2>
                            WELCOME TO <br />
                            <strong>RK INDUSTRIES</strong>
                        </h2>

                        <p className="about-desc">
                            RK INDUSTRIES is a leading scientific instrument manufacturer
                            and supplier in India with over 40 years of experience. We provide
                            high-quality laboratory equipment at competitive prices, serving schools,
                            colleges, hospitals, research labs, and industries nationwide.
                        </p>

                        <div className="about-features">
                            <div className="feature">
                                <h4>MEDICAL LABORATORY TECHNICIAN</h4>
                            </div>
                            <div className="feature">
                                <h4>ISO CERTIFIED 9001 : 2015</h4>
                            </div>
                        </div>

                        <p className="about-desc">
                            Our wide range of microscopes, pharmacy equipment, and laboratory
                            accessories are designed for high performance and long-term reliability.
                            We focus on precision engineering, quality assurance, and dependable
                            after-sales support.
                        </p>

                        <a href="/about-us" className="about-btn">Know More</a>
                    </div>

                </div>
            </section>

            
        </>
    )
}

export default Homepage