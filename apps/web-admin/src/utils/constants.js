export const USER_ROLES = {
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};


export const INQUIRY_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const INQUIRY_TYPES = [
  { value: 'viewing', label: 'Viewing' },
  { value: 'information', label: 'Information' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'rent', label: 'Rent' },
  { value: 'other', label: 'Other' },
];

export const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'system', label: 'System' },
];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  ITEMS_PER_PAGE_OPTIONS: [10, 25, 50, 100],
};
