import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, X, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Button from '../shared/Button';
import ErrorBoundary from '../shared/ErrorBoundary';
import { locationApi } from '../../api';
import { collectionApi } from '../../api';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { useLoadingStates } from '../../hooks';

/**
 * LocationImport Component
 * Handles location import modal with file upload, validation, and background job processing
 */
const LocationImport = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importJobId, setImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [expandedErrors, setExpandedErrors] = useState({});
  const [fileSizeError, setFileSizeError] = useState(null);
  
  // Use granular loading states hook
  const { isLoading, setLoading } = useLoadingStates(['validating', 'importing', 'downloading']);
  
  const importModalRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentJobIdRef = useRef(null);

  // File size validation (10MB max)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = useCallback((file) => {
    if (!file) {
      setFileSizeError(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileSizeError(`File size (${sizeMB}MB) exceeds maximum allowed size of 10MB`);
      return false;
    }

    setFileSizeError(null);
    return true;
  }, [MAX_FILE_SIZE]);

  const handleDownloadTemplate = async () => {
    try {
      setLoading('downloading', true);
      const blob = await locationApi.getImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'locations-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded');
    } catch (error) {
      logger.error('Failed to download template:', error);
      toast.error('Failed to download template');
    } finally {
      setLoading('downloading', false);
    }
  };

  const pollJobStatus = useCallback(async (jobId) => {
    const maxAttempts = 300; // 5 minutes max
    let attempts = 0;
    let pollInterval = null;
    let isCancelled = false;

    currentJobIdRef.current = jobId;

    const poll = async () => {
      if (isCancelled || currentJobIdRef.current !== jobId) {
        return;
      }

      try {
        const response = await collectionApi.getJobStatus(jobId);
        if (response.success) {
          const status = response.data;
          setImportProgress(status.progress || 0);

          if (status.status === 'completed') {
            setImportResults(status.result);
            toast.success(`Import completed: ${status.result.success} succeeded, ${status.result.failed} failed`);
            if (status.result.failed === 0) {
              onClose();
              setImportFile(null);
              setImportPreview(null);
              if (onImportComplete) {
                onImportComplete();
              }
            }
            setImportJobId(null);
            setImportProgress(0);
            currentJobIdRef.current = null;
            if (pollInterval) clearTimeout(pollInterval);
            isCancelled = true;
          } else if (status.status === 'failed') {
            toast.error(`Import failed: ${status.error || 'Unknown error'}`);
            setImportJobId(null);
            setImportProgress(0);
            currentJobIdRef.current = null;
            if (pollInterval) clearTimeout(pollInterval);
            isCancelled = true;
          } else if (status.status === 'active' || status.status === 'waiting') {
            attempts++;
            if (attempts < maxAttempts && !isCancelled && currentJobIdRef.current === jobId) {
              pollInterval = setTimeout(poll, 1000);
            } else {
              toast.error('Import timeout. Please check job status manually.');
              setImportJobId(null);
              currentJobIdRef.current = null;
              isCancelled = true;
            }
          }
        }
      } catch (error) {
        logger.error('Failed to poll job status:', error);
        attempts++;
        if (attempts < maxAttempts && !isCancelled && currentJobIdRef.current === jobId) {
          pollInterval = setTimeout(poll, 2000);
        } else {
          toast.error('Failed to track import progress');
          setImportJobId(null);
          currentJobIdRef.current = null;
          isCancelled = true;
        }
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, [onClose, onImportComplete]);

  const handleValidateImport = useCallback(async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    if (!validateFile(importFile)) {
      return;
    }

    try {
      setLoading('validating', true);
      const response = await locationApi.validateLocationsImport(importFile);
      if (response.success) {
        setImportPreview(response.data);
        if (!response.data.valid) {
          toast.error(`Validation found ${response.data.invalidRows} invalid row(s)`);
        } else {
          toast.success('Validation passed! Ready to import.');
        }
      }
    } catch (error) {
      logger.error('Failed to validate import:', error);
      toast.error(error.response?.data?.message || 'Failed to validate import');
    } finally {
      setLoading('validating', false);
    }
  }, [importFile, validateFile, setLoading]);

  const handleImportLocations = useCallback(async (useAsync = false) => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    if (!validateFile(importFile)) {
      return;
    }

    try {
      setLoading('importing', true);
      setImportProgress(0);
      
      const response = await locationApi.importLocations(importFile, { async: useAsync });
      
      if (response.success) {
        if (response.data.jobId) {
          setImportJobId(response.data.jobId);
          currentJobIdRef.current = response.data.jobId;
          toast.success('Import started in background. Tracking progress...');
          pollJobStatus(response.data.jobId);
        } else {
          setImportResults(response.data);
          toast.success(`Imported ${response.data.success} location(s)`);
          if (response.data.failed === 0) {
            onClose();
            setImportFile(null);
            setImportPreview(null);
            if (onImportComplete) {
              onImportComplete();
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to import locations:', error);
      toast.error(error.response?.data?.message || 'Failed to import locations');
    } finally {
      setLoading('importing', false);
    }
  }, [importFile, validateFile, pollJobStatus, onClose, onImportComplete, setLoading]);

  const handleCancelImport = useCallback(async () => {
    if (!importJobId) return;

    try {
      await collectionApi.cancelJob(importJobId);
      setImportJobId(null);
      setImportProgress(0);
      currentJobIdRef.current = null;
      toast.success('Import cancelled successfully');
    } catch (error) {
      logger.error('Failed to cancel import:', error);
      toast.error('Failed to cancel import. It may have already completed.');
    }
  }, [importJobId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (!importJobId) {
        setImportFile(null);
        setImportPreview(null);
        setImportResults(null);
        setFileSizeError(null);
        setExpandedErrors({});
      }
    }
  }, [isOpen, importJobId]);

  if (!isOpen) return null;

  return (
    <ErrorBoundary
      title="Import Error"
      message="An error occurred while importing locations. Please try again."
      showReload={false}
    >
      <div
        ref={importModalRef}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !importJobId) {
            onClose();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !importJobId) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 id="import-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              Import Locations
            </h2>
            {!importJobId && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close import modal"
                icon={X}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download the template to see the required format
              </p>
              <Button
                onClick={handleDownloadTemplate}
                variant="ghost"
                size="sm"
                className="text-sm bg-primary-100 hover:bg-primary-200 text-primary-700"
                icon={Download}
                isLoading={isLoading('downloading')}
                loadingText="Downloading..."
              >
                Download Template
              </Button>
            </div>

            <div>
              <label 
                htmlFor="location-import-file-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Select CSV or Excel File
              </label>
              <input
                id="location-import-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportPreview(null);
                  setImportResults(null);
                  setFileSizeError(null);
                  if (file) {
                    validateFile(file);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                aria-describedby="location-file-help-text location-file-error-text"
                aria-invalid={!!fileSizeError}
              />
              <p id="location-file-help-text" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload a CSV or Excel file with location data (max 10MB)
              </p>
              {fileSizeError && (
                <p id="location-file-error-text" className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3 h-3" />
                  {fileSizeError}
                </p>
              )}
              {importFile && !fileSizeError && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Selected: {importFile.name} ({(importFile.size / (1024 * 1024)).toFixed(2)}MB)
                </p>
              )}
            </div>

            {/* Validation Preview */}
            {importPreview && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Validation Preview
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Rows:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{importPreview.totalRows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Valid Rows:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{importPreview.validRows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Invalid Rows:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{importPreview.invalidRows}</span>
                  </div>
                  {importPreview.summary && (
                    <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Locations:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{importPreview.summary.totalLocations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duplicates:</span>
                        <span className="font-medium text-yellow-600 dark:text-yellow-400">{importPreview.summary.duplicates}</span>
                      </div>
                    </div>
                  )}
                  {importPreview.preview && importPreview.preview.some(p => !p.valid) && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={() => setExpandedErrors(prev => ({ ...prev, preview: !prev.preview }))}
                        variant="ghost"
                        size="sm"
                        className="text-xs font-medium text-red-600 dark:text-red-400 mb-1 hover:underline"
                        aria-expanded={expandedErrors.preview}
                        aria-controls="location-preview-errors-list"
                        icon={expandedErrors.preview ? ChevronUp : ChevronDown}
                      >
                        {expandedErrors.preview ? 'Hide Errors' : `Show Errors (${importPreview.preview.filter(p => !p.valid).length})`}
                      </Button>
                      {expandedErrors.preview && (
                        <div
                          id="location-preview-errors-list"
                          className="max-h-60 overflow-y-auto border border-red-200 dark:border-red-800 rounded p-2 bg-red-50 dark:bg-red-900/10"
                          role="region"
                          aria-label="Validation errors"
                        >
                          {importPreview.preview.filter(p => !p.valid).map((preview, idx) => (
                            <div key={idx} className="text-xs text-red-600 dark:text-red-400 mb-1">
                              <strong>Row {preview.row}:</strong> {preview.errors.join(', ')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {importJobId && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Import Progress</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{importProgress}%</span>
                </div>
                <div 
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={importProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Import progress"
                >
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Processing in background... You can close this modal.
                  </p>
                  <Button
                    onClick={handleCancelImport}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    aria-label="Cancel import"
                  >
                    Cancel Import
                  </Button>
                </div>
              </div>
            )}

            {importResults && !importJobId && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Import Results
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Success: {importResults.success} | Failed: {importResults.failed}
                </p>
                {importResults.errorReport && (
                  <Button
                    onClick={() => {
                      const blob = new Blob([importResults.errorReport], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Download Error Report
                  </Button>
                )}
                {importResults.results && importResults.results.length > 0 && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={() => setExpandedErrors(prev => ({ ...prev, results: !prev.results }))}
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium text-red-600 dark:text-red-400 mb-1 hover:underline"
                      aria-expanded={expandedErrors.results}
                      aria-controls="location-import-results-errors-list"
                      icon={expandedErrors.results ? ChevronUp : ChevronDown}
                    >
                      {expandedErrors.results ? 'Hide Errors' : `Show Errors (${importResults.results.filter(r => !r.success).length})`}
                    </Button>
                    {expandedErrors.results && (
                      <div
                        id="location-import-results-errors-list"
                        className="max-h-60 overflow-y-auto border border-red-200 dark:border-red-800 rounded p-2 bg-red-50 dark:bg-red-900/10"
                        role="region"
                        aria-label="Import error details"
                      >
                        {importResults.results.filter(r => !r.success).map((result, idx) => (
                          <div key={idx} className="text-xs text-red-600 dark:text-red-400 mb-1">
                            <strong>Row {result.row}:</strong> {result.error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  if (!importJobId) {
                    onClose();
                  }
                }}
                disabled={!!importJobId}
                variant="secondary"
                aria-label={importJobId ? 'Cannot close during import' : 'Cancel import'}
              >
                {importJobId ? 'Close' : 'Cancel'}
              </Button>
              {!importPreview && (
                <Button
                  onClick={handleValidateImport}
                  disabled={!importFile || isLoading('validating')}
                  variant="primary"
                  className="bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                  isLoading={isLoading('validating')}
                  loadingText="Validating..."
                >
                  Validate
                </Button>
              )}
              {importPreview && importPreview.valid && (
                <>
                  <Button
                    onClick={() => handleImportLocations(false)}
                    disabled={isLoading('importing')}
                    variant="primary"
                    isLoading={isLoading('importing')}
                    loadingText="Importing..."
                  >
                    Import Now
                  </Button>
                  <Button
                    onClick={() => handleImportLocations(true)}
                    disabled={isLoading('importing')}
                    variant="success"
                    isLoading={isLoading('importing')}
                    loadingText="Queuing..."
                  >
                    Import in Background
                  </Button>
                </>
              )}
              {!importPreview && (
                <Button
                  onClick={() => handleImportLocations(false)}
                  disabled={!importFile || isLoading('importing')}
                  variant="primary"
                  isLoading={isLoading('importing')}
                  loadingText="Importing..."
                >
                  Import
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default LocationImport;
