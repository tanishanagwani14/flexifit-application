import React, { useState } from 'react';

export const PatientCheckIn: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [pain, setPain] = useState<number>(3);
  const [effort, setEffort] = useState<number>(5);
  const [submitted, setSubmitted] = useState(false);

  const content = {
    en: {
      title: "Daily Recovery Check-In",
      painLabel: "Current Pain Level (1 = Low, 10 = Severe)",
      effortLabel: "Exercise Difficulty (1 = Easy, 10 = Very Hard)",
      submit: "Submit Check-In",
      success: "Check-in logged successfully!"
    },
    hi: {
      title: "दैनिक रिकवरी चेक-इन",
      painLabel: "वर्तमान दर्द का स्तर (1 = कम, 10 = अत्यधिक)",
      effortLabel: "व्यायाम का कठिनाई स्तर (1 = आसान, 10 = बहुत कठिन)",
      submit: "चेक-इन जमा करें",
      success: "चेक-इन सफलतापूर्वक दर्ज हो गया!"
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 my-8 text-gray-800 border border-gray-200">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-xl font-bold">{content[lang].title}</h2>
        <button 
          type="button"
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          className="px-3 py-1 bg-gray-100 border text-black rounded-md text-sm font-semibold hover:bg-gray-200"
        >
          {lang === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </div>

      {submitted ? (
        <div className="p-4 bg-green-100 text-green-700 rounded-md font-medium">
          {content[lang].success}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{content[lang].painLabel}: <span className="font-bold text-red-600">{pain}</span></label>
            <input 
              type="range" min="1" max="10" value={pain} 
              onChange={(e) => setPain(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{content[lang].effortLabel}: <span className="font-bold text-blue-600">{effort}</span></label>
            <input 
              type="range" min="1" max="10" value={effort} 
              onChange={(e) => setEffort(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 text-white py-2 rounded-md font-bold hover:bg-emerald-700 transition"
          >
            {content[lang].submit}
          </button>
        </form>
      )}
    </div>
  );
};