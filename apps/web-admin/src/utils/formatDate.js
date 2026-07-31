import { format, formatDistance, formatRelative, isValid } from 'date-fns';

const toValidDate = (date) => {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  return isValid(parsed) ? parsed : null;
};

export const formatDate = (date, formatStr = 'PPP') => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return format(parsed, formatStr);
};

export const formatDateTime = (date) => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return format(parsed, 'PPP p');
};

export const formatRelativeDate = (date) => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return formatRelative(parsed, new Date());
};

export const formatDistanceDate = (date) => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return formatDistance(parsed, new Date(), { addSuffix: true });
};

export const formatTime = (date) => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return format(parsed, 'p');
};

export const formatShortDate = (date) => {
  const parsed = toValidDate(date);
  if (!parsed) return '';
  return format(parsed, 'PP');
};
