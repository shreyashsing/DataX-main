/**
 * Direct download service for datasets
 * This provides a more reliable alternative to IPFS
 */

// Simple in-memory cache for download headers
const downloadHeadersCache = new Map();

/**
 * Gets a direct download URL or buffer for the dataset
 * @param {string} datasetId - The dataset ID
 * @param {object} dataset - The dataset object (optional)
 * @param {object} options - Download options
 * @returns {Promise<object>} - Download information
 */
export const getDirectDownloadUrl = async (datasetId, dataset = null, options = {}) => {
  try {
    // If we already have the dataset object, use it
    // Otherwise fetch from the database
    const datasetInfo = dataset || await fetchDatasetInfo(datasetId);
    
    if (!datasetInfo) {
      throw new Error('Dataset not found');
    }
    
    // Check for existing URLs in this order of preference
    const downloadUrl = datasetInfo.downloadUrl || 
                        datasetInfo.fileUrl || 
                        datasetInfo.file?.url || 
                        datasetInfo.ipfsCid || 
                        generateBackupUrl(datasetInfo);
    
    // Return our result
    return {
      success: true,
      downloadUrl,
      fileName: getFileName(datasetInfo),
      contentType: getContentType(datasetInfo),
      datasetName: datasetInfo.name
    };
  } catch (error) {
    console.error('Error getting direct download URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate a backup URL for datasets that are missing a download URL
 * This creates a direct download endpoint that will serve the data from our system
 */
const generateBackupUrl = (dataset) => {
  // If we have a token address, create a predictable URL based on it
  if (dataset.datatokenAddress) {
    // Create a direct download URL that our API will handle
    return `/api/datasets/${dataset._id}/direct-download?token=${dataset.datatokenAddress.substring(2, 10)}`;
  }
  
  // Fallback to a generic download URL
  return `/api/datasets/${dataset._id}/direct-download`;
};

/**
 * Get a filename for the dataset download
 */
const getFileName = (dataset) => {
  // Try to get a name from the dataset
  const baseName = dataset.file?.name || dataset.name || 'dataset';
  
  // Make sure it has a CSV extension
  if (baseName.toLowerCase().endsWith('.csv')) {
    return baseName;
  }
  
  return `${baseName}.csv`;
};

/**
 * Get the content type for the dataset
 */
const getContentType = (dataset) => {
  return dataset.file?.type || 'text/csv';
};

/**
 * Fetch dataset info from the database
 * This is used if we don't already have the dataset object
 */
const fetchDatasetInfo = async (datasetId) => {
  try {
    const response = await fetch(`/api/datasets/${datasetId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset (Status: ${response.status})`);
    }
    
    const data = await response.json();
    return data.dataset;
  } catch (error) {
    console.error('Error fetching dataset info:', error);
    throw error;
  }
};

/**
 * Store additional download headers for a dataset
 * This is used by the direct download endpoint
 */
export const setDownloadHeaders = (datasetId, headers) => {
  downloadHeadersCache.set(datasetId, headers);
};

/**
 * Get any special download headers for a dataset
 */
export const getDownloadHeaders = (datasetId) => {
  return downloadHeadersCache.get(datasetId) || {};
}; 