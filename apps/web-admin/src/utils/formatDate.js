import { format, formatDistance, formatRelative } from 'date-fns';

export const formatDate = (date, formatStr = 'PPP') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'PPP p');
};

export const formatRelativeDate = (date) => {
  if (!date) return '';
  return formatRelative(new Date(date), new Date());
};

export const formatDistanceDate = (date) => {
  if (!date) return '';
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const formatTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'p');
};

export const formatShortDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'PP');
};
