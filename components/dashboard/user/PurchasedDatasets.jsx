import React, { useState, useEffect } from 'react';
import { Spinner, Alert, Button, Badge } from 'flowbite-react';
import { FiDownload, FiExternalLink, FiFilter, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import DatasetCard from '@/components/datasets/DatasetCard';
import EmptyState from '@/components/common/EmptyState';

const PurchasedDatasets = ({ userId }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'token', 'direct'
  const [downloadingIds, setDownloadingIds] = useState({});
  const [downloadErrors, setDownloadErrors] = useState({});
  const [downloadSuccess, setDownloadSuccess] = useState({});

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/purchases');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch purchased datasets (Status: ${response.status})`);
      }
      
      const data = await response.json();
      console.log('Purchased datasets response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load purchased datasets');
      }
      
      // Check if purchases exist but empty
      if (!data.purchases || data.purchases.length === 0) {
        console.warn('No purchases found in response');
      } else {
        console.log(`Found ${data.purchases.length} purchases`);
        
        // Log each purchase to help debug
        data.purchases.forEach((purchase, index) => {
          console.log(`Purchase ${index + 1}:`, {
            id: purchase._id,
            datasetId: purchase.datasetId,
            date: purchase.purchaseDate,
            hasDataset: !!purchase.dataset,
            datasetName: purchase.dataset?.name || 'Missing dataset'
          });
        });
      }
      
      setPurchases(data.purchases || []);
    } catch (error) {
      console.error('Error fetching purchased datasets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [userId]);

  const handleDownload = async (datasetId, purchaseId) => {
    try {
      // Clear previous error for this dataset
      setDownloadErrors(prev => ({ ...prev, [datasetId]: null }));
      setDownloadSuccess(prev => ({ ...prev, [datasetId]: false }));
      
      // Set downloading state for this dataset
      setDownloadingIds(prev => ({ ...prev, [datasetId]: true }));
      
      // Try both download methods
      try {
        // First attempt: Try the normal download endpoint
        console.log(`Requesting download for dataset: ${datasetId}`);
        const response = await fetch(`/api/datasets/${datasetId}/download`);
        
        const data = await response.json();
        console.log('Download response:', data);
        
        if (!response.ok) {
          throw new Error(data.error || `Download failed: ${response.status}`);
        }
        
        if (!data.success || !data.downloadUrl) {
          throw new Error(data.info || 'Download URL not found in response');
        }
        
        console.log('Download URL:', data.downloadUrl);
        
        // Start the download
        window.location.href = data.downloadUrl;
        
        // Show success state
        setDownloadSuccess(prev => ({ ...prev, [datasetId]: true }));
        setTimeout(() => {
          setDownloadSuccess(prev => ({ ...prev, [datasetId]: false }));
        }, 3000);
        
        return; // Early return on success
      } catch (firstError) {
        // First attempt failed, try direct download as fallback
        console.log('Regular download failed, trying direct download:', firstError.message);
        
        // Second attempt: Fallback to direct download
        const directUrl = `/api/datasets/${datasetId}/direct-download`;
        
        // Create a download link and trigger it
        const link = document.createElement('a');
        link.href = directUrl;
        link.download = `dataset-${datasetId}.csv`;
        link.target = '_blank'; // Open in new tab to avoid navigation
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Show success state
      setDownloadSuccess(prev => ({ ...prev, [datasetId]: true }));
      setTimeout(() => {
        setDownloadSuccess(prev => ({ ...prev, [datasetId]: false }));
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadErrors(prev => ({ ...prev, [datasetId]: error.message }));
    } finally {
      // Clear downloading state
      setDownloadingIds(prev => ({ ...prev, [datasetId]: false }));
    }
  };

  // Filter purchases based on selected filter
  const filteredPurchases = () => {
    if (filterType === 'all') {
      return purchases;
    } else if (filterType === 'token') {
      return purchases.filter(purchase => purchase.tokenized);
    } else {
      return purchases.filter(purchase => !purchase.tokenized);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="failure">
        <div className="flex items-center">
          <FiAlertCircle className="mr-2 h-4 w-4" />
          <h3 className="font-medium">Error Loading Purchases</h3>
        </div>
        <p className="mt-2">{error}</p>
        <div className="mt-4">
          <Button 
            size="sm" 
            color="light" 
            onClick={fetchPurchases}
            disabled={loading}
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  if (purchases.length === 0) {
    return (
      <EmptyState
        title="No Purchased Datasets"
        description="You haven't purchased any datasets yet. Browse the marketplace to find datasets."
        icon={<FiDownload className="h-12 w-12" />}
        action={{
          label: "Browse Marketplace",
          href: "/explore"
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Purchased Datasets ({purchases.length})</h2>
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border rounded p-1"
          >
            <option value="all">All Purchases</option>
            <option value="token">Token Purchases</option>
            <option value="direct">Direct Purchases</option>
          </select>
        </div>
      </div>
      
      <button 
        onClick={fetchPurchases} 
        className="text-xs text-gray-500 hover:text-blue-500 underline flex items-center"
      >
        <FiRefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh purchased datasets
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPurchases().map((purchase) => (
          <div key={purchase._id} className="relative border rounded-lg p-4 shadow-sm">
            {/* If dataset is missing, show a placeholder */}
            {!purchase.dataset || !purchase.dataset._id ? (
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-bold text-lg">Dataset Not Available</h3>
                <p className="text-sm text-gray-600 mt-2">
                  This purchased dataset (ID: {purchase.datasetId}) could not be found. It may have been deleted.
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  Purchase ID: {purchase._id}
                </div>
              </div>
            ) : (
              <>
                <DatasetCard dataset={purchase.dataset} />
                
                <div className="absolute top-3 right-3">
                  {purchase.tokenized ? (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      Tokenized
                    </span>
                  ) : (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Direct
                    </span>
                  )}
                </div>
              </>
            )}
            
            {/* Download and view buttons */}
            <div className="mt-4 flex justify-between">
              <Button 
                size="sm" 
                color={downloadSuccess[purchase.datasetId] ? "success" : "primary"} 
                onClick={() => handleDownload(purchase.datasetId, purchase._id)}
                disabled={downloadingIds[purchase.datasetId]}
              >
                {downloadingIds[purchase.datasetId] ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Downloading...
                  </>
                ) : downloadSuccess[purchase.datasetId] ? (
                  <>
                    <FiDownload className="mr-1" /> Downloaded!
                  </>
                ) : (
                  <>
                    <FiDownload className="mr-1" /> Download
                  </>
                )}
              </Button>
              
              {purchase.dataset && purchase.dataset._id && (
                <Button 
                  size="sm" 
                  color="light" 
                  href={`/datasets/${purchase.datasetId}`}
                >
                  <FiExternalLink className="mr-1" /> View
                </Button>
              )}
            </div>
            
            {/* Error message */}
            {downloadErrors[purchase.datasetId] && (
              <div className="mt-2">
                <Alert color="failure" className="py-1 text-xs">
                  {downloadErrors[purchase.datasetId]}
                </Alert>
              </div>
            )}
            
            {/* Purchase details */}
            <div className="mt-3">
              {purchase.tokenized && purchase.tokenAmount && (
                <div className="text-xs text-gray-500">
                  Token Balance: {purchase.tokenAmount}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
              </div>
              
              <div className="text-xs text-gray-500 truncate">
                ID: {purchase.datasetId}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchasedDatasets; 