'use client';

import React from 'react';
import FixMissingUrl from '@/components/util/FixMissingUrl';
import { FiTool } from 'react-icons/fi';

const FixDatasetPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <FiTool className="mx-auto h-12 w-12 text-blue-500 mb-2" />
        <h1 className="text-2xl font-bold">Dataset Utilities</h1>
        <p className="text-gray-600">
          Tools to fix issues with datasets
        </p>
      </div>
      
      <FixMissingUrl />
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          These utilities are for fixing issues with datasets that are missing download URLs.
          Use them if you're having trouble downloading purchased datasets.
        </p>
      </div>
    </div>
  );
};

export default FixDatasetPage; 