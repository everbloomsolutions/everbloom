import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Loader from '../shared/Loader';
import { locationApi } from '../../api';
import { formatDate } from '../../utils/formatDate';
import { getLocationTypeLabel } from '../../types/collections';
import { Calendar, Package, TrendingUp, Edit, XCircle } from 'lucide-react';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';

const LocationDetailsModal = ({ isOpen, onClose, locationId, onEdit, onDeactivate }) => {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (isOpen && locationId) {
      fetchLocationDetails();
    }
    // intentional: run only when isOpen/locationId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, locationId]);

  const fetchLocationDetails = async () => {
    try {
      setLoading(true);
      const response = await locationApi.getLocationWithStats(locationId);
      if (response.success) {
        setLocation(response.data);
      }
    } catch (error) {
      logger.error('Failed to fetch location details:', error);
      toast.error('Failed to load location details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Location Details"
      size="lg"
    >
      {loading ? (
        <Loader />
      ) : !location ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Location not found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Location Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {location.locationName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Location Type
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {getLocationTypeLabel(location.locationType)}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Address
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {location.address}
                </p>
              </div>
              {(location.city || location.state || location.zipCode) && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    City, State, Zip
                  </label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {[location.city, location.state, location.zipCode].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Usage Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Collections</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {location.collectionsCount || 0}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-primary-500" />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Usage Count</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {location.usageCount || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Used</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {location.lastUsedAt ? formatDate(location.lastUsedAt) : 'Never'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Collections */}
          {location.recentCollections && location.recentCollections.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Collections
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {location.recentCollections.map((collection) => (
                  <div
                    key={collection._id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {collection.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(collection.collectionDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {location.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Notes
              </h3>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {location.notes}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                onEdit?.(location);
                onClose();
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                onDeactivate?.(location);
                onClose();
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {location.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default LocationDetailsModal;

