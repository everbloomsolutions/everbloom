/**
 * Collection Location Type Constants
 * Centralized definitions for location types used in collections
 */

export const COLLECTION_LOCATION_TYPES = {
  RESIDENTIAL_APARTMENT: 'residential-apartment',
  RESIDENTIAL_SOCIETY: 'residential-society',
  RESIDENTIAL_GATED_COMMUNITY: 'residential-gated-community',
  COMMERCIAL_PROPERTY: 'commercial-property',
} as const;

export type CollectionLocationType = 
  typeof COLLECTION_LOCATION_TYPES[keyof typeof COLLECTION_LOCATION_TYPES];

export const COLLECTION_LOCATION_LABELS: Record<CollectionLocationType, string> = {
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT]: 'Residential Apartment',
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY]: 'Residential Society',
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY]: 'Residential Gated Community',
  [COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY]: 'Commercial Property',
};

export const COLLECTION_LOCATION_DESCRIPTIONS: Record<CollectionLocationType, string> = {
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT]: 'Multi-unit residential building',
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY]: 'Residential housing society or cooperative',
  [COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY]: 'Gated residential community with security',
  [COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY]: 'Commercial property for business use',
};

export const COLLECTION_LOCATION_OPTIONS = Object.entries(COLLECTION_LOCATION_LABELS).map(
  ([value, label]) => ({ value, label })
);

/**
 * Get display label for location type
 */
export const getLocationTypeLabel = (type: CollectionLocationType | string): string => {
  return COLLECTION_LOCATION_LABELS[type as CollectionLocationType] || type;
};

/**
 * Get description for location type
 */
export const getLocationTypeDescription = (type: CollectionLocationType | string): string => {
  return COLLECTION_LOCATION_DESCRIPTIONS[type as CollectionLocationType] || '';
};

/**
 * Validate if location type is valid
 */
export const isValidLocationType = (type: string): type is CollectionLocationType => {
  return Object.values(COLLECTION_LOCATION_TYPES).includes(type as CollectionLocationType);
};

/**
 * Get location name placeholder/suggestion based on type
 */
export const getLocationNameSuggestion = (type: CollectionLocationType | string): string => {
  const suggestions: Record<string, string> = {
    [COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT]: 'e.g., Green Valley Apartments, Sunset Towers',
    [COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY]: 'e.g., Green Valley Society, Sunset Co-op Housing',
    [COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY]: 'e.g., Green Valley Estates, Sunset Villas',
    [COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY]: 'e.g., Business Plaza, Commercial Complex, Office Tower',
  };
  return suggestions[type] || 'Enter location name';
};

/**
 * Normalize location name (trim, remove extra spaces, title case)
 */
export const normalizeLocationName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Material Type Constants
 * Centralized definitions for material types used in collections
 */
export const MATERIAL_TYPES = {
  MIXED_PLASTIC: 'mixed-plastic',
  PAPER: 'paper',
  IRON: 'iron',
  ALUMINIUM: 'aluminium',
  WOOD: 'wood',
  COPPER: 'copper',
} as const;

export type MaterialType = typeof MATERIAL_TYPES[keyof typeof MATERIAL_TYPES];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MATERIAL_TYPES.MIXED_PLASTIC]: 'Mixed Plastic',
  [MATERIAL_TYPES.PAPER]: 'Paper',
  [MATERIAL_TYPES.IRON]: 'Iron',
  [MATERIAL_TYPES.ALUMINIUM]: 'Aluminium',
  [MATERIAL_TYPES.WOOD]: 'Wood',
  [MATERIAL_TYPES.COPPER]: 'Copper',
};

/**
 * GST rates for different material types
 * Wood and paper: 5%, all others: 18%
 */
export const MATERIAL_GST_RATES: Record<MaterialType, number> = {
  [MATERIAL_TYPES.MIXED_PLASTIC]: 18,
  [MATERIAL_TYPES.PAPER]: 5,
  [MATERIAL_TYPES.IRON]: 18,
  [MATERIAL_TYPES.ALUMINIUM]: 18,
  [MATERIAL_TYPES.WOOD]: 5,
  [MATERIAL_TYPES.COPPER]: 18,
};

/**
 * Get display label for material type
 */
export const getMaterialTypeLabel = (type: MaterialType | string): string => {
  return MATERIAL_TYPE_LABELS[type as MaterialType] || type;
};

/**
 * Get GST rate for material type
 * Wood and paper: 5%, all others: 18%
 */
export const getGSTRateForMaterial = (materialType: MaterialType | string): number => {
  return MATERIAL_GST_RATES[materialType as MaterialType] || 18;
};

/**
 * Validate if material type is valid
 */
export const isValidMaterialType = (type: string): type is MaterialType => {
  return Object.values(MATERIAL_TYPES).includes(type as MaterialType);
};

/**
 * Get all material types as array
 */
export const getAllMaterialTypes = (): MaterialType[] => {
  return Object.values(MATERIAL_TYPES);
};

