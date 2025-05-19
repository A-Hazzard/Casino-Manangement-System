import React from "react";

const CollectorMobileUI: React.FC = () => {
  return (
    <div className="md:hidden w-full absolute left-0 right-0 px-4">
      <div className="mx-auto max-w-xl bg-white p-6 rounded-lg shadow-md text-center space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Coming Soon...</h2>
        <p className="text-gray-500">
          The Collectors Schedule (Mobile) is under development.
        </p>
      </div>
    </div>
  );
};

export default CollectorMobileUI;
