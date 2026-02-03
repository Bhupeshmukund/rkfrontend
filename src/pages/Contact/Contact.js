import React from "react";
import "./Contact.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

const Contact = () => {
  return (
    <section className="contact-section">
      <div className="contact-wrapper">
        {/* Left: Form */}
        <div className="contact-form">
          <h2>Let's Talk Further</h2>
          <p>Please fill out the following form and we will get back to you shortly</p>

          <form>
            <div className="form-row">
              <div className="form-group">
                <label>Name <span>*</span></label>
                <input type="text" placeholder="Your Name" />
              </div>

              <div className="form-group">
                <label>Name <span>*</span></label>
                <input type="text" placeholder="Your Name" />
              </div>
            </div>

            <div className="form-group">
              <label>Email <span>*</span></label>
              <input type="email" placeholder="Your Email" />
            </div>

            <div className="form-group">
              <label>Message <span>*</span></label>
              <textarea rows="5" placeholder="Type Your Message..."></textarea>
            </div>

            <button type="submit" className="send-btn">
              Send →
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
            <p>rkindustriesexports@gmail.com</p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon phone">
            <FontAwesomeIcon icon={faPhone} />
          </div>
          <div>
            <h4>Phone</h4>
            <p>+91 8685933785 / +91 9817000000</p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon address">
            <FontAwesomeIcon icon={faMapMarkerAlt} />
          </div>
          <div>
            <h4>Address</h4>
            <p> MADHUBAN COLONY , JAGADHRI, MADHUBAN COLONY , TEJLI GATE, MANAN INTERNATIONAL, Jagadhri, Yamunanagar, Haryana, 135003</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
