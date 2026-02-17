import React, { useState, useEffect } from 'react';
import './Dealership.css';
import { api } from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faGlobe, faCity, faUser, faBriefcase, faEnvelope, faPhone, faStore, faCalendarAlt, faWarehouse, faFileAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { loadScript } from '../../utils/loadScript';

const Dealership = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  // Step 1: Basic Details
  const [formData, setFormData] = useState({
    companyName: '',
    country: '',
    city: '',
    contactPersonName: '',
    designation: '',
    email: '',
    mobileNumber: '',
    natureOfBusiness: '',
    yearsInBusiness: '',
    warehouseFacility: '',
    briefMessage: '',
    declaration: false
  });

  const [errors, setErrors] = useState({});

  const countries = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium',
    'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
    'Poland', 'Czech Republic', 'Portugal', 'Greece', 'Ireland',
    'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman',
    'Bahrain', 'Singapore', 'Malaysia', 'Thailand', 'Indonesia',
    'Philippines', 'Vietnam', 'Japan', 'South Korea', 'China',
    'Hong Kong', 'Taiwan', 'New Zealand', 'South Africa', 'Egypt',
    'Nigeria', 'Kenya', 'Brazil', 'Mexico', 'Argentina', 'Chile',
    'Colombia', 'Peru', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.contactPersonName.trim()) newErrors.contactPersonName = 'Contact person name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.natureOfBusiness) newErrors.natureOfBusiness = 'Nature of business is required';
    if (!formData.yearsInBusiness) newErrors.yearsInBusiness = 'Years in business is required';
    if (!formData.warehouseFacility) newErrors.warehouseFacility = 'Warehouse facility is required';
    if (!formData.declaration) newErrors.declaration = 'Please confirm your interest';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if reCAPTCHA is completed
    if (!recaptchaToken) {
      toast.error('Please complete the reCAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      await api.submitDealershipApplication({
        ...formData,
        recaptchaToken: recaptchaToken
      });

      toast.success('Application submitted successfully! We will contact you soon.');
      
      // Reset form
      setFormData({
        companyName: '',
        country: '',
        city: '',
        contactPersonName: '',
        designation: '',
        email: '',
        mobileNumber: '',
        natureOfBusiness: '',
        yearsInBusiness: '',
        warehouseFacility: '',
        briefMessage: '',
        declaration: false
      });
      setStep(1);
      setRecaptchaToken(null);
      
      // Reset reCAPTCHA widget
      if (window.grecaptcha && window.grecaptcha.reset) {
        const recaptchaElement = document.querySelector('.g-recaptcha');
        if (recaptchaElement) {
          const widgetId = recaptchaElement.getAttribute('data-widget-id');
          if (widgetId) {
            window.grecaptcha.reset(parseInt(widgetId));
          }
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load and render reCAPTCHA script (v2 visible) - only in step 2
  useEffect(() => {
    if (step !== 2) return; // Only render in step 2
    
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LcHb2ssAAAAALkaEHuJgeu58D2m9TWYuvc7J9Jo";
    
    const renderRecaptcha = () => {
      const recaptchaElement = document.getElementById('recaptcha-widget');
      if (recaptchaElement && !recaptchaElement.hasChildNodes() && window.grecaptcha && window.grecaptcha.render) {
        window.grecaptcha.render(recaptchaElement, {
          sitekey: siteKey,
          callback: onRecaptchaChange
        });
      }
    };
    
    // Check if script is already loaded
    if (window.grecaptcha && window.grecaptcha.ready) {
      window.grecaptcha.ready(renderRecaptcha);
    } else if (window.grecaptcha && window.grecaptcha.render) {
      // Script loaded but ready not available
      setTimeout(renderRecaptcha, 100);
    } else {
      // Load script first
      if (!document.querySelector('#recaptcha-script')) {
        loadScript(`https://www.google.com/recaptcha/api.js?render=explicit`, {
          id: 'recaptcha-script',
          async: true,
          defer: true
        }).then(() => {
          // Wait for grecaptcha to be ready
          const checkInterval = setInterval(() => {
            if (window.grecaptcha) {
              clearInterval(checkInterval);
              if (window.grecaptcha.ready) {
                window.grecaptcha.ready(renderRecaptcha);
              } else {
                setTimeout(renderRecaptcha, 500);
              }
            }
          }, 100);
          
          // Timeout after 5 seconds
          setTimeout(() => clearInterval(checkInterval), 5000);
        }).catch(err => {
          console.error('Failed to load reCAPTCHA:', err);
        });
      } else {
        // Script tag exists but grecaptcha not ready yet
        const checkInterval = setInterval(() => {
          if (window.grecaptcha) {
            clearInterval(checkInterval);
            if (window.grecaptcha.ready) {
              window.grecaptcha.ready(renderRecaptcha);
            } else {
              setTimeout(renderRecaptcha, 500);
            }
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }
  }, [step]); // Re-run when step changes to ensure widget renders in step 2

  // reCAPTCHA callback - stores token when user completes reCAPTCHA
  const onRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  return (
    <div className="dealership-page">
      {/* Header Section */}
      <section className="dealership-header">
        <div className="dealership-header-content">
          <h1>Become an Authorized Distributor – R.K Industries</h1>
          <p className="dealership-subtitle">
            Partner with India's Trusted Manufacturer of Laboratory & Civil Testing Equipment
          </p>
          <div className="dealership-highlights">
            <div className="highlight-item">
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>Export Quality Products</span>
            </div>
            <div className="highlight-item">
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>Bulk Production Capacity</span>
            </div>
            <div className="highlight-item">
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>Competitive Distributor Margins</span>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="dealership-form-section">
        <div className="dealership-container">
          {/* Progress Indicator */}
          <div className="form-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Basic Details</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Business Qualification</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="dealership-form">
            {/* Step 1: Basic Details */}
            {step === 1 && (
              <div className="form-step">
                <h2 className="step-title">Step 1: Basic Details</h2>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="companyName">
                      <FontAwesomeIcon icon={faBuilding} />
                      Company Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={errors.companyName ? 'error' : ''}
                      placeholder="Enter your company name"
                    />
                    {errors.companyName && <span className="error-message">{errors.companyName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">
                      <FontAwesomeIcon icon={faGlobe} />
                      Country <span className="required">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={errors.country ? 'error' : ''}
                    >
                      <option value="">Select Country</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {errors.country && <span className="error-message">{errors.country}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="city">
                      <FontAwesomeIcon icon={faCity} />
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter your city"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactPersonName">
                      <FontAwesomeIcon icon={faUser} />
                      Contact Person Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="contactPersonName"
                      name="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={handleChange}
                      className={errors.contactPersonName ? 'error' : ''}
                      placeholder="Enter contact person name"
                    />
                    {errors.contactPersonName && <span className="error-message">{errors.contactPersonName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="designation">
                      <FontAwesomeIcon icon={faBriefcase} />
                      Designation
                    </label>
                    <input
                      type="text"
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="Enter your designation"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <FontAwesomeIcon icon={faEnvelope} />
                      Email <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'error' : ''}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mobileNumber">
                      <FontAwesomeIcon icon={faPhone} />
                      Mobile Number with Country Code <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      className={errors.mobileNumber ? 'error' : ''}
                      placeholder="+91 9876543210"
                    />
                    {errors.mobileNumber && <span className="error-message">{errors.mobileNumber}</span>}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleNext} className="btn btn-primary">
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Business Qualification */}
            {step === 2 && (
              <div className="form-step">
                <h2 className="step-title">Step 2: Business Qualification</h2>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="natureOfBusiness">
                      <FontAwesomeIcon icon={faStore} />
                      Nature of Business <span className="required">*</span>
                    </label>
                    <select
                      id="natureOfBusiness"
                      name="natureOfBusiness"
                      value={formData.natureOfBusiness}
                      onChange={handleChange}
                      className={errors.natureOfBusiness ? 'error' : ''}
                    >
                      <option value="">Select Nature of Business</option>
                      <option value="Importer">Importer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Trader">Trader</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Government Supplier">Government Supplier</option>
                    </select>
                    {errors.natureOfBusiness && <span className="error-message">{errors.natureOfBusiness}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="yearsInBusiness">
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      Years in Business <span className="required">*</span>
                    </label>
                    <select
                      id="yearsInBusiness"
                      name="yearsInBusiness"
                      value={formData.yearsInBusiness}
                      onChange={handleChange}
                      className={errors.yearsInBusiness ? 'error' : ''}
                    >
                      <option value="">Select Years in Business</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                    {errors.yearsInBusiness && <span className="error-message">{errors.yearsInBusiness}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="warehouseFacility">
                      <FontAwesomeIcon icon={faWarehouse} />
                      Warehouse Facility Available? <span className="required">*</span>
                    </label>
                    <select
                      id="warehouseFacility"
                      name="warehouseFacility"
                      value={formData.warehouseFacility}
                      onChange={handleChange}
                      className={errors.warehouseFacility ? 'error' : ''}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {errors.warehouseFacility && <span className="error-message">{errors.warehouseFacility}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="briefMessage">
                      <FontAwesomeIcon icon={faFileAlt} />
                      Brief Message
                    </label>
                    <textarea
                      id="briefMessage"
                      name="briefMessage"
                      value={formData.briefMessage}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Tell us about your business and why you want to become a distributor..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="declaration"
                        checked={formData.declaration}
                        onChange={handleChange}
                        className={errors.declaration ? 'error' : ''}
                      />
                      <span>I confirm my interest in becoming an authorized distributor. <span className="required">*</span></span>
                    </label>
                    {errors.declaration && <span className="error-message">{errors.declaration}</span>}
                  </div>
                </div>

                {/* reCAPTCHA v2 Visible */}
                <div className="form-group full-width">
                  <label>reCAPTCHA Verification <span className="required">*</span></label>
                  <div className="recaptcha-container">
                    <div id="recaptcha-widget" className="g-recaptcha"></div>
                    {!recaptchaToken && (
                      <p className="recaptcha-hint">Please complete the reCAPTCHA verification above</p>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleBack} className="btn btn-secondary">
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Submitting...' : 'Apply for Distributorship'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
};

export default Dealership;
