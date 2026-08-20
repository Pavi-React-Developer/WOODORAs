import React, { forwardRef } from 'react';

export const PackingSlip = forwardRef(({ orders }, ref) => {
    const cachedLogoUrl = typeof window !== 'undefined' ? localStorage.getItem('cms_cached_logo') : null;

    // If no orders are provided, just render an empty div
    if (!orders || orders.length === 0) {
        return <div ref={ref}></div>;
    }

    return (
        <div ref={ref} className="packing-slip-container">
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .packing-slip-container {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    .packing-slip-page {
                        page-break-after: always;
                        page-break-inside: avoid;
                    }
                    .packing-slip-page:last-child {
                        page-break-after: auto;
                    }
                }
                .packing-slip-page {
                    width: 100%;
                    max-width: 210mm;
                    min-height: 297mm;
                    padding: 10mm 5mm;
                    box-sizing: border-box;
                    background: white;
                    color: black;
                    font-family: Arial, sans-serif;
                    font-size: 18px;
                    line-height: 1.4;
                    margin: 0 auto;
                    page-break-after: always;
                }
                .packing-slip-page:last-child {
                    page-break-after: auto;
                }
                .ps-border {
                    border: 1.5pt solid #000 !important;
                }
                .ps-border-b {
                    border-bottom: 1.5pt solid #000 !important;
                }
                .ps-border-t {
                    border-top: 1.5pt solid #000 !important;
                }
                .ps-border-r {
                    border-right: 1.5pt solid #000 !important;
                }
                .ps-border-l {
                    border-left: 1.5pt solid #000 !important;
                }
                .ps-bold {
                    font-weight: bold;
                }
                .ps-text-center {
                    text-align: center;
                }
                .ps-text-right {
                    text-align: right;
                }
                .ps-flex {
                    display: flex;
                }
                .ps-grid {
                    display: grid;
                }
                .ps-black-bg {
                    background-color: black;
                    color: white;
                }
                .ps-p-1 { padding: 2mm; }
                .ps-p-05 { padding: 1mm; }
                
                table.ps-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                table.ps-table th, table.ps-table td {
                    border: 1.5pt solid #000 !important;
                    padding: 2.5mm 2mm;
                    text-align: left;
                    font-size: 16px;
                }
                table.ps-table th {
                    font-weight: bold;
                    background: #f0f0f0;
                }
            `}</style>

            {orders.map((order, idx) => {
                const isCOD = order.paymentMethod === 'COD' && !order.isPaid;
                const trackingId = order.trackingId || order.orderId || order._id.substring(order._id.length - 8);
                const address = order.shippingAddress || { address: 'Address not provided (Advanced Booking)', city: 'N/A', state: 'N/A', pinCode: 'N/A' };
                const user = order.user || {};
                const name = address.fullName || user.name || order.customerName || 'Customer';

                // Calculate invoice values
                let taxableValueTotal = 0;
                let taxTotal = 0;
                let grossTotal = 0;

                return (
                    <div key={order._id || idx} className="packing-slip-page">



                        {/* Top Section: Address & Courier */}
                        <div className="ps-flex ps-border" style={{ marginTop: '50mm' }}>
                            {/* Left Side: Address */}
                            <div className="ps-border-r" style={{ flex: '1', width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="ps-bold ps-border-b" style={{ padding: '2mm', fontSize: '18px' }}>Ship to Address</div>
                                <div style={{ padding: '2mm', flex: 1, overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'normal' }}>
                                    <div className="ps-bold" style={{ fontSize: '20px' }}>{name}</div>
                                    <div style={{ marginTop: '2mm', fontSize: '20px' }}>{address.address}</div>
                                    <div style={{ fontSize: '20px' }}>{address.city}, {address.state}, {address.pinCode}</div>
                                    {(address.phone || order.phoneNo) && <div style={{ fontSize: '20 px' }}>Ph: {address.phone || order.phoneNo}</div>}
                                </div>

                                <div className="ps-border-t" style={{ padding: '2mm', fontSize: '20px' }}>
                                    <div className="ps-bold" style={{ fontSize: '18px' }}>If undelivered, return to:</div>
                                    <div>Marakathai Warehouse</div>
                                    <div>Sengathurai Road,Kadampadi,</div>
                                    <div>Sulur Maingate, Coimbatore,</div>
                                    <div>Tamil Nadu, 641401</div>
                                </div>
                            </div>

                            {/* Right Side: Courier & Barcode */}
                            <div style={{ flex: '1', width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="ps-black-bg ps-p-1 ps-text-center ps-bold" style={{ fontSize: '24px', padding: '3mm' }}>
                                    {isCOD ? `COD: Collect ₹${(order.balanceAmount ?? order.totalPrice ?? 0).toFixed(2)}` : 'PREPAID: Do Not Collect'}
                                </div>
                                <div className="ps-p-1" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '3mm' }}>
                                    {cachedLogoUrl && cachedLogoUrl !== 'undefined' && (
                                        <div style={{ marginBottom: '6mm', display: 'flex', justifyContent: 'center' }}>
                                            <img src={cachedLogoUrl} alt="Logo" style={{ maxHeight: '24mm', objectFit: 'contain' }} />
                                        </div>
                                    )}

                                    <div style={{ fontSize: '16px', marginTop: '4mm', width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                                            <span>Sold by:</span>
                                            <span className="ps-bold">Marakathai Warehouse</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                                            <span>GSTIN:</span>
                                            <span className="ps-bold">33ABCDE1234F1Z5</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                                            <span>Order No.</span>
                                            <span className="ps-bold">{order.orderId || order._id.substring(order._id.length - 8)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Order Date</span>
                                            <span className="ps-bold">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Packing Slip Details */}
                        <div className="ps-border" style={{ marginTop: '8mm' }}>


                            <table className="ps-table" style={{ border: 'none' }}>
                                <thead>
                                    <tr>
                                        <th style={{ borderTop: 'none', borderLeft: 'none' }}>Description</th>
                                        <th style={{ borderTop: 'none' }}>HSN</th>
                                        <th style={{ borderTop: 'none' }}>Qty</th>
                                        <th style={{ borderTop: 'none' }}>Gross Amount</th>
                                        <th style={{ borderTop: 'none' }}>Taxable Value</th>
                                        <th style={{ borderTop: 'none' }}>Taxes</th>
                                        <th style={{ borderTop: 'none', borderRight: 'none' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(order.orderItems || [{ name: order.productName, qty: order.quantity, price: order.price }])?.map((item, i) => {
                                        const qty = item.qty || 1;
                                        const price = item.price || 0;
                                        const taxable = price * qty;
                                        const taxPercent = item.gstPercent || item.taxPercent || 0;
                                        const tax = item.gstAmount || (taxable * (taxPercent / 100));
                                        const total = taxable + tax;

                                        taxableValueTotal += taxable;
                                        taxTotal += tax;
                                        grossTotal += total;

                                        return (
                                            <tr key={i}>
                                                <td style={{ borderLeft: 'none' }}>{item.name}</td>
                                                <td>{item.hsnCode || '9503'}</td>
                                                <td>{qty}</td>
                                                <td>₹{taxable.toFixed(2)}</td>
                                                <td>₹{taxable.toFixed(2)}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>GST @{taxPercent}%<br />₹{tax.toFixed(2)}</td>
                                                <td style={{ borderRight: 'none', whiteSpace: 'nowrap' }}>₹{total.toFixed(2)}</td>
                                            </tr>
                                        )
                                    })}

                                </tbody>
                            </table>
                        </div>

                        <div className="ps-text-center ps-bold" style={{ fontSize: '18px', marginTop: '6mm', color: '#333' }}>
                            மரக்கதையை தேர்ந்தெடுத்ததற்கு நன்றி....! ❤️
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
