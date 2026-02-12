import React, { useState } from "react";
import "./Contact.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { api } from "../../api";
import { toast } from "react-toastify";

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: ""
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setSubmitting(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      await api.submitContact(fullName, formData.email, formData.message);

      toast.success("Thank you for your message! We will get back to you shortly.", {
        position: "top-right",
        autoClose: 5000,
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        message: ""
      });
      setErrors({});
    } catch (error) {
      console.error("Contact form submission error:", error);
      toast.error(error.message || "Failed to send message. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-wrapper">
        {/* Left: Form */}
        <div className="contact-form">
          <h2>Let's Talk Further</h2>
          <p>Please fill out the following form and we will get back to you shortly</p>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name <span>*</span></label>
                <input 
                  type="text" 
                  name="firstName"
                  placeholder="Your First Name" 
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? "error" : ""}
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label>Last Name <span>*</span></label>
                <input 
                  type="text" 
                  name="lastName"
                  placeholder="Your Last Name" 
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? "error" : ""}
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email <span>*</span></label>
              <input 
                type="email" 
                name="email"
                placeholder="Your Email" 
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Message <span>*</span></label>
              <textarea 
                rows="5" 
                name="message"
                placeholder="Type Your Message..." 
                value={formData.message}
                onChange={handleChange}
                className={errors.message ? "error" : ""}
              ></textarea>
              {errors.message && <span className="error-message">{errors.message}</span>}
            </div>

            <button type="submit" className="send-btn" disabled={submitting}>
              {submitting ? "Sending..." : "Send →"}
            </button>
          </form>
        </div>

        {/* Right: Map */}
        <div className="contact-map">
          <iframe
            title="map"
            src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d14583.755366541129!2d77.29788955993021!3d30.172323114477532!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e6!4m5!1s0x390efbc9ee42d3bf%3A0x9565bb70b6bb2998!2zUi5LLiBJbmR1c3RyaWVzIOCkhuCksC7gpJXgpYcuIOCkh-CkguCkoeCkuOCljeCkn-CljeCksOClgOCknA!3m2!1d30.161565999999997!2d77.30875!4m5!1s0x390efbc9ee42d3bf%3A0x9565bb70b6bb2998!2smadhuban%20colony%2C%20near%20tata%20motors%2C%20Indira%20Colony%2C%20Jagadhri%2C%20Haryana%20135003!3m2!1d30.161565999999997!2d77.30875!5e0!3m2!1sen!2sin!4v1766763525041!5m2!1sen!2sin"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="contact-info">
        <div className="info-card">
          <div className="icon email">
            <FontAwesomeIcon icon={faEnvelope} />
          </div>
          <div>
            <h4>Email</h4>
            <p>sales@rkindustriesexports.com</p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon phone">
            <FontAwesomeIcon icon={faPhone} />
          </div>
          <div>
            <h4>Phone</h4>
            <p>+91 8685933785 / +91 9896099653</p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon address">
            <FontAwesomeIcon icon={faMapMarkerAlt} />
          </div>
          <div>
            <h4>Address</h4>
            <p>MADHUBAN COLONY, Jagadhri, Yamunanagar, Haryana, 135003</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
