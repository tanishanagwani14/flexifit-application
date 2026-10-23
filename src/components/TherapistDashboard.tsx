import React, { useState } from 'react';

export const TherapistDashboard: React.FC = () => {
  const [maxPainThreshold, setMaxPainThreshold] = useState(7);
  const [alertSent, setAlertSent] = useState(false);

  const patientData = {
    name: "Rajesh Kumar",
    recentPain: 8,
    complianceRate: "85%",
    needsHumanReview: true
  };

  const handleSendAlert = () => {
    setAlertSent(true);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-6 my-8 text-gray-800 border border-gray-200">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-2xl font-bold">Therapist Control Panel</h2>
        {patientData.needsHumanReview && (
          <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-300 animate-pulse">
            ⚠️ Needs Human Review
          </span>
        )}
      </div>

      {/* Threshold Matrix Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2 border">
        <h3 className="font-semibold text-lg">Safety Rule Settings (Threshold Matrix)</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Alert if Pain Level ≥:</label>
          <input 
            type="number" 
            value={maxPainThreshold} 
            onChange={(e) => setMaxPainThreshold(Number(e.target.value))}
            className="w-16 border rounded px-2 py-1 text-center bg-white font-bold"
          />
        </div>
      </div>

      {/* Automated AI Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-900">Automated AI Clinical Summary (14-Day Progress)</h3>
        <p className="text-sm text-blue-800 mt-1">
          "Patient completed {patientData.complianceRate} of assigned routines over 14 days, but reported a 3-point pain increase following knee extension exercises."
        </p>
      </div>

      {/* Emergency Alert Payload Dispatch */}
      {patientData.recentPain >= maxPainThreshold && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-red-700 font-bold">⚠️ Emergency Threshold Breached</p>
            <p className="text-xs text-red-600">Patient reported pain level {patientData.recentPain}/10</p>
          </div>
          <button 
            type="button"
            onClick={handleSendAlert}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-red-700 transition"
          >
            {alertSent ? "Notification Sent ✅" : "Send Emergency Dispatch"}
          </button>
        </div>
      )}
    </div>
  );
};