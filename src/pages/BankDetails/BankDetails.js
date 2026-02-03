import React from 'react';
import './BankDetails.css';

const BankDetails = () => {
    return (
        <div className="bankDetails-page">
            {/* Header Section */}
            <section className="bankDetails-header">
                <h1>BANK DETAILS</h1>
            </section>

            {/* Main Content */}
            <div className="bankDetails-content">
                <div className="bankDetails-container">
                    {/* Left Side - Bank Account Details */}
                    <div className="bankDetails-account-section">
                        <h2 className="bankDetails-section-title">BANK ACCOUNT DETAILS</h2>
                        <div className="bankDetails-table">
                            <div className="bankDetails-row">
                                <div className="bankDetails-label">Bank Holder Name</div>
                                <div className="bankDetails-value">RK INDUSTRIES</div>
                            </div>
                            <div className="bankDetails-row">
                                <div className="bankDetails-label">Bank name</div>
                                <div className="bankDetails-value">State Bank of India, Jagadhri yamunanagar</div>
                            </div>
                            <div className="bankDetails-row">
                                <div className="bankDetails-label">Account No</div>
                                <div className="bankDetails-value">39135298801</div>
                            </div>
                            <div className="bankDetails-row">
                                <div className="bankDetails-label">IFSC Code</div>
                                <div className="bankDetails-value">SBIN0000654</div>
                            </div>
                            <div className="bankDetails-row">
                                <div className="bankDetails-label">Swift Code for Foreign Transactions</div>
                                <div className="bankDetails-value">SBININBB437</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Scan & Pay */}
                    <div className="bankDetails-scan-pay-section">
                        <h2 className="bankDetails-section-title bankDetails-scan-title">SCAN & PAY</h2>
                        <div className="bankDetails-qr-code-container">
                            {/* QR Code Placeholder - Replace with actual QR code image */}
                            <div className="bankDetails-qr-code-placeholder">
                                <p>QR Code Image</p>
                                <p className="bankDetails-qr-note">(Please add QR code image here)</p>
                            </div>
                            {/* Uncomment and use when QR code image is available:
                            <img 
                                src={require('../../assets/qr-code.png')} 
                                alt="Scan & Pay QR Code" 
                                className="bankDetails-qr-code-image"
                            />
                            */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankDetails;

