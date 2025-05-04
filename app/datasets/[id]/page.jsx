import React from 'react';
import { getDatasetById } from '@/lib/models/dataset';
import { getUserById } from '@/lib/models/user';
import DatasetDetail from '@/components/datasets/DatasetDetail';
import DatasetPurchase from '@/components/datasets/DatasetPurchase';
import { Tabs, Button, Spinner } from 'flowbite-react';
import { notFound } from 'next/navigation';
import { FiDownload, FiInfo, FiBarChart2, FiStar } from 'react-icons/fi';
import { getCurrentUser } from '@/lib/auth/session';

export async function generateMetadata({ params }) {
  const dataset = await getDatasetById(params.id);
  
  if (!dataset) {
    return {
      title: 'Dataset Not Found - DataX',
    };
  }
  
  return {
    title: `${dataset.name} - DataX`,
    description: dataset.description || 'Dataset details on DataX marketplace',
  };
}

async function DatasetDetailPage({ params }) {
  const dataset = await getDatasetById(params.id);
  
  if (!dataset) {
    notFound();
  }
  
  // Get current user if logged in
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  
  // Get dataset owner details
  let owner = null;
  if (dataset.owner) {
    try {
      owner = await getUserById(dataset.owner);
    } catch (error) {
      console.error('Error getting dataset owner:', error);
    }
  }
  
  // Check if user is the owner
  const isOwner = user && (user.id === dataset.owner || user.id === dataset.owner?.toString());
  
  // Check if dataset is tokenized
  const isTokenized = Boolean(dataset.nftId && dataset.datatokenAddress);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main content - 2/3 width on desktop */}
        <div className="md:col-span-2">
          <DatasetDetail dataset={dataset} owner={owner} />
          
          <div className="mt-8">
            <Tabs>
              <Tabs.Item title="Overview" icon={FiInfo}>
                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Dataset Overview</h3>
                  <div className="prose max-w-none">
                    <p>{dataset.description}</p>
                    
                    {dataset.tags && dataset.tags.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold">Tags</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dataset.tags.map((tag, index) => (
                            <span key={index} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {dataset.file && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold">File Details</h4>
                        <ul className="list-disc list-inside mt-2">
                          <li>Type: {dataset.file.type || 'Unknown'}</li>
                          <li>Size: {dataset.file.size ? `${(dataset.file.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}</li>
                          {dataset.file.lastModified && (
                            <li>Last Modified: {new Date(dataset.file.lastModified).toLocaleDateString()}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Tabs.Item>
              
              <Tabs.Item title="Statistics" icon={FiBarChart2}>
                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Downloads</p>
                      <p className="text-2xl font-bold">{dataset.downloads || 0}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Views</p>
                      <p className="text-2xl font-bold">{dataset.views || 0}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Purchases</p>
                      <p className="text-2xl font-bold">{dataset.purchases || 0}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="text-2xl font-bold flex items-center">
                        {dataset.averageRating || 0} <FiStar className="ml-1 text-yellow-500" />
                      </p>
                    </div>
                  </div>
                </div>
              </Tabs.Item>
            </Tabs>
          </div>
        </div>
        
        {/* Sidebar - 1/3 width on desktop */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Dataset Actions</h3>
            
            {isOwner ? (
              <>
                <div className="mb-4">
                  <Button color="success" className="w-full" href={`/api/datasets/${dataset._id}/download`}>
                    <FiDownload className="mr-2" /> Download Dataset
                  </Button>
                </div>
                
                <div className="mb-2">
                  <Button color="light" className="w-full" href={`/dashboard/datasets/${dataset._id}/edit`}>
                    Edit Dataset
                  </Button>
                </div>
                
                {!isTokenized && (
                  <div className="mt-4">
                    <Button color="purple" className="w-full" href={`/dashboard/datasets/${dataset._id}/tokenize`}>
                      Tokenize Dataset
                    </Button>
                  </div>
                )}
              </>
            ) : (
              user ? (
                isTokenized ? (
                  <DatasetPurchase 
                    dataset={dataset} 
                    onPurchaseComplete={(result) => {
                      console.log('Purchase completed:', result);
                      // We'll handle this client-side with React state
                    }} 
                  />
                ) : (
                  <div className="mb-4">
                    <Button color="success" className="w-full" href={`/api/datasets/${dataset._id}/download`}>
                      <FiDownload className="mr-2" /> Download Dataset (Free)
                    </Button>
                  </div>
                )
              ) : (
                <div className="mb-4">
                  <Button color="primary" className="w-full" href={`/auth/login?redirect=/datasets/${dataset._id}`}>
                    Log in to Download
                  </Button>
                </div>
              )
            )}
            
            {isTokenized && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                <h4 className="font-semibold text-gray-700">Token Details</h4>
                <ul className="mt-2 space-y-1 text-gray-600">
                  <li>NFT ID: {dataset.nftId}</li>
                  <li>Token Name: {dataset.tokenName || 'Data Token'}</li>
                  <li>Token Address: {dataset.datatokenAddress.substring(0, 10)}...{dataset.datatokenAddress.substring(dataset.datatokenAddress.length - 8)}</li>
                </ul>
              </div>
            )}
            
            {owner && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <h4 className="font-semibold text-gray-700">Dataset Owner</h4>
                <div className="flex items-center mt-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    {owner.name ? owner.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{owner.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-500">{owner.email || 'No email'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatasetDetailPage; 