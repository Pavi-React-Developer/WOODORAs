import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';

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
                        size: 100mm 100mm;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                .packing-slip-page {
                    width: 100mm;
                    height: 100mm;
                    padding: 2mm;
                    box-sizing: border-box;
                    background: white;
                    color: black;
                    font-family: Arial, sans-serif;
                    font-size: 6px;
                    line-height: 1.2;
                    overflow: hidden;
                    page-break-after: always;
                }
                .packing-slip-page:last-child {
                    page-break-after: auto;
                }
                .ps-border {
                    border: 1px solid black;
                }
                .ps-border-b {
                    border-bottom: 1px solid black;
                }
                .ps-border-t {
                    border-top: 1px solid black;
                }
                .ps-border-r {
                    border-right: 1px solid black;
                }
                .ps-border-l {
                    border-left: 1px solid black;
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
                .ps-p-1 { padding: 1mm; }
                .ps-p-05 { padding: 0.5mm; }
                
                table.ps-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                table.ps-table th, table.ps-table td {
                    border: 1px solid black;
                    padding: 0.5mm 1mm;
                    text-align: left;
                }
                table.ps-table th {
                    font-weight: bold;
                }
            `}</style>

            {orders.map((order, idx) => {
                const isCOD = order.paymentMethod === 'COD' && !order.isPaid;
                const trackingId = order.trackingId || order.orderId || order._id.substring(order._id.length - 8);
                const address = order.shippingAddress || {};
                const user = order.user || {};
                const name = address.fullName || user.name || 'Customer';
                
                // Calculate invoice values
                let taxableValueTotal = 0;
                let taxTotal = 0;
                let grossTotal = 0;

                return (
                    <div key={order._id || idx} className="packing-slip-page">
                        
                        {/* Logo Section */}
                        {cachedLogoUrl && cachedLogoUrl !== 'undefined' && (
                            <div className="ps-flex" style={{ justifyContent: 'center', marginBottom: '2mm', paddingTop: '1mm' }}>
                                <img src={cachedLogoUrl} alt="Logo" style={{ maxHeight: '10mm', objectFit: 'contain' }} />
                            </div>
                        )}

                        {/* Top Section: Address & Courier */}
                        <div className="ps-flex ps-border">
                            {/* Left Side: Address */}
                            <div className="ps-border-r ps-p-1" style={{ flex: '1', width: '50%', minWidth: 0 }}>
                                <div className="ps-bold ps-border-b" style={{ paddingBottom: '0.5mm', marginBottom: '0.5mm' }}>Customer Address</div>
                                <div className="ps-bold" style={{ fontSize: '7px' }}>{name}</div>
                                <div>{address.address}</div>
                                <div>{address.city}, {address.state}, {address.pinCode}</div>
                                {address.phone && <div>Ph: {address.phone}</div>}
                                
                                <div className="ps-border-t" style={{ marginTop: '2mm', paddingTop: '1mm' }}>
                                    <div className="ps-bold">If undelivered, return to:</div>
                                    <div>Wooden Toys Warehouse</div>
                                    <div>12 Craft Street, Coimbatore,</div>
                                    <div>Tamil Nadu, 641035</div>
                                </div>
                            </div>
                            
                            {/* Right Side: Courier & Barcode */}
                            <div style={{ flex: '1', width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="ps-black-bg ps-p-1 ps-text-center ps-bold">
                                    {isCOD ? `COD: Collect ₹${(order.balanceAmount ?? order.totalPrice ?? 0).toFixed(2)}` : 'PREPAID: Do Not Collect'}
                                </div>
                                <div className="ps-p-1" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div className="ps-bold" style={{ fontSize: '9px' }}>{order.courierName || 'Standard Delivery'}</div>
                                    <div className="ps-bold ps-black-bg" style={{ display: 'inline-block', padding: '0.5mm 1mm', marginTop: '0.5mm', width: 'fit-content' }}>Pickup</div>
                                    
                                    <div className="ps-text-center" style={{ marginTop: 'auto', width: '100%', overflow: 'hidden' }}>
                                        <div className="ps-bold" style={{ fontSize: '7px', wordWrap: 'break-word' }}>{trackingId}</div>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1mm' }}>
                                            <Barcode 
                                                value={trackingId} 
                                                width={1.2} 
                                                height={25} 
                                                displayValue={false} 
                                                margin={0}
                                                background="transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fold Line */}
                        <div className="ps-text-center" style={{ borderBottom: '1px dashed black', margin: '1mm 0', fontSize: '5px', paddingBottom: '0.5mm' }}>
                            Fold Here
                        </div>

                        {/* Tax Invoice */}
                        <div className="ps-border">
                            <div className="ps-flex ps-border-b">
                                <div className="ps-bold ps-p-05" style={{ flex: 1, textAlign: 'center' }}>TAX INVOICE</div>
                                <div className="ps-p-05 ps-border-l" style={{ fontSize: '5px' }}>Original For Recipient</div>
                            </div>
                            
                            <div className="ps-flex ps-border-b">
                                <div className="ps-p-1 ps-border-r" style={{ flex: 1 }}>
                                    <div className="ps-bold">BILL TO</div>
                                    <div>{name}</div>
                                    <div>{address.city}, {address.state}</div>
                                    <div>Place of Supply: {address.state}</div>
                                </div>
                                <div className="ps-p-1 ps-border-r" style={{ flex: 1 }}>
                                    <div className="ps-bold">SHIP TO</div>
                                    <div>{name}</div>
                                    <div>{address.address}</div>
                                    <div>{address.city}, {address.state}, {address.pinCode}</div>
                                </div>
                                <div className="ps-p-1" style={{ flex: 1.2 }}>
                                    <div style={{ fontSize: '6px' }}>Sold by: Wooden Toys Warehouse</div>
                                    <div style={{ fontSize: '6px' }}>GSTIN: 33ABCDE1234F1Z5</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1mm' }}>
                                        <div style={{ fontSize: '6px' }}>Order No.</div>
                                        <div className="ps-bold" style={{ fontSize: '6px' }}>{order.orderId || order._id.substring(order._id.length - 8)}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontSize: '6px' }}>Order Date</div>
                                        <div className="ps-bold" style={{ fontSize: '6px' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                    </div>
                                </div>
                            </div>

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
                                    {order.orderItems?.map((item, i) => {
                                        const qty = item.qty || 1;
                                        const price = item.price || 0;
                                        const total = price * qty;
                                        // Assume 18% GST standard if not provided
                                        const taxPercent = item.taxPercent || 18; 
                                        const taxable = total / (1 + (taxPercent / 100));
                                        const tax = total - taxable;
                                        
                                        taxableValueTotal += taxable;
                                        taxTotal += tax;
                                        grossTotal += total;

                                        return (
                                            <tr key={i}>
                                                <td style={{ borderLeft: 'none' }}>{item.name}</td>
                                                <td>{item.hsnCode || '9503'}</td>
                                                <td>{qty}</td>
                                                <td>₹{total.toFixed(2)}</td>
                                                <td>₹{taxable.toFixed(2)}</td>
                                                <td>GST @{taxPercent}%<br/>₹{tax.toFixed(2)}</td>
                                                <td style={{ borderRight: 'none' }}>₹{total.toFixed(2)}</td>
                                            </tr>
                                        )
                                    })}

                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="3" className="ps-bold" style={{ borderLeft: 'none', borderBottom: 'none' }}>Total</td>
                                        <td className="ps-bold" style={{ borderBottom: 'none' }}>₹{grossTotal.toFixed(2)}</td>
                                        <td className="ps-bold" style={{ borderBottom: 'none' }}>₹{taxableValueTotal.toFixed(2)}</td>
                                        <td className="ps-bold" style={{ borderBottom: 'none' }}>₹{taxTotal.toFixed(2)}</td>
                                        <td className="ps-bold" style={{ borderRight: 'none', borderBottom: 'none' }}>₹{grossTotal.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <div style={{ fontSize: '4.5px', marginTop: '1mm', textAlign: 'justify', color: '#333' }}>
                            Tax is not payable on reverse charge basis. This is a computer generated invoice and does not require signature. Other charges are charges that are applicable to your order and include charges for logistics fee (where applicable).
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
