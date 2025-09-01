"use client";

import { useState } from "react";

export default function Header() {
  const [incVat, setIncVat] = useState(true);

  return (
    <header className="w-full border-b bg-white shadow-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-teal-700 text-white">
        {/* Logo Left */}
        <div className="text-xl font-bold">
          Compare<span className="text-teal-300">Build</span>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center space-x-6">
          <button className="hover:underline">Login / Register</button>
          <div className="flex items-center space-x-2">
            <span>Excl VAT</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={incVat}
                onChange={() => setIncVat(!incVat)}
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-teal-500"></div>
            </label>
            <span>Inc VAT</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex justify-center items-center py-4 px-6 bg-white">
        <input
          type="text"
          placeholder="What are you looking for?"
          className="w-full max-w-2xl px-4 py-2 border rounded-l-full focus:outline-none"
        />
        <button className="px-5 py-2 bg-teal-600 text-white rounded-r-full hover:bg-teal-700">
          🔍
        </button>
      </div>
    </header>
  );
}
