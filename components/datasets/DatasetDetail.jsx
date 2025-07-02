import React from 'react';
import { FiCalendar, FiUser, FiTag, FiEye, FiDownload } from 'react-icons/fi';

export default function DatasetDetail({ dataset, owner }) {
  if (!dataset) {
    return <div>Dataset not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with title and basic info */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{dataset.name}</h1>
        <p className="text-gray-600 text-lg mb-4">{dataset.description}</p>
        
        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {owner && (
            <div className="flex items-center">
              <FiUser className="mr-1" />
              <span>{owner.name || 'Unknown Owner'}</span>
            </div>
          )}
          
          {dataset.createdAt && (
            <div className="flex items-center">
              <FiCalendar className="mr-1" />
              <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <FiEye className="mr-1" />
            <span>{dataset.views || 0} views</span>
          </div>
          
          <div className="flex items-center">
            <FiDownload className="mr-1" />
            <span>{dataset.downloads || 0} downloads</span>
          </div>
          
          {dataset.category && (
            <div className="flex items-center">
              <FiTag className="mr-1" />
              <span>{dataset.category}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="p-6">
        {/* Tags */}
        {dataset.tags && dataset.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {dataset.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* File Information */}
        {dataset.file && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">File Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {dataset.file.name && (
                  <div>
                    <span className="font-medium text-gray-700">File Name:</span>
                    <span className="ml-2 text-gray-600">{dataset.file.name}</span>
                  </div>
                )}
                
                {dataset.file.type && (
                  <div>
                    <span className="font-medium text-gray-700">File Type:</span>
                    <span className="ml-2 text-gray-600">{dataset.file.type}</span>
                  </div>
                )}
                
                {dataset.file.size && (
                  <div>
                    <span className="font-medium text-gray-700">File Size:</span>
                    <span className="ml-2 text-gray-600">
                      {(dataset.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
                
                {dataset.file.lastModified && (
                  <div>
                    <span className="font-medium text-gray-700">Last Modified:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(dataset.file.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Price Information */}
        {dataset.price && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Pricing</h3>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                ${dataset.price} {dataset.currency || 'USD'}
              </div>
              {dataset.priceType && (
                <div className="text-sm text-green-600 mt-1">
                  {dataset.priceType}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token Information (if tokenized) */}
        {dataset.nftId && dataset.datatokenAddress && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Blockchain Details</h3>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">NFT ID:</span>
                  <span className="ml-2 text-gray-600 font-mono">{dataset.nftId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Token Name:</span>
                  <span className="ml-2 text-gray-600">{dataset.tokenName || 'Data Token'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Token Address:</span>
                  <span className="ml-2 text-gray-600 font-mono text-xs">
                    {dataset.datatokenAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 