import { useState, useEffect, useCallback } from 'react';
import { USER_ROLES } from '../../utils/constants';
import logger from '../../utils/logger';
import { locationApi } from '../../api';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for managing Collections page location selection state
 * Handles location selection, existing location mode, and location data fetching
 */
export const useCollectionLocationState = (user) => {
  // Determine initial state based on user role
  const initialUseExistingLocation = user?.role !== USER_ROLES.AGENT ? true : true;
  
  const [useExistingLocation, setUseExistingLocation] = useState(initialUseExistingLocation);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocationData, setSelectedLocationData] = useState(null);

  // Force agents to use existing locations
  useEffect(() => {
    if (user?.role === USER_ROLES.AGENT && !useExistingLocation) {
      setUseExistingLocation(true);
    }
  }, [user?.role, useExistingLocation]);

  // Fetch location data by ID
  const fetchLocationData = useCallback(async (locationId) => {
    if (!locationId) {
      setSelectedLocationId('');
      setSelectedLocationData(null);
      return;
    }

    try {
      const locationIdStr = String(locationId);
      logger.debug('Fetching location data:', { locationIdStr });
      const locationResponse = await locationApi.getLocationById(locationIdStr);
      
      if (locationResponse.success && locationResponse.data) {
        const location = locationResponse.data;
        setSelectedLocationId(locationIdStr);
        setSelectedLocationData({
          _id: location._id,
          locationName: location.locationName,
          locationType: location.locationType,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode,
        });
        setUseExistingLocation(true);
      } else {
        // Location not found or inactive
        if (user?.role === USER_ROLES.AGENT) {
          toast.error('Location not found or inactive. Please contact an administrator.', { duration: 5000 });
          setSelectedLocationId('');
          setSelectedLocationData(null);
          // Keep useExistingLocation = true for agents
        } else {
          toast.error('Location not found or inactive. Switching to manual entry mode.');
          setSelectedLocationId('');
          setSelectedLocationData(null);
          setUseExistingLocation(false);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch location data:', error);
      if (user?.role === USER_ROLES.AGENT) {
        toast.error('Could not load location details. Please contact an administrator.', { duration: 5000 });
        setSelectedLocationId('');
        setSelectedLocationData(null);
      } else {
        toast.error('Could not load location details. Using manual entry mode.');
        setSelectedLocationId('');
        setSelectedLocationData(null);
        setUseExistingLocation(false);
      }
    }
  }, [user?.role]);

  // Reset location state
  const resetLocationState = useCallback(() => {
    setSelectedLocationId('');
    setSelectedLocationData(null);
    setUseExistingLocation(initialUseExistingLocation);
  }, [initialUseExistingLocation]);

  return {
    useExistingLocation,
    setUseExistingLocation,
    selectedLocationId,
    setSelectedLocationId,
    selectedLocationData,
    setSelectedLocationData,
    fetchLocationData,
    resetLocationState,
  };
};

export default useCollectionLocationState;
