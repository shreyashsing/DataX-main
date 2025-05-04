import React, { useState } from 'react';
import { Button, TextInput, Alert, Spinner, Card } from 'flowbite-react';

const FixMissingUrl = () => {
  const [datasetId, setDatasetId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataset, setDataset] = useState(null);

  const handleFix = async () => {
    if (!datasetId) {
      setError('Please enter a dataset ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setDataset(null);
      
      const response = await fetch('/api/datasets/update-missing-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId,
          downloadUrl: customUrl || undefined, // Only send if not empty
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update dataset');
      }
      
      setSuccess('Dataset updated successfully');
      setDataset(data.dataset);
    } catch (error) {
      console.error('Error fixing dataset:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Fix Missing Download URL</h2>
      <p className="text-sm text-gray-600 mb-4">
        Use this utility to fix datasets that are missing download URLs. Enter the dataset ID 
        from your purchased datasets page or from error messages.
      </p>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">Dataset ID</label>
        <TextInput
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          placeholder="e.g., 681473cd2a6f9251238ac105"
          className="mb-2"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">Custom Download URL (Optional)</label>
        <TextInput
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="Leave empty to generate automatically from token address"
          className="mb-2"
        />
        <p className="text-xs text-gray-500">
          If left empty, we'll generate a URL based on the dataset's token contract address.
        </p>
      </div>
      
      <Button 
        onClick={handleFix} 
        disabled={loading || !datasetId}
        className="w-full"
      >
        {loading ? <Spinner className="mr-2" size="sm" /> : null}
        {loading ? 'Fixing...' : 'Fix Dataset URL'}
      </Button>
      
      {error && (
        <Alert color="failure" className="mt-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert color="success" className="mt-4">
          {success}
        </Alert>
      )}
      
      {dataset && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Updated Dataset</h3>
          <div className="text-sm">
            <p><span className="font-medium">Name:</span> {dataset.name}</p>
            <p><span className="font-medium">Download URL:</span> {dataset.downloadUrl}</p>
            {dataset.file && (
              <p>
                <span className="font-medium">File:</span> {dataset.file.name} 
                ({dataset.file.type})
              </p>
            )}
          </div>
          <div className="mt-2">
            <Button 
              href={`/datasets/${dataset._id}`}
              size="xs" 
              color="light"
            >
              View Dataset
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FixMissingUrl; 