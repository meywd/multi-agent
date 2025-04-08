import React from "react";

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      <p className="text-lg mb-4">
        This is a simple test page to check if the router and basic rendering are working.
      </p>
      <div className="p-4 bg-blue-100 rounded-md">
        <p>If you can see this, the basic routing is working correctly!</p>
      </div>
    </div>
  );
}