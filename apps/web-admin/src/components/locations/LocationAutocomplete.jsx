import { useState, useEffect, useRef } from 'react';
import { locationApi } from '../../api';
import { Search, MapPin, Clock, X } from 'lucide-react';
import logger from '../../utils/logger';
import { getLocationTypeLabel } from '../../types/collections';
import { useAuth } from '../../hooks';

const LocationAutocomplete = ({ value, onChange, onLocationSelect, onSearchChange, placeholder = 'Search or select location...' }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hasSearchedOnFocus, setHasSearchedOnFocus] = useState(false);
  const wrapperRef = useRef(null);

  // Load recent locations from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentLocations');
    if (recent) {
      try {
        setRecentLocations(JSON.parse(recent));
      } catch (error) {
        logger.error('Failed to parse recent locations:', error);
      }
    }
  }, []);

  // Sync value prop with internal state
  useEffect(() => {
    if (!value) {
      // If value is cleared externally, clear internal state
      setSelectedLocation(null);
      setSearchTerm('');
      setHasSearchedOnFocus(false);
    }
  }, [value]);

  // Notify parent of search term changes
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(searchTerm);
    }
  }, [searchTerm, onSearchChange]);

  // Search locations when search term changes
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        searchLocations(searchTerm);
        setHasSearchedOnFocus(true);
      }, 500); // Debounce 500ms

      return () => clearTimeout(timeoutId);
    } else {
      // For agents and users, fetch locations when search term is empty (on focus)
      // For admins, also fetch all locations when field is focused (for creating users)
      // Only do this once when field is opened, not on every empty search
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (isOpen && !hasSearchedOnFocus && (user?.role === 'agent' || user?.role === 'user' || isAdmin)) {
        searchLocations('');
        setHasSearchedOnFocus(true);
      } else if (searchTerm.trim().length === 0 && !isOpen) {
        // Reset when closed
        setHasSearchedOnFocus(false);
        setSuggestions([]);
      } else if (searchTerm.trim().length === 0 && isOpen && hasSearchedOnFocus) {
        // Keep suggestions when field is open but search is cleared
        // Don't clear suggestions for agents/users/admins
      } else {
        setSuggestions([]);
      }
    }
    // intentional: run only when search term/open state change, not when searchLocations reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, isOpen, hasSearchedOnFocus, user?.role]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query) => {
    try {
      setLoading(true);
      const response = await locationApi.searchLocations(query, 10);
      
      // Handle both response formats
      let locations = [];
      if (response.success && response.data) {
        locations = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // Direct array format (fallback)
        locations = response;
      } else if (Array.isArray(response.data)) {
        // Data array format
        locations = response.data;
      }
      
      setSuggestions(locations);
      
      // Log for debugging (especially for agents)
      if (user?.role === 'agent' || user?.role === 'user') {
        logger.debug(`LocationAutocomplete: Found ${locations.length} locations for ${user?.role}`, { query, locations: locations.map(l => l.locationName) });
      }
    } catch (error) {
      logger.error('Failed to search locations:', error);
      setSuggestions([]);
      
      // Show helpful error for agents
      if (user?.role === 'agent' && error.response?.status === 403) {
        logger.warn('Agent may not have assigned locations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    const locationPart = location.locality || location.address || '';
    setSearchTerm(`${location.locationName} - ${locationPart}${location.city ? `, ${location.city}` : ''}`);
    setIsOpen(false);
    
    // Save to recent locations
    const recent = recentLocations.filter(loc => loc._id !== location._id);
    recent.unshift({
      _id: location._id,
      locationName: location.locationName,
      locality: location.locality,
      address: location.address,
      city: location.city,
      locationType: location.locationType,
    });
    const updatedRecent = recent.slice(0, 5); // Keep only last 5
    localStorage.setItem('recentLocations', JSON.stringify(updatedRecent));
    setRecentLocations(updatedRecent);

    // Call parent handlers
    onChange?.(location._id);
    onLocationSelect?.(location);
  };

  const handleClear = () => {
    setSelectedLocation(null);
    setSearchTerm('');
    onChange?.('');
    onLocationSelect?.(null);
    setHasSearchedOnFocus(false);
  };

  const _formatLocationDisplay = (location) => {
    const locationPart = location.locality || location.address || '';
    return `${location.locationName} - ${locationPart}${location.city ? `, ${location.city}` : ''}`;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') {
              // Don't clear selectedLocation when clearing search - only clear if explicitly clearing
              // This allows agents/users to see their locations when search is cleared
              setSelectedLocation(null);
              onChange?.('');
              onLocationSelect?.(null);
              // Reset hasSearchedOnFocus so we can fetch again on next focus
              setHasSearchedOnFocus(false);
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            // For agents and users, trigger search with empty query to show assigned locations
            // For admins, also trigger search to show all locations (useful when creating users)
            const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
            if ((user?.role === 'agent' || user?.role === 'user' || isAdmin) && searchTerm.trim().length === 0 && !hasSearchedOnFocus) {
              searchLocations('');
              setHasSearchedOnFocus(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {selectedLocation && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (suggestions.length > 0 || recentLocations.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {!loading && searchTerm.trim().length === 0 && recentLocations.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent Locations
              </div>
              {recentLocations.map((location) => (
                <button
                  key={location._id}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {location.locationName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {location.locality || location.address}{location.city ? `, ${location.city}` : ''}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {getLocationTypeLabel(location.locationType)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div>
              {searchTerm.trim().length > 0 && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Search Results
                </div>
              )}
              {suggestions.map((location) => (
                <button
                  key={location._id}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {location.locationName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {location.locality || location.address}{location.city ? `, ${location.city}` : ''}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {getLocationTypeLabel(location.locationType)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && searchTerm.trim().length > 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No locations found
            </div>
          )}
          
          {!loading && suggestions.length === 0 && searchTerm.trim().length === 0 && (user?.role === 'agent' || user?.role === 'user') && recentLocations.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {user?.role === 'user' 
                ? 'No assigned location found. Please contact an admin.'
                : 'No assigned locations found. Please contact an admin to assign locations to you.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;

