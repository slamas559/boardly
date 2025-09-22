// components/PayButton.jsx
import React, { useState } from "react";
import axios from "axios";
import { PaystackButton } from "react-paystack";
import api from "../../utils/api";

const PayButton = ({ roomId, user }) => {
  const [paymentData, setPaymentData] = useState(null);

  const handleInitPayment = async () => {
    try {
      const token = localStorage.getItem("token"); // assuming JWT
      const res = await api.post(
        `/rooms/${roomId}/pay`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save payment data
      setPaymentData({
        reference: res.data.data.reference,
        email: user.email,
        amount: res.data.data.amount, // already in kobo from backend
        publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY,
      });
    } catch (err) {
      console.error("Payment init failed", err.response?.data || err.message);
      alert("Failed to initialize payment. Try again.");
    }
  };

  if (!paymentData) {
    return (
      <button
        onClick={handleInitPayment}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Pay & Join
      </button>
    );
  }

  return (
    <PaystackButton
      {...paymentData}
      text="Proceed with Payment"
      onSuccess={(ref) => {
        console.log("Payment success", ref);
        alert("Payment successful! Redirecting...");
        window.location.href = `/room/${roomId}`;
      }}
      onClose={() => {
        alert("Payment cancelled.");
        setPaymentData(null);
      }}
    />
  );
};

export default PayButton;
